import { Router, type IRouter } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { db, subscriptionsTable, membersTable, scheduledHoldsTable, gymsTable } from "@workspace/db";
import { getStripeClient } from "../../stripeClient";
import { requireBillingPermission, requireBillingRead } from "../../middlewares/billingRbac";
import { billingAuditLogger } from "../../billingAuditLogger";
import { parseGymId, paramStr } from "./helpers";

const router: IRouter = Router();

router.get("/gyms/:gymId/members/:memberId/holds", requireBillingRead(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }
  const memberId = parseInt(paramStr(req.params.memberId), 10);
  const holds = await db.select().from(scheduledHoldsTable)
    .where(and(eq(scheduledHoldsTable.gymId, gymId), eq(scheduledHoldsTable.memberId, memberId)))
    .orderBy(desc(scheduledHoldsTable.createdAt));
  res.json(holds);
});

router.post("/gyms/:gymId/members/:memberId/holds", requireBillingPermission("billing.create_subscription"), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }
  const memberId = parseInt(paramStr(req.params.memberId), 10);
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
  const holdId = parseInt(paramStr(req.params.holdId), 10);
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
  const holdId = parseInt(paramStr(req.params.holdId), 10);

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
  const memberId = parseInt(paramStr(req.params.memberId), 10);

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
