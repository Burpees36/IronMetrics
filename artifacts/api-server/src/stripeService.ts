import Stripe from "stripe";
import { getUncachableStripeClient } from "./stripeClient";
import { db, membersTable, subscriptionsTable, membershipPlansTable, invoicesTable, paymentsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { billingAuditLogger, type AuditSource } from "./billingAuditLogger";

interface ActorInfo {
  userId?: string;
  name?: string;
  source?: AuditSource;
}

export class StripeService {
  async getOrCreateCustomer(memberId: number, gymId: number): Promise<string> {
    const [member] = await db.select().from(membersTable).where(and(eq(membersTable.id, memberId), eq(membersTable.gymId, gymId)));
    if (!member) throw new Error("Member not found");

    if (member.stripeCustomerId) return member.stripeCustomerId;

    const stripe = await getUncachableStripeClient();
    const customer = await stripe.customers.create({
      email: member.email,
      name: `${member.firstName} ${member.lastName}`,
      metadata: { memberId: String(memberId), gymId: String(gymId) },
    });

    await db.update(membersTable).set({ stripeCustomerId: customer.id }).where(eq(membersTable.id, memberId));
    return customer.id;
  }

  async createSetupIntent(memberId: number, gymId: number): Promise<{ clientSecret: string; customerId: string }> {
    const customerId = await this.getOrCreateCustomer(memberId, gymId);
    const stripe = await getUncachableStripeClient();
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["card"],
    });
    return { clientSecret: setupIntent.client_secret!, customerId };
  }

  async listPaymentMethods(memberId: number, gymId: number): Promise<any[]> {
    const [member] = await db.select().from(membersTable).where(and(eq(membersTable.id, memberId), eq(membersTable.gymId, gymId)));
    if (!member?.stripeCustomerId) return [];

    const stripe = await getUncachableStripeClient();
    const methods = await stripe.paymentMethods.list({
      customer: member.stripeCustomerId,
      type: "card",
    });

    const customer = await stripe.customers.retrieve(member.stripeCustomerId) as Stripe.Customer;
    const defaultPmId = typeof customer.invoice_settings?.default_payment_method === "string"
      ? customer.invoice_settings.default_payment_method
      : customer.invoice_settings?.default_payment_method?.id;

    return methods.data.map((pm) => ({
      id: pm.id,
      brand: pm.card?.brand || "unknown",
      last4: pm.card?.last4 || "****",
      expMonth: pm.card?.exp_month,
      expYear: pm.card?.exp_year,
      isDefault: pm.id === defaultPmId,
    }));
  }

  async setDefaultPaymentMethod(memberId: number, gymId: number, paymentMethodId: string): Promise<void> {
    const [member] = await db.select().from(membersTable).where(and(eq(membersTable.id, memberId), eq(membersTable.gymId, gymId)));
    if (!member?.stripeCustomerId) throw new Error("Member has no Stripe customer");

    const stripe = await getUncachableStripeClient();
    await stripe.customers.update(member.stripeCustomerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });
  }

  async detachPaymentMethod(memberId: number, gymId: number, paymentMethodId: string): Promise<void> {
    const [member] = await db.select().from(membersTable).where(and(eq(membersTable.id, memberId), eq(membersTable.gymId, gymId)));
    if (!member?.stripeCustomerId) throw new Error("Member has no Stripe customer");

    const stripe = await getUncachableStripeClient();
    const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
    if (pm.customer !== member.stripeCustomerId) throw new Error("Payment method does not belong to this member");
    await stripe.paymentMethods.detach(paymentMethodId);
  }

  async createStripeSubscription(
    memberId: number,
    gymId: number,
    planId: number,
    paymentMethodId?: string,
    actor?: ActorInfo
  ): Promise<any> {
    const [member] = await db.select().from(membersTable).where(and(eq(membersTable.id, memberId), eq(membersTable.gymId, gymId)));
    if (!member) throw new Error("Member not found");

    const [plan] = await db.select().from(membershipPlansTable).where(and(eq(membershipPlansTable.id, planId), eq(membershipPlansTable.gymId, gymId)));
    if (!plan) throw new Error("Plan not found");

    if (plan.billingInterval === "one_time") {
      const result = await this.createOneTimeCharge(
        memberId, gymId, parseFloat(plan.price),
        `${plan.name} — one-time purchase`, paymentMethodId, actor
      );
      return { ...result, isOneTime: true, planName: plan.name };
    }

    const billingMemberId = member.linkedBillingMemberId || memberId;
    const customerId = await this.getOrCreateCustomer(billingMemberId, gymId);

    const stripe = await getUncachableStripeClient();

    if (paymentMethodId) {
      await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });
    }

    let stripePriceId = plan.stripePriceId;

    if (!stripePriceId) {
      let stripeProductId = plan.stripeProductId;
      if (!stripeProductId) {
        const product = await stripe.products.create({
          name: plan.name,
          description: plan.description || undefined,
          metadata: { gymId: String(gymId), planId: String(planId) },
        });
        stripeProductId = product.id;
      }

      const intervalMap: Record<string, "month" | "quarter" | "year"> = {
        monthly: "month",
        quarterly: "month",
        annual: "year",
      };
      const interval = (intervalMap[plan.billingInterval] || "month") as Stripe.PriceCreateParams.Recurring.Interval;
      const intervalCount = plan.billingInterval === "quarterly" ? 3 : 1;

      const price = await stripe.prices.create({
        product: stripeProductId,
        unit_amount: Math.round(parseFloat(plan.price) * 100),
        currency: "usd",
        recurring: { interval, interval_count: intervalCount },
      });
      stripePriceId = price.id;

      await db.update(membershipPlansTable).set({
        stripeProductId,
        stripePriceId,
      }).where(eq(membershipPlansTable.id, planId));
    }

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: stripePriceId }],
      payment_behavior: paymentMethodId ? "allow_incomplete" : "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
      metadata: { gymId: String(gymId), memberId: String(memberId), planId: String(planId) },
    });

    const today = new Date().toISOString().split("T")[0];

    const subStatus = subscription.status === "active" ? "active" : "pending";
    const [localSub] = await db.insert(subscriptionsTable).values({
      gymId,
      memberId,
      memberName: `${member.firstName} ${member.lastName}`,
      planId,
      planName: plan.name,
      status: subStatus,
      amount: plan.price,
      failedPayments: 0,
      stripeSubscriptionId: subscription.id,
      stripePriceId: stripePriceId,
      currentPeriodStart: today,
    }).returning();

    if (subscription.status === "active") {
      await db.update(membersTable).set({ membershipType: plan.name, status: "active" }).where(eq(membersTable.id, memberId));
    }

    await billingAuditLogger.log({
      gymId,
      memberId,
      actorUserId: actor?.userId,
      actorName: actor?.name,
      action: "subscription.created",
      entityType: "subscription",
      entityId: String(localSub.id),
      amount: parseFloat(plan.price),
      source: actor?.source || "ui",
      afterValue: { planName: plan.name, status: subStatus, stripeId: subscription.id },
    });

    return {
      ...localSub,
      amount: parseFloat(localSub.amount),
      stripeStatus: subscription.status,
      clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret || null,
    };
  }

  async cancelSubscription(subscriptionId: number, gymId: number, cancelAtPeriodEnd: boolean = true, reason?: string, actor?: ActorInfo): Promise<any> {
    const [sub] = await db.select().from(subscriptionsTable).where(and(eq(subscriptionsTable.id, subscriptionId), eq(subscriptionsTable.gymId, gymId)));
    if (!sub) throw new Error("Subscription not found");

    if (sub.status === "cancelled") throw new Error("Subscription is already cancelled");

    if (sub.stripeSubscriptionId) {
      const stripe = await getUncachableStripeClient();
      if (cancelAtPeriodEnd) {
        await stripe.subscriptions.update(sub.stripeSubscriptionId, {
          cancel_at_period_end: true,
        });
      } else {
        await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
      }
    }

    const newStatus = cancelAtPeriodEnd ? "cancel_at_period_end" : "cancelled";
    const cancelledAt = cancelAtPeriodEnd ? (sub.cancelledAt || new Date()) : new Date();

    const [updated] = await db.update(subscriptionsTable).set({
      status: newStatus,
      cancelledAt,
      cancelReason: reason || null,
    }).where(eq(subscriptionsTable.id, subscriptionId)).returning();

    if (!cancelAtPeriodEnd) {
      await db.update(membersTable).set({ status: "cancelled" }).where(eq(membersTable.id, sub.memberId));
    }

    await billingAuditLogger.log({
      gymId,
      memberId: sub.memberId,
      actorUserId: actor?.userId,
      actorName: actor?.name,
      action: "subscription.cancelled",
      entityType: "subscription",
      entityId: String(subscriptionId),
      amount: parseFloat(sub.amount),
      reason,
      source: actor?.source || "ui",
      beforeValue: { status: sub.status },
      afterValue: { status: newStatus, cancelAtPeriodEnd },
    });

    return { ...updated, amount: parseFloat(updated.amount) };
  }

  async pauseSubscription(subscriptionId: number, gymId: number, actor?: ActorInfo): Promise<any> {
    const [sub] = await db.select().from(subscriptionsTable).where(and(eq(subscriptionsTable.id, subscriptionId), eq(subscriptionsTable.gymId, gymId)));
    if (!sub) throw new Error("Subscription not found");

    if (sub.status !== "active") throw new Error("Only active subscriptions can be paused");

    if (sub.stripeSubscriptionId) {
      const stripe = await getUncachableStripeClient();
      await stripe.subscriptions.update(sub.stripeSubscriptionId, {
        pause_collection: { behavior: "void" },
      });
    }

    const [updated] = await db.update(subscriptionsTable).set({ status: "paused" }).where(eq(subscriptionsTable.id, subscriptionId)).returning();
    await db.update(membersTable).set({ status: "hold" }).where(eq(membersTable.id, sub.memberId));

    await billingAuditLogger.log({
      gymId,
      memberId: sub.memberId,
      actorUserId: actor?.userId,
      actorName: actor?.name,
      action: "subscription.paused",
      entityType: "subscription",
      entityId: String(subscriptionId),
      amount: parseFloat(sub.amount),
      source: actor?.source || "ui",
      beforeValue: { status: "active" },
      afterValue: { status: "paused" },
    });

    return { ...updated, amount: parseFloat(updated.amount) };
  }

  async resumeSubscription(subscriptionId: number, gymId: number, actor?: ActorInfo): Promise<any> {
    const [sub] = await db.select().from(subscriptionsTable).where(and(eq(subscriptionsTable.id, subscriptionId), eq(subscriptionsTable.gymId, gymId)));
    if (!sub) throw new Error("Subscription not found");

    if (sub.status !== "paused" && sub.status !== "cancel_at_period_end") {
      throw new Error("Subscription cannot be resumed from current status");
    }

    if (sub.stripeSubscriptionId) {
      const stripe = await getUncachableStripeClient();
      await stripe.subscriptions.update(sub.stripeSubscriptionId, {
        pause_collection: null as any,
        cancel_at_period_end: false,
      });
    }

    const [updated] = await db.update(subscriptionsTable).set({
      status: "active",
      cancelledAt: null,
      cancelReason: null,
    }).where(eq(subscriptionsTable.id, subscriptionId)).returning();
    await db.update(membersTable).set({ status: "active" }).where(eq(membersTable.id, sub.memberId));

    await billingAuditLogger.log({
      gymId,
      memberId: sub.memberId,
      actorUserId: actor?.userId,
      actorName: actor?.name,
      action: "subscription.resumed",
      entityType: "subscription",
      entityId: String(subscriptionId),
      amount: parseFloat(sub.amount),
      source: actor?.source || "ui",
      beforeValue: { status: sub.status },
      afterValue: { status: "active" },
    });

    return { ...updated, amount: parseFloat(updated.amount) };
  }

  async createOneTimeCharge(
    memberId: number,
    gymId: number,
    amount: number,
    description: string,
    paymentMethodId?: string,
    actor?: ActorInfo
  ): Promise<any> {
    if (amount <= 0) throw new Error("Amount must be positive");
    if (amount > 10000) throw new Error("Amount exceeds maximum allowed charge");

    const [member] = await db.select().from(membersTable).where(and(eq(membersTable.id, memberId), eq(membersTable.gymId, gymId)));
    if (!member) throw new Error("Member not found");

    const billingMemberId = member.linkedBillingMemberId || memberId;
    const customerId = await this.getOrCreateCustomer(billingMemberId, gymId);
    const stripe = await getUncachableStripeClient();

    const piParams: any = {
      amount: Math.round(amount * 100),
      currency: "usd",
      customer: customerId,
      description,
      metadata: { gymId: String(gymId), memberId: String(memberId) },
    };

    if (paymentMethodId) {
      piParams.payment_method = paymentMethodId;
      piParams.confirm = true;
      piParams.off_session = true;
    }

    const paymentIntent = await stripe.paymentIntents.create(piParams);

    const [payment] = await db.insert(paymentsTable).values({
      gymId,
      memberId,
      memberName: `${member.firstName} ${member.lastName}`,
      amount: String(amount),
      type: "one_time",
      status: paymentIntent.status === "succeeded" ? "succeeded" : "pending",
      description,
      stripePaymentIntentId: paymentIntent.id,
    }).returning();

    await billingAuditLogger.log({
      gymId,
      memberId,
      actorUserId: actor?.userId,
      actorName: actor?.name,
      action: "charge.created",
      entityType: "payment",
      entityId: String(payment.id),
      amount,
      source: actor?.source || "ui",
      afterValue: { description, status: payment.status, stripeId: paymentIntent.id },
    });

    return {
      ...payment,
      amount: parseFloat(payment.amount),
      clientSecret: paymentIntent.client_secret,
      stripeStatus: paymentIntent.status,
    };
  }

  async refundPayment(paymentId: number, gymId: number, amount?: number, reason?: string, actor?: ActorInfo): Promise<any> {
    const [payment] = await db.select().from(paymentsTable).where(and(eq(paymentsTable.id, paymentId), eq(paymentsTable.gymId, gymId)));
    if (!payment) throw new Error("Payment not found");
    if (!payment.stripePaymentIntentId) throw new Error("No Stripe payment to refund");
    if (payment.status !== "succeeded") throw new Error("Can only refund succeeded payments");

    const refundAmount = amount || parseFloat(payment.amount);
    if (refundAmount <= 0) throw new Error("Refund amount must be positive");
    if (refundAmount > parseFloat(payment.amount)) throw new Error("Refund amount exceeds payment amount");

    const stripe = await getUncachableStripeClient();
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripePaymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined,
      reason: "requested_by_customer",
    });

    const [member] = await db.select().from(membersTable).where(eq(membersTable.id, payment.memberId));
    const { refundsTable } = await import("@workspace/db");

    const [localRefund] = await db.insert(refundsTable).values({
      gymId,
      memberId: payment.memberId,
      memberName: member ? `${member.firstName} ${member.lastName}` : payment.memberName,
      amount: String(refundAmount),
      reason: reason || null,
      status: refund.status || "succeeded",
      paymentId,
      stripeRefundId: refund.id,
    }).returning();

    await billingAuditLogger.log({
      gymId,
      memberId: payment.memberId,
      actorUserId: actor?.userId,
      actorName: actor?.name,
      action: "refund.issued",
      entityType: "refund",
      entityId: String(localRefund.id),
      amount: refundAmount,
      reason,
      source: actor?.source || "ui",
      afterValue: { stripeRefundId: refund.id, status: refund.status },
    });

    return { ...localRefund, amount: parseFloat(localRefund.amount) };
  }

  async getMemberBillingHistory(memberId: number, gymId: number): Promise<any> {
    const subs = await db.select().from(subscriptionsTable).where(and(eq(subscriptionsTable.memberId, memberId), eq(subscriptionsTable.gymId, gymId)));
    const payments = await db.select().from(paymentsTable).where(and(eq(paymentsTable.memberId, memberId), eq(paymentsTable.gymId, gymId)));
    const invoices = await db.select().from(invoicesTable).where(and(eq(invoicesTable.memberId, memberId), eq(invoicesTable.gymId, gymId)));

    return {
      subscriptions: subs.map((s) => ({ ...s, amount: parseFloat(s.amount) })),
      payments: payments.map((p) => ({ ...p, amount: parseFloat(p.amount) })),
      invoices: invoices.map((i) => ({ ...i, amount: parseFloat(i.amount) })),
    };
  }
}

export const stripeService = new StripeService();
