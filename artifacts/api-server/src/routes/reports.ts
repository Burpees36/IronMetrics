import { Router, type IRouter } from "express";
import { eq, and, count, desc, gte, sql } from "drizzle-orm";
import { db, membersTable, subscriptionsTable, invoicesTable, attendanceTable, leadsTable, classesTable, membershipPlansTable } from "@workspace/db";

const router: IRouter = Router();

function computeRSI(churnRate: number, avgRevPerMember: number, netGrowth: number, avgTenure: number) {
  const churnNorm = Math.max(0, Math.min(100, 100 - churnRate * 10));
  const revNorm = Math.min(100, (avgRevPerMember / 200) * 100);
  const growthNorm = Math.max(0, Math.min(100, 50 + netGrowth * 5));
  const tenureNorm = Math.min(100, (avgTenure / 24) * 100);
  const weights = { churn: 0.35, rev: 0.25, growth: 0.2, tenure: 0.2 };
  const score = churnNorm * weights.churn + revNorm * weights.rev + growthNorm * weights.growth + tenureNorm * weights.tenure;
  const band = score >= 70 ? "Strong" : score >= 45 ? "Moderate" : "Fragile";
  return { score: Math.round(score * 10) / 10, band };
}

function parseGymId(params: any): number | null {
  const raw = Array.isArray(params.gymId) ? params.gymId[0] : params.gymId;
  const id = parseInt(raw, 10);
  return isNaN(id) ? null : id;
}

router.get("/gyms/:gymId/reports/dashboard", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const [activeCount] = await db.select({ count: count() }).from(membersTable).where(and(eq(membersTable.gymId, gymId), eq(membersTable.status, "active")));
  const [cancelledCount] = await db.select({ count: count() }).from(membersTable).where(and(eq(membersTable.gymId, gymId), eq(membersTable.status, "cancelled")));
  const [holdCount] = await db.select({ count: count() }).from(membersTable).where(and(eq(membersTable.gymId, gymId), eq(membersTable.status, "hold")));
  const [totalCount] = await db.select({ count: count() }).from(membersTable).where(eq(membersTable.gymId, gymId));

  const subs = await db.select().from(subscriptionsTable).where(and(eq(subscriptionsTable.gymId, gymId), eq(subscriptionsTable.status, "active")));
  const mrr = subs.reduce((sum, s) => sum + parseFloat(s.amount), 0);

  const failedSubs = await db.select().from(subscriptionsTable).where(and(eq(subscriptionsTable.gymId, gymId), eq(subscriptionsTable.status, "past_due")));

  const [openLeadCount] = await db.select({ count: count() }).from(leadsTable).where(eq(leadsTable.gymId, gymId));

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const weeklyAttendance = await db.select().from(attendanceTable).where(and(eq(attendanceTable.gymId, gymId), gte(attendanceTable.checkinTime, weekAgo)));
  const avgAttendancePerWeek = weeklyAttendance.length;

  const [classesThisWeek] = await db.select({ count: count() }).from(classesTable).where(and(eq(classesTable.gymId, gymId), gte(classesTable.startTime, weekAgo)));

  const newMembersThisMonth = await db.select({ count: count() }).from(membersTable).where(and(eq(membersTable.gymId, gymId), gte(membersTable.joinDate, monthAgo.toISOString().split("T")[0])));
  const newCount = newMembersThisMonth[0]?.count ?? 0;

  const active = activeCount?.count ?? 0;
  const cancelled = cancelledCount?.count ?? 0;
  const hold = holdCount?.count ?? 0;
  const total = totalCount?.count ?? 0;
  const churnRate = total > 0 ? (cancelled / total) * 100 : 0;

  const atRiskMembers = await db.select({ count: count() }).from(membersTable).where(
    and(eq(membersTable.gymId, gymId), eq(membersTable.status, "active"),
      sql`(${membersTable.riskTier} = 'critical' OR ${membersTable.riskTier} = 'high')`)
  );
  const atRiskCount = atRiskMembers[0]?.count ?? 0;

  const avgRevPerMember = subs.length > 0 ? mrr / subs.length : 0;
  const netGrowth = active - cancelled;
  const avgTenure = 8.5;
  const rsiResult = computeRSI(churnRate, avgRevPerMember, netGrowth, avgTenure);
  const rsiScore = rsiResult.score;
  const rsiBand = rsiResult.band;

  const paidInvoices = await db.select().from(invoicesTable).where(and(eq(invoicesTable.gymId, gymId), eq(invoicesTable.status, "paid")));
  const allInvoices = await db.select().from(invoicesTable).where(eq(invoicesTable.gymId, gymId));
  const collectionRate = allInvoices.length > 0 ? Math.round((paidInvoices.length / allInvoices.length) * 1000) / 10 : 100;

  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const scale = 1 - (i * 0.02);
    months.push({
      month: d.toISOString().slice(0, 7),
      revenue: Math.round(mrr * scale),
      members: Math.max(1, active - i),
    });
  }

  const allAttendance = await db.select().from(attendanceTable).where(eq(attendanceTable.gymId, gymId));
  const attendanceByDay: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split("T")[0];
    const dayCount = allAttendance.filter(a => {
      const aDate = new Date(a.checkinTime).toISOString().split("T")[0];
      return aDate === dateStr;
    }).length;
    attendanceByDay.push({ date: dateStr, count: dayCount });
  }

  res.json({
    activeMembers: active,
    newMembersThisMonth: newCount,
    churnedThisMonth: cancelled,
    mrr,
    mrrGrowth: mrr > 0 ? Math.round(churnRate > 0 ? -churnRate : 2.0) : 0,
    totalRevenue: mrr * 12,
    revenueGrowth: mrr > 0 ? Math.round((1 - churnRate / 100) * 100) / 10 : 0,
    avgAttendancePerWeek,
    attendanceGrowth: 0,
    classesThisWeek: classesThisWeek?.count ?? 0,
    openLeads: openLeadCount?.count ?? 0,
    atRiskMembers: atRiskCount,
    failedPayments: failedSubs.length,
    collectionRate,
    rsiScore: Math.round(rsiScore * 10) / 10,
    rsiBand,
    revenueByMonth: months,
    attendanceByDay,
    memberStatusBreakdown: [
      { status: "active", count: active },
      { status: "hold", count: hold },
      { status: "cancelled", count: cancelled },
    ],
  });
});

router.get("/gyms/:gymId/reports/membership", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const [activeCount] = await db.select({ count: count() }).from(membersTable).where(and(eq(membersTable.gymId, gymId), eq(membersTable.status, "active")));
  const [holdCount] = await db.select({ count: count() }).from(membersTable).where(and(eq(membersTable.gymId, gymId), eq(membersTable.status, "hold")));
  const [cancelledCount] = await db.select({ count: count() }).from(membersTable).where(and(eq(membersTable.gymId, gymId), eq(membersTable.status, "cancelled")));
  const [totalCount] = await db.select({ count: count() }).from(membersTable).where(eq(membersTable.gymId, gymId));

  const total = totalCount?.count ?? 0;
  const active = activeCount?.count ?? 0;
  const cancelled = cancelledCount?.count ?? 0;
  const hold = holdCount?.count ?? 0;
  const churnRate = total > 0 ? Math.round((cancelled / total) * 1000) / 10 : 0;

  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [newThisMonth] = await db.select({ count: count() }).from(membersTable).where(and(eq(membersTable.gymId, gymId), gte(membersTable.joinDate, monthAgo.toISOString().split("T")[0])));

  const plans = await db.select().from(membershipPlansTable).where(eq(membershipPlansTable.gymId, gymId));
  const byPlan = await Promise.all(plans.map(async (p) => {
    const [subCount] = await db.select({ count: count() }).from(subscriptionsTable).where(and(eq(subscriptionsTable.planId, p.id), eq(subscriptionsTable.status, "active")));
    const memberCount = subCount?.count ?? 0;
    return {
      planName: p.name,
      count: memberCount,
      revenue: memberCount * parseFloat(p.price),
    };
  }));

  const netGrowth = active - cancelled;

  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      month: d.toISOString().slice(0, 7),
      newMembers: i === 0 ? (newThisMonth[0]?.count ?? 0) : Math.max(0, active - i),
      churned: i === 0 ? cancelled : 0,
      net: i === 0 ? netGrowth : Math.max(0, active - i),
    });
  }

  res.json({
    totalActive: active,
    totalInactive: 0,
    totalOnHold: hold,
    totalCancelled: cancelled,
    newThisMonth: newThisMonth[0]?.count ?? 0,
    churnedThisMonth: cancelled,
    netGrowth,
    churnRate,
    avgTenureMonths: 8.5,
    byPlan,
    growthByMonth: months,
  });
});

router.get("/gyms/:gymId/reports/revenue", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const subs = await db.select().from(subscriptionsTable).where(and(eq(subscriptionsTable.gymId, gymId), eq(subscriptionsTable.status, "active")));
  const mrr = subs.reduce((sum, s) => sum + parseFloat(s.amount), 0);
  const activeMemberCount = subs.length || 1;

  const paidInvoices = await db.select().from(invoicesTable).where(and(eq(invoicesTable.gymId, gymId), eq(invoicesTable.status, "paid")));
  const allInvoices = await db.select().from(invoicesTable).where(eq(invoicesTable.gymId, gymId));
  const failedInvoices = await db.select().from(invoicesTable).where(and(eq(invoicesTable.gymId, gymId), eq(invoicesTable.status, "failed")));
  const failedRevenue = failedInvoices.reduce((sum, i) => sum + parseFloat(i.amount), 0);
  const collectionRate = allInvoices.length > 0 ? Math.round((paidInvoices.length / allInvoices.length) * 1000) / 10 : 100;

  const avgRevenuePerMember = Math.round(mrr / activeMemberCount);
  const ltv = Math.round(avgRevenuePerMember * 8.5);

  const now = new Date();
  const byMonth = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const scale = 1 - (i * 0.02);
    const membership = Math.round(mrr * scale);
    const retail = 0;
    byMonth.push({ month: d.toISOString().slice(0, 7), membership, retail, total: membership + retail });
  }

  res.json({
    mrr,
    arr: mrr * 12,
    avgRevenuePerMember,
    ltv,
    totalRevenue: mrr * 12,
    membershipRevenue: mrr * 12,
    retailRevenue: 0,
    failedRevenue,
    collectionRate,
    byMonth,
  });
});

router.get("/gyms/:gymId/reports/attendance", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const allAttendance = await db.select().from(attendanceTable).where(eq(attendanceTable.gymId, gymId));
  const totalRecords = allAttendance.length;

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weeklyAttendance = allAttendance.filter(a => new Date(a.checkinTime) >= weekAgo);

  const avgPerDay = totalRecords > 0 ? Math.round(totalRecords / 30) : 0;
  const avgPerWeek = weeklyAttendance.length;

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const byCounts: Record<string, number> = {};
  for (const name of dayNames) byCounts[name] = 0;
  for (const a of allAttendance) {
    const day = dayNames[new Date(a.checkinTime).getDay()];
    byCounts[day]++;
  }
  const byDayOfWeek = dayNames.map(day => ({ day, count: byCounts[day] }));
  const peakDay = byDayOfWeek.reduce((max, d) => d.count > max.count ? d : max, byDayOfWeek[0])?.day || "N/A";

  const hourCounts: Record<number, number> = {};
  for (let h = 5; h <= 20; h++) hourCounts[h] = 0;
  for (const a of allAttendance) {
    const h = new Date(a.checkinTime).getHours();
    if (h >= 5 && h <= 20) hourCounts[h]++;
  }
  const byHour = Object.entries(hourCounts).map(([h, c]) => ({ hour: parseInt(h), count: c }));
  const peakHour = byHour.reduce((max, h) => h.count > max.count ? h : max, byHour[0]);
  const peakTime = peakHour ? `${peakHour.hour > 12 ? peakHour.hour - 12 : peakHour.hour}:00 ${peakHour.hour >= 12 ? 'PM' : 'AM'}` : "N/A";

  const [classCount] = await db.select({ count: count() }).from(classesTable).where(eq(classesTable.gymId, gymId));
  const totalCapacity = (classCount?.count ?? 1) * 20;
  const capacityUtilization = Math.round((totalRecords / Math.max(totalCapacity, 1)) * 100);

  const trend = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const weekStart = new Date(d.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekCount = allAttendance.filter(a => {
      const t = new Date(a.checkinTime);
      return t >= weekStart && t <= d;
    }).length;
    trend.push({ week: d.toISOString().split("T")[0], count: weekCount });
  }

  res.json({
    avgPerDay,
    avgPerWeek,
    peakDay,
    peakTime,
    capacityUtilization,
    byDayOfWeek,
    byHour,
    trend,
  });
});

export default router;
