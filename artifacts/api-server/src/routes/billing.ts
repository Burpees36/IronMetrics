import { Router, type IRouter } from "express";
import { eq, and, count, desc, sql, gte, lt } from "drizzle-orm";
import { db, membershipPlansTable, subscriptionsTable, invoicesTable, membersTable, paymentsTable, refundsTable } from "@workspace/db";
import { CreateMembershipPlanBody, CreateSubscriptionBody, UpdateSubscriptionBody } from "@workspace/api-zod";
import { stripeService } from "../stripeService";
import { getPublishableKey } from "../stripeClient";

const router: IRouter = Router();

function parseGymId(params: any): number | null {
  const raw = Array.isArray(params.gymId) ? params.gymId[0] : params.gymId;
  const id = parseInt(raw, 10);
  return isNaN(id) ? null : id;
}

router.get("/gyms/:gymId/stripe/publishable-key", async (_req, res): Promise<void> => {
  try {
    const key = await getPublishableKey();
    res.json({ publishableKey: key });
  } catch (err: any) {
    res.status(500).json({ error: "Stripe not configured" });
  }
});

router.get("/gyms/:gymId/plans", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const plans = await db.select().from(membershipPlansTable).where(eq(membershipPlansTable.gymId, gymId));

  const plansWithCounts = await Promise.all(
    plans.map(async (p) => {
      const [memberCountResult] = await db
        .select({ count: count() })
        .from(subscriptionsTable)
        .where(and(eq(subscriptionsTable.planId, p.id), eq(subscriptionsTable.status, "active")));
      return { ...p, price: parseFloat(p.price), memberCount: memberCountResult?.count ?? 0 };
    })
  );

  res.json(plansWithCounts);
});

router.post("/gyms/:gymId/plans", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const parsed = CreateMembershipPlanBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [plan] = await db.insert(membershipPlansTable).values({
    ...parsed.data,
    gymId,
    price: String(parsed.data.price),
  }).returning();

  res.status(201).json({ ...plan, price: parseFloat(plan.price), memberCount: 0 });
});

router.get("/gyms/:gymId/subscriptions", async (req, res): Promise<void> => {
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

router.post("/gyms/:gymId/subscriptions", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const parsed = CreateSubscriptionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [member] = await db.select().from(membersTable).where(eq(membersTable.id, parsed.data.memberId));
  if (!member) { res.status(404).json({ error: "Member not found" }); return; }

  const [plan] = await db.select().from(membershipPlansTable).where(eq(membershipPlansTable.id, parsed.data.planId));
  if (!plan) { res.status(404).json({ error: "Plan not found" }); return; }

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
    currentPeriodStart: parsed.data.startDate || today,
  }).returning();

  await db.update(membersTable).set({ membershipType: plan.name, status: "active" }).where(eq(membersTable.id, parsed.data.memberId));

  res.status(201).json({ ...sub, amount: parseFloat(sub.amount) });
});

router.patch("/gyms/:gymId/subscriptions/:subscriptionId", async (req, res): Promise<void> => {
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

router.post("/gyms/:gymId/members/:memberId/setup-intent", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const memberId = parseInt(req.params.memberId, 10);
  if (!gymId || isNaN(memberId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  try {
    const result = await stripeService.createSetupIntent(memberId, gymId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/gyms/:gymId/members/:memberId/payment-methods", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const memberId = parseInt(req.params.memberId, 10);
  if (!gymId || isNaN(memberId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  try {
    const methods = await stripeService.listPaymentMethods(memberId, gymId);
    res.json(methods);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/gyms/:gymId/members/:memberId/stripe-subscription", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const memberId = parseInt(req.params.memberId, 10);
  if (!gymId || isNaN(memberId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const { planId, paymentMethodId } = req.body;
  if (!planId) { res.status(400).json({ error: "planId is required" }); return; }

  try {
    const result = await stripeService.createStripeSubscription(memberId, gymId, planId, paymentMethodId);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/gyms/:gymId/subscriptions/:subscriptionId/cancel", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const subId = parseInt(req.params.subscriptionId, 10);
  if (!gymId || isNaN(subId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const { cancelAtPeriodEnd = true, reason } = req.body;

  try {
    const result = await stripeService.cancelSubscription(subId, gymId, cancelAtPeriodEnd, reason);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/gyms/:gymId/subscriptions/:subscriptionId/pause", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const subId = parseInt(req.params.subscriptionId, 10);
  if (!gymId || isNaN(subId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  try {
    const result = await stripeService.pauseSubscription(subId, gymId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/gyms/:gymId/subscriptions/:subscriptionId/resume", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const subId = parseInt(req.params.subscriptionId, 10);
  if (!gymId || isNaN(subId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  try {
    const result = await stripeService.resumeSubscription(subId, gymId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/gyms/:gymId/members/:memberId/charge", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const memberId = parseInt(req.params.memberId, 10);
  if (!gymId || isNaN(memberId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const { amount, description, paymentMethodId } = req.body;
  if (!amount || !description) { res.status(400).json({ error: "amount and description required" }); return; }

  try {
    const result = await stripeService.createOneTimeCharge(memberId, gymId, parseFloat(amount), description, paymentMethodId);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/gyms/:gymId/payments/:paymentId/refund", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const paymentId = parseInt(req.params.paymentId, 10);
  if (!gymId || isNaN(paymentId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const { amount, reason } = req.body;

  try {
    const result = await stripeService.refundPayment(paymentId, gymId, amount ? parseFloat(amount) : undefined, reason);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/gyms/:gymId/members/:memberId/billing-history", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const memberId = parseInt(req.params.memberId, 10);
  if (!gymId || isNaN(memberId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  try {
    const result = await stripeService.getMemberBillingHistory(memberId, gymId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/gyms/:gymId/payments", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const payments = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.gymId, gymId))
    .orderBy(desc(paymentsTable.createdAt));

  res.json(payments.map((p) => ({ ...p, amount: parseFloat(p.amount) })));
});

router.get("/gyms/:gymId/refunds", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const refunds = await db
    .select()
    .from(refundsTable)
    .where(eq(refundsTable.gymId, gymId))
    .orderBy(desc(refundsTable.createdAt));

  res.json(refunds.map((r) => ({ ...r, amount: parseFloat(r.amount) })));
});

router.get("/gyms/:gymId/cancelled-members", async (req, res): Promise<void> => {
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
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    endDate = new Date(now.getFullYear(), now.getMonth(), 1);
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

  const lostRevenue = cancelledSubs.reduce((sum, s) => sum + parseFloat(s.amount), 0);

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

router.get("/gyms/:gymId/billing-summary", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const activeSubs = await db
    .select()
    .from(subscriptionsTable)
    .where(and(eq(subscriptionsTable.gymId, gymId), eq(subscriptionsTable.status, "active")));

  const allSubs = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.gymId, gymId));

  const failedPaymentSubs = allSubs.filter((s) => s.failedPayments > 0);
  const overdueSubs = allSubs.filter((s) => s.status === "past_due");

  const mrr = activeSubs.reduce((sum, s) => sum + parseFloat(s.amount), 0);
  const arm = activeSubs.length > 0 ? mrr / activeSubs.length : 0;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const monthPayments = await db
    .select()
    .from(paymentsTable)
    .where(and(
      eq(paymentsTable.gymId, gymId),
      gte(paymentsTable.createdAt, monthStart),
      eq(paymentsTable.status, "succeeded"),
    ));

  const collectionsThisMonth = monthPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

  const monthRefunds = await db
    .select()
    .from(refundsTable)
    .where(and(
      eq(refundsTable.gymId, gymId),
      gte(refundsTable.createdAt, monthStart),
    ));

  const refundsThisMonth = monthRefunds.reduce((sum, r) => sum + parseFloat(r.amount), 0);

  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const cancelledThisMonth = allSubs.filter((s) =>
    s.cancelledAt && s.cancelledAt >= thisMonthStart
  );

  res.json({
    mrr,
    arr: mrr * 12,
    arm,
    activeSubscriptions: activeSubs.length,
    totalSubscriptions: allSubs.length,
    failedPayments: failedPaymentSubs.length,
    overdueAccounts: overdueSubs.length,
    collectionsThisMonth,
    refundsThisMonth,
    cancelledThisMonth: cancelledThisMonth.length,
  });
});

router.get("/gyms/:gymId/invoices", async (req, res): Promise<void> => {
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

export default router;
