import { eq, and, count, sql } from "drizzle-orm";
import { db, membersTable, subscriptionsTable, leadsTable, invoicesTable } from "@workspace/db";
import { calculateRiskScore, getRiskTier } from "./computations";
import { getBlendedGymMetrics, computeBlendedMRR, getMemberRevenueFromMembersTable } from "../../blendedMetrics";

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
  const members = await db.select().from(membersTable).where(and(eq(membersTable.gymId, gymId), eq(membersTable.status, "active")));

  const memberSubs = await db.select().from(subscriptionsTable).where(and(eq(subscriptionsTable.gymId, gymId), eq(subscriptionsTable.status, "active")));
  const subByMember: Record<number, number> = {};
  for (const s of memberSubs) {
    subByMember[s.memberId] = parseFloat(s.amount || "0");
  }

  return members.map((m) => {
    const now = new Date();
    const daysSinceLastVisit = m.lastVisitDate ? Math.floor((now.getTime() - new Date(m.lastVisitDate).getTime()) / (1000 * 60 * 60 * 24)) : 999;
    const attendanceDecay = Math.min(1, daysSinceLastVisit / 30);
    const riskScore = calculateRiskScore(daysSinceLastVisit, m.attendanceCount30d, m.riskScore);
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

export async function getInterventions(gymId: number) {
  const [atRiskResult] = await db.select({ count: count() }).from(membersTable).where(
    and(eq(membersTable.gymId, gymId), eq(membersTable.status, "active"),
      sql`(${membersTable.riskTier} = 'critical' OR ${membersTable.riskTier} = 'high')`)
  );
  const atRiskCount = Number(atRiskResult?.count ?? 0);

  const [openLeadCount] = await db.select({ count: count() }).from(leadsTable).where(eq(leadsTable.gymId, gymId));
  const failedSubs = await db.select().from(subscriptionsTable).where(and(eq(subscriptionsTable.gymId, gymId), eq(subscriptionsTable.status, "past_due")));

  const blendedMRR = await computeBlendedMRR(gymId);
  const avgSubAmount = blendedMRR.activeBillableMembers > 0
    ? blendedMRR.totalMRR / blendedMRR.activeBillableMembers
    : 0;

  const atRiskMembers = await db.select().from(membersTable).where(
    and(eq(membersTable.gymId, gymId), eq(membersTable.status, "active"),
      sql`(${membersTable.riskTier} = 'critical' OR ${membersTable.riskTier} = 'high')`)
  );
  const atRiskSubsByMember = await db.select().from(subscriptionsTable).where(and(eq(subscriptionsTable.gymId, gymId), eq(subscriptionsTable.status, "active")));
  const subLookup: Record<number, number> = {};
  for (const s of atRiskSubsByMember) subLookup[s.memberId] = parseFloat(s.amount || "0");
  const atRiskRevenue = atRiskMembers.reduce((sum, m) => sum + (subLookup[m.id] ?? getMemberRevenueFromMembersTable(m)), 0);

  const interventions = [
    {
      id: "int-1",
      category: "retention",
      title: "Reach out to at-risk members",
      description: `${atRiskCount} member${atRiskCount !== 1 ? 's' : ''} show${atRiskCount === 1 ? 's' : ''} elevated risk signals. Personal outreach can reduce churn by 15-25%.`,
      impact: "high",
      urgency: "immediate" as const,
      score: 92,
      expectedRevenue: Math.round(atRiskRevenue * 100) / 100,
      affectedMembers: atRiskCount,
      actions: ["Review risk radar for critical-tier members", "Draft personalized check-in messages", "Schedule 1:1 calls with top at-risk members", "Track response and re-engagement within 7 days"],
      status: "pending",
    },
    {
      id: "int-2",
      category: "billing",
      title: "Recover failed payments",
      description: `${failedSubs.length} subscription${failedSubs.length !== 1 ? 's' : ''} with payment issues. Prompt follow-up typically recovers 60-80%.`,
      impact: failedSubs.length > 0 ? "high" : "low",
      urgency: failedSubs.length > 0 ? "this_week" as const : "this_month" as const,
      score: failedSubs.length > 0 ? 85 : 30,
      expectedRevenue: failedSubs.reduce((s, sub) => s + parseFloat(sub.amount || "0"), 0),
      affectedMembers: failedSubs.length,
      actions: ["Review dunning report for failed charges", "Send payment update reminders", "Offer alternative payment methods", "Follow up with personal call after 48 hours"],
      status: "pending",
    },
    {
      id: "int-3",
      category: "onboarding",
      title: "Improve first-30-day experience",
      description: "New member retention in the first 30 days is critical. Structured onboarding increases 90-day retention by 20%.",
      impact: "medium",
      urgency: "this_week" as const,
      score: 78,
      expectedRevenue: null,
      affectedMembers: null,
      actions: ["Create welcome sequence for new members", "Schedule intro sessions within first week", "Assign accountability buddies", "Check in at day 7, 14, and 30"],
      status: "pending",
    },
    {
      id: "int-4",
      category: "leads",
      title: "Follow up on open leads",
      description: `${Number(openLeadCount?.count ?? 0)} lead${Number(openLeadCount?.count ?? 0) !== 1 ? 's' : ''} in pipeline. Speed to lead matters for conversion.`,
      impact: "medium",
      urgency: "this_week" as const,
      score: 72,
      expectedRevenue: avgSubAmount > 0 ? Math.round(Number(openLeadCount?.count ?? 0) * avgSubAmount * 100) / 100 : null,
      affectedMembers: null,
      actions: ["Review lead pipeline for stale entries", "Send follow-up emails or texts", "Offer free trial or No Sweat Intro", "Remove or archive truly cold leads"],
      status: "pending",
    },
    {
      id: "int-5",
      category: "campaign",
      title: "Launch referral campaign",
      description: "Member referrals have 3x higher retention than cold leads. A structured referral program can drive consistent growth.",
      impact: "medium",
      urgency: "this_month" as const,
      score: 65,
      expectedRevenue: null,
      affectedMembers: null,
      actions: ["Design referral incentive structure", "Announce to current members", "Create tracking system", "Measure results after 30 days"],
      status: "pending",
    },
  ];

  return interventions;
}

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
    const activeMembers = allMembers.filter(m => m.status === "active").length;
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
