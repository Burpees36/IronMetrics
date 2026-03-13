import { Router, type IRouter } from "express";
import { db, subscriptionsTable, membersTable, gymsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { paymentUpdateTokenService } from "../services/payment-update-token";
import { billingRecoveryService } from "../services/billing-recovery";
import { buildPaymentUpdatedEmail, sendBillingEmail } from "../services/billing-email";
import { billingAuditLogger } from "../billingAuditLogger";
import { getUncachableStripeClient, getPublishableKey } from "../stripeClient";
import { stripeService } from "../stripeService";

const router: IRouter = Router();

router.get("/payment-update/validate", async (req, res): Promise<void> => {
  const token = req.query.token as string;
  if (!token) { res.status(400).json({ error: "Token required" }); return; }

  try {
    const validation = await paymentUpdateTokenService.validateToken(token);

    if (!validation.valid) {
      res.status(400).json({ valid: false, error: validation.error });
      return;
    }

    const context = await paymentUpdateTokenService.getTokenContext(token);
    res.json({
      valid: true,
      gymName: context?.gymName,
      gymLogoUrl: context?.gymLogoUrl,
      memberName: context?.memberName,
    });
  } catch (err: any) {
    res.status(500).json({ valid: false, error: "An error occurred validating your link." });
  }
});

router.post("/payment-update/setup-intent", async (req, res): Promise<void> => {
  const { token } = req.body;
  if (!token) { res.status(400).json({ error: "Token required" }); return; }

  try {
    const validation = await paymentUpdateTokenService.validateToken(token);
    if (!validation.valid || !validation.data) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const { gymId, memberId } = validation.data;
    const result = await stripeService.createSetupIntent(memberId, gymId);
    const publishableKey = await getPublishableKey();

    res.json({
      clientSecret: result.clientSecret,
      publishableKey,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to initialize payment form. Please try again." });
  }
});

router.post("/payment-update/complete", async (req, res): Promise<void> => {
  const { token, paymentMethodId } = req.body;
  if (!token || !paymentMethodId) {
    res.status(400).json({ error: "Token and payment method required" });
    return;
  }

  try {
    const validation = await paymentUpdateTokenService.validateToken(token);
    if (!validation.valid || !validation.data) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const { id: tokenId, gymId, memberId, subscriptionId, recoveryId } = validation.data;

    const consumed = await paymentUpdateTokenService.markUsed(tokenId);
    if (!consumed) {
      res.status(400).json({ error: "This link has already been used or expired. Please contact your gym for a new update link." });
      return;
    }

    const [member] = await db.select().from(membersTable).where(
      and(eq(membersTable.id, memberId), eq(membersTable.gymId, gymId))
    );
    if (!member) { res.status(404).json({ error: "Member not found" }); return; }

    if (!member.stripeCustomerId) {
      res.status(400).json({ error: "Member does not have a Stripe customer account. Please contact your gym." });
      return;
    }

    const [sub] = await db.select().from(subscriptionsTable).where(
      and(
        eq(subscriptionsTable.id, subscriptionId),
        eq(subscriptionsTable.gymId, gymId),
        eq(subscriptionsTable.memberId, memberId)
      )
    );
    if (!sub) { res.status(404).json({ error: "Subscription not found" }); return; }

    const stripe = await getUncachableStripeClient();

    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: member.stripeCustomerId,
    });

    await stripe.customers.update(member.stripeCustomerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    if (sub.stripeSubscriptionId) {
      await stripe.subscriptions.update(sub.stripeSubscriptionId, {
        default_payment_method: paymentMethodId,
      });
    }

    const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
    const cardLast4 = pm.card?.last4 || "****";
    const cardBrand = pm.card?.brand || "card";

    if (recoveryId) {
      await billingRecoveryService.resolveRecovery(subscriptionId, "card_updated");
    }

    await db.update(subscriptionsTable).set({
      failedPayments: 0,
    }).where(eq(subscriptionsTable.id, subscriptionId));

    await billingAuditLogger.log({
      gymId,
      memberId,
      action: "recovery.card_updated",
      entityType: "payment_method",
      entityId: paymentMethodId,
      source: "system",
      afterValue: { brand: cardBrand, last4: cardLast4 },
    });

    const [gym] = await db.select().from(gymsTable).where(eq(gymsTable.id, gymId));
    if (gym) {
      const email = buildPaymentUpdatedEmail({
        memberName: `${member.firstName} ${member.lastName}`,
        cardLast4,
        cardBrand,
        branding: {
          name: gym.name,
          fromEmail: gym.fromEmail,
          fromName: gym.fromName,
          logoUrl: gym.logoUrl,
          email: gym.email,
          phone: gym.phone,
        },
      });

      sendBillingEmail({
        to: member.email,
        ...email,
        branding: {
          name: gym.name,
          fromEmail: gym.fromEmail,
          fromName: gym.fromName,
          logoUrl: gym.logoUrl,
          email: gym.email,
          phone: gym.phone,
        },
      }).catch((err) => console.error("[billing-recovery] Failed to send confirmation email:", err));
    }

    if (sub.stripeSubscriptionId) {
      try {
        const stripeSub = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId);
        const latestInvoiceId = typeof stripeSub.latest_invoice === "string"
          ? stripeSub.latest_invoice
          : (stripeSub.latest_invoice as any)?.id;

        if (latestInvoiceId) {
          const invoice = await stripe.invoices.retrieve(latestInvoiceId);
          if (invoice.status === "open") {
            await stripe.invoices.pay(latestInvoiceId);
          }
        }
      } catch (retryErr: any) {
        console.warn("[billing-recovery] Could not retry invoice payment:", retryErr.message);
      }
    }

    res.json({
      success: true,
      cardLast4,
      cardBrand,
    });
  } catch (err: any) {
    console.error("[payment-update] Error completing card update:", err.message);
    res.status(500).json({ error: "Failed to update payment method. Please try again." });
  }
});

export default router;
