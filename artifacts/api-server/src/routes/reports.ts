import { Router, type IRouter } from "express";
import { eq, and, count, desc, gte, lt, sql } from "drizzle-orm";
import { db, membersTable, subscriptionsTable, invoicesTable, attendanceTable, leadsTable, classesTable, membershipPlansTable } from "@workspace/db";
import { getBlendedGymMetrics, computeBlendedMRR, computeBlendedEngagement } from "../blendedMetrics";

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

  const blended = await getBlendedGymMetrics(gymId);
  const { mrr: mrrResult, engagement } = blended;

  const [openLeadCount] = await db.select({ count: count() }).from(leadsTable).where(eq(leadsTable.gymId, gymId));

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [classesThisWeek] = await db.select({ count: count() }).from(classesTable).where(and(eq(classesTable.gymId, gymId), gte(classesTable.startTime, weekAgo)));

  const newMembersThisMonth = await db.select({ count: count() }).from(membersTable).where(and(eq(membersTable.gymId, gymId), gte(membersTable.joinDate, monthAgo.toISOString().split("T")[0])));
  const newCount = Number(newMembersThisMonth[0]?.count ?? 0);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const [churnedThisMonthCount] = await db.select({ count: count() }).from(subscriptionsTable).where(and(
    eq(subscriptionsTable.gymId, gymId),
    gte(subscriptionsTable.cancelledAt, monthStart),
    lt(subscriptionsTable.cancelledAt, monthEnd),
  ));
  const churnedThisMonth = Number(churnedThisMonthCount?.count ?? 0);

  const atRiskMembers = await db.select({ count: count() }).from(membersTable).where(
    and(eq(membersTable.gymId, gymId), eq(membersTable.status, "active"),
      sql`(${membersTable.riskTier} = 'critical' OR ${membersTable.riskTier} = 'high')`)
  );
  const atRiskCount = Number(atRiskMembers[0]?.count ?? 0);

  const rsiResult = computeRSI(blended.churnRate, blended.avgRevPerMember, blended.netGrowth, blended.avgTenure);

  const paidInvoices = await db.select().from(invoicesTable).where(and(eq(invoicesTable.gymId, gymId), eq(invoicesTable.status, "paid")));
  const allInvoices = await db.select().from(invoicesTable).where(eq(invoicesTable.gymId, gymId));
  const collectionRate = allInvoices.length > 0 ? Math.round((paidInvoices.length / allInvoices.length) * 1000) / 10 : 100;

  const invoicesByMonth: Record<string, number> = {};
  for (const inv of paidInvoices) {
    if (!inv.paidAt) continue;
    const monthKey = new Date(inv.paidAt).toISOString().slice(0, 7);
    invoicesByMonth[monthKey] = (invoicesByMonth[monthKey] ?? 0) + parseFloat(inv.amount || "0");
  }

  const months = [];
  const currentMonthKey = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 7);
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = d.toISOString().slice(0, 7);
    if (monthKey === currentMonthKey) {
      months.push({ month: monthKey, revenue: Math.round(mrrResult.totalMRR) });
    } else {
      const invoiceRev = invoicesByMonth[monthKey] ?? 0;
      months.push({ month: monthKey, revenue: invoiceRev > 0 ? Math.round(invoiceRev) : 0 });
    }
  }

  const failedSubs = await db.select().from(subscriptionsTable).where(and(eq(subscriptionsTable.gymId, gymId), eq(subscriptionsTable.status, "past_due")));

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
    activeMembers: blended.activeBillableMembers,
    newMembersThisMonth: newCount,
    churnedThisMonth,
    mrr: mrrResult.totalMRR,
    mrrGrowth: (() => {
      const currentRev = months[months.length - 1]?.revenue ?? 0;
      const prevRev = months[months.length - 2]?.revenue ?? 0;
      if (prevRev > 0) return Math.round(((currentRev - prevRev) / prevRev) * 1000) / 10;
      return null;
    })(),
    totalRevenue: mrrResult.totalMRR * 12,
    revenueGrowth: null,
    engagementRate: engagement.engagementRate,
    engagementChange: engagement.engagementChange,
    classesThisWeek: Number(classesThisWeek?.count ?? 0),
    openLeads: Number(openLeadCount?.count ?? 0),
    atRiskMembers: atRiskCount,
    failedPayments: failedSubs.length,
    collectionRate,
    rsiScore: Math.round(rsiResult.score * 10) / 10,
    rsiBand: rsiResult.band,
    revenueByMonth: months,
    attendanceByDay,
    memberStatusBreakdown: [
      { status: "active", count: blended.activeBillableMembers },
      { status: "hold", count: blended.holdMembers },
      { status: "cancelled", count: blended.cancelledMembers },
    ],
    revenueSource: mrrResult.revenueSource,
    attendanceSource: engagement.attendanceSource,
    hasSubscriptionData: mrrResult.hasSubscriptionData,
  });
});

router.get("/gyms/:gymId/reports/membership", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const [activeCount] = await db.select({ count: count() }).from(membersTable).where(and(eq(membersTable.gymId, gymId), eq(membersTable.status, "active")));
  const [holdCount] = await db.select({ count: count() }).from(membersTable).where(and(eq(membersTable.gymId, gymId), eq(membersTable.status, "hold")));
  const [cancelledCount] = await db.select({ count: count() }).from(membersTable).where(and(eq(membersTable.gymId, gymId), eq(membersTable.status, "cancelled")));
  const [totalCount] = await db.select({ count: count() }).from(membersTable).where(eq(membersTable.gymId, gymId));

  const total = Number(totalCount?.count ?? 0);
  const active = Number(activeCount?.count ?? 0);
  const cancelled = Number(cancelledCount?.count ?? 0);
  const hold = Number(holdCount?.count ?? 0);
  const churnRate = total > 0 ? Math.round((cancelled / total) * 1000) / 10 : 0;

  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [newThisMonth] = await db.select({ count: count() }).from(membersTable).where(and(eq(membersTable.gymId, gymId), gte(membersTable.joinDate, monthAgo.toISOString().split("T")[0])));

  const plans = await db.select().from(membershipPlansTable).where(eq(membershipPlansTable.gymId, gymId));
  const byPlan = await Promise.all(plans.map(async (p) => {
    const [subCount] = await db.select({ count: count() }).from(subscriptionsTable).where(and(eq(subscriptionsTable.planId, p.id), eq(subscriptionsTable.status, "active")));
    const memberCount = Number(subCount?.count ?? 0);
    return {
      planName: p.name,
      count: memberCount,
      revenue: memberCount * parseFloat(p.price || "0"),
    };
  }));

  const netGrowth = active - cancelled;

  const allMembersForTenure = await db.select().from(membersTable).where(eq(membersTable.gymId, gymId));
  const tenureValues = allMembersForTenure
    .filter(m => m.joinDate || m.createdAt)
    .map(m => {
      const end = m.status === "cancelled" && m.updatedAt ? new Date(m.updatedAt) : now;
      const start = new Date(m.joinDate || m.createdAt!);
      return Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
    });
  const avgTenureMonths = tenureValues.length > 0 ? Math.round((tenureValues.reduce((s, t) => s + t, 0) / tenureValues.length) * 10) / 10 : 0;

  const allCancelledSubs = await db.select({
    cancelledAt: subscriptionsTable.cancelledAt,
  }).from(subscriptionsTable).where(and(
    eq(subscriptionsTable.gymId, gymId),
    sql`${subscriptionsTable.cancelledAt} IS NOT NULL`,
  ));

  const allNewMembers = await db.select({
    joinDate: membersTable.joinDate,
    createdAt: membersTable.createdAt,
  }).from(membersTable).where(eq(membersTable.gymId, gymId));

  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const monthKey = d.toISOString().slice(0, 7);

    const churned = allCancelledSubs.filter(s => {
      if (!s.cancelledAt) return false;
      const cat = new Date(s.cancelledAt);
      return cat >= mStart && cat < mEnd;
    }).length;

    const newMems = allNewMembers.filter(m => {
      const jd = m.joinDate || (m.createdAt ? new Date(m.createdAt).toISOString().split("T")[0] : null);
      if (!jd) return false;
      const jDate = new Date(jd);
      return jDate >= mStart && jDate < mEnd;
    }).length;

    months.push({
      month: monthKey,
      newMembers: newMems,
      churned,
      net: newMems - churned,
    });
  }

  const currentMonthChurned = months[months.length - 1]?.churned ?? 0;

  res.json({
    totalActive: active,
    totalInactive: 0,
    totalOnHold: hold,
    totalCancelled: cancelled,
    newThisMonth: Number(newThisMonth?.count ?? 0),
    churnedThisMonth: currentMonthChurned,
    netGrowth,
    churnRate,
    avgTenureMonths,
    byPlan,
    growthByMonth: months,
  });
});

router.get("/gyms/:gymId/reports/revenue", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const blendedMRR = await computeBlendedMRR(gymId);
  const mrr = blendedMRR.totalMRR;
  const activeMemberCount = blendedMRR.activeBillableMembers || 1;

  const paidInvoices = await db.select().from(invoicesTable).where(and(eq(invoicesTable.gymId, gymId), eq(invoicesTable.status, "paid")));
  const allInvoices = await db.select().from(invoicesTable).where(eq(invoicesTable.gymId, gymId));
  const failedInvoices = await db.select().from(invoicesTable).where(and(eq(invoicesTable.gymId, gymId), eq(invoicesTable.status, "failed")));
  const failedRevenue = failedInvoices.reduce((sum, i) => sum + parseFloat(i.amount || "0"), 0);
  const collectionRate = allInvoices.length > 0 ? Math.round((paidInvoices.length / allInvoices.length) * 1000) / 10 : 100;

  const avgRevenuePerMember = Math.round(mrr / activeMemberCount);

  const allMembersRev = await db.select().from(membersTable).where(eq(membersTable.gymId, gymId));
  const now = new Date();
  const tenuresRev = allMembersRev
    .filter(m => m.joinDate || m.createdAt)
    .map(m => {
      const end = m.status === "cancelled" && m.updatedAt ? new Date(m.updatedAt) : now;
      const start = new Date(m.joinDate || m.createdAt!);
      return Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
    });
  const avgTenureRev = tenuresRev.length > 0 ? tenuresRev.reduce((s, t) => s + t, 0) / tenuresRev.length : 0;
  const ltv = Math.round(avgRevenuePerMember * avgTenureRev);

  const invoicesByMonthRev: Record<string, number> = {};
  for (const inv of paidInvoices) {
    if (!inv.paidAt) continue;
    const monthKey = new Date(inv.paidAt).toISOString().slice(0, 7);
    invoicesByMonthRev[monthKey] = (invoicesByMonthRev[monthKey] ?? 0) + parseFloat(inv.amount || "0");
  }

  const byMonth = [];
  const currentMonthKeyRev = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 7);
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = d.toISOString().slice(0, 7);
    if (monthKey === currentMonthKeyRev) {
      const membership = Math.round(mrr);
      byMonth.push({ month: monthKey, membership, retail: 0, total: membership });
    } else {
      const invoiceRev = invoicesByMonthRev[monthKey] ?? 0;
      const membership = invoiceRev > 0 ? Math.round(invoiceRev) : 0;
      byMonth.push({ month: monthKey, membership, retail: 0, total: membership });
    }
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
    revenueSource: blendedMRR.revenueSource,
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
  const totalCapacity = Number(classCount?.count ?? 1) * 20;
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
