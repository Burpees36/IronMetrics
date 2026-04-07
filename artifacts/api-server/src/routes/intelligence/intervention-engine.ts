import { eq, and, count, sql, gte } from "drizzle-orm";
import { db, membersTable, subscriptionsTable, leadsTable, attendanceTable, recommendationLearningStatsTable, classesTable } from "@workspace/db";
import { computeBlendedMRR, activeMemberCondition, getMemberRevenueFromMembersTable } from "../../blendedMetrics";

interface Intervention {
  id: string;
  category: string;
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  urgency: "immediate" | "this_week" | "this_month";
  score: number;
  expectedRevenue: number | null;
  affectedMembers: number | null;
  affectedMemberIds?: number[] | null;
  actions: string[];
  status: string;
}

interface InterventionContext {
  gymId: number;
  atRiskMembers: Array<{ id: number; riskTier: string | null; monthlyRevenue: string | null }>;
  atRiskCount: number;
  atRiskRevenue: number;
  failedSubs: Array<{ memberId: number; amount: string | null }>;
  openLeadCount: number;
  staleLeadCount: number;
  avgSubAmount: number;
  activeBillableMembers: number;
  totalMRR: number;
  arm: number;
  newMembers: Array<{ id: number; joinDate: string | null; createdAt: Date | null; attendanceCount30d: number | null }>;
  recentlyCancelled: Array<{ id: number; updatedAt: Date | null; monthlyRevenue: string | null }>;
  engagementRate: number;
  engagementChange: number;
  learningStats: Map<string, { expectedImpact: number; confidence: number; sampleSize: number }>;
  cancelledMembers: number;
  longTenureActiveCount: number;
  recentClasses: Array<{ capacity: number; enrolled: number }>;
  avgFillRate: number;
}

type InterventionBuilder = (ctx: InterventionContext) => Intervention | null;

function fmtDollars(val: number): string {
  if (val >= 1000) return `$${(val / 1000).toFixed(1)}k`;
  return `$${Math.round(val).toLocaleString()}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function blendWithLearning(
  baseScore: number,
  category: string,
  learningStats: Map<string, { expectedImpact: number; confidence: number; sampleSize: number }>,
): number {
  const stats = learningStats.get(category);
  if (!stats || stats.sampleSize < 1) return baseScore;

  const impactBoost = stats.expectedImpact * stats.confidence * 10;
  const blended = baseScore * (1 - stats.confidence * 0.3) + (baseScore + impactBoost) * (stats.confidence * 0.3);
  return clamp(Math.round(blended), 0, 99);
}

const retentionIntervention: InterventionBuilder = (ctx) => {
  if (ctx.atRiskCount === 0) return null;

  const severityFactor = clamp(ctx.atRiskCount / Math.max(1, ctx.activeBillableMembers), 0, 1);
  const revenueFactor = ctx.totalMRR > 0 ? clamp(ctx.atRiskRevenue / ctx.totalMRR, 0, 1) : 0;
  const baseScore = Math.round(60 + severityFactor * 25 + revenueFactor * 14);
  const score = blendWithLearning(clamp(baseScore, 40, 99), "retention", ctx.learningStats);

  const pct = ctx.activeBillableMembers > 0 ? Math.round((ctx.atRiskCount / ctx.activeBillableMembers) * 100) : 0;
  const revenueStr = ctx.atRiskRevenue > 0 ? ` That's ${fmtDollars(ctx.atRiskRevenue)}/mo walking out the door if you don't act.` : "";

  let description: string;
  if (ctx.atRiskCount >= 10) {
    description = `${ctx.atRiskCount} members (${pct}% of your roster) are showing elevated risk signals.${revenueStr} Start with the critical-tier members — personal outreach can reduce churn by 15–25%.`;
  } else if (ctx.atRiskCount >= 3) {
    description = `${ctx.atRiskCount} member${ctx.atRiskCount !== 1 ? "s" : ""} ${ctx.atRiskCount !== 1 ? "are" : "is"} flagged as at-risk.${revenueStr} A quick personal check-in often turns this around before it becomes a cancellation.`;
  } else {
    description = `${ctx.atRiskCount} member${ctx.atRiskCount !== 1 ? "s" : ""} ${ctx.atRiskCount !== 1 ? "need" : "needs"} attention.${revenueStr} Early outreach is the cheapest retention tool you have.`;
  }

  return {
    id: "int-retention",
    category: "retention",
    title: "Reach out to at-risk members",
    description,
    impact: ctx.atRiskCount >= 5 || ctx.atRiskRevenue > 500 ? "high" : "medium",
    urgency: ctx.atRiskCount >= 5 ? "immediate" : "this_week",
    score,
    expectedRevenue: Math.round(ctx.atRiskRevenue * 100) / 100,
    affectedMembers: ctx.atRiskCount,
    actions: [
      "Review risk radar for critical-tier members",
      "Draft personalized check-in messages",
      "Schedule 1:1 calls with top at-risk members",
      "Track response and re-engagement within 7 days",
    ],
    status: "pending",
  };
};

const billingIntervention: InterventionBuilder = (ctx) => {
  if (ctx.failedSubs.length === 0) return null;

  const failedAmount = ctx.failedSubs.reduce((s, sub) => s + parseFloat(sub.amount || "0"), 0);
  const severityFactor = clamp(ctx.failedSubs.length / Math.max(1, ctx.activeBillableMembers), 0, 1);
  const revenueFactor = ctx.totalMRR > 0 ? clamp(failedAmount / ctx.totalMRR, 0, 1) : 0;
  const baseScore = Math.round(55 + severityFactor * 20 + revenueFactor * 20);
  const score = blendWithLearning(clamp(baseScore, 35, 99), "billing", ctx.learningStats);

  let description: string;
  if (ctx.failedSubs.length >= 5) {
    description = `${ctx.failedSubs.length} subscriptions have payment issues totaling ${fmtDollars(failedAmount)}/mo. Most are just expired cards — a batch of friendly reminders typically recovers 60–80% within 48 hours.`;
  } else {
    description = `${ctx.failedSubs.length} subscription${ctx.failedSubs.length !== 1 ? "s" : ""} with payment ${ctx.failedSubs.length !== 1 ? "issues" : "issue"} (${fmtDollars(failedAmount)}/mo). Usually just an expired card — a quick heads-up resolves most of these.`;
  }

  return {
    id: "int-billing",
    category: "billing",
    title: "Recover failed payments",
    description,
    impact: failedAmount > 300 ? "high" : "medium",
    urgency: ctx.failedSubs.length >= 3 ? "immediate" : "this_week",
    score,
    expectedRevenue: failedAmount,
    affectedMembers: ctx.failedSubs.length,
    actions: [
      "Review dunning report for failed charges",
      "Send payment update reminders",
      "Offer alternative payment methods",
      "Follow up with personal call after 48 hours",
    ],
    status: "pending",
  };
};

const onboardingIntervention: InterventionBuilder = (ctx) => {
  if (ctx.newMembers.length === 0) return null;

  const needAttention = ctx.newMembers.filter(m => {
    return (m.attendanceCount30d ?? 0) < 4;
  });

  if (needAttention.length === 0) return null;

  const ratio = needAttention.length / ctx.newMembers.length;
  const baseScore = Math.round(50 + ratio * 30 + clamp(needAttention.length / 10, 0, 1) * 15);
  const score = blendWithLearning(clamp(baseScore, 35, 95), "onboarding", ctx.learningStats);

  let description: string;
  if (needAttention.length >= 5) {
    description = `${needAttention.length} of your ${ctx.newMembers.length} new members (joined in the last 30 days) haven't built a consistent attendance habit yet. The first month is make-or-break — structured onboarding increases 90-day retention by 20%.`;
  } else {
    description = `${needAttention.length} new member${needAttention.length !== 1 ? "s" : ""} joined recently but ${needAttention.length !== 1 ? "haven't" : "hasn't"} attended enough yet. A personal welcome and intro session can make the difference between a long-term member and a quick cancellation.`;
  }

  return {
    id: "int-onboarding",
    category: "onboarding",
    title: "Improve first-30-day experience",
    description,
    impact: needAttention.length >= 5 ? "high" : "medium",
    urgency: "this_week",
    score,
    expectedRevenue: ctx.avgSubAmount > 0 ? Math.round(needAttention.length * ctx.avgSubAmount * 100) / 100 : null,
    affectedMembers: needAttention.length,
    actions: [
      "Create welcome sequence for new members",
      "Schedule intro sessions within first week",
      "Assign accountability buddies",
      "Check in at day 7, 14, and 30",
    ],
    status: "pending",
  };
};

const leadsIntervention: InterventionBuilder = (ctx) => {
  if (ctx.openLeadCount === 0) return null;

  const staleRatio = ctx.openLeadCount > 0 ? ctx.staleLeadCount / ctx.openLeadCount : 0;
  const baseScore = Math.round(40 + clamp(ctx.openLeadCount / 20, 0, 1) * 20 + staleRatio * 25);
  const score = blendWithLearning(clamp(baseScore, 30, 92), "leads", ctx.learningStats);

  const potentialRevenue = ctx.avgSubAmount > 0 ? Math.round(ctx.openLeadCount * ctx.avgSubAmount * 100) / 100 : null;

  let description: string;
  if (ctx.staleLeadCount > 0 && ctx.staleLeadCount >= ctx.openLeadCount * 0.5) {
    description = `${ctx.openLeadCount} lead${ctx.openLeadCount !== 1 ? "s" : ""} in your pipeline, and ${ctx.staleLeadCount} went stale — they were interested but nobody followed up. Speed to lead matters: prospects contacted within 1 hour are 7x more likely to convert.`;
  } else {
    description = `${ctx.openLeadCount} lead${ctx.openLeadCount !== 1 ? "s" : ""} in your pipeline.${potentialRevenue ? ` That's potentially ${fmtDollars(potentialRevenue)}/mo in new revenue if you convert even a fraction.` : ""} Consistent follow-up is what separates growing gyms from stagnant ones.`;
  }

  return {
    id: "int-leads",
    category: "leads",
    title: "Follow up on open leads",
    description,
    impact: ctx.openLeadCount >= 10 || staleRatio > 0.5 ? "high" : "medium",
    urgency: ctx.staleLeadCount >= 3 ? "immediate" : "this_week",
    score,
    expectedRevenue: potentialRevenue,
    affectedMembers: null,
    actions: [
      "Review lead pipeline for stale entries",
      "Send follow-up emails or texts",
      "Offer free trial or No Sweat Intro",
      "Remove or archive truly cold leads",
    ],
    status: "pending",
  };
};

const campaignIntervention: InterventionBuilder = (ctx) => {
  if (ctx.activeBillableMembers < 10) return null;

  const hasGoodRetention = ctx.atRiskCount < Math.max(2, ctx.activeBillableMembers * 0.05);
  const hasLowPipeline = ctx.openLeadCount < 5;
  const hasLongTenureMembers = ctx.longTenureActiveCount >= 5;

  if (!hasLongTenureMembers && !hasLowPipeline) return null;
  if (!hasGoodRetention && !hasLowPipeline) return null;

  const baseScore = Math.round(
    35 +
    (hasGoodRetention ? 15 : 0) +
    (hasLowPipeline ? 15 : 0) +
    (hasLongTenureMembers ? 10 : 0),
  );
  const score = blendWithLearning(clamp(baseScore, 30, 85), "campaign", ctx.learningStats);

  let description: string;
  if (hasLowPipeline && hasLongTenureMembers) {
    description = `Your lead pipeline is thin (${ctx.openLeadCount} leads), but you have ${ctx.longTenureActiveCount} members with 12+ months of tenure — your best referral advocates. Member referrals have 3x higher retention than cold leads. A structured referral program could fill your pipeline without ad spend.`;
  } else if (hasLowPipeline) {
    description = `Your lead pipeline is thin (${ctx.openLeadCount} leads). A referral campaign leveraging your existing members is the most cost-effective way to refill it. Referral members retain 3x better than cold leads.`;
  } else {
    description = `You have ${ctx.longTenureActiveCount} loyal members with 12+ months of tenure. They're your strongest advocates — a referral incentive could turn their loyalty into growth without spending on ads.`;
  }

  return {
    id: "int-campaign",
    category: "campaign",
    title: "Launch referral campaign",
    description,
    impact: "medium",
    urgency: "this_month",
    score,
    expectedRevenue: null,
    affectedMembers: null,
    actions: [
      "Design referral incentive structure",
      "Announce to current members",
      "Create tracking system",
      "Measure results after 30 days",
    ],
    status: "pending",
  };
};

const pricingIntervention: InterventionBuilder = (ctx) => {
  if (ctx.activeBillableMembers < 5) return null;
  const ARM_BENCHMARK = 120;
  if (ctx.arm >= ARM_BENCHMARK) return null;

  const gap = ARM_BENCHMARK - ctx.arm;
  const gapRatio = gap / ARM_BENCHMARK;
  const potentialUplift = Math.round(ctx.activeBillableMembers * gap * 0.3);

  const baseScore = Math.round(40 + gapRatio * 40 + clamp(potentialUplift / 1000, 0, 1) * 15);
  const score = blendWithLearning(clamp(baseScore, 30, 90), "pricing", ctx.learningStats);

  let description: string;
  if (ctx.arm < 80) {
    description = `Your average revenue per member is ${fmtDollars(ctx.arm)}/mo — well below the ${fmtDollars(ARM_BENCHMARK)} benchmark. Even a ${fmtDollars(Math.round(gap * 0.5))}/mo increase across your base would add ${fmtDollars(Math.round(ctx.activeBillableMembers * gap * 0.5))}/mo without adding a single member.`;
  } else {
    description = `Your average revenue per member is ${fmtDollars(ctx.arm)}/mo, which is below the ${fmtDollars(ARM_BENCHMARK)} benchmark. Tiered pricing, premium add-ons, or a modest rate increase could close the gap and add roughly ${fmtDollars(potentialUplift)}/mo.`;
  }

  return {
    id: "int-pricing",
    category: "pricing",
    title: "Pricing & revenue-per-member opportunity",
    description,
    impact: gapRatio > 0.4 ? "high" : "medium",
    urgency: "this_month",
    score,
    expectedRevenue: potentialUplift,
    affectedMembers: ctx.activeBillableMembers,
    actions: [
      "Review current pricing tiers and membership mix",
      "Identify members on legacy or low-cost plans",
      "Consider premium add-ons (personal training, nutrition, open gym)",
      "Plan a pricing update with grandfather clauses for loyal members",
    ],
    status: "pending",
  };
};

const engagementDeclineIntervention: InterventionBuilder = (ctx) => {
  if (ctx.activeBillableMembers < 5) return null;
  if (ctx.engagementChange >= 0) return null;

  const dropMagnitude = Math.abs(ctx.engagementChange);
  if (dropMagnitude < 5) return null;

  const baseScore = Math.round(45 + clamp(dropMagnitude / 30, 0, 1) * 40);
  const score = blendWithLearning(clamp(baseScore, 35, 92), "engagement", ctx.learningStats);

  let description: string;
  if (dropMagnitude >= 15) {
    description = `Gym-wide attendance dropped ${dropMagnitude.toFixed(1)} percentage points this week (now at ${ctx.engagementRate.toFixed(1)}%). That's a significant shift — it could be seasonal, scheduling, or a sign of broader disengagement. Worth investigating before it turns into cancellations.`;
  } else {
    description = `Attendance is trending down ${dropMagnitude.toFixed(1)} points this week to ${ctx.engagementRate.toFixed(1)}%. Keep an eye on this — consistent drops often precede churn. An attendance challenge or schedule adjustment could reverse the trend.`;
  }

  return {
    id: "int-engagement",
    category: "engagement",
    title: "Engagement decline alert",
    description,
    impact: dropMagnitude >= 15 ? "high" : "medium",
    urgency: dropMagnitude >= 15 ? "immediate" : "this_week",
    score,
    expectedRevenue: null,
    affectedMembers: null,
    actions: [
      "Review class attendance data for patterns",
      "Check if schedule changes or holidays are a factor",
      "Run a re-engagement challenge or attendance incentive",
      "Reach out to members who haven't visited recently",
    ],
    status: "pending",
  };
};

const newMemberRampUpIntervention: InterventionBuilder = (ctx) => {
  const veryNew = ctx.newMembers.filter(m => {
    if (!m.joinDate && !m.createdAt) return false;
    const joinDate = new Date(m.joinDate || m.createdAt!);
    const daysSinceJoin = Math.floor((Date.now() - joinDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysSinceJoin <= 14 && (m.attendanceCount30d ?? 0) < 2;
  });

  if (veryNew.length === 0) return null;

  const baseScore = Math.round(50 + clamp(veryNew.length / 8, 0, 1) * 30);
  const score = blendWithLearning(clamp(baseScore, 40, 90), "onboarding", ctx.learningStats);

  const description = veryNew.length >= 3
    ? `${veryNew.length} members joined in the last 2 weeks but have attended fewer than 2 classes each. The first 14 days are the highest-risk window — if they don't build a habit now, they likely won't stick. A personal check-in or invite to a specific class makes a huge difference.`
    : `${veryNew.length} new member${veryNew.length !== 1 ? "s" : ""} joined in the last 2 weeks with very low attendance. The first 14 days matter most — reach out now while they're still excited about joining.`;

  return {
    id: "int-newmember-ramp",
    category: "onboarding",
    title: "New member ramp-up needed",
    description,
    impact: veryNew.length >= 3 ? "high" : "medium",
    urgency: "immediate",
    score,
    expectedRevenue: ctx.avgSubAmount > 0 ? Math.round(veryNew.length * ctx.avgSubAmount * 100) / 100 : null,
    affectedMembers: veryNew.length,
    actions: [
      "Send a personal welcome message to each new member",
      "Invite them to a specific class that matches their goals",
      "Schedule a free intro session or goal-setting call",
      "Set a reminder to check in at day 7 and day 14",
    ],
    status: "pending",
  };
};

const winBackIntervention: InterventionBuilder = (ctx) => {
  const recentlyCancelled = ctx.recentlyCancelled.filter(m => {
    if (!m.updatedAt) return false;
    const daysSinceCancel = Math.floor((Date.now() - new Date(m.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
    return daysSinceCancel <= 60;
  });

  if (recentlyCancelled.length === 0) return null;

  const recoverableRevenue = recentlyCancelled.reduce((sum, m) => sum + parseFloat(m.monthlyRevenue || "0"), 0);
  const baseScore = Math.round(35 + clamp(recentlyCancelled.length / 10, 0, 1) * 25 + (recoverableRevenue > 500 ? 15 : 5));
  const score = blendWithLearning(clamp(baseScore, 30, 85), "retention", ctx.learningStats);

  let description: string;
  if (recentlyCancelled.length >= 5) {
    description = `${recentlyCancelled.length} members cancelled in the last 60 days.${recoverableRevenue > 0 ? ` That's ${fmtDollars(recoverableRevenue)}/mo that left.` : ""} Win-back campaigns within 60 days of cancellation have a 10–15% success rate — much cheaper than acquiring new members.`;
  } else {
    description = `${recentlyCancelled.length} member${recentlyCancelled.length !== 1 ? "s" : ""} cancelled recently.${recoverableRevenue > 0 ? ` Worth ${fmtDollars(recoverableRevenue)}/mo.` : ""} A personal outreach or a "we miss you" offer within 60 days often brings people back.`;
  }

  return {
    id: "int-winback",
    category: "retention",
    title: "Win-back recently cancelled members",
    description,
    impact: recentlyCancelled.length >= 5 || recoverableRevenue > 500 ? "high" : "medium",
    urgency: "this_week",
    score,
    expectedRevenue: recoverableRevenue > 0 ? Math.round(recoverableRevenue * 0.12 * 100) / 100 : null,
    affectedMembers: recentlyCancelled.length,
    affectedMemberIds: recentlyCancelled.map(m => m.id),
    actions: [
      "Review recently cancelled members for win-back potential",
      "Send a personal 'we miss you' message or call",
      "Offer a comeback incentive (free week, waived join fee)",
      "Track who returns and adjust approach based on results",
    ],
    status: "pending",
  };
};

const capacityOptimizationIntervention: InterventionBuilder = (ctx) => {
  if (ctx.recentClasses.length < 5) return null;

  const lowFillClasses = ctx.recentClasses.filter(c => c.capacity > 0 && (c.enrolled / c.capacity) < 0.4);
  const fullClasses = ctx.recentClasses.filter(c => c.capacity > 0 && (c.enrolled / c.capacity) >= 0.95);
  const lowFillRate = ctx.recentClasses.length > 0 ? lowFillClasses.length / ctx.recentClasses.length : 0;
  const fullRate = ctx.recentClasses.length > 0 ? fullClasses.length / ctx.recentClasses.length : 0;

  if (lowFillRate < 0.3 && fullRate < 0.3) return null;

  const isLowFillProblem = lowFillRate >= 0.3;
  const isCapacityProblem = fullRate >= 0.3;

  const baseScore = Math.round(
    35 +
    (isLowFillProblem ? lowFillRate * 30 : 0) +
    (isCapacityProblem ? fullRate * 25 : 0),
  );
  const score = blendWithLearning(clamp(baseScore, 30, 85), "capacity", ctx.learningStats);

  let description: string;
  let title: string;
  if (isLowFillProblem && isCapacityProblem) {
    title = "Optimize class schedule capacity";
    description = `Your schedule has a split problem: ${lowFillClasses.length} classes are under 40% capacity while ${fullClasses.length} are at or over capacity. Consider consolidating low-fill time slots and adding capacity or sessions at peak times. Your average fill rate is ${ctx.avgFillRate.toFixed(0)}%.`;
  } else if (isLowFillProblem) {
    title = "Address low class attendance";
    description = `${lowFillClasses.length} of your ${ctx.recentClasses.length} recent classes are under 40% capacity (average fill rate: ${ctx.avgFillRate.toFixed(0)}%). Consider consolidating underperforming time slots, promoting them with targeted outreach, or adjusting the schedule to match when members actually want to train.`;
  } else {
    title = "Add capacity at peak times";
    description = `${fullClasses.length} of your ${ctx.recentClasses.length} recent classes are at or over capacity. Members may be getting shut out of popular times. Adding a session or increasing capacity at peak hours could improve satisfaction and reduce churn from scheduling frustration.`;
  }

  return {
    id: "int-capacity",
    category: "engagement",
    title,
    description,
    impact: (isLowFillProblem && isCapacityProblem) || lowFillRate > 0.5 || fullRate > 0.5 ? "high" : "medium",
    urgency: "this_month",
    score,
    expectedRevenue: null,
    affectedMembers: null,
    actions: [
      "Review class-by-class attendance data for the last 30 days",
      "Identify consistently under-filled and over-filled time slots",
      isLowFillProblem ? "Consider merging or rescheduling low-attendance classes" : "Add sessions or increase capacity at peak times",
      "Survey members about preferred class times",
    ],
    status: "pending",
  };
};

const INTERVENTION_BUILDERS: InterventionBuilder[] = [
  retentionIntervention,
  billingIntervention,
  onboardingIntervention,
  leadsIntervention,
  campaignIntervention,
  pricingIntervention,
  engagementDeclineIntervention,
  newMemberRampUpIntervention,
  winBackIntervention,
  capacityOptimizationIntervention,
];

async function buildContext(gymId: number): Promise<InterventionContext> {
  const blendedMRR = await computeBlendedMRR(gymId);
  const avgSubAmount = blendedMRR.activeBillableMembers > 0
    ? blendedMRR.totalMRR / blendedMRR.activeBillableMembers
    : 0;

  const atRiskMembers = await db.select({
    id: membersTable.id,
    riskTier: membersTable.riskTier,
    monthlyRevenue: membersTable.monthlyRevenue,
  }).from(membersTable).where(
    and(eq(membersTable.gymId, gymId), activeMemberCondition(membersTable),
      sql`(${membersTable.riskTier} = 'critical' OR ${membersTable.riskTier} = 'high')`)
  );

  const atRiskSubsByMember = await db.select({
    memberId: subscriptionsTable.memberId,
    amount: subscriptionsTable.amount,
  }).from(subscriptionsTable).where(and(eq(subscriptionsTable.gymId, gymId), eq(subscriptionsTable.status, "active")));
  const subLookup: Record<number, number> = {};
  for (const s of atRiskSubsByMember) subLookup[s.memberId] = parseFloat(s.amount || "0");
  const atRiskRevenue = atRiskMembers.reduce((sum, m) => sum + (subLookup[m.id] ?? getMemberRevenueFromMembersTable(m)), 0);

  const failedSubs = await db.select({
    memberId: subscriptionsTable.memberId,
    amount: subscriptionsTable.amount,
  }).from(subscriptionsTable).where(and(eq(subscriptionsTable.gymId, gymId), eq(subscriptionsTable.status, "past_due")));

  const [openLeadResult] = await db.select({ count: count() }).from(leadsTable).where(
    and(eq(leadsTable.gymId, gymId), sql`${leadsTable.stage} NOT IN ('converted', 'lost')`)
  );
  const openLeadCount = Number(openLeadResult?.count ?? 0);

  const [staleLeadResult] = await db.select({ count: count() }).from(leadsTable).where(
    and(eq(leadsTable.gymId, gymId), eq(leadsTable.isStale, true), sql`${leadsTable.stage} NOT IN ('converted', 'lost')`)
  );
  const staleLeadCount = Number(staleLeadResult?.count ?? 0);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const newMembers = await db.select({
    id: membersTable.id,
    joinDate: membersTable.joinDate,
    createdAt: membersTable.createdAt,
    attendanceCount30d: membersTable.attendanceCount30d,
  }).from(membersTable).where(
    and(
      eq(membersTable.gymId, gymId),
      activeMemberCondition(membersTable),
      sql`(${membersTable.joinDate} >= ${thirtyDaysAgo.toISOString().slice(0, 10)} OR (${membersTable.joinDate} IS NULL AND ${membersTable.createdAt} >= ${thirtyDaysAgo.toISOString()}))`,
    )
  );

  const recentlyCancelled = await db.select({
    id: membersTable.id,
    updatedAt: membersTable.updatedAt,
    monthlyRevenue: membersTable.monthlyRevenue,
  }).from(membersTable).where(
    and(eq(membersTable.gymId, gymId), eq(membersTable.status, "cancelled"))
  );

  const [cancelledResult] = await db.select({ count: count() }).from(membersTable).where(
    and(eq(membersTable.gymId, gymId), eq(membersTable.status, "cancelled"))
  );

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const weeklyAttendance = await db.select({ memberId: attendanceTable.memberId })
    .from(attendanceTable)
    .where(and(eq(attendanceTable.gymId, gymId), gte(attendanceTable.checkinTime, weekAgo)));
  const engagedThisWeek = new Set(weeklyAttendance.map(a => a.memberId)).size;

  const priorWeekAttendance = await db.select({ memberId: attendanceTable.memberId })
    .from(attendanceTable)
    .where(and(
      eq(attendanceTable.gymId, gymId),
      gte(attendanceTable.checkinTime, twoWeeksAgo),
      sql`${attendanceTable.checkinTime} < ${weekAgo}`,
    ));
  const engagedPriorWeek = new Set(priorWeekAttendance.map(a => a.memberId)).size;

  const totalActive = blendedMRR.activeBillableMembers;
  const engagementRate = totalActive > 0 ? Math.round((engagedThisWeek / totalActive) * 1000) / 10 : 0;
  const priorEngagementRate = totalActive > 0 ? Math.round((engagedPriorWeek / totalActive) * 1000) / 10 : 0;
  const engagementChange = Math.round((engagementRate - priorEngagementRate) * 10) / 10;

  const longTenureMembers = await db.select({ id: membersTable.id }).from(membersTable).where(
    and(
      eq(membersTable.gymId, gymId),
      activeMemberCondition(membersTable),
      sql`${membersTable.joinDate} IS NOT NULL AND ${membersTable.joinDate} <= ${new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)}`,
    )
  );

  const thirtyDaysAgoDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentClasses = await db.select({
    capacity: classesTable.capacity,
    enrolled: classesTable.enrolled,
  }).from(classesTable).where(
    and(eq(classesTable.gymId, gymId), gte(classesTable.startTime, thirtyDaysAgoDate))
  );
  const avgFillRate = recentClasses.length > 0
    ? recentClasses.reduce((sum, c) => sum + (c.capacity > 0 ? (c.enrolled / c.capacity) * 100 : 0), 0) / recentClasses.length
    : 0;

  const gymLearningStats = await db.select().from(recommendationLearningStatsTable).where(
    eq(recommendationLearningStatsTable.gymId, gymId)
  );
  const globalLearningStats = await db.select().from(recommendationLearningStatsTable).where(
    sql`${recommendationLearningStatsTable.gymId} IS NULL`
  );

  const learningStats = new Map<string, { expectedImpact: number; confidence: number; sampleSize: number }>();
  for (const stat of globalLearningStats) {
    learningStats.set(stat.recommendationType, {
      expectedImpact: Number(stat.expectedImpact),
      confidence: Number(stat.confidence),
      sampleSize: stat.sampleSize,
    });
  }
  for (const stat of gymLearningStats) {
    learningStats.set(stat.recommendationType, {
      expectedImpact: Number(stat.expectedImpact),
      confidence: Number(stat.confidence),
      sampleSize: stat.sampleSize,
    });
  }

  return {
    gymId,
    atRiskMembers,
    atRiskCount: atRiskMembers.length,
    atRiskRevenue,
    failedSubs,
    openLeadCount,
    staleLeadCount,
    avgSubAmount,
    activeBillableMembers: blendedMRR.activeBillableMembers,
    totalMRR: blendedMRR.totalMRR,
    arm: blendedMRR.arm,
    newMembers,
    recentlyCancelled,
    engagementRate,
    engagementChange,
    learningStats,
    cancelledMembers: Number(cancelledResult?.count ?? 0),
    longTenureActiveCount: longTenureMembers.length,
    recentClasses,
    avgFillRate,
  };
}

export async function getInterventionsDynamic(gymId: number): Promise<Intervention[]> {
  const ctx = await buildContext(gymId);

  const results: Intervention[] = [];
  for (const builder of INTERVENTION_BUILDERS) {
    const intervention = builder(ctx);
    if (intervention) results.push(intervention);
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}

export { type Intervention, type InterventionContext, type InterventionBuilder };
export { blendWithLearning, clamp };
export const _interventionBuilders = {
  retentionIntervention,
  billingIntervention,
  onboardingIntervention,
  leadsIntervention,
  campaignIntervention,
  pricingIntervention,
  engagementDeclineIntervention,
  newMemberRampUpIntervention,
  winBackIntervention,
  capacityOptimizationIntervention,
};
