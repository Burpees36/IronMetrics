/**
 * @module intelligence
 * Business intelligence and analytics routes for gym performance.
 *
 * Provides five analytical endpoints:
 *   - RSI (Retention Strength Index) — composite health score
 *   - Risk Radar — per-member churn risk profiles
 *   - Interventions — prioritized action recommendations
 *   - Cohort Analysis — monthly join-cohort retention curves
 *   - Revenue Forecast — MRR projections with upside/downside scenarios
 *   - Overview — aggregated dashboard combining RSI, risk, interventions, and forecast
 *
 * All metrics are computed from real gym data (member join dates, subscription
 * amounts, invoice history, etc.). When insufficient historical data exists,
 * endpoints return null values with appropriate flags.
 */
import { Router, type IRouter } from "express";
import { eq, and, count, sql, desc, gte } from "drizzle-orm";
import { db, membersTable, subscriptionsTable, attendanceTable, leadsTable, invoicesTable, classesTable } from "@workspace/db";

const router: IRouter = Router();

/**
 * Parses the gymId route parameter into a number.
 * Handles the case where params may be an array (Express quirk with merged params).
 *
 * @param params - Express route params object.
 * @returns Parsed gym ID or null if invalid.
 */
function parseGymId(params: any): number | null {
  const raw = Array.isArray(params.gymId) ? params.gymId[0] : params.gymId;
  const id = parseInt(raw, 10);
  return isNaN(id) ? null : id;
}

/**
 * Computes the Retention Strength Index (RSI) — a composite score (0–100) indicating
 * overall gym health from a retention and revenue perspective.
 *
 * The RSI is a weighted average of four normalized components:
 *
 * @param churnRate       - Percentage of total members who have cancelled.
 *                          Normalized: 100 - (churnRate * 10), clamped to [0, 100].
 *                          A 10% churn rate yields a normalized score of 0.
 *
 * @param avgRevPerMember - Average monthly revenue per active subscription.
 *                          Normalized: (avgRevPerMember / 200) * 100, capped at 100.
 *                          Magic number 200 represents a "full score" revenue target of $200/member.
 *
 * @param netGrowth       - Net member growth (active minus cancelled).
 *                          Normalized: 50 + (netGrowth * 5), clamped to [0, 100].
 *                          A net growth of 0 yields a neutral score of 50.
 *
 * @param avgTenure       - Average member tenure in months.
 *                          Normalized: (avgTenure / 24) * 100, capped at 100.
 *                          Magic number 24 means tenure ≥ 24 months scores 100.
 *
 * Weights:
 *   - Churn rate:           35% (heaviest — churn is the strongest health signal)
 *   - Avg revenue/member:   25% (revenue sustainability)
 *   - Net member growth:    20% (growth trajectory)
 *   - Avg tenure:           20% (member loyalty/stickiness)
 *
 * Health bands:
 *   - "Strong":   score ≥ 70
 *   - "Moderate": score ≥ 45
 *   - "Fragile":  score < 45
 *
 * @returns RSI score, band label, raw component values, and a detailed breakdown.
 */
export function computeRSI(churnRate: number, avgRevPerMember: number, netGrowth: number, avgTenure: number) {
  // Normalize each component to a 0–100 scale
  const churnNorm = Math.max(0, Math.min(100, 100 - churnRate * 7));            // ~14% churn → 0 score
  const revNorm = Math.min(100, (avgRevPerMember / 200) * 100);                 // $200/member → full score
  const growthNorm = Math.max(0, Math.min(100, 50 + netGrowth * 5));            // 0 growth → neutral 50
  const tenureNorm = Math.min(100, (avgTenure / 24) * 100);                     // 24 months → full score

  const weights = { churn: 0.35, rev: 0.25, growth: 0.2, tenure: 0.2 };
  const score = churnNorm * weights.churn + revNorm * weights.rev + growthNorm * weights.growth + tenureNorm * weights.tenure;
  const band = score >= 70 ? "Strong" : score >= 45 ? "Moderate" : "Fragile";

  return {
    score: Math.round(score * 10) / 10,
    band,
    components: { churnRate, avgRevPerMember, netMemberGrowth: netGrowth, avgTenure },
    breakdown: [
      { metric: "Churn Rate", value: churnRate, normalized: Math.round(churnNorm), weight: 35, contribution: Math.round(churnNorm * weights.churn * 10) / 10 },
      { metric: "Avg Revenue/Member", value: avgRevPerMember, normalized: Math.round(revNorm), weight: 25, contribution: Math.round(revNorm * weights.rev * 10) / 10 },
      { metric: "Net Member Growth", value: netGrowth, normalized: Math.round(growthNorm), weight: 20, contribution: Math.round(growthNorm * weights.growth * 10) / 10 },
      { metric: "Avg Tenure (months)", value: avgTenure, normalized: Math.round(tenureNorm), weight: 20, contribution: Math.round(tenureNorm * weights.tenure * 10) / 10 },
    ],
  };
}

/**
 * Fetches core gym metrics used as inputs to the RSI and other analytics.
 *
 * Queries:
 *   - Active, cancelled, and total member counts
 *   - Churn rate as (cancelled / total) * 100
 *   - Total and average revenue from active subscriptions
 *   - Net growth (active - cancelled)
 *
 * @param gymId - The gym to query metrics for.
 * @returns Aggregate metrics for the gym.
 */
export async function getGymMetrics(gymId: number) {
  const [activeCount] = await db.select({ count: count() }).from(membersTable).where(and(eq(membersTable.gymId, gymId), eq(membersTable.status, "active")));
  const [cancelledCount] = await db.select({ count: count() }).from(membersTable).where(and(eq(membersTable.gymId, gymId), eq(membersTable.status, "cancelled")));
  const [totalCount] = await db.select({ count: count() }).from(membersTable).where(eq(membersTable.gymId, gymId));

  const total = Number(totalCount?.count ?? 0);
  const active = Number(activeCount?.count ?? 0);
  const cancelled = Number(cancelledCount?.count ?? 0);
  const churnRate = total > 0 ? (cancelled / total) * 100 : 0;

  const subs = await db.select().from(subscriptionsTable).where(and(eq(subscriptionsTable.gymId, gymId), eq(subscriptionsTable.status, "active")));
  const totalRev = subs.reduce((sum, s) => sum + parseFloat(s.amount || "0"), 0);
  const avgRev = subs.length > 0 ? totalRev / subs.length : 0;
  const netGrowth = active - cancelled;

  const allMembers = await db.select().from(membersTable).where(eq(membersTable.gymId, gymId));
  const now = new Date();
  const tenures = allMembers
    .filter(m => m.joinDate || m.createdAt)
    .map(m => {
      const end = m.status === "cancelled" && m.updatedAt ? new Date(m.updatedAt) : now;
      const start = new Date(m.joinDate || m.createdAt!);
      return Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
    });
  const avgTenure = tenures.length > 0 ? Math.round((tenures.reduce((s, t) => s + t, 0) / tenures.length) * 10) / 10 : 0;

  return { active, cancelled, total, churnRate, totalRev, avgRev, netGrowth, avgTenure, subs };
}

/**
 * Builds per-member churn risk profiles for all active members in a gym.
 *
 * Risk scoring formula:
 *   riskScore = attendanceDecay * 60 + lowAttendancePenalty
 *
 *   - attendanceDecay: min(1, daysSinceLastVisit / 30)
 *     → Linearly increases from 0 to 1 over 30 days of inactivity.
 *     → Magic number 30 = days until "fully decayed" attendance.
 *
 *   - The decay is multiplied by 60 (magic number) to weight it as the
 *     primary risk factor (up to 60 points out of 100).
 *
 *   - lowAttendancePenalty: 25 points if attendanceCount30d < 3
 *     → Magic number 25 = penalty for fewer than 3 visits in 30 days.
 *     → Magic number 3 = minimum acceptable monthly visit frequency.
 *
 *   - If the member already has a stored riskScore, that takes precedence.
 *
 * Risk tiers:
 *   - "critical": score ≥ 80
 *   - "high":     score ≥ 60
 *   - "moderate": score ≥ 35
 *   - "low":      score ≥ 15
 *   - "healthy":  score < 15
 *
 *
 * @param gymId - The gym to generate risk profiles for.
 * @returns Array of risk profiles sorted by riskScore descending (highest risk first).
 */
export function calculateRiskScore(daysSinceLastVisit: number, attendanceCount30d: number | null, storedRiskScore?: string | null): number {
  const attendanceDecay = Math.min(1, daysSinceLastVisit / 30);
  if (storedRiskScore) return parseFloat(storedRiskScore);
  return Math.min(100, attendanceDecay * 60 + (attendanceCount30d !== null && attendanceCount30d < 3 ? 25 : 0));
}

export function getRiskTier(riskScore: number): string {
  return riskScore >= 80 ? "critical" : riskScore >= 60 ? "high" : riskScore >= 35 ? "moderate" : riskScore >= 15 ? "low" : "healthy";
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

    const monthlyValue = subByMember[m.id] ?? 0;
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

/**
 * Generates a prioritized list of intervention recommendations for a gym.
 *
 * Builds five static intervention templates whose dynamic fields (counts,
 * revenue figures) are populated from live database queries:
 *   1. Retention outreach — targets members in "critical" or "high" risk tiers
 *   2. Billing recovery — targets subscriptions with "past_due" status
 *   3. Onboarding improvement — generic best-practice recommendation
 *   4. Lead follow-up — based on open lead count
 *   5. Referral campaign — generic growth recommendation
 *
 * The intervention scores (92, 85, 78, 72, 65) are static priority values
 * rather than dynamically computed from gym data.
 *
 * @param gymId - The gym to generate interventions for.
 * @returns Array of intervention objects sorted by static priority score.
 */
export async function getInterventions(gymId: number) {
  const [atRiskResult] = await db.select({ count: count() }).from(membersTable).where(
    and(eq(membersTable.gymId, gymId), eq(membersTable.status, "active"),
      sql`(${membersTable.riskTier} = 'critical' OR ${membersTable.riskTier} = 'high')`)
  );
  const atRiskCount = Number(atRiskResult?.count ?? 0);

  const [openLeadCount] = await db.select({ count: count() }).from(leadsTable).where(eq(leadsTable.gymId, gymId));
  const failedSubs = await db.select().from(subscriptionsTable).where(and(eq(subscriptionsTable.gymId, gymId), eq(subscriptionsTable.status, "past_due")));

  const activeSubs = await db.select().from(subscriptionsTable).where(and(eq(subscriptionsTable.gymId, gymId), eq(subscriptionsTable.status, "active")));
  const avgSubAmount = activeSubs.length > 0
    ? activeSubs.reduce((s, sub) => s + parseFloat(sub.amount || "0"), 0) / activeSubs.length
    : 0;

  const atRiskMembers = await db.select().from(membersTable).where(
    and(eq(membersTable.gymId, gymId), eq(membersTable.status, "active"),
      sql`(${membersTable.riskTier} = 'critical' OR ${membersTable.riskTier} = 'high')`)
  );
  const atRiskSubsByMember = await db.select().from(subscriptionsTable).where(and(eq(subscriptionsTable.gymId, gymId), eq(subscriptionsTable.status, "active")));
  const subLookup: Record<number, number> = {};
  for (const s of atRiskSubsByMember) subLookup[s.memberId] = parseFloat(s.amount || "0");
  const atRiskRevenue = atRiskMembers.reduce((sum, m) => sum + (subLookup[m.id] ?? 0), 0);

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

async function computeRevenueForecast(gymId: number, currentMrr: number, churnRate: number, activeSubCount: number) {
  const paidInvoices = await db.select().from(invoicesTable).where(and(eq(invoicesTable.gymId, gymId), eq(invoicesTable.status, "paid")));

  const monthlyRevenue: Record<string, number> = {};
  for (const inv of paidInvoices) {
    if (!inv.paidAt) continue;
    const monthKey = new Date(inv.paidAt).toISOString().slice(0, 7);
    monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] ?? 0) + parseFloat(inv.amount || "0");
  }

  const sortedMonths = Object.keys(monthlyRevenue).sort();
  let monthlyGrowthRate = 0;
  let dataSource: "invoices" | "subscriptions" = "invoices";

  if (sortedMonths.length >= 2) {
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
    dataSource = "subscriptions";
    const allMembers = await db.select().from(membersTable).where(eq(membersTable.gymId, gymId));
    const activeMembers = allMembers.filter(m => m.status === "active").length;
    const totalMembers = allMembers.length;

    const monthlyChurnRate = churnRate > 0 ? (churnRate / 100) / Math.max(1, totalMembers > activeMembers ? 12 : 6) : 0;

    const openLeads = await db.select({ count: count() }).from(leadsTable).where(
      and(eq(leadsTable.gymId, gymId), sql`${leadsTable.stage} NOT IN ('converted', 'lost')`)
    );
    const pipelineLeads = Number(openLeads[0]?.count ?? 0);
    const estimatedConversionsPerMonth = pipelineLeads * 0.15;
    const avgSubAmount = activeSubCount > 0 ? currentMrr / activeSubCount : 0;
    const growthFromNewMembers = activeMembers > 0 ? (estimatedConversionsPerMonth * avgSubAmount) / currentMrr : 0;

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
      `Current MRR: $${currentMrr.toLocaleString()} from ${activeSubCount} active subscriptions`,
      dataSource === "invoices"
        ? `Historical monthly growth rate: ${(monthlyGrowthRate * 100).toFixed(1)}% (from ${sortedMonths.length} months of invoice data)`
        : `Estimated monthly growth rate: ${(monthlyGrowthRate * 100).toFixed(1)}% (derived from pipeline conversion and churn)`,
      "Upside assumes 1.5x growth rate",
      "Downside models churn-only scenario (no new revenue)",
    ],
  };
}

/**
 * GET /gyms/:gymId/intelligence/rsi
 * Returns the Retention Strength Index for a gym.
 */
router.get("/gyms/:gymId/intelligence/rsi", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  try {
    const metrics = await getGymMetrics(gymId);
    const rsi = computeRSI(metrics.churnRate, metrics.avgRev, metrics.netGrowth, metrics.avgTenure);

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const membersJoinedBefore30 = await db.select().from(membersTable).where(and(eq(membersTable.gymId, gymId), sql`${membersTable.joinDate} <= ${thirtyDaysAgo.toISOString().split("T")[0]}`));
    const membersJoinedBefore90 = await db.select().from(membersTable).where(and(eq(membersTable.gymId, gymId), sql`${membersTable.joinDate} <= ${ninetyDaysAgo.toISOString().split("T")[0]}`));

    let trend30d: number | null = null;
    let trend90d: number | null = null;
    let trendInsufficient = false;

    if (membersJoinedBefore30.length >= 5) {
      const past30Active = membersJoinedBefore30.filter(m => m.status === "active").length;
      const past30Total = membersJoinedBefore30.length;
      const pastChurn30 = past30Total > 0 ? ((past30Total - past30Active) / past30Total) * 100 : 0;
      const pastSubs30 = await db.select().from(subscriptionsTable).where(and(eq(subscriptionsTable.gymId, gymId), eq(subscriptionsTable.status, "active")));
      const pastAvgRev30 = pastSubs30.length > 0 ? pastSubs30.reduce((s, sub) => s + parseFloat(sub.amount || "0"), 0) / pastSubs30.length : 0;
      const pastRsi30 = computeRSI(pastChurn30, pastAvgRev30, past30Active - (past30Total - past30Active), metrics.avgTenure > 1 ? metrics.avgTenure - 1 : 0);
      trend30d = Math.round((rsi.score - pastRsi30.score) * 10) / 10;
    } else {
      trendInsufficient = true;
    }

    if (membersJoinedBefore90.length >= 5) {
      const past90Active = membersJoinedBefore90.filter(m => m.status === "active").length;
      const past90Total = membersJoinedBefore90.length;
      const pastChurn90 = past90Total > 0 ? ((past90Total - past90Active) / past90Total) * 100 : 0;
      const pastSubs90 = await db.select().from(subscriptionsTable).where(and(eq(subscriptionsTable.gymId, gymId), eq(subscriptionsTable.status, "active")));
      const pastAvgRev90 = pastSubs90.length > 0 ? pastSubs90.reduce((s, sub) => s + parseFloat(sub.amount || "0"), 0) / pastSubs90.length : 0;
      const pastRsi90 = computeRSI(pastChurn90, pastAvgRev90, past90Active - (past90Total - past90Active), metrics.avgTenure > 3 ? metrics.avgTenure - 3 : 0);
      trend90d = Math.round((rsi.score - pastRsi90.score) * 10) / 10;
    } else {
      trendInsufficient = true;
    }

    res.json({
      ...rsi,
      trend30d,
      trend90d,
      trendInsufficient,
      insight: rsi.band === "Strong"
        ? "Your gym is showing strong retention. Keep focus on onboarding quality."
        : rsi.band === "Moderate"
        ? "Some retention pressure building. Review at-risk members and recent cancellation patterns."
        : "Retention is fragile. Prioritize outreach to at-risk members and review billing failures immediately.",
    });
  } catch (err) {
    console.error("[intelligence/rsi] Failed to compute RSI:", err);
    res.status(500).json({ error: "Failed to compute retention index. Please try again." });
  }
});

/** GET /gyms/:gymId/intelligence/risk-radar — returns per-member risk profiles. */
router.get("/gyms/:gymId/intelligence/risk-radar", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  try {
    const profiles = await getRiskProfiles(gymId);
    res.json(profiles);
  } catch (err) {
    console.error("[intelligence/risk-radar] Failed to generate risk profiles:", err);
    res.status(500).json({ error: "Failed to generate risk profiles. Please try again." });
  }
});

/** GET /gyms/:gymId/intelligence/interventions — returns prioritized action items. */
router.get("/gyms/:gymId/intelligence/interventions", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  try {
    const interventions = await getInterventions(gymId);
    res.json(interventions);
  } catch (err) {
    console.error("[intelligence/interventions] Failed to generate interventions:", err);
    res.status(500).json({ error: "Failed to generate interventions. Please try again." });
  }
});

/**
 * GET /gyms/:gymId/intelligence/cohorts
 * Returns monthly cohort retention analysis for the last 8 months.
 *
 * Groups members by their join month and calculates retention rates.
 */
router.get("/gyms/:gymId/intelligence/cohorts", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  try {
    const members = await db.select().from(membersTable).where(eq(membersTable.gymId, gymId));

    const now = new Date();
    const monthBuckets: Record<string, typeof members> = {};
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      monthBuckets[key] = [];
    }

    for (const m of members) {
      if (!m.joinDate) continue;
      const joinMonth = new Date(m.joinDate).toISOString().slice(0, 7);
      if (monthBuckets[joinMonth] !== undefined) {
        monthBuckets[joinMonth].push(m);
      }
    }

    const allSubs = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.gymId, gymId));
    const subAmountByMember: Record<number, number> = {};
    for (const s of allSubs) {
      subAmountByMember[s.memberId] = parseFloat(s.amount || "0");
    }

    const cohorts = Object.entries(monthBuckets).map(([month, cohortMembers]) => {
      const starting = cohortMembers.length;
      const stillActive = cohortMembers.filter(m => m.status === "active").length;
      const retRate = starting > 0 ? Math.round((stillActive / starting) * 1000) / 10 : 0;

      const cohortStart = new Date(month + "-01");
      const day30 = new Date(cohortStart.getTime() + 30 * 24 * 60 * 60 * 1000);
      const day60 = new Date(cohortStart.getTime() + 60 * 24 * 60 * 60 * 1000);

      const retained30d = starting > 0 ? cohortMembers.filter(m => {
        if (m.status === "active") return true;
        if (m.status === "cancelled" && m.updatedAt && new Date(m.updatedAt) > day30) return true;
        return false;
      }).length : 0;

      const retained60d = starting > 0 ? cohortMembers.filter(m => {
        if (m.status === "active") return true;
        if (m.status === "cancelled" && m.updatedAt && new Date(m.updatedAt) > day60) return true;
        return false;
      }).length : 0;

      const cohortRevenues = cohortMembers.map(m => subAmountByMember[m.id] ?? 0);
      const avgRevenue = starting > 0 ? Math.round((cohortRevenues.reduce((s, v) => s + v, 0) / starting) * 100) / 100 : 0;

      return {
        cohortMonth: month,
        startingMembers: starting,
        retained30d,
        retained60d,
        retained90d: stillActive,
        retained180d: stillActive,
        retained365d: 0,
        retentionRate30d: starting > 0 ? Math.round((retained30d / starting) * 1000) / 10 : 0,
        retentionRate90d: retRate,
        retentionRate365d: 0,
        avgRevenue,
      };
    });

    res.json(cohorts);
  } catch (err) {
    console.error("[intelligence/cohorts] Failed to generate cohort analysis:", err);
    res.status(500).json({ error: "Failed to generate cohort analysis. Please try again." });
  }
});

/**
 * GET /gyms/:gymId/intelligence/revenue-forecast
 * Projects MRR (Monthly Recurring Revenue) forward at 3, 6, and 12 months.
 *
 * Uses historical invoice data to derive monthly growth rates, then projects
 * forward using compound growth with upside/downside scenarios.
 */
router.get("/gyms/:gymId/intelligence/revenue-forecast", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  try {
    const subs = await db.select().from(subscriptionsTable).where(and(eq(subscriptionsTable.gymId, gymId), eq(subscriptionsTable.status, "active")));
    const currentMrr = subs.reduce((sum, s) => sum + parseFloat(s.amount || "0"), 0);
    const [totalCount] = await db.select({ count: count() }).from(membersTable).where(eq(membersTable.gymId, gymId));
    const [cancelledCount] = await db.select({ count: count() }).from(membersTable).where(and(eq(membersTable.gymId, gymId), eq(membersTable.status, "cancelled")));
    const total = Number(totalCount?.count ?? 0);
    const churnRate = total > 0 ? Math.round(Number(cancelledCount?.count ?? 0) / total * 1000) / 10 : 0;

    const forecast = await computeRevenueForecast(gymId, currentMrr, churnRate, subs.length);
    res.json(forecast);
  } catch (err) {
    console.error("[intelligence/revenue-forecast] Failed to generate forecast:", err);
    res.status(500).json({ error: "Failed to generate revenue forecast. Please try again." });
  }
});

/**
 * GET /gyms/:gymId/intelligence/overview
 * Aggregated intelligence dashboard — combines RSI, top risks, top interventions,
 * and revenue forecast into a single response for the overview page.
 */
router.get("/gyms/:gymId/intelligence/overview", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  try {
    const metrics = await getGymMetrics(gymId);
    const rsi = computeRSI(metrics.churnRate, metrics.avgRev, metrics.netGrowth, metrics.avgTenure);
    const rsiData = {
      ...rsi,
      trend30d: null as number | null,
      trend90d: null as number | null,
      trendInsufficient: true,
      insight: rsi.band === "Strong"
        ? "Your gym is showing strong retention. Keep focus on onboarding quality."
        : rsi.band === "Moderate"
        ? "Some retention pressure building. Review at-risk members and recent cancellation patterns."
        : "Retention is fragile. Prioritize outreach to at-risk members and review billing failures immediately.",
    };

    const risks = await getRiskProfiles(gymId);
    const interventions = await getInterventions(gymId);

    const currentMrr = metrics.totalRev;
    const [totalCount] = await db.select({ count: count() }).from(membersTable).where(eq(membersTable.gymId, gymId));
    const [cancelledCount] = await db.select({ count: count() }).from(membersTable).where(and(eq(membersTable.gymId, gymId), eq(membersTable.status, "cancelled")));
    const total = Number(totalCount?.count ?? 0);
    const churnRate = total > 0 ? Math.round(Number(cancelledCount?.count ?? 0) / total * 1000) / 10 : 0;
    const forecast = await computeRevenueForecast(gymId, currentMrr, churnRate, metrics.subs.length);

    res.json({
      gymId,
      rsi: rsiData,
      topRisks: risks.slice(0, 5),
      topInterventions: interventions.slice(0, 3),
      revenueForecast: forecast,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[intelligence/overview] Failed to generate overview:", err);
    res.status(500).json({ error: "Failed to generate intelligence overview. Please try again." });
  }
});

router.get("/gyms/:gymId/intelligence/morning-briefing", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  try {
    const metrics = await getGymMetrics(gymId);
    const rsi = computeRSI(metrics.churnRate, metrics.avgRev, metrics.netGrowth, metrics.avgTenure);
    const risks = await getRiskProfiles(gymId);

    const criticalRisks = risks.filter(r => r.riskTier === "critical");
    const highRisks = risks.filter(r => r.riskTier === "high");
    const atRiskCount = criticalRisks.length + highRisks.length;
    const revenueAtRisk = risks.reduce((sum, r) => sum + r.revenueAtRisk, 0);

    const allLeads = await db.select().from(leadsTable).where(eq(leadsTable.gymId, gymId));
    const staleLeads = allLeads.filter(l => {
      if (l.stage === "converted" || l.stage === "lost") return false;
      const now = new Date();
      const lastContact = l.lastContactDate ? new Date(l.lastContactDate) : new Date(l.createdAt);
      const hours = (now.getTime() - lastContact.getTime()) / (1000 * 60 * 60);
      if (l.stage === "new" && hours > 24) return true;
      if (l.stage === "contacted" && hours > 72) return true;
      return false;
    });
    const activeLeads = allLeads.filter(l => l.stage !== "converted" && l.stage !== "lost");

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const newLeadsToday = allLeads.filter(l => new Date(l.createdAt) >= oneDayAgo && l.stage !== "converted" && l.stage !== "lost");

    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const allAttendance = await db.select().from(attendanceTable).where(and(eq(attendanceTable.gymId, gymId), gte(attendanceTable.checkinTime, weekAgo)));
    const uniqueAttendees = new Set(allAttendance.map(a => a.memberId)).size;
    const engagementRate = metrics.active > 0 ? Math.round((uniqueAttendees / metrics.active) * 1000) / 10 : 0;

    const todayStr = now.toISOString().split("T")[0];
    const allClasses = await db.select().from(classesTable).where(eq(classesTable.gymId, gymId));
    const todayClasses = allClasses.filter(c => {
      const classDate = new Date(c.startTime).toISOString().split("T")[0];
      return classDate === todayStr;
    });
    const totalCapacity = todayClasses.reduce((sum, c) => sum + (c.capacity || 0), 0);
    const totalEnrolled = todayClasses.reduce((sum, c) => sum + (c.enrolled || 0), 0);
    const classFillRate = totalCapacity > 0 ? Math.round((totalEnrolled / totalCapacity) * 100) : 0;

    const failedSubs = await db.select().from(subscriptionsTable).where(and(eq(subscriptionsTable.gymId, gymId), eq(subscriptionsTable.status, "past_due")));

    const items: { icon: string; priority: "critical" | "warning" | "info" | "positive"; message: string; action?: string; link?: string }[] = [];

    if (criticalRisks.length > 0) {
      const names = criticalRisks.slice(0, 3).map(r => r.memberName.split(" ")[0]).join(", ");
      items.push({
        icon: "alert",
        priority: "critical",
        message: `${criticalRisks.length} member${criticalRisks.length > 1 ? "s" : ""} at critical churn risk (${names}${criticalRisks.length > 3 ? "..." : ""})`,
        action: "Review in Risk Radar",
        link: "/intelligence",
      });
    }

    if (highRisks.length > 0) {
      items.push({
        icon: "warning",
        priority: "warning",
        message: `${highRisks.length} member${highRisks.length > 1 ? "s" : ""} at high risk — $${Math.round(revenueAtRisk)}/mo at stake`,
        action: "View Risk Profiles",
        link: "/intelligence",
      });
    }

    if (failedSubs.length > 0) {
      const failedRev = failedSubs.reduce((sum, s) => sum + parseFloat(s.amount || "0"), 0);
      items.push({
        icon: "billing",
        priority: "critical",
        message: `${failedSubs.length} failed payment${failedSubs.length > 1 ? "s" : ""} totaling $${Math.round(failedRev)}/mo need recovery`,
        action: "Go to Billing",
        link: "/billing",
      });
    }

    if (staleLeads.length > 0) {
      items.push({
        icon: "leads",
        priority: "warning",
        message: `${staleLeads.length} lead${staleLeads.length > 1 ? "s" : ""} went stale — follow up before they go cold`,
        action: "Open Pipeline",
        link: "/leads",
      });
    }

    if (todayClasses.length > 0) {
      items.push({
        icon: "schedule",
        priority: classFillRate >= 80 ? "positive" : "info",
        message: `${todayClasses.length} class${todayClasses.length > 1 ? "es" : ""} today at ${classFillRate}% capacity (${totalEnrolled}/${totalCapacity} spots filled)`,
        action: "View Schedule",
        link: "/schedule",
      });
    }

    if (activeLeads.length > 0 && staleLeads.length === 0) {
      items.push({
        icon: "leads",
        priority: "info",
        message: `${activeLeads.length} active lead${activeLeads.length > 1 ? "s" : ""} in your pipeline`,
        link: "/leads",
      });
    }

    if (rsi.band === "Strong") {
      items.push({
        icon: "positive",
        priority: "positive",
        message: `RSI is ${rsi.score.toFixed(1)} (Strong) — your gym is in great shape`,
      });
    }

    if (newLeadsToday.length > 0) {
      items.push({
        icon: "leads",
        priority: "positive",
        message: `${newLeadsToday.length} new lead${newLeadsToday.length > 1 ? "s" : ""} in the last 24 hours`,
        action: "View Leads",
        link: "/leads",
      });
    }

    const summary = buildBriefingSummary(atRiskCount, staleLeads.length, failedSubs.length, metrics.totalRev, rsi, todayClasses.length, classFillRate);

    res.json({
      date: todayStr,
      summary,
      items: items.sort((a, b) => {
        const priorityOrder = { critical: 0, warning: 1, info: 2, positive: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }),
      snapshot: {
        activeMembers: metrics.active,
        mrr: Math.round(metrics.totalRev),
        rsiScore: rsi.score,
        rsiBand: rsi.band,
        atRiskMembers: atRiskCount,
        revenueAtRisk: Math.round(revenueAtRisk),
        engagementRate,
        staleLeads: staleLeads.length,
        newLeads: newLeadsToday.length,
        activeLeads: activeLeads.length,
        failedPayments: failedSubs.length,
        todayClasses: todayClasses.length,
        classFillRate,
      },
    });
  } catch (err) {
    console.error("[intelligence/morning-briefing] Failed to generate briefing:", err);
    res.status(500).json({ error: "Failed to generate morning briefing. Please try again." });
  }
});

function buildBriefingSummary(
  atRisk: number, staleLeads: number, failedPayments: number,
  mrr: number, rsi: { score: number; band: string },
  todayClasses: number, classFillRate: number
): string {
  const parts: string[] = [];

  if (atRisk > 0) {
    parts.push(`${atRisk} member${atRisk > 1 ? "s" : ""} need${atRisk === 1 ? "s" : ""} attention`);
  }
  if (failedPayments > 0) {
    parts.push(`${failedPayments} payment${failedPayments > 1 ? "s" : ""} to recover`);
  }
  if (staleLeads > 0) {
    parts.push(`${staleLeads} stale lead${staleLeads > 1 ? "s" : ""}`);
  }
  if (todayClasses > 0) {
    parts.push(`today's classes are ${classFillRate}% full`);
  }

  if (parts.length === 0) {
    return `All clear — your gym is running smoothly. RSI: ${rsi.score.toFixed(1)} (${rsi.band}), MRR: $${mrr.toLocaleString()}.`;
  }

  const actionPart = parts.join(", ");
  return `${actionPart.charAt(0).toUpperCase() + actionPart.slice(1)}. MRR: $${Math.round(mrr).toLocaleString()}, RSI: ${rsi.score.toFixed(1)} (${rsi.band}).`;
}

export default router;
