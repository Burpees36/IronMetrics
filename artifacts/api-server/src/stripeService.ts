import { getUncachableStripeClient } from "./stripeClient";
import { db, membersTable, subscriptionsTable, membershipPlansTable, invoicesTable, paymentsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

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

    return methods.data.map((pm) => ({
      id: pm.id,
      brand: pm.card?.brand || "unknown",
      last4: pm.card?.last4 || "****",
      expMonth: pm.card?.exp_month,
      expYear: pm.card?.exp_year,
    }));
  }

  async createStripeSubscription(
    memberId: number,
    gymId: number,
    planId: number,
    paymentMethodId?: string
  ): Promise<any> {
    const customerId = await this.getOrCreateCustomer(memberId, gymId);
    const [plan] = await db.select().from(membershipPlansTable).where(and(eq(membershipPlansTable.id, planId), eq(membershipPlansTable.gymId, gymId)));
    if (!plan) throw new Error("Plan not found");

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
      const interval = intervalMap[plan.billingInterval] || "month";
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
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
      metadata: { gymId: String(gymId), memberId: String(memberId), planId: String(planId) },
    });

    const [member] = await db.select().from(membersTable).where(eq(membersTable.id, memberId));
    const today = new Date().toISOString().split("T")[0];

    const [localSub] = await db.insert(subscriptionsTable).values({
      gymId,
      memberId,
      memberName: `${member.firstName} ${member.lastName}`,
      planId,
      planName: plan.name,
      status: subscription.status === "active" ? "active" : "pending",
      amount: plan.price,
      failedPayments: 0,
      stripeSubscriptionId: subscription.id,
      stripePriceId: stripePriceId,
      currentPeriodStart: today,
    }).returning();

    await db.update(membersTable).set({ membershipType: plan.name, status: "active" }).where(eq(membersTable.id, memberId));

    return {
      ...localSub,
      amount: parseFloat(localSub.amount),
      stripeStatus: subscription.status,
      clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret || null,
    };
  }

  async cancelSubscription(subscriptionId: number, gymId: number, cancelAtPeriodEnd: boolean = true, reason?: string): Promise<any> {
    const [sub] = await db.select().from(subscriptionsTable).where(and(eq(subscriptionsTable.id, subscriptionId), eq(subscriptionsTable.gymId, gymId)));
    if (!sub) throw new Error("Subscription not found");

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
    const [updated] = await db.update(subscriptionsTable).set({
      status: newStatus,
      cancelledAt: new Date(),
      cancelReason: reason || null,
    }).where(eq(subscriptionsTable.id, subscriptionId)).returning();

    if (!cancelAtPeriodEnd) {
      await db.update(membersTable).set({ status: "cancelled" }).where(eq(membersTable.id, sub.memberId));
    }

    return { ...updated, amount: parseFloat(updated.amount) };
  }

  async pauseSubscription(subscriptionId: number, gymId: number): Promise<any> {
    const [sub] = await db.select().from(subscriptionsTable).where(and(eq(subscriptionsTable.id, subscriptionId), eq(subscriptionsTable.gymId, gymId)));
    if (!sub) throw new Error("Subscription not found");

    if (sub.stripeSubscriptionId) {
      const stripe = await getUncachableStripeClient();
      await stripe.subscriptions.update(sub.stripeSubscriptionId, {
        pause_collection: { behavior: "void" },
      });
    }

    const [updated] = await db.update(subscriptionsTable).set({ status: "paused" }).where(eq(subscriptionsTable.id, subscriptionId)).returning();
    await db.update(membersTable).set({ status: "hold" }).where(eq(membersTable.id, sub.memberId));

    return { ...updated, amount: parseFloat(updated.amount) };
  }

  async resumeSubscription(subscriptionId: number, gymId: number): Promise<any> {
    const [sub] = await db.select().from(subscriptionsTable).where(and(eq(subscriptionsTable.id, subscriptionId), eq(subscriptionsTable.gymId, gymId)));
    if (!sub) throw new Error("Subscription not found");

    if (sub.stripeSubscriptionId) {
      const stripe = await getUncachableStripeClient();
      await stripe.subscriptions.update(sub.stripeSubscriptionId, {
        pause_collection: null as any,
        cancel_at_period_end: false,
      });
    }

    const [updated] = await db.update(subscriptionsTable).set({ status: "active" }).where(eq(subscriptionsTable.id, subscriptionId)).returning();
    await db.update(membersTable).set({ status: "active" }).where(eq(membersTable.id, sub.memberId));

    return { ...updated, amount: parseFloat(updated.amount) };
  }

  async createOneTimeCharge(
    memberId: number,
    gymId: number,
    amount: number,
    description: string,
    paymentMethodId?: string
  ): Promise<any> {
    const customerId = await this.getOrCreateCustomer(memberId, gymId);
    const stripe = await getUncachableStripeClient();
    const [member] = await db.select().from(membersTable).where(eq(membersTable.id, memberId));

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

    return {
      ...payment,
      amount: parseFloat(payment.amount),
      clientSecret: paymentIntent.client_secret,
      stripeStatus: paymentIntent.status,
    };
  }

  async refundPayment(paymentId: number, gymId: number, amount?: number, reason?: string): Promise<any> {
    const [payment] = await db.select().from(paymentsTable).where(and(eq(paymentsTable.id, paymentId), eq(paymentsTable.gymId, gymId)));
    if (!payment) throw new Error("Payment not found");
    if (!payment.stripePaymentIntentId) throw new Error("No Stripe payment to refund");

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
      amount: String(amount || parseFloat(payment.amount)),
      reason: reason || null,
      status: refund.status || "succeeded",
      paymentId,
      stripeRefundId: refund.id,
    }).returning();

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
