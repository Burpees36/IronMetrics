import { Router, type IRouter } from "express";
import { eq, and, desc, gte, lt, sql, inArray, or, ne } from "drizzle-orm";
import { db, subscriptionsTable, membersTable, membershipPlansTable, invoicesTable, billingAuditLogsTable, billingWebhookEventsTable, billingEventsTable } from "@workspace/db";
import { requireBillingPermission, requireBillingRead } from "../../middlewares/billingRbac";
import { computeBillingSummary } from "../../billingMetrics";
import { billingAuditLogger } from "../../billingAuditLogger";
import { parseGymId } from "./helpers";

const router: IRouter = Router();

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

  const cancelledMemberRows = await db
    .select({
      id: membersTable.id,
      firstName: membersTable.firstName,
      lastName: membersTable.lastName,
      email: membersTable.email,
      phone: membersTable.phone,
      membershipType: membersTable.membershipType,
      joinDate: membersTable.joinDate,
      cancelledAt: sql<string>`MAX(${subscriptionsTable.cancelledAt})`.as("cancelled_at"),
    })
    .from(membersTable)
    .innerJoin(subscriptionsTable, and(
      eq(subscriptionsTable.memberId, membersTable.id),
      eq(subscriptionsTable.gymId, gymId),
      gte(subscriptionsTable.cancelledAt, startDate),
      lt(subscriptionsTable.cancelledAt, endDate),
    ))
    .where(eq(membersTable.gymId, gymId))
    .groupBy(membersTable.id)
    .orderBy(desc(sql`MAX(${subscriptionsTable.cancelledAt})`));

  const lostRevenue = cancelledSubs.reduce((sum, s) => sum + parseFloat(s.amount || "0"), 0);

  res.json({
    cancelledSubscriptions: cancelledSubs.map((s) => ({ ...s, amount: parseFloat(s.amount) })),
    cancelledMembers: cancelledMemberRows.map((m) => ({
      id: m.id,
      firstName: m.firstName,
      lastName: m.lastName,
      email: m.email,
      phone: m.phone,
      membershipType: m.membershipType,
      joinDate: m.joinDate,
      cancelledAt: m.cancelledAt,
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

router.get("/gyms/:gymId/dashboard/billing-payroll", requireBillingRead(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const today = new Date().toISOString().split("T")[0];

  const subs = await db
    .select({
      id: subscriptionsTable.id,
      memberId: subscriptionsTable.memberId,
      memberName: subscriptionsTable.memberName,
      planName: subscriptionsTable.planName,
      status: subscriptionsTable.status,
      amount: subscriptionsTable.amount,
      failedPayments: subscriptionsTable.failedPayments,
      currentPeriodEnd: subscriptionsTable.currentPeriodEnd,
      billingInterval: membershipPlansTable.billingInterval,
      email: membersTable.email,
      phone: membersTable.phone,
    })
    .from(subscriptionsTable)
    .leftJoin(membershipPlansTable, eq(subscriptionsTable.planId, membershipPlansTable.id))
    .leftJoin(membersTable, eq(subscriptionsTable.memberId, membersTable.id))
    .where(and(
      eq(subscriptionsTable.gymId, gymId),
      or(eq(subscriptionsTable.status, "active"), eq(subscriptionsTable.status, "past_due")),
    ))
    .orderBy(desc(subscriptionsTable.failedPayments), subscriptionsTable.currentPeriodEnd);

  const overdue = subs
    .filter((s) => s.status === "past_due" || s.failedPayments > 0)
    .map((s) => ({ ...s, amount: parseFloat(s.amount), category: "overdue" as const }));

  const upcoming = subs
    .filter((s) => s.status === "active" && s.failedPayments === 0)
    .sort((a, b) => {
      if (a.currentPeriodEnd && b.currentPeriodEnd) return a.currentPeriodEnd.localeCompare(b.currentPeriodEnd);
      if (a.currentPeriodEnd) return -1;
      if (b.currentPeriodEnd) return 1;
      return 0;
    })
    .map((s) => ({ ...s, amount: parseFloat(s.amount), category: "upcoming" as const }))
    .slice(0, 20);

  res.json({ overdue, upcoming });
});

router.get("/gyms/:gymId/dashboard/recent-cancellations", requireBillingRead(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const cancellations = await db
    .select({
      subscriptionId: subscriptionsTable.id,
      memberId: subscriptionsTable.memberId,
      memberName: subscriptionsTable.memberName,
      planName: subscriptionsTable.planName,
      amount: subscriptionsTable.amount,
      cancelledAt: subscriptionsTable.cancelledAt,
      cancelReason: subscriptionsTable.cancelReason,
      email: membersTable.email,
      phone: membersTable.phone,
    })
    .from(subscriptionsTable)
    .leftJoin(membersTable, eq(subscriptionsTable.memberId, membersTable.id))
    .where(and(
      eq(subscriptionsTable.gymId, gymId),
      gte(subscriptionsTable.cancelledAt, thirtyDaysAgo),
    ))
    .orderBy(desc(subscriptionsTable.cancelledAt));

  res.json({
    cancellations: cancellations.map((c) => ({ ...c, amount: parseFloat(c.amount) })),
    count: cancellations.length,
  });
});

export default router;
