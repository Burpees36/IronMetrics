import Stripe from "stripe";
import { getUncachableStripeClient } from "./stripeClient";
import { db, membersTable, subscriptionsTable, membershipPlansTable, invoicesTable, paymentsTable, gymsTable, discountCodesTable } from "@workspace/db";
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
      const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
      if (!pm.customer || pm.customer !== customerId) {
        await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
      }
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

    const [gym] = await db.select().from(gymsTable).where(eq(gymsTable.id, gymId));
    const subParams: any = {
      customer: customerId,
      items: [{ price: stripePriceId }],
      payment_behavior: paymentMethodId ? "allow_incomplete" : "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
      metadata: { gymId: String(gymId), memberId: String(memberId), planId: String(planId) },
    };
    if (gym?.taxEnabled && gym?.stripeTaxRateId) {
      subParams.default_tax_rates = [gym.stripeTaxRateId];
    }

    const subscription = await stripe.subscriptions.create(subParams);

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
    const subs = await db.select({
      id: subscriptionsTable.id,
      gymId: subscriptionsTable.gymId,
      memberId: subscriptionsTable.memberId,
      memberName: subscriptionsTable.memberName,
      planId: subscriptionsTable.planId,
      planName: subscriptionsTable.planName,
      status: subscriptionsTable.status,
      amount: subscriptionsTable.amount,
      failedPayments: subscriptionsTable.failedPayments,
      stripeSubscriptionId: subscriptionsTable.stripeSubscriptionId,
      stripePriceId: subscriptionsTable.stripePriceId,
      currentPeriodStart: subscriptionsTable.currentPeriodStart,
      currentPeriodEnd: subscriptionsTable.currentPeriodEnd,
      cancelledAt: subscriptionsTable.cancelledAt,
      cancelReason: subscriptionsTable.cancelReason,
      createdAt: subscriptionsTable.createdAt,
      updatedAt: subscriptionsTable.updatedAt,
      billingInterval: membershipPlansTable.billingInterval,
    })
      .from(subscriptionsTable)
      .leftJoin(membershipPlansTable, eq(subscriptionsTable.planId, membershipPlansTable.id))
      .where(and(eq(subscriptionsTable.memberId, memberId), eq(subscriptionsTable.gymId, gymId)));
    const payments = await db.select().from(paymentsTable).where(and(eq(paymentsTable.memberId, memberId), eq(paymentsTable.gymId, gymId)));
    const invoices = await db.select().from(invoicesTable).where(and(eq(invoicesTable.memberId, memberId), eq(invoicesTable.gymId, gymId)));

    return {
      subscriptions: subs.map((s) => ({ ...s, amount: parseFloat(s.amount) })),
      payments: payments.map((p) => ({ ...p, amount: parseFloat(p.amount) })),
      invoices: invoices.map((i) => ({ ...i, amount: parseFloat(i.amount) })),
    };
  }

  async changePlan(
    subscriptionId: number, gymId: number, newPlanId: number,
    timing: "immediate" | "next_cycle", actor?: ActorInfo
  ): Promise<any> {
    const [sub] = await db.select().from(subscriptionsTable)
      .where(and(eq(subscriptionsTable.id, subscriptionId), eq(subscriptionsTable.gymId, gymId)));
    if (!sub) throw new Error("Subscription not found");
    if (!sub.stripeSubscriptionId) throw new Error("No Stripe subscription to modify");
    if (sub.status !== "active") throw new Error(`Cannot change plan while subscription is ${sub.status}`);
    if (sub.planId === newPlanId) throw new Error("Already on this plan");

    const [newPlan] = await db.select().from(membershipPlansTable)
      .where(and(eq(membershipPlansTable.id, newPlanId), eq(membershipPlansTable.gymId, gymId)));
    if (!newPlan) throw new Error("Target plan not found");
    if (!newPlan.isActive) throw new Error("Target plan is not active");
    if (newPlan.billingInterval === "one_time") throw new Error("Cannot switch to a one-time plan");

    const stripe = await getUncachableStripeClient();
    const stripeSub = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId);

    let newStripePriceId = newPlan.stripePriceId;
    if (!newStripePriceId) {
      let productId = newPlan.stripeProductId;
      if (!productId) {
        const product = await stripe.products.create({
          name: newPlan.name, description: newPlan.description || undefined,
          metadata: { gymId: String(gymId), planId: String(newPlanId) },
        });
        productId = product.id;
      }
      const intervalMap: Record<string, "month" | "year"> = { monthly: "month", quarterly: "month", annual: "year" };
      const interval = intervalMap[newPlan.billingInterval] || "month";
      const intervalCount = newPlan.billingInterval === "quarterly" ? 3 : 1;
      const price = await stripe.prices.create({
        product: productId, unit_amount: Math.round(parseFloat(newPlan.price) * 100),
        currency: "usd", recurring: { interval, interval_count: intervalCount },
      });
      newStripePriceId = price.id;
      await db.update(membershipPlansTable).set({ stripeProductId: productId, stripePriceId: newStripePriceId })
        .where(eq(membershipPlansTable.id, newPlanId));
    }

    const [gym] = await db.select().from(gymsTable).where(eq(gymsTable.id, gymId));
    const taxRateIds = gym?.stripeTaxRateId ? [gym.stripeTaxRateId] : [];

    const updateParams: Stripe.SubscriptionUpdateParams = {
      items: [{
        id: stripeSub.items.data[0].id,
        price: newStripePriceId,
        ...(taxRateIds.length ? { tax_rates: taxRateIds } : {}),
      }],
      proration_behavior: timing === "immediate" ? "create_prorations" : "none",
    };

    if (timing === "next_cycle") {
      updateParams.proration_behavior = "none";
      updateParams.billing_cycle_anchor = "unchanged";
    }

    const updated = await stripe.subscriptions.update(sub.stripeSubscriptionId, updateParams);

    const oldPlanName = sub.planName;
    await db.update(subscriptionsTable).set({
      planId: newPlanId, planName: newPlan.name,
      amount: newPlan.price, stripePriceId: newStripePriceId,
    }).where(eq(subscriptionsTable.id, subscriptionId));

    await billingAuditLogger.log({
      gymId, memberId: sub.memberId,
      actorUserId: actor?.userId, actorName: actor?.name,
      action: "plan.changed", entityType: "subscription", entityId: String(subscriptionId),
      amount: parseFloat(newPlan.price),
      source: actor?.source || "ui",
      beforeValue: { planId: sub.planId, planName: oldPlanName, amount: sub.amount },
      afterValue: { planId: newPlanId, planName: newPlan.name, amount: newPlan.price, timing },
    });

    let prorationPreview = null;
    if (timing === "immediate") {
      try {
        const upcomingInvoice = await stripe.invoices.createPreview({ subscription: sub.stripeSubscriptionId });
        prorationPreview = {
          amountDue: upcomingInvoice.amount_due / 100,
          credit: Math.abs(Math.min(0, upcomingInvoice.amount_due)) / 100,
        };
      } catch {}
    }

    return { success: true, oldPlan: oldPlanName, newPlan: newPlan.name, timing, prorationPreview };
  }

  async previewPlanChange(
    subscriptionId: number, gymId: number, newPlanId: number
  ): Promise<any> {
    const [sub] = await db.select().from(subscriptionsTable)
      .where(and(eq(subscriptionsTable.id, subscriptionId), eq(subscriptionsTable.gymId, gymId)));
    if (!sub || !sub.stripeSubscriptionId) throw new Error("Subscription not found");

    const [newPlan] = await db.select().from(membershipPlansTable)
      .where(and(eq(membershipPlansTable.id, newPlanId), eq(membershipPlansTable.gymId, gymId)));
    if (!newPlan) throw new Error("Target plan not found");

    let newStripePriceId = newPlan.stripePriceId;
    if (!newStripePriceId) return { currentAmount: parseFloat(sub.amount), newAmount: parseFloat(newPlan.price), prorationAmount: null };

    const stripe = await getUncachableStripeClient();
    const stripeSub = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId);

    try {
      const preview = await stripe.invoices.createPreview({
        subscription: sub.stripeSubscriptionId,
        subscription_details: {
          items: [{ id: stripeSub.items.data[0].id, price: newStripePriceId }],
          proration_behavior: "create_prorations",
        },
      });
      return {
        currentAmount: parseFloat(sub.amount), newAmount: parseFloat(newPlan.price),
        prorationAmount: preview.amount_due / 100,
        immediateCharge: preview.amount_due > 0 ? preview.amount_due / 100 : 0,
        credit: preview.amount_due < 0 ? Math.abs(preview.amount_due) / 100 : 0,
      };
    } catch {
      return { currentAmount: parseFloat(sub.amount), newAmount: parseFloat(newPlan.price), prorationAmount: null };
    }
  }

  async getMemberStripeInvoices(memberId: number, gymId: number): Promise<any[]> {
    const [member] = await db.select().from(membersTable)
      .where(and(eq(membersTable.id, memberId), eq(membersTable.gymId, gymId)));
    if (!member || !member.stripeCustomerId) return [];

    const stripe = await getUncachableStripeClient();
    const invoices = await stripe.invoices.list({ customer: member.stripeCustomerId, limit: 50 });

    return invoices.data.map(inv => ({
      id: inv.id,
      number: inv.number,
      date: inv.created ? new Date(inv.created * 1000).toISOString() : null,
      dueDate: inv.due_date ? new Date(inv.due_date * 1000).toISOString() : null,
      amount: (inv.status === "paid" ? (inv.amount_paid || inv.amount_due || 0) : (inv.amount_due || 0)) / 100,
      amountPaid: (inv.amount_paid || 0) / 100,
      status: inv.status,
      invoiceUrl: inv.hosted_invoice_url || null,
      invoicePdf: inv.invoice_pdf || null,
      description: inv.description || (inv.lines?.data?.[0]?.description) || null,
    }));
  }

  async createDiscountCode(gymId: number, data: {
    name: string; code: string; type: "percentage" | "fixed";
    amount: number; duration: "once" | "repeating" | "forever";
    durationInMonths?: number; maxRedemptions?: number; expiresAt?: string;
  }, actor?: ActorInfo): Promise<any> {
    if (data.amount <= 0) throw new Error("Discount amount must be positive");
    if (data.type === "percentage" && data.amount > 100) throw new Error("Percentage cannot exceed 100");

    const stripe = await getUncachableStripeClient();
    const couponParams: Stripe.CouponCreateParams = {
      name: data.name,
      duration: data.duration,
      metadata: { gymId: String(gymId), code: data.code },
    };
    if (data.type === "percentage") couponParams.percent_off = data.amount;
    else couponParams.amount_off = Math.round(data.amount * 100), couponParams.currency = "usd";
    if (data.duration === "repeating" && data.durationInMonths) couponParams.duration_in_months = data.durationInMonths;
    if (data.maxRedemptions) couponParams.max_redemptions = data.maxRedemptions;
    if (data.expiresAt) couponParams.redeem_by = Math.floor(new Date(data.expiresAt).getTime() / 1000);

    const coupon = await stripe.coupons.create(couponParams);

    const [discount] = await db.insert(discountCodesTable).values({
      gymId, name: data.name, code: data.code.toUpperCase(),
      type: data.type, amount: String(data.amount), duration: data.duration,
      durationInMonths: data.durationInMonths || null,
      maxRedemptions: data.maxRedemptions || null,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      stripeCouponId: coupon.id,
    }).returning();

    await billingAuditLogger.log({
      gymId, actorUserId: actor?.userId, actorName: actor?.name,
      action: "discount.created", entityType: "discount", entityId: String(discount.id),
      source: actor?.source || "ui",
      afterValue: { name: data.name, code: data.code, type: data.type, amount: data.amount },
    });

    return { ...discount, amount: parseFloat(discount.amount) };
  }

  async applyDiscountToSubscription(
    subscriptionId: number, gymId: number, discountId: number, actor?: ActorInfo
  ): Promise<any> {
    const [sub] = await db.select().from(subscriptionsTable)
      .where(and(eq(subscriptionsTable.id, subscriptionId), eq(subscriptionsTable.gymId, gymId)));
    if (!sub || !sub.stripeSubscriptionId) throw new Error("Subscription not found");

    const [discount] = await db.select().from(discountCodesTable)
      .where(and(eq(discountCodesTable.id, discountId), eq(discountCodesTable.gymId, gymId)));
    if (!discount || !discount.isActive) throw new Error("Discount not found or inactive");
    if (!discount.stripeCouponId) throw new Error("Discount has no Stripe coupon");
    if (discount.maxRedemptions && discount.timesRedeemed >= discount.maxRedemptions) throw new Error("Discount has reached max redemptions");
    if (discount.expiresAt && new Date(discount.expiresAt) < new Date()) throw new Error("Discount has expired");

    const stripe = await getUncachableStripeClient();
    await stripe.subscriptions.update(sub.stripeSubscriptionId, { discounts: [{ coupon: discount.stripeCouponId }] });

    await db.update(discountCodesTable)
      .set({ timesRedeemed: sql`${discountCodesTable.timesRedeemed} + 1` })
      .where(eq(discountCodesTable.id, discountId));

    await billingAuditLogger.log({
      gymId, memberId: sub.memberId, actorUserId: actor?.userId, actorName: actor?.name,
      action: "discount.applied", entityType: "subscription", entityId: String(subscriptionId),
      source: actor?.source || "ui",
      afterValue: { discountId, discountName: discount.name, code: discount.code },
    });

    return { success: true };
  }

  async removeDiscountFromSubscription(
    subscriptionId: number, gymId: number, actor?: ActorInfo
  ): Promise<any> {
    const [sub] = await db.select().from(subscriptionsTable)
      .where(and(eq(subscriptionsTable.id, subscriptionId), eq(subscriptionsTable.gymId, gymId)));
    if (!sub || !sub.stripeSubscriptionId) throw new Error("Subscription not found");

    const stripe = await getUncachableStripeClient();
    await stripe.subscriptions.deleteDiscount(sub.stripeSubscriptionId);

    await billingAuditLogger.log({
      gymId, memberId: sub.memberId, actorUserId: actor?.userId, actorName: actor?.name,
      action: "discount.removed", entityType: "subscription", entityId: String(subscriptionId),
      source: actor?.source || "ui",
    });

    return { success: true };
  }

  async adjustMemberBalance(
    memberId: number, gymId: number, amount: number, description: string, actor?: ActorInfo
  ): Promise<any> {
    const [member] = await db.select().from(membersTable)
      .where(and(eq(membersTable.id, memberId), eq(membersTable.gymId, gymId)));
    if (!member) throw new Error("Member not found");

    const customerId = await this.getOrCreateCustomer(memberId, gymId);
    const stripe = await getUncachableStripeClient();

    const balanceTransaction = await stripe.customers.createBalanceTransaction(customerId, {
      amount: Math.round(amount * -100),
      currency: "usd",
      description,
    });

    await billingAuditLogger.log({
      gymId, memberId, actorUserId: actor?.userId, actorName: actor?.name,
      action: amount > 0 ? "credit.added" : "credit.removed",
      entityType: "member", entityId: String(memberId),
      amount: Math.abs(amount), source: actor?.source || "ui",
      afterValue: { description, balanceChange: amount },
    });

    return { success: true, newBalance: balanceTransaction.ending_balance / -100 };
  }

  async getMemberBalance(memberId: number, gymId: number): Promise<number> {
    const [member] = await db.select().from(membersTable)
      .where(and(eq(membersTable.id, memberId), eq(membersTable.gymId, gymId)));
    if (!member || !member.stripeCustomerId) return 0;

    const stripe = await getUncachableStripeClient();
    const customer = await stripe.customers.retrieve(member.stripeCustomerId);
    if ((customer as any).deleted) return 0;
    return ((customer as any).balance || 0) / -100;
  }

  async createOrUpdateTaxRate(gymId: number, data: {
    taxLabel: string; taxRate: number; taxJurisdiction?: string;
  }, actor?: ActorInfo): Promise<any> {
    if (data.taxRate < 0 || data.taxRate > 100) throw new Error("Tax rate must be between 0 and 100");

    const stripe = await getUncachableStripeClient();
    const taxRate = await stripe.taxRates.create({
      display_name: data.taxLabel,
      percentage: data.taxRate,
      inclusive: false,
      jurisdiction: data.taxJurisdiction || undefined,
      metadata: { gymId: String(gymId) },
    });

    await db.update(gymsTable).set({
      taxEnabled: true,
      taxLabel: data.taxLabel,
      taxRate: String(data.taxRate),
      taxJurisdiction: data.taxJurisdiction || null,
      stripeTaxRateId: taxRate.id,
    }).where(eq(gymsTable.id, gymId));

    await billingAuditLogger.log({
      gymId, actorUserId: actor?.userId, actorName: actor?.name,
      action: "tax.configured", entityType: "gym", entityId: String(gymId),
      source: actor?.source || "ui",
      afterValue: { taxLabel: data.taxLabel, taxRate: data.taxRate, taxJurisdiction: data.taxJurisdiction },
    });

    return { success: true, stripeTaxRateId: taxRate.id };
  }

  async disableTax(gymId: number, actor?: ActorInfo): Promise<any> {
    await db.update(gymsTable).set({
      taxEnabled: false, stripeTaxRateId: null,
    }).where(eq(gymsTable.id, gymId));

    await billingAuditLogger.log({
      gymId, actorUserId: actor?.userId, actorName: actor?.name,
      action: "tax.disabled", entityType: "gym", entityId: String(gymId),
      source: actor?.source || "ui",
    });

    return { success: true };
  }
}

export const stripeService = new StripeService();
