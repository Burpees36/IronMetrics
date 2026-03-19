import { Router, type IRouter } from "express";
import { eq, and, count, desc, sql, gte, lt, inArray } from "drizzle-orm";
import { db, membershipPlansTable, subscriptionsTable, invoicesTable, membersTable, paymentsTable, refundsTable, billingAuditLogsTable, billingWebhookEventsTable, billingEventsTable, gymsTable, gymStaffTable, scheduledHoldsTable, discountCodesTable } from "@workspace/db";
import { CreateMembershipPlanBody, CreateSubscriptionBody, UpdateSubscriptionBody } from "@workspace/api-zod";
import { stripeService } from "../stripeService";
import { getPublishableKey, getStripeClient } from "../stripeClient";
import { requireBillingPermission, requireBillingRead, getPermissionsForRole } from "../middlewares/billingRbac";
import { computeBillingSummary } from "../billingMetrics";
import { billingAuditLogger } from "../billingAuditLogger";

const router: IRouter = Router();

function parseGymId(params: any): number | null {
  const raw = Array.isArray(params.gymId) ? params.gymId[0] : params.gymId;
  const id = parseInt(raw, 10);
  return isNaN(id) ? null : id;
}

function getActor(req: any) {
  return {
    userId: req.user?.id,
    name: req.user?.username || req.user?.name || undefined,
    source: "ui" as const,
  };
}

router.get("/gyms/:gymId/stripe/publishable-key", async (_req, res): Promise<void> => {
  try {
    const key = await getPublishableKey();
    res.json({ publishableKey: key });
  } catch (err: any) {
    res.status(500).json({ error: "Stripe not configured" });
  }
});

router.get("/gyms/:gymId/billing/permissions", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) {
    res.json({ role: null, permissions: [] });
    return;
  }

  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const userId = req.user!.id;
  const [gym] = await db.select().from(gymsTable).where(eq(gymsTable.id, gymId));
  let role: string | null = null;

  if (gym && gym.ownerId === userId) {
    role = "owner";
  } else {
    const [staff] = await db.select().from(gymStaffTable)
      .where(and(eq(gymStaffTable.userId, userId), eq(gymStaffTable.gymId, gymId), eq(gymStaffTable.isActive, true)));
    role = staff?.role || null;
  }

  const perms = role ? getPermissionsForRole(role) : [];
  res.json({ role, permissions: perms });
});

router.get("/gyms/:gymId/plans", requireBillingRead(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const plans = await db.select().from(membershipPlansTable).where(eq(membershipPlansTable.gymId, gymId));

  const plansWithCounts = await Promise.all(
    plans.map(async (p) => {
      const [memberCountResult] = await db
        .select({ count: count() })
        .from(subscriptionsTable)
        .where(and(eq(subscriptionsTable.planId, p.id), eq(subscriptionsTable.status, "active")));
      return { ...p, price: parseFloat(p.price), memberCount: Number(memberCountResult?.count ?? 0) };
    })
  );

  res.json(plansWithCounts);
});

router.post("/gyms/:gymId/plans", requireBillingPermission("billing.create_plan"), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const parsed = CreateMembershipPlanBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [plan] = await db.insert(membershipPlansTable).values({
    ...parsed.data,
    gymId,
    price: String(parsed.data.price),
  }).returning();

  await billingAuditLogger.log({
    gymId,
    actorUserId: req.user?.id,
    actorName: req.user?.firstName || "Unknown",
    action: "plan.created",
    entityType: "plan",
    entityId: String(plan.id),
    amount: parseFloat(plan.price),
    source: "ui",
    afterValue: { name: plan.name, price: plan.price, interval: plan.billingInterval },
  });

  res.status(201).json({ ...plan, price: parseFloat(plan.price), memberCount: 0 });
});

router.get("/gyms/:gymId/subscriptions", requireBillingRead(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  let conditions: any[] = [eq(subscriptionsTable.gymId, gymId)];
  if (req.query.status) conditions.push(eq(subscriptionsTable.status, req.query.status as string));

  const subs = await db
    .select()
    .from(subscriptionsTable)
    .where(conditions.length === 1 ? conditions[0] : and(...conditions))
    .orderBy(desc(subscriptionsTable.createdAt));

  res.json(subs.map((s) => ({ ...s, amount: parseFloat(s.amount) })));
});

router.post("/gyms/:gymId/subscriptions", requireBillingPermission("billing.create_subscription"), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const parsed = CreateSubscriptionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [member] = await db.select().from(membersTable).where(and(eq(membersTable.id, parsed.data.memberId), eq(membersTable.gymId, gymId)));
  if (!member) { res.status(404).json({ error: "Member not found in this gym" }); return; }

  const [plan] = await db.select().from(membershipPlansTable).where(and(eq(membershipPlansTable.id, parsed.data.planId), eq(membershipPlansTable.gymId, gymId)));
  if (!plan) { res.status(404).json({ error: "Plan not found in this gym" }); return; }

  const today = new Date().toISOString().split("T")[0];
  const [sub] = await db.insert(subscriptionsTable).values({
    gymId,
    memberId: parsed.data.memberId,
    memberName: `${member.firstName} ${member.lastName}`,
    planId: parsed.data.planId,
    planName: plan.name,
    status: "active",
    amount: plan.price,
    failedPayments: 0,
    currentPeriodStart: parsed.data.startDate ? (typeof parsed.data.startDate === 'string' ? parsed.data.startDate : (parsed.data.startDate as Date).toISOString().split('T')[0]) : today,
  }).returning();

  await db.update(membersTable).set({ membershipType: plan.name, status: "active" }).where(eq(membersTable.id, parsed.data.memberId));

  await billingAuditLogger.log({
    gymId,
    memberId: parsed.data.memberId,
    actorUserId: req.user?.id,
    actorName: req.user?.firstName || "Unknown",
    action: "subscription.created",
    entityType: "subscription",
    entityId: String(sub.id),
    amount: parseFloat(plan.price),
    source: "ui",
    afterValue: { planName: plan.name, status: "active" },
  });

  res.status(201).json({ ...sub, amount: parseFloat(sub.amount) });
});

router.patch("/gyms/:gymId/subscriptions/:subscriptionId", requireBillingPermission("billing.cancel_subscription"), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const raw = Array.isArray(req.params.subscriptionId) ? req.params.subscriptionId[0] : req.params.subscriptionId;
  const subId = parseInt(raw, 10);
  if (!gymId || isNaN(subId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const parsed = UpdateSubscriptionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [sub] = await db.update(subscriptionsTable).set(parsed.data).where(and(eq(subscriptionsTable.id, subId), eq(subscriptionsTable.gymId, gymId))).returning();
  if (!sub) { res.status(404).json({ error: "Subscription not found" }); return; }

  if (parsed.data.status === "cancelled") {
    await db.update(membersTable).set({ status: "cancelled" }).where(eq(membersTable.id, sub.memberId));
  } else if (parsed.data.status === "paused") {
    await db.update(membersTable).set({ status: "hold" }).where(eq(membersTable.id, sub.memberId));
  } else if (parsed.data.status === "active") {
    await db.update(membersTable).set({ status: "active" }).where(eq(membersTable.id, sub.memberId));
  }

  res.json({ ...sub, amount: parseFloat(sub.amount) });
});

router.post("/gyms/:gymId/onboarding/setup-intent", requireBillingPermission("billing.create_subscription"), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const { email, name } = req.body;
  if (!email) { res.status(400).json({ error: "Email is required" }); return; }

  try {
    const stripe = await getStripeClient();
    const customer = await stripe.customers.create({
      email,
      name: name || undefined,
      metadata: { gymId: String(gymId), source: "onboarding" },
    });

    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ["card", "us_bank_account"],
    });

    res.json({
      clientSecret: setupIntent.client_secret!,
      customerId: customer.id,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create setup intent";
    res.status(400).json({ error: message });
  }
});

router.get("/gyms/:gymId/payment-methods/:paymentMethodId", requireBillingRead(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const pmId = req.params.paymentMethodId;
  if (!pmId) { res.status(400).json({ error: "Payment method ID is required" }); return; }

  try {
    const stripe = await getStripeClient();
    const pm = await stripe.paymentMethods.retrieve(pmId);
    if (pm.customer) {
      const customerId = typeof pm.customer === "string" ? pm.customer : pm.customer.id;
      const customer = await stripe.customers.retrieve(customerId);
      if (!customer.deleted) {
        const meta = (customer as { metadata?: Record<string, string> }).metadata || {};
        if (meta.gymId && meta.gymId !== String(gymId)) {
          res.status(403).json({ error: "Payment method does not belong to this gym" });
          return;
        }
      }
    }
    res.json({
      brand: pm.card?.brand || "card",
      last4: pm.card?.last4 || "****",
      expMonth: pm.card?.exp_month,
      expYear: pm.card?.exp_year,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to retrieve payment method";
    res.status(400).json({ error: message });
  }
});

router.post("/gyms/:gymId/members/:memberId/setup-intent", requireBillingPermission("billing.create_subscription"), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const memberId = parseInt(String(req.params.memberId), 10);
  if (!gymId || isNaN(memberId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  try {
    const result = await stripeService.createSetupIntent(memberId, gymId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/gyms/:gymId/members/:memberId/payment-methods", requireBillingRead(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const memberId = parseInt(String(req.params.memberId), 10);
  if (!gymId || isNaN(memberId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  try {
    const methods = await stripeService.listPaymentMethods(memberId, gymId);
    res.json(methods);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/gyms/:gymId/members/:memberId/payment-methods/:paymentMethodId/set-default", requireBillingPermission("billing.create_subscription"), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const memberId = parseInt(String(req.params.memberId), 10);
  const paymentMethodId = req.params.paymentMethodId;
  if (!gymId || isNaN(memberId) || !paymentMethodId) { res.status(400).json({ error: "Invalid IDs" }); return; }

  try {
    await stripeService.setDefaultPaymentMethod(memberId, gymId, paymentMethodId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/gyms/:gymId/members/:memberId/payment-methods/:paymentMethodId", requireBillingPermission("billing.create_subscription"), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const memberId = parseInt(String(req.params.memberId), 10);
  const paymentMethodId = req.params.paymentMethodId;
  if (!gymId || isNaN(memberId) || !paymentMethodId) { res.status(400).json({ error: "Invalid IDs" }); return; }

  try {
    await stripeService.detachPaymentMethod(memberId, gymId, paymentMethodId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/gyms/:gymId/members/:memberId/stripe-subscription", requireBillingPermission("billing.create_subscription"), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const memberId = parseInt(String(req.params.memberId), 10);
  if (!gymId || isNaN(memberId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const { planId, paymentMethodId } = req.body;
  if (!planId) { res.status(400).json({ error: "planId is required" }); return; }

  try {
    const result = await stripeService.createStripeSubscription(memberId, gymId, planId, paymentMethodId, getActor(req));
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/gyms/:gymId/subscriptions/:subscriptionId/cancel", requireBillingPermission("billing.cancel_subscription"), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const subId = parseInt(String(req.params.subscriptionId), 10);
  if (!gymId || isNaN(subId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const { cancelAtPeriodEnd = true, reason } = req.body;

  try {
    const result = await stripeService.cancelSubscription(subId, gymId, cancelAtPeriodEnd, reason, getActor(req));
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/gyms/:gymId/subscriptions/:subscriptionId/pause", requireBillingPermission("billing.pause_subscription"), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const subId = parseInt(String(req.params.subscriptionId), 10);
  if (!gymId || isNaN(subId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  try {
    const result = await stripeService.pauseSubscription(subId, gymId, getActor(req));
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/gyms/:gymId/subscriptions/:subscriptionId/resume", requireBillingPermission("billing.resume_subscription"), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const subId = parseInt(String(req.params.subscriptionId), 10);
  if (!gymId || isNaN(subId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  try {
    const result = await stripeService.resumeSubscription(subId, gymId, getActor(req));
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/gyms/:gymId/members/:memberId/charge", requireBillingPermission("billing.create_charge"), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const memberId = parseInt(String(req.params.memberId), 10);
  if (!gymId || isNaN(memberId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const { amount, description, paymentMethodId } = req.body;
  if (!amount || !description) { res.status(400).json({ error: "amount and description required" }); return; }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) { res.status(400).json({ error: "Amount must be a positive number" }); return; }

  try {
    const result = await stripeService.createOneTimeCharge(memberId, gymId, parsedAmount, description, paymentMethodId, getActor(req));
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/gyms/:gymId/payments/:paymentId/refund", requireBillingPermission("billing.issue_refund"), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const paymentId = parseInt(String(req.params.paymentId), 10);
  if (!gymId || isNaN(paymentId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const { amount, reason } = req.body;

  try {
    const result = await stripeService.refundPayment(paymentId, gymId, amount ? parseFloat(amount) : undefined, reason, getActor(req));
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/gyms/:gymId/members/:memberId/billing-history", requireBillingRead(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const memberId = parseInt(String(req.params.memberId), 10);
  if (!gymId || isNaN(memberId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  try {
    const result = await stripeService.getMemberBillingHistory(memberId, gymId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/gyms/:gymId/payments", requireBillingRead(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const payments = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.gymId, gymId))
    .orderBy(desc(paymentsTable.createdAt));

  res.json(payments.map((p) => ({ ...p, amount: parseFloat(p.amount) })));
});

router.get("/gyms/:gymId/refunds", requireBillingRead(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const refunds = await db
    .select()
    .from(refundsTable)
    .where(eq(refundsTable.gymId, gymId))
    .orderBy(desc(refundsTable.createdAt));

  res.json(refunds.map((r) => ({ ...r, amount: parseFloat(r.amount) })));
});

router.get("/gyms/:gymId/cancelled-members", requireBillingRead(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const { month, year } = req.query;

  let startDate: Date;
  let endDate: Date;

  if (month && year) {
    const m = parseInt(month as string, 10) - 1;
    const y = parseInt(year as string, 10);
    startDate = new Date(y, m, 1);
    endDate = new Date(y, m + 1, 1);
  } else {
    const now = new Date();
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }

  const cancelledSubs = await db
    .select({
      subscriptionId: subscriptionsTable.id,
      memberId: subscriptionsTable.memberId,
      memberName: subscriptionsTable.memberName,
      planName: subscriptionsTable.planName,
      amount: subscriptionsTable.amount,
      cancelledAt: subscriptionsTable.cancelledAt,
      cancelReason: subscriptionsTable.cancelReason,
      status: subscriptionsTable.status,
    })
    .from(subscriptionsTable)
    .where(and(
      eq(subscriptionsTable.gymId, gymId),
      gte(subscriptionsTable.cancelledAt, startDate),
      lt(subscriptionsTable.cancelledAt, endDate),
    ))
    .orderBy(desc(subscriptionsTable.cancelledAt));

  const cancelledMembers = await db
    .select()
    .from(membersTable)
    .where(and(
      eq(membersTable.gymId, gymId),
      eq(membersTable.status, "cancelled"),
    ))
    .orderBy(desc(membersTable.updatedAt));

  const lostRevenue = cancelledSubs.reduce((sum, s) => sum + parseFloat(s.amount || "0"), 0);

  res.json({
    cancelledSubscriptions: cancelledSubs.map((s) => ({ ...s, amount: parseFloat(s.amount) })),
    cancelledMembers: cancelledMembers.map((m) => ({
      id: m.id,
      firstName: m.firstName,
      lastName: m.lastName,
      email: m.email,
      phone: m.phone,
      membershipType: m.membershipType,
      joinDate: m.joinDate,
      updatedAt: m.updatedAt,
    })),
    lostRevenue,
    period: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
  });
});

router.get("/gyms/:gymId/billing-summary", requireBillingRead(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  try {
    const summary = await computeBillingSummary(gymId);
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to compute billing summary" });
  }
});

router.get("/gyms/:gymId/billing/audit-logs", requireBillingPermission("billing.view_audit_logs"), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
  const offset = parseInt(req.query.offset as string) || 0;
  const memberId = req.query.memberId ? parseInt(req.query.memberId as string) : undefined;
  const action = req.query.action as string | undefined;

  const logs = await billingAuditLogger.getAuditLogs(gymId, { limit, offset, memberId, action });
  res.json(logs);
});

router.get("/gyms/:gymId/billing/webhook-events", requireBillingPermission("billing.view_audit_logs"), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);

  const gymEventIds = db
    .select({ stripeEventId: billingEventsTable.stripeEventId })
    .from(billingEventsTable)
    .where(and(eq(billingEventsTable.gymId, gymId), sql`${billingEventsTable.stripeEventId} IS NOT NULL`));

  const events = await db
    .select({
      id: billingWebhookEventsTable.id,
      stripeEventId: billingWebhookEventsTable.stripeEventId,
      eventType: billingWebhookEventsTable.eventType,
      status: billingWebhookEventsTable.status,
      processingError: billingWebhookEventsTable.processingError,
      processedAt: billingWebhookEventsTable.processedAt,
      createdAt: billingWebhookEventsTable.createdAt,
    })
    .from(billingWebhookEventsTable)
    .where(inArray(billingWebhookEventsTable.stripeEventId, gymEventIds))
    .orderBy(desc(billingWebhookEventsTable.createdAt))
    .limit(limit);

  res.json(events);
});

router.get("/gyms/:gymId/invoices", requireBillingRead(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  let conditions: any[] = [eq(invoicesTable.gymId, gymId)];
  if (req.query.memberId) conditions.push(eq(invoicesTable.memberId, parseInt(req.query.memberId as string, 10)));
  if (req.query.status) conditions.push(eq(invoicesTable.status, req.query.status as string));

  const invoices = await db
    .select()
    .from(invoicesTable)
    .where(conditions.length === 1 ? conditions[0] : and(...conditions))
    .orderBy(desc(invoicesTable.createdAt));

  res.json(invoices.map((i) => ({ ...i, amount: parseFloat(i.amount) })));
});

router.post("/gyms/:gymId/subscriptions/:subscriptionId/change-plan", requireBillingPermission("billing.create_subscription"), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }
  const subscriptionId = parseInt(req.params.subscriptionId, 10);
  const { newPlanId, timing } = req.body;
  if (!newPlanId || !["immediate", "next_cycle"].includes(timing)) {
    res.status(400).json({ error: "newPlanId and timing (immediate|next_cycle) required" }); return;
  }
  try {
    const result = await stripeService.changePlan(subscriptionId, gymId, parseInt(String(newPlanId), 10), timing, getActor(req));
    res.json(result);
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.post("/gyms/:gymId/subscriptions/:subscriptionId/preview-change", requireBillingRead(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }
  const subscriptionId = parseInt(req.params.subscriptionId, 10);
  const { newPlanId } = req.body;
  if (!newPlanId) { res.status(400).json({ error: "newPlanId required" }); return; }
  try {
    const result = await stripeService.previewPlanChange(subscriptionId, gymId, parseInt(String(newPlanId), 10));
    res.json(result);
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.get("/gyms/:gymId/members/:memberId/stripe-invoices", requireBillingRead(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }
  const memberId = parseInt(req.params.memberId, 10);
  try {
    const invoices = await stripeService.getMemberStripeInvoices(memberId, gymId);
    res.json(invoices);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/gyms/:gymId/discount-codes", requireBillingRead(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }
  const codes = await db.select().from(discountCodesTable)
    .where(eq(discountCodesTable.gymId, gymId)).orderBy(desc(discountCodesTable.createdAt));
  res.json(codes.map(c => ({ ...c, amount: parseFloat(c.amount) })));
});

router.post("/gyms/:gymId/discount-codes", requireBillingPermission("billing.create_plan"), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }
  const { name, code, type, amount, duration, durationInMonths, maxRedemptions, expiresAt } = req.body;
  if (!name || !code || !type || !amount) { res.status(400).json({ error: "name, code, type, amount required" }); return; }
  if (!["percentage", "fixed"].includes(type)) { res.status(400).json({ error: "type must be percentage or fixed" }); return; }
  try {
    const result = await stripeService.createDiscountCode(gymId, {
      name, code, type, amount: parseFloat(amount),
      duration: duration || "once", durationInMonths, maxRedemptions,
      expiresAt: expiresAt || undefined,
    }, getActor(req));
    res.status(201).json(result);
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.patch("/gyms/:gymId/discount-codes/:id", requireBillingPermission("billing.create_plan"), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }
  const id = parseInt(req.params.id, 10);
  const { isActive } = req.body;
  const [updated] = await db.update(discountCodesTable)
    .set({ isActive: !!isActive })
    .where(and(eq(discountCodesTable.id, id), eq(discountCodesTable.gymId, gymId)))
    .returning();
  if (!updated) { res.status(404).json({ error: "Discount not found" }); return; }
  await billingAuditLogger.log({
    gymId, actorUserId: req.user?.id, actorName: req.user?.firstName || "Unknown",
    action: isActive ? "discount.reactivated" : "discount.deactivated",
    entityType: "discount", entityId: String(id), source: "ui",
  });
  res.json({ ...updated, amount: parseFloat(updated.amount) });
});

router.post("/gyms/:gymId/subscriptions/:subscriptionId/apply-discount", requireBillingPermission("billing.create_subscription"), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }
  const subscriptionId = parseInt(req.params.subscriptionId, 10);
  const { discountId } = req.body;
  if (!discountId) { res.status(400).json({ error: "discountId required" }); return; }
  try {
    const result = await stripeService.applyDiscountToSubscription(subscriptionId, gymId, parseInt(String(discountId), 10), getActor(req));
    res.json(result);
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.delete("/gyms/:gymId/subscriptions/:subscriptionId/discount", requireBillingPermission("billing.create_subscription"), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }
  const subscriptionId = parseInt(req.params.subscriptionId, 10);
  try {
    const result = await stripeService.removeDiscountFromSubscription(subscriptionId, gymId, getActor(req));
    res.json(result);
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.get("/gyms/:gymId/members/:memberId/balance", requireBillingRead(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }
  const memberId = parseInt(req.params.memberId, 10);
  try {
    const balance = await stripeService.getMemberBalance(memberId, gymId);
    res.json({ balance });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/gyms/:gymId/members/:memberId/balance", requireBillingPermission("billing.create_subscription"), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }
  const memberId = parseInt(req.params.memberId, 10);
  const { amount, description } = req.body;
  if (!amount || !description) { res.status(400).json({ error: "amount and description required" }); return; }
  try {
    const result = await stripeService.adjustMemberBalance(memberId, gymId, parseFloat(amount), description, getActor(req));
    res.json(result);
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.get("/gyms/:gymId/tax-config", requireBillingRead(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }
  const [gym] = await db.select().from(gymsTable).where(eq(gymsTable.id, gymId));
  if (!gym) { res.status(404).json({ error: "Gym not found" }); return; }
  res.json({
    taxEnabled: gym.taxEnabled, taxLabel: gym.taxLabel,
    taxRate: gym.taxRate ? parseFloat(gym.taxRate) : 0,
    taxJurisdiction: gym.taxJurisdiction, stripeTaxRateId: gym.stripeTaxRateId,
  });
});

router.post("/gyms/:gymId/tax-config", requireBillingPermission("billing.create_plan"), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }
  const { taxLabel, taxRate, taxJurisdiction } = req.body;
  if (!taxLabel || taxRate === undefined) { res.status(400).json({ error: "taxLabel and taxRate required" }); return; }
  try {
    const result = await stripeService.createOrUpdateTaxRate(gymId, { taxLabel, taxRate: parseFloat(taxRate), taxJurisdiction }, getActor(req));
    res.json(result);
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.delete("/gyms/:gymId/tax-config", requireBillingPermission("billing.create_plan"), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }
  try {
    const result = await stripeService.disableTax(gymId, getActor(req));
    res.json(result);
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.get("/gyms/:gymId/members/:memberId/holds", requireBillingRead(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }
  const memberId = parseInt(req.params.memberId, 10);
  const holds = await db.select().from(scheduledHoldsTable)
    .where(and(eq(scheduledHoldsTable.gymId, gymId), eq(scheduledHoldsTable.memberId, memberId)))
    .orderBy(desc(scheduledHoldsTable.createdAt));
  res.json(holds);
});

router.post("/gyms/:gymId/members/:memberId/holds", requireBillingPermission("billing.create_subscription"), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }
  const memberId = parseInt(req.params.memberId, 10);
  const { subscriptionId, startDate, endDate, reason } = req.body;
  if (!subscriptionId || !startDate) { res.status(400).json({ error: "subscriptionId and startDate required" }); return; }
  if (endDate && endDate <= startDate) { res.status(400).json({ error: "endDate must be after startDate" }); return; }

  const [sub] = await db.select().from(subscriptionsTable)
    .where(and(eq(subscriptionsTable.id, parseInt(String(subscriptionId), 10)), eq(subscriptionsTable.gymId, gymId)));
  if (!sub) { res.status(404).json({ error: "Subscription not found" }); return; }
  if (sub.status === "cancelled") { res.status(400).json({ error: "Cannot hold a cancelled subscription" }); return; }

  const existing = await db.select().from(scheduledHoldsTable)
    .where(and(
      eq(scheduledHoldsTable.memberId, memberId), eq(scheduledHoldsTable.gymId, gymId),
      sql`${scheduledHoldsTable.status} IN ('scheduled', 'active')`
    ));
  if (existing.length > 0) { res.status(400).json({ error: "Member already has an active or scheduled hold" }); return; }

  const today = new Date().toISOString().split("T")[0];
  const isImmediate = startDate <= today;

  const [hold] = await db.insert(scheduledHoldsTable).values({
    gymId, memberId, subscriptionId: parseInt(String(subscriptionId), 10),
    status: isImmediate ? "active" : "scheduled",
    startDate, endDate: endDate || null, reason: reason || null,
    createdBy: req.user?.id, createdByName: req.user?.firstName || "Staff",
    ...(isImmediate ? { activatedAt: new Date() } : {}),
  }).returning();

  if (isImmediate && sub.stripeSubscriptionId) {
    try {
      const stripe = await getStripeClient();
      await stripe.subscriptions.update(sub.stripeSubscriptionId, {
        pause_collection: { behavior: "void" },
      });
      await db.update(subscriptionsTable).set({ status: "on_hold" })
        .where(eq(subscriptionsTable.id, sub.id));
      await db.update(membersTable).set({ status: "hold" })
        .where(eq(membersTable.id, memberId));
    } catch (err: any) {
      console.error(`[billing] Error pausing subscription for hold:`, err.message);
      await db.update(scheduledHoldsTable).set({ status: "scheduled" }).where(eq(scheduledHoldsTable.id, hold.id));
      res.status(500).json({ error: "Failed to pause subscription in Stripe" }); return;
    }
  }

  await billingAuditLogger.log({
    gymId, memberId, actorUserId: req.user?.id, actorName: req.user?.firstName || "Unknown",
    action: isImmediate ? "hold.started" : "hold.scheduled",
    entityType: "hold", entityId: String(hold.id), source: "ui",
    afterValue: { startDate, endDate, reason, status: hold.status },
  });

  res.status(201).json(hold);
});

router.patch("/gyms/:gymId/holds/:holdId", requireBillingPermission("billing.create_subscription"), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }
  const holdId = parseInt(req.params.holdId, 10);
  const { endDate, reason } = req.body;

  const [hold] = await db.select().from(scheduledHoldsTable)
    .where(and(eq(scheduledHoldsTable.id, holdId), eq(scheduledHoldsTable.gymId, gymId)));
  if (!hold) { res.status(404).json({ error: "Hold not found" }); return; }
  if (hold.status !== "scheduled" && hold.status !== "active") {
    res.status(400).json({ error: "Can only edit scheduled or active holds" }); return;
  }

  const updates: any = {};
  if (endDate !== undefined) updates.endDate = endDate;
  if (reason !== undefined) updates.reason = reason;

  const [updated] = await db.update(scheduledHoldsTable).set(updates)
    .where(eq(scheduledHoldsTable.id, holdId)).returning();

  await billingAuditLogger.log({
    gymId, memberId: hold.memberId, actorUserId: req.user?.id, actorName: req.user?.firstName || "Unknown",
    action: "hold.updated", entityType: "hold", entityId: String(holdId), source: "ui",
    beforeValue: { endDate: hold.endDate, reason: hold.reason },
    afterValue: { endDate: updated.endDate, reason: updated.reason },
  });

  res.json(updated);
});

router.post("/gyms/:gymId/holds/:holdId/cancel", requireBillingPermission("billing.create_subscription"), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }
  const holdId = parseInt(req.params.holdId, 10);

  const [hold] = await db.select().from(scheduledHoldsTable)
    .where(and(eq(scheduledHoldsTable.id, holdId), eq(scheduledHoldsTable.gymId, gymId)));
  if (!hold) { res.status(404).json({ error: "Hold not found" }); return; }
  if (hold.status !== "scheduled" && hold.status !== "active") {
    res.status(400).json({ error: "Can only cancel scheduled or active holds" }); return;
  }

  if (hold.status === "active") {
    const [sub] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.id, hold.subscriptionId));
    if (sub?.stripeSubscriptionId) {
      try {
        const stripe = await getStripeClient();
        await stripe.subscriptions.update(sub.stripeSubscriptionId, { pause_collection: null });
        await db.update(subscriptionsTable).set({ status: "active" }).where(eq(subscriptionsTable.id, sub.id));
        await db.update(membersTable).set({ status: "active" }).where(eq(membersTable.id, hold.memberId));
      } catch (err: any) {
        console.error(`[billing] Error resuming subscription for hold ${holdId}:`, err.message);
        res.status(500).json({ error: "Failed to resume subscription in Stripe" }); return;
      }
    }
  }

  const [updated] = await db.update(scheduledHoldsTable)
    .set({ status: "cancelled", cancelledAt: new Date() })
    .where(eq(scheduledHoldsTable.id, holdId)).returning();

  await billingAuditLogger.log({
    gymId, memberId: hold.memberId, actorUserId: req.user?.id, actorName: req.user?.firstName || "Unknown",
    action: "hold.cancelled", entityType: "hold", entityId: String(holdId), source: "ui",
    afterValue: { previousStatus: hold.status },
  });

  res.json(updated);
});

router.get("/gyms/:gymId/members/:memberId/checkin-status", requireBillingRead(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }
  const memberId = parseInt(req.params.memberId, 10);

  const [member] = await db.select().from(membersTable)
    .where(and(eq(membersTable.id, memberId), eq(membersTable.gymId, gymId)));
  if (!member) { res.status(404).json({ error: "Member not found" }); return; }

  const activeHolds = await db.select().from(scheduledHoldsTable)
    .where(and(
      eq(scheduledHoldsTable.memberId, memberId), eq(scheduledHoldsTable.gymId, gymId),
      eq(scheduledHoldsTable.status, "active")
    ));

  if (activeHolds.length > 0) {
    res.json({ allowed: false, reason: "Member is on hold", holdId: activeHolds[0].id });
    return;
  }

  const { billingRecoveryTable } = await import("@workspace/db");
  const activeRecovery = await db.select().from(billingRecoveryTable)
    .where(and(
      eq(billingRecoveryTable.memberId, memberId), eq(billingRecoveryTable.gymId, gymId),
      eq(billingRecoveryTable.status, "active")
    ));

  if (activeRecovery.length > 0) {
    const [gym] = await db.select().from(gymsTable).where(eq(gymsTable.id, gymId));
    const policy = gym?.pastDuePolicy || "grace_period";

    if (policy === "strict") {
      res.json({ allowed: false, reason: "Payment past due — check-in blocked" });
      return;
    }

    const recovery = activeRecovery[0];
    if (recovery.graceDeadline && new Date(recovery.graceDeadline) < new Date()) {
      res.json({ allowed: false, reason: "Grace period expired — payment required before check-in" });
      return;
    }

    res.json({ allowed: true, warning: "Payment past due — grace period active" });
    return;
  }

  res.json({ allowed: true });
});

export default router;
