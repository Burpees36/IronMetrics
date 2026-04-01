import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, membershipPlansTable, subscriptionsTable, membersTable } from "@workspace/db";
import { CreateSubscriptionBody, UpdateSubscriptionBody } from "@workspace/api-zod";
import { stripeService } from "../../stripeService";
import { getStripeClient } from "../../stripeClient";
import { requireBillingPermission, requireBillingRead } from "../../middlewares/billingRbac";
import { billingAuditLogger } from "../../billingAuditLogger";
import { parseGymId, paramStr, getActor } from "./helpers";

const router: IRouter = Router();

router.get("/gyms/:gymId/subscriptions", requireBillingRead(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  let conditions: any[] = [eq(subscriptionsTable.gymId, gymId)];
  if (req.query.status) conditions.push(eq(subscriptionsTable.status, req.query.status as string));

  const subs = await db
    .select({
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

  const updateData: Record<string, any> = { ...parsed.data };
  if (parsed.data.status === "cancelled") {
    updateData.cancelledAt = new Date();
    updateData.cancelReason = updateData.cancelReason || "Cancelled by staff";
  }

  const [sub] = await db.update(subscriptionsTable).set(updateData).where(and(eq(subscriptionsTable.id, subId), eq(subscriptionsTable.gymId, gymId))).returning();
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

router.post("/gyms/:gymId/subscriptions/:subscriptionId/change-plan", requireBillingPermission("billing.create_subscription"), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }
  const subscriptionId = parseInt(paramStr(req.params.subscriptionId), 10);
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
  const subscriptionId = parseInt(paramStr(req.params.subscriptionId), 10);
  const { newPlanId } = req.body;
  if (!newPlanId) { res.status(400).json({ error: "newPlanId required" }); return; }
  try {
    const result = await stripeService.previewPlanChange(subscriptionId, gymId, parseInt(String(newPlanId), 10));
    res.json(result);
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

export default router;
