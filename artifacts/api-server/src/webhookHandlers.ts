import { getStripeSync, getUncachableStripeClient } from "./stripeClient";
import { db, subscriptionsTable, paymentsTable, refundsTable, invoicesTable, membersTable, billingWebhookEventsTable, gymsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { billingAuditLogger } from "./billingAuditLogger";
import { billingRecoveryService } from "./services/billing-recovery";
import type Stripe from "stripe";
import { getTierFromPriceId, type SubscriptionTier } from "./tierConfig";
import { exitMemberSequences } from "./schedulers/retention-engine";

async function claimEvent(stripeEventId: string, eventType: string): Promise<boolean> {
  try {
    const result = await db.insert(billingWebhookEventsTable).values({
      stripeEventId,
      eventType,
      status: "processing",
      rawPayload: null,
    }).onConflictDoNothing().returning();

    return result.length > 0;
  } catch {
    return false;
  }
}

async function recordEventResult(stripeEventId: string, status: "processed" | "failed", error?: string): Promise<void> {
  await db.update(billingWebhookEventsTable).set({
    status,
    processingError: error || null,
    processedAt: new Date(),
  }).where(eq(billingWebhookEventsTable.stripeEventId, stripeEventId));
}

function extractGymId(metadata: Stripe.Metadata | null | undefined): number | null {
  const raw = metadata?.gymId;
  if (!raw) return null;
  const id = parseInt(raw, 10);
  return isNaN(id) ? null : id;
}

function extractMemberId(metadata: Stripe.Metadata | null | undefined): number | null {
  const raw = metadata?.memberId;
  if (!raw) return null;
  const id = parseInt(raw, 10);
  return isNaN(id) ? null : id;
}

async function handleSubscriptionCreated(sub: Stripe.Subscription): Promise<void> {
  const gymId = extractGymId(sub.metadata);
  const memberId = extractMemberId(sub.metadata);
  if (!gymId || !memberId) return;

  const [existing] = await db.select().from(subscriptionsTable)
    .where(eq(subscriptionsTable.stripeSubscriptionId, sub.id));

  if (existing) {
    await db.update(subscriptionsTable).set({
      status: sub.status === "active" ? "active" : sub.status === "trialing" ? "active" : "pending",
      currentPeriodStart: new Date((sub as any).current_period_start * 1000).toISOString().split("T")[0],
      currentPeriodEnd: new Date((sub as any).current_period_end * 1000).toISOString().split("T")[0],
    }).where(eq(subscriptionsTable.id, existing.id));
  }

  await billingAuditLogger.log({
    gymId,
    memberId,
    action: "subscription.created",
    entityType: "subscription",
    entityId: sub.id,
    source: "webhook",
    afterValue: { status: sub.status, stripeId: sub.id },
  });
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription): Promise<void> {
  const [existing] = await db.select().from(subscriptionsTable)
    .where(eq(subscriptionsTable.stripeSubscriptionId, sub.id));
  if (!existing) return;

  const beforeStatus = existing.status;
  let newStatus = existing.status;

  if (existing.status === "pending" && (sub.status === "active" || sub.status === "trialing")) {
    newStatus = "active";
  } else if (existing.status === "pending" && (sub.status === "canceled" || sub.status === "incomplete_expired")) {
    newStatus = "cancelled";
  } else if (sub.status === "incomplete_expired") {
    newStatus = "cancelled";
  } else if (sub.status === "active" && !(sub as any).cancel_at_period_end) {
    newStatus = "active";
  } else if (sub.status === "active" && (sub as any).cancel_at_period_end) {
    newStatus = "cancel_at_period_end";
  } else if (sub.status === "past_due") {
    newStatus = "past_due";
  } else if (sub.status === "canceled") {
    newStatus = "cancelled";
  } else if (sub.status === "paused") {
    newStatus = "paused";
  } else if (sub.status === "unpaid") {
    newStatus = "past_due";
  }

  const updates: any = {
    status: newStatus,
    currentPeriodStart: new Date((sub as any).current_period_start * 1000).toISOString().split("T")[0],
    currentPeriodEnd: new Date((sub as any).current_period_end * 1000).toISOString().split("T")[0],
  };

  if (newStatus === "cancelled" && !existing.cancelledAt) {
    updates.cancelledAt = new Date();
  }

  if ((sub as any).cancel_at_period_end && newStatus === "cancel_at_period_end" && !existing.cancelledAt) {
    updates.cancelledAt = new Date();
  }

  await db.update(subscriptionsTable).set(updates).where(eq(subscriptionsTable.id, existing.id));

  if (newStatus === "cancelled" || newStatus === "past_due") {
    if (newStatus === "cancelled") {
      await db.update(membersTable).set({ status: "cancelled", riskScore: null, riskTier: null }).where(eq(membersTable.id, existing.memberId));
    } else {
      await db.update(membersTable).set({ status: "active" }).where(eq(membersTable.id, existing.memberId));
    }
  } else if (newStatus === "active" && beforeStatus !== "active") {
    await db.update(membersTable).set({ status: "active" }).where(eq(membersTable.id, existing.memberId));
  }

  if (newStatus === "active" && (beforeStatus === "past_due" || existing.failedPayments > 0)) {
    try {
      await billingRecoveryService.resolveRecovery(existing.id, "subscription_reactivated");
      await db.update(subscriptionsTable).set({ failedPayments: 0 }).where(eq(subscriptionsTable.id, existing.id));
    } catch (err: any) {
      console.error("[WEBHOOK] Error resolving billing recovery on sub update:", err.message);
    }
  }

  await billingAuditLogger.log({
    gymId: existing.gymId,
    memberId: existing.memberId,
    action: "webhook.reconciliation",
    entityType: "subscription",
    entityId: sub.id,
    source: "webhook",
    beforeValue: { status: beforeStatus },
    afterValue: { status: newStatus },
  });
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription): Promise<void> {
  const [existing] = await db.select().from(subscriptionsTable)
    .where(eq(subscriptionsTable.stripeSubscriptionId, sub.id));
  if (!existing) return;

  await db.update(subscriptionsTable).set({
    status: "cancelled",
    cancelledAt: existing.cancelledAt || new Date(),
  }).where(eq(subscriptionsTable.id, existing.id));

  await db.update(subscriptionsTable).set({
    status: "cancelled",
    cancelledAt: new Date(),
  }).where(and(
    eq(subscriptionsTable.memberId, existing.memberId),
    eq(subscriptionsTable.gymId, existing.gymId),
    eq(subscriptionsTable.status, "pending"),
  ));

  await db.update(membersTable).set({ status: "cancelled", riskScore: null, riskTier: null }).where(eq(membersTable.id, existing.memberId));

  try {
    await exitMemberSequences(existing.memberId, existing.gymId, "member_inactive");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[webhook] Failed to exit sequences for cancelled member ${existing.memberId}:`, msg);
  }

  await billingAuditLogger.log({
    gymId: existing.gymId,
    memberId: existing.memberId,
    action: "subscription.cancelled",
    entityType: "subscription",
    entityId: sub.id,
    source: "webhook",
    beforeValue: { status: existing.status },
    afterValue: { status: "cancelled" },
  });
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  const inv = invoice as any;
  const subId = typeof inv.subscription === "string" ? inv.subscription : inv.subscription?.id;
  if (!subId) return;

  const [sub] = await db.select().from(subscriptionsTable)
    .where(eq(subscriptionsTable.stripeSubscriptionId, subId));
  if (!sub) return;

  const [member] = await db.select().from(membersTable).where(eq(membersTable.id, sub.memberId));
  if (!member) return;

  const amountPaid = (invoice.amount_paid || 0) / 100;
  const stripeInvoiceId = invoice.id;
  const piId = typeof inv.payment_intent === "string" ? inv.payment_intent : inv.payment_intent?.id;

  const existingPayments = await db.select().from(paymentsTable)
    .where(and(
      eq(paymentsTable.stripePaymentIntentId, piId || ""),
      eq(paymentsTable.gymId, sub.gymId)
    ));

  if (existingPayments.length === 0 && amountPaid > 0) {
    await db.insert(paymentsTable).values({
      gymId: sub.gymId,
      memberId: sub.memberId,
      memberName: `${member.firstName} ${member.lastName}`,
      amount: String(amountPaid),
      type: "subscription",
      status: "succeeded",
      description: `Invoice ${stripeInvoiceId}`,
      stripePaymentIntentId: piId || null,
    });
  }

  await db.update(subscriptionsTable).set({
    status: "active",
    failedPayments: 0,
  }).where(eq(subscriptionsTable.id, sub.id));

  await billingAuditLogger.log({
    gymId: sub.gymId,
    memberId: sub.memberId,
    action: "payment.succeeded",
    entityType: "payment",
    entityId: piId || stripeInvoiceId,
    amount: amountPaid,
    source: "webhook",
  });

  if (sub.failedPayments > 0) {
    try {
      await billingRecoveryService.resolveRecovery(sub.id, "payment_succeeded");
    } catch (err: any) {
      console.error("[WEBHOOK] Error resolving billing recovery:", err.message);
    }
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const inv = invoice as any;
  const subId = typeof inv.subscription === "string" ? inv.subscription : inv.subscription?.id;
  if (!subId) return;

  const [sub] = await db.select().from(subscriptionsTable)
    .where(eq(subscriptionsTable.stripeSubscriptionId, subId));
  if (!sub) return;

  await db.update(subscriptionsTable).set({
    failedPayments: sub.failedPayments + 1,
    status: sub.failedPayments >= 2 ? "past_due" : sub.status,
  }).where(eq(subscriptionsTable.id, sub.id));

  await billingAuditLogger.log({
    gymId: sub.gymId,
    memberId: sub.memberId,
    action: "payment.failed",
    entityType: "payment",
    entityId: invoice.id,
    amount: (invoice.amount_due || 0) / 100,
    source: "webhook",
    metadata: { attemptCount: sub.failedPayments + 1 },
  });

  let cardLast4: string | null = null;
  let cardBrand: string | null = null;
  try {
    const charge = inv.charge;
    if (charge && typeof charge === "object" && charge.payment_method_details?.card) {
      cardLast4 = charge.payment_method_details.card.last4 || null;
      cardBrand = charge.payment_method_details.card.brand || null;
    }
  } catch {}

  try {
    await billingRecoveryService.handlePaymentFailure({
      subscriptionId: sub.id,
      gymId: sub.gymId,
      memberId: sub.memberId,
      stripeSubscriptionId: subId,
      amountDue: (invoice.amount_due || 0) / 100,
      cardLast4,
      cardBrand,
      stripeEventId: invoice.id,
    });
  } catch (err: any) {
    console.error("[WEBHOOK] Error triggering billing recovery:", err.message);
  }
}

async function handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
  const piId = typeof charge.payment_intent === "string" ? charge.payment_intent : (charge.payment_intent as any)?.id;
  if (!piId) return;

  const [payment] = await db.select().from(paymentsTable)
    .where(eq(paymentsTable.stripePaymentIntentId, piId));
  if (!payment) return;

  const [member] = await db.select().from(membersTable).where(eq(membersTable.id, payment.memberId));
  const refundAmount = (charge.amount_refunded || 0) / 100;

  const existingRefunds = await db.select().from(refundsTable)
    .where(and(
      eq(refundsTable.stripeRefundId, charge.id),
      eq(refundsTable.gymId, payment.gymId)
    ));

  if (existingRefunds.length === 0 && refundAmount > 0) {
    await db.insert(refundsTable).values({
      gymId: payment.gymId,
      memberId: payment.memberId,
      memberName: member ? `${member.firstName} ${member.lastName}` : payment.memberName,
      amount: String(refundAmount),
      reason: "Stripe refund",
      status: "succeeded",
      paymentId: payment.id,
      stripeRefundId: charge.id,
    });
  }

  await billingAuditLogger.log({
    gymId: payment.gymId,
    memberId: payment.memberId,
    action: "refund.issued",
    entityType: "refund",
    entityId: charge.id,
    amount: refundAmount,
    source: "webhook",
  });
}

function isPlatformSubscription(sub: Stripe.Subscription): boolean {
  return sub.metadata?.iron_metrics_platform === "true";
}

async function isPlatformInvoiceAsync(invoice: Stripe.Invoice): Promise<boolean> {
  if (invoice.metadata?.iron_metrics_platform === "true") return true;

  const subRef = invoice.parent?.subscription_details?.subscription;
  const subscriptionId: string | null = typeof subRef === "string"
    ? subRef
    : (subRef?.id ?? null);

  if (!subscriptionId) return false;

  const [gym] = await db
    .select({ id: gymsTable.id })
    .from(gymsTable)
    .where(eq(gymsTable.platformSubscriptionId, subscriptionId));

  return !!gym;
}

function extractPlatformTierFromSubscription(sub: Stripe.Subscription): SubscriptionTier | null {
  for (const item of sub.items.data) {
    const priceId = item.price.id;
    const tier = getTierFromPriceId(priceId);
    if (tier) return tier;
  }
  const metaTier = sub.metadata?.tier as SubscriptionTier | undefined;
  return metaTier ?? null;
}

function getSubscriptionPeriodEnd(sub: Stripe.Subscription): Date | null {
  const firstItem = sub.items.data[0];
  if (firstItem?.current_period_end) {
    return new Date(firstItem.current_period_end * 1000);
  }
  return null;
}

async function handlePlatformSubscriptionActivated(sub: Stripe.Subscription): Promise<void> {
  const gymIdStr = sub.metadata?.gymId;
  if (!gymIdStr) return;

  const gymId = parseInt(gymIdStr, 10);
  if (isNaN(gymId)) return;

  const tier = extractPlatformTierFromSubscription(sub);
  if (!tier) {
    console.warn(`[PLATFORM WEBHOOK] Could not determine tier for subscription ${sub.id} (gym ${gymId})`);
    return;
  }

  await db.update(gymsTable).set({
    subscriptionTier: tier,
    platformSubscriptionId: sub.id,
    platformCancelAtPeriodEnd: sub.cancel_at_period_end,
    platformCurrentPeriodEnd: getSubscriptionPeriodEnd(sub),
  }).where(eq(gymsTable.id, gymId));

  console.log(`[PLATFORM WEBHOOK] Activated tier=${tier} for gym ${gymId}`);
}

interface PlatformSubscriptionUpdate {
  platformCancelAtPeriodEnd: boolean;
  platformCurrentPeriodEnd: Date | null;
  subscriptionTier?: SubscriptionTier;
  platformSubscriptionId?: string | null;
}

async function handlePlatformSubscriptionUpdated(sub: Stripe.Subscription): Promise<void> {
  const gymIdStr = sub.metadata?.gymId;
  if (!gymIdStr) return;

  const gymId = parseInt(gymIdStr, 10);
  if (isNaN(gymId)) return;

  const updates: PlatformSubscriptionUpdate = {
    platformCancelAtPeriodEnd: sub.cancel_at_period_end,
    platformCurrentPeriodEnd: getSubscriptionPeriodEnd(sub),
  };

  if (sub.status === "active" || sub.status === "trialing") {
    const tier = extractPlatformTierFromSubscription(sub);
    if (tier) {
      updates.subscriptionTier = tier;
      updates.platformSubscriptionId = sub.id;
    }
  } else if (sub.status === "canceled") {
    updates.subscriptionTier = "none";
    updates.platformSubscriptionId = null;
  }

  await db.update(gymsTable).set(updates).where(eq(gymsTable.id, gymId));
  console.log(`[PLATFORM WEBHOOK] Updated platform subscription for gym ${gymId}, status=${sub.status}, tier=${updates.subscriptionTier ?? "(unchanged)"}`);
}

async function handlePlatformSubscriptionDeleted(sub: Stripe.Subscription): Promise<void> {
  const gymIdStr = sub.metadata?.gymId;
  if (!gymIdStr) return;

  const gymId = parseInt(gymIdStr, 10);
  if (isNaN(gymId)) return;

  await db.update(gymsTable).set({
    subscriptionTier: "none",
    platformSubscriptionId: null,
    platformCancelAtPeriodEnd: false,
    platformCurrentPeriodEnd: null,
  }).where(eq(gymsTable.id, gymId));

  console.log(`[PLATFORM WEBHOOK] Platform subscription deleted for gym ${gymId} — downgraded to none`);
}

async function handlePaymentMethodAttached(pm: Stripe.PaymentMethod): Promise<void> {
  const customerId = typeof pm.customer === "string" ? pm.customer : (pm.customer as any)?.id;
  if (!customerId) return;

  const [member] = await db.select().from(membersTable)
    .where(eq(membersTable.stripeCustomerId, customerId));
  if (!member) return;

  await billingAuditLogger.log({
    gymId: member.gymId,
    memberId: member.id,
    action: "payment_method.updated",
    entityType: "payment_method",
    entityId: pm.id,
    source: "webhook",
    afterValue: { brand: pm.card?.brand, last4: pm.card?.last4 },
  });
}

export { handleSubscriptionDeleted as _handleSubscriptionDeleted };

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        "STRIPE WEBHOOK ERROR: Payload must be a Buffer. " +
        "Received type: " + typeof payload + ". " +
        "FIX: Ensure webhook route is registered BEFORE app.use(express.json())."
      );
    }

    const stripe = await getUncachableStripeClient();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: Stripe.Event;

    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } else {
      const sync = await getStripeSync();
      await sync.processWebhook(payload, signature);

      event = JSON.parse(payload.toString()) as Stripe.Event;
    }

    const eventId = event.id;
    const eventType = event.type;

    const claimed = await claimEvent(eventId, eventType);
    if (!claimed) {
      console.log(`[WEBHOOK] Skipping duplicate event ${eventId} (${eventType})`);
      return;
    }

    try {
      switch (eventType) {
        case "customer.subscription.created": {
          const sub = event.data.object as Stripe.Subscription;
          if (isPlatformSubscription(sub)) {
            await handlePlatformSubscriptionActivated(sub);
          } else {
            await handleSubscriptionCreated(sub);
          }
          break;
        }
        case "customer.subscription.updated": {
          const sub = event.data.object as Stripe.Subscription;
          if (isPlatformSubscription(sub)) {
            await handlePlatformSubscriptionUpdated(sub);
          } else {
            await handleSubscriptionUpdated(sub);
          }
          break;
        }
        case "customer.subscription.deleted": {
          const sub = event.data.object as Stripe.Subscription;
          if (isPlatformSubscription(sub)) {
            await handlePlatformSubscriptionDeleted(sub);
          } else {
            await handleSubscriptionDeleted(sub);
          }
          break;
        }
        case "invoice.payment_succeeded": {
          const inv = event.data.object as Stripe.Invoice;
          const isPlatform = await isPlatformInvoiceAsync(inv);
          if (isPlatform) {
            console.log(`[PLATFORM WEBHOOK] invoice.payment_succeeded for platform subscription (invoice: ${inv.id}) — no additional action needed`);
          } else {
            await handleInvoicePaymentSucceeded(inv);
          }
          break;
        }
        case "invoice.payment_failed": {
          const inv = event.data.object as Stripe.Invoice;
          const isPlatform = await isPlatformInvoiceAsync(inv);
          if (isPlatform) {
            console.warn(`[PLATFORM WEBHOOK] invoice.payment_failed for platform subscription (invoice: ${inv.id}) — Stripe will retry and may cancel subscription`);
          } else {
            await handleInvoicePaymentFailed(inv);
          }
          break;
        }
        case "charge.refunded":
          await handleChargeRefunded(event.data.object as Stripe.Charge);
          break;
        case "payment_method.attached":
          await handlePaymentMethodAttached(event.data.object as Stripe.PaymentMethod);
          break;
        case "invoice.created":
        case "invoice.finalized":
          console.log(`[WEBHOOK] Received ${eventType} — logged, no action needed`);
          break;
        default:
          console.log(`[WEBHOOK] Unhandled event type: ${eventType}`);
          break;
      }

      await recordEventResult(eventId, "processed");
      console.log(`[WEBHOOK] Processed ${eventType} (${eventId})`);
    } catch (err: any) {
      console.error(`[WEBHOOK] Error processing ${eventType} (${eventId}):`, err.message);
      await recordEventResult(eventId, "failed", err.message);
      throw err;
    }
  }
}
