import { Router, type IRouter } from "express";
import { eq, and, count, desc } from "drizzle-orm";
import { db, membershipPlansTable, subscriptionsTable, invoicesTable, membersTable } from "@workspace/db";
import { CreateMembershipPlanBody, CreateSubscriptionBody, UpdateSubscriptionBody } from "@workspace/api-zod";

const router: IRouter = Router();

function parseGymId(params: any): number | null {
  const raw = Array.isArray(params.gymId) ? params.gymId[0] : params.gymId;
  const id = parseInt(raw, 10);
  return isNaN(id) ? null : id;
}

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
