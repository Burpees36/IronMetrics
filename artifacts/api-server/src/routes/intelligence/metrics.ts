import { eq, and, count, sql } from "drizzle-orm";
import { db, membersTable, subscriptionsTable, leadsTable, invoicesTable } from "@workspace/db";
import { calculateRiskScore, getRiskTier } from "./computations";
import { getBlendedGymMetrics, computeBlendedMRR, getMemberRevenueFromMembersTable, activeMemberCondition, isActiveBillableMember } from "../../blendedMetrics";
export { getInterventionsDynamic } from "./intervention-engine";

export async function getGymMetrics(gymId: number) {
  const blended = await getBlendedGymMetrics(gymId);

  const subs = await db.select().from(subscriptionsTable).where(and(eq(subscriptionsTable.gymId, gymId), eq(subscriptionsTable.status, "active")));

  return {
    active: blended.activeBillableMembers,
    cancelled: blended.cancelledMembers,
    total: blended.totalMembers,
    churnRate: blended.churnRate,
    totalRev: blended.mrr.totalMRR,
    avgRev: blended.avgRevPerMember,
    netGrowth: blended.netGrowth,
    avgTenure: blended.avgTenure,
    subs,
    revenueSource: blended.mrr.revenueSource,
    attendanceSource: blended.engagement.attendanceSource,
    hasSubscriptionData: blended.mrr.hasSubscriptionData,
  };
}

export async function getRiskProfiles(gymId: number) {
  const members = await db.select().from(membersTable).where(and(eq(membersTable.gymId, gymId), activeMemberCondition(membersTable)));

  const memberSubs = await db.select().from(subscriptionsTable).where(and(eq(subscriptionsTable.gymId, gymId), eq(subscriptionsTable.status, "active")));
  const subByMember: Record<number, number> = {};
  for (const s of memberSubs) {
    subByMember[s.memberId] = parseFloat(s.amount || "0");
  }

  return members.map((m) => {
    const now = new Date();
    const joinDate = m.joinDate || m.createdAt;
    const daysSinceJoin = joinDate ? Math.floor((now.getTime() - new Date(joinDate).getTime()) / (1000 * 60 * 60 * 24)) : 999;

    let daysSinceLastVisit: number;
    if (m.lastVisitDate) {
      daysSinceLastVisit = Math.floor((now.getTime() - new Date(m.lastVisitDate).getTime()) / (1000 * 60 * 60 * 24));
    } else if (daysSinceJoin <= 7) {
      daysSinceLastVisit = 0;
    } else {
      daysSinceLastVisit = 999;
    }

    const attendanceDecay = Math.min(1, daysSinceLastVisit / 30);
    const riskScore = daysSinceJoin <= 3 ? 0 : calculateRiskScore(daysSinceLastVisit, m.attendanceCount30d, m.riskScore);
    const riskTier = getRiskTier(riskScore);

    const signals: string[] = [];
    if (daysSinceLastVisit > 14) signals.push(`No visit in ${daysSinceLastVisit} days`);
    if (m.attendanceCount30d !== null && m.attendanceCount30d < 3) signals.push("Low attendance (<3/month)");
    if (attendanceDecay > 0.5) signals.push("Attendance declining");

    const monthlyValue = subByMember[m.id] ?? getMemberRevenueFromMembersTable(m);
    return {
      memberId: m.id,
      memberName: `${m.firstName} ${m.lastName}`,
      email: m.email,
      riskScore: Math.round(riskScore),
      riskTier,
      revenueAtRisk: riskTier === "critical" || riskTier === "high" ? monthlyValue : 0,
      daysSinceLastVisit: daysSinceLastVisit < 999 ? daysSinceLastVisit : null,
      attendanceDecay: Math.round(attendanceDecay * 100) / 100,
      billingIssues: false,
      tenure: (m.joinDate || m.createdAt) ? Math.floor((new Date().getTime() - new Date(m.joinDate || m.createdAt!).getTime()) / (1000 * 60 * 60 * 24 * 30)) : 0,
      signals,
      membershipType: m.membershipType,
      monthlyValue,
    };
  }).sort((a, b) => b.riskScore - a.riskScore);
}

export { getInterventionsDynamic as getInterventions } from "./intervention-engine";

export async function computeRevenueForecast(gymId: number, currentMrr: number, churnRate: number, activeSubCount: number) {
  const paidInvoices = await db.select().from(invoicesTable).where(and(eq(invoicesTable.gymId, gymId), eq(invoicesTable.status, "paid")));

  const monthlyRevenue: Record<string, number> = {};
  for (const inv of paidInvoices) {
    if (!inv.paidAt) continue;
    const monthKey = new Date(inv.paidAt).toISOString().slice(0, 7);
    monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] ?? 0) + parseFloat(inv.amount || "0");
  }

  const sortedMonths = Object.keys(monthlyRevenue).sort();
  let monthlyGrowthRate = 0;
  let dataSource: "invoices" | "subscriptions" | "blended" = "blended";

  if (sortedMonths.length >= 2) {
    dataSource = "invoices";
    const recentMonths = sortedMonths.slice(-6);
    const growthRates: number[] = [];
    for (let i = 1; i < recentMonths.length; i++) {
      const prev = monthlyRevenue[recentMonths[i - 1]];
      const curr = monthlyRevenue[recentMonths[i]];
      if (prev > 0) {
        growthRates.push((curr - prev) / prev);
      }
    }
    if (growthRates.length > 0) {
      monthlyGrowthRate = growthRates.reduce((s, r) => s + r, 0) / growthRates.length;
    }
  } else {
    const allMembers = await db.select().from(membersTable).where(eq(membersTable.gymId, gymId));
    const activeMembers = allMembers.filter(m => isActiveBillableMember(m.status)).length;
    const totalMembers = allMembers.length;

    const monthlyChurnRate = churnRate > 0 ? (churnRate / 100) / Math.max(1, totalMembers > activeMembers ? 12 : 6) : 0;

    const openLeads = await db.select({ count: count() }).from(leadsTable).where(
      and(eq(leadsTable.gymId, gymId), sql`${leadsTable.stage} NOT IN ('converted', 'lost')`)
    );
    const pipelineLeads = Number(openLeads[0]?.count ?? 0);
    const estimatedConversionsPerMonth = pipelineLeads * 0.15;
    const avgMemberAmount = activeMembers > 0 ? currentMrr / activeMembers : 0;
    const growthFromNewMembers = activeMembers > 0 && currentMrr > 0 ? (estimatedConversionsPerMonth * avgMemberAmount) / currentMrr : 0;

    monthlyGrowthRate = currentMrr > 0 ? growthFromNewMembers - monthlyChurnRate : 0;
  }

  const monthlyChurnDecay = churnRate > 0 ? (churnRate / 100) / 12 : 0;

  const project = (months: number, growthMult: number) => {
    const rate = monthlyGrowthRate * growthMult;
    return Math.round(currentMrr * Math.pow(1 + rate, months));
  };

  const projectWithChurn = (months: number) => {
    return Math.round(currentMrr * Math.pow(1 - monthlyChurnDecay, months));
  };

  const blendedMRR = await computeBlendedMRR(gymId);

  return {
    currentMrr,
    expectedMrr3m: project(3, 1),
    upsideMrr3m: project(3, 1.5),
    downsideMrr3m: projectWithChurn(3),
    expectedMrr6m: project(6, 1),
    upsideMrr6m: project(6, 1.5),
    downsideMrr6m: projectWithChurn(6),
    expectedMrr12m: project(12, 1),
    upsideMrr12m: project(12, 1.5),
    downsideMrr12m: projectWithChurn(12),
    dataSource,
    assumptions: [
      `Based on trailing churn rate of ${churnRate.toFixed(1)}%`,
      `Current MRR: $${currentMrr.toLocaleString()} from ${blendedMRR.activeBillableMembers} active members (${blendedMRR.revenueSource})`,
      dataSource === "invoices"
        ? `Historical monthly growth rate: ${(monthlyGrowthRate * 100).toFixed(1)}% (from ${sortedMonths.length} months of invoice data)`
        : `Estimated monthly growth rate: ${(monthlyGrowthRate * 100).toFixed(1)}% (derived from pipeline conversion and churn)`,
      "Upside assumes 1.5x growth rate",
      "Downside models churn-only scenario (no new revenue)",
    ],
  };
}
