import { Router, type IRouter } from "express";
import { eq, and, count, desc, gte, lt, sql, asc } from "drizzle-orm";
import { db, membersTable, subscriptionsTable, invoicesTable, attendanceTable, leadsTable, classesTable, membershipPlansTable, rsiSnapshotsTable, mrrSnapshotsTable } from "@workspace/db";
import { getBlendedGymMetrics, computeBlendedMRR, computeBlendedEngagement, activeMemberCondition } from "../blendedMetrics";
import { getRiskProfiles } from "./intelligence/metrics";
import { computeRSI } from "./intelligence/computations";

const router: IRouter = Router();

async function getSnapshotsByMonth(gymId: number): Promise<Record<string, { totalMRR: number; snapshotDate: string }>> {
  const snapshots = await db.select({
    snapshotDate: mrrSnapshotsTable.snapshotDate,
    totalMRR: mrrSnapshotsTable.totalMRR,
  }).from(mrrSnapshotsTable).where(eq(mrrSnapshotsTable.gymId, gymId)).orderBy(desc(mrrSnapshotsTable.snapshotDate));

  const byMonth: Record<string, { totalMRR: number; snapshotDate: string }> = {};
  for (const s of snapshots) {
    const monthKey = s.snapshotDate.slice(0, 7);
    if (!byMonth[monthKey]) {
      byMonth[monthKey] = {
        totalMRR: parseFloat(s.totalMRR),
        snapshotDate: s.snapshotDate,
      };
    }
  }
  return byMonth;
}

function parseGymId(params: any): number | null {
  const raw = Array.isArray(params.gymId) ? params.gymId[0] : params.gymId;
  const id = parseInt(raw, 10);
  return isNaN(id) ? null : id;
}

router.get("/gyms/:gymId/reports/dashboard", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  try {
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

    const riskProfiles = await getRiskProfiles(gymId);
    const criticalRiskCount = riskProfiles.filter(r => r.riskTier === "critical").length;
    const highRiskCount = riskProfiles.filter(r => r.riskTier === "high").length;
    const atRiskCount = criticalRiskCount + highRiskCount;
    const revenueAtRisk = riskProfiles.reduce((sum, r) => sum + r.revenueAtRisk, 0);
    const retentionRate = blended.activeBillableMembers > 0
      ? Math.round(((blended.activeBillableMembers - atRiskCount) / blended.activeBillableMembers) * 1000) / 10
      : 100;

    const rsiResult = computeRSI(blended.churnRate, blended.avgRevPerMember, blended.netGrowth, blended.avgTenure, blended.totalMembers);

    const paidInvoices = await db.select().from(invoicesTable).where(and(eq(invoicesTable.gymId, gymId), eq(invoicesTable.status, "paid")));
    const allInvoices = await db.select().from(invoicesTable).where(eq(invoicesTable.gymId, gymId));
    const collectionRate = allInvoices.length > 0 ? Math.round((paidInvoices.length / allInvoices.length) * 1000) / 10 : 100;

    const invoicesByMonth: Record<string, number> = {};
    for (const inv of paidInvoices) {
      if (!inv.paidAt) continue;
      const monthKey = new Date(inv.paidAt).toISOString().slice(0, 7);
      invoicesByMonth[monthKey] = (invoicesByMonth[monthKey] ?? 0) + parseFloat(inv.amount || "0");
    }

    const snapshotsByMonth = await getSnapshotsByMonth(gymId);

    const months = [];
    const currentMonthKey = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 7);
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = d.toISOString().slice(0, 7);
      if (monthKey === currentMonthKey) {
        months.push({ month: monthKey, revenue: Math.round(mrrResult.totalMRR) });
      } else {
        const invoiceRev = invoicesByMonth[monthKey] ?? 0;
        const snapshotRev = snapshotsByMonth[monthKey]?.totalMRR ?? 0;
        const bestRev = Math.max(invoiceRev, snapshotRev);
        months.push({ month: monthKey, revenue: bestRev > 0 ? Math.round(bestRev) : 0 });
      }
    }

    const hasSnapshotData = Object.keys(snapshotsByMonth).length > 0;
    const nonZeroMonths = months.filter(m => m.revenue > 0);
    const sparseData = hasSnapshotData && nonZeroMonths.length < 3;

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
      atRiskCritical: criticalRiskCount,
      atRiskHigh: highRiskCount,
      revenueAtRisk: Math.round(revenueAtRisk),
      retentionRate,
      failedPayments: failedSubs.length,
      collectionRate,
      rsiScore: rsiResult.score !== null ? Math.round(rsiResult.score * 10) / 10 : null,
      rsiBand: rsiResult.band,
      ...await (async () => {
        if (rsiResult.score === null) return { rsiTrend30d: null, rsiTrendInsufficient: true };
        const snapshots = await db.select()
          .from(rsiSnapshotsTable)
          .where(eq(rsiSnapshotsTable.gymId, gymId))
          .orderBy(asc(rsiSnapshotsTable.recordedAt));
        if (snapshots.length < 7) return { rsiTrend30d: null, rsiTrendInsufficient: true };
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        const snapshot30d = snapshots
          .filter(s => s.recordedAt <= thirtyDaysAgo)
          .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0];
        if (!snapshot30d) return { rsiTrend30d: null, rsiTrendInsufficient: true };
        return {
          rsiTrend30d: Math.round((rsiResult.score - parseFloat(snapshot30d.score)) * 10) / 10,
          rsiTrendInsufficient: false,
        };
      })(),
      revenueByMonth: sparseData ? nonZeroMonths : months,
      revenueTrendSparse: sparseData,
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
  } catch (err) {
    console.error("[reports/dashboard] Failed to compute dashboard stats:", err);
    const now = new Date();
    const attendanceByDay = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      attendanceByDay.push({ date: d.toISOString().split("T")[0], count: 0 });
    }
    res.json({
      activeMembers: 0, newMembersThisMonth: 0, churnedThisMonth: 0,
      mrr: 0, mrrGrowth: null, totalRevenue: 0, revenueGrowth: null,
      engagementRate: 0, engagementChange: null,
      classesThisWeek: 0, openLeads: 0,
      atRiskMembers: 0, atRiskCritical: 0, atRiskHigh: 0, revenueAtRisk: 0,
      retentionRate: 100, failedPayments: 0, collectionRate: 100,
      rsiScore: null, rsiBand: null, rsiTrend30d: null, rsiTrendInsufficient: true,
      revenueByMonth: [], revenueTrendSparse: false,
      attendanceByDay,
      memberStatusBreakdown: [
        { status: "active", count: 0 },
        { status: "hold", count: 0 },
        { status: "cancelled", count: 0 },
      ],
      revenueSource: "members_table", attendanceSource: "none",
      hasSubscriptionData: false,
    });
  }
});

router.get("/gyms/:gymId/reports/membership", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const [activeCount] = await db.select({ count: count() }).from(membersTable).where(and(eq(membersTable.gymId, gymId), activeMemberCondition(membersTable)));
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

  const snapshotsByMonthRev = await getSnapshotsByMonth(gymId);

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
      const snapshotRev = snapshotsByMonthRev[monthKey]?.totalMRR ?? 0;
      const bestRev = Math.max(invoiceRev, snapshotRev);
      const membership = bestRev > 0 ? Math.round(bestRev) : 0;
      byMonth.push({ month: monthKey, membership, retail: 0, total: membership });
    }
  }

  const hasSnapshotDataRev = Object.keys(snapshotsByMonthRev).length > 0;
  const nonZeroMonthsRev = byMonth.filter(m => m.total > 0);
  const sparseDataRev = hasSnapshotDataRev && nonZeroMonthsRev.length < 3;

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
    byMonth: sparseDataRev ? nonZeroMonthsRev : byMonth,
    revenueTrendSparse: sparseDataRev,
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
