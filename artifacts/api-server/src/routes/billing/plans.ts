import { Router, type IRouter } from "express";
import { eq, and, count } from "drizzle-orm";
import { db, membershipPlansTable, subscriptionsTable, gymsTable, gymStaffTable } from "@workspace/db";
import { CreateMembershipPlanBody } from "@workspace/api-zod";
import { getPublishableKey } from "../../stripeClient";
import { requireBillingPermission, requireBillingRead, getPermissionsForRole } from "../../middlewares/billingRbac";
import { billingAuditLogger } from "../../billingAuditLogger";
import { parseGymId } from "./helpers";

const router: IRouter = Router();

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

router.patch("/gyms/:gymId/plans/:planId", requireBillingPermission("billing.edit_plan"), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const planId = parseInt(String(req.params.planId), 10);
  if (!gymId || isNaN(planId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const { name, price, description, billingInterval, isActive } = req.body;
  const updates: Record<string, any> = {};
  if (name !== undefined) updates.name = name;
  if (price !== undefined) updates.price = String(price);
  if (description !== undefined) updates.description = description;
  if (billingInterval !== undefined) updates.billingInterval = billingInterval;
  if (isActive !== undefined) updates.isActive = isActive;

  if (Object.keys(updates).length === 0) { res.status(400).json({ error: "No fields to update" }); return; }

  const [existing] = await db.select().from(membershipPlansTable)
    .where(and(eq(membershipPlansTable.id, planId), eq(membershipPlansTable.gymId, gymId)));
  if (!existing) { res.status(404).json({ error: "Plan not found" }); return; }

  const [updated] = await db.update(membershipPlansTable).set(updates)
    .where(and(eq(membershipPlansTable.id, planId), eq(membershipPlansTable.gymId, gymId)))
    .returning();

  await billingAuditLogger.log({
    gymId,
    actorUserId: req.user?.id,
    actorName: req.user?.firstName || "Unknown",
    action: "plan.updated",
    entityType: "plan",
    entityId: String(planId),
    source: "ui",
    beforeValue: { name: existing.name, price: existing.price, interval: existing.billingInterval, isActive: existing.isActive },
    afterValue: { name: updated.name, price: updated.price, interval: updated.billingInterval, isActive: updated.isActive },
  });

  const [memberCountResult] = await db.select({ count: count() }).from(subscriptionsTable)
    .where(and(eq(subscriptionsTable.planId, planId), eq(subscriptionsTable.status, "active")));

  res.json({ ...updated, price: parseFloat(updated.price), memberCount: Number(memberCountResult?.count ?? 0) });
});

export default router;
