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
  const revenueStr = ctx.atRiskRevenue > 0 ? ` That's ${fmtDollars(ctx.atRiskRevenue)}/mo you're about to lose.` : "";

  let description: string;
  if (ctx.atRiskCount >= 10) {
    description = `${ctx.atRiskCount} members (${pct}% of your roster) haven't shown up in 10+ days.${revenueStr} Pull up the risk radar. Call the critical ones today — not tomorrow.`;
  } else if (ctx.atRiskCount >= 3) {
    description = `${ctx.atRiskCount} member${ctx.atRiskCount !== 1 ? "s" : ""} ${ctx.atRiskCount !== 1 ? "are" : "is"} going dark.${revenueStr} Pick up the phone. A 2-minute call now saves a cancellation later.`;
  } else {
    description = `${ctx.atRiskCount} member${ctx.atRiskCount !== 1 ? "s" : ""} ${ctx.atRiskCount !== 1 ? "need" : "needs"} a call.${revenueStr} Reach out today — the longer you wait, the harder it gets.`;
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
      "Open the risk radar — sort by critical tier first",
      "Call or text each critical member today",
      "Book a specific class or session for each one",
      "Check back in 7 days — did they show up?",
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
    description = `${ctx.failedSubs.length} payments failed this week. ${fmtDollars(failedAmount)} is sitting on the table. Most are expired cards — send the update link now. 80% will fix it within 48 hours if you move today.`;
  } else {
    description = `${ctx.failedSubs.length} payment${ctx.failedSubs.length !== 1 ? "s" : ""} failed (${fmtDollars(failedAmount)}/mo at stake). Expired card, most likely. Send the update link today — this is free money you're leaving behind.`;
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
      "Send payment update links to all failed accounts today",
      "Text anyone who hasn't updated within 48 hours",
      "Call stragglers by end of week — 2 minutes solves it",
      "Flag recurring failures for a plan conversation",
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
    description = `${needAttention.length} of your ${ctx.newMembers.length} new members joined and aren't showing up. If they don't build a habit in the first 30 days, they're gone. Text them. Invite them to a specific class. Give them a reason to walk in.`;
  } else {
    description = `${needAttention.length} new member${needAttention.length !== 1 ? "s" : ""} joined but ${needAttention.length !== 1 ? "aren't" : "isn't"} attending. The first 30 days decide everything. Send a personal text with a specific class and time — vague invites don't work.`;
  }

  return {
    id: "int-onboarding",
    category: "onboarding",
    title: "New members need attention now",
    description,
    impact: needAttention.length >= 5 ? "high" : "medium",
    urgency: "this_week",
    score,
    expectedRevenue: ctx.avgSubAmount > 0 ? Math.round(needAttention.length * ctx.avgSubAmount * 100) / 100 : null,
    affectedMembers: needAttention.length,
    actions: [
      "Text each new member today with a specific class invite",
      "Schedule a 10-minute intro call this week",
      "Pair them with a regular member for their next session",
      "Check in at day 7 and day 14 — no exceptions",
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
    description = `${ctx.openLeadCount} lead${ctx.openLeadCount !== 1 ? "s" : ""} sitting in your pipeline with no follow-up. ${ctx.staleLeadCount} went stale. Every hour you wait, the close rate drops. Pick up the phone. Send the text. Do it now — not after lunch.`;
  } else {
    description = `${ctx.openLeadCount} lead${ctx.openLeadCount !== 1 ? "s" : ""} in your pipeline.${potentialRevenue ? ` That's ${fmtDollars(potentialRevenue)}/mo if you close even a few.` : ""} Follow up today. Speed is the only thing that matters with leads.`;
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
      "Call or text every stale lead today",
      "Book a No Sweat Intro for each one — give them a specific time",
      "Archive anything older than 30 days with no response",
      "Set a daily reminder: leads get contacted within 1 hour",
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
    description = `Your pipeline is dry (${ctx.openLeadCount} leads). You have ${ctx.longTenureActiveCount} members who've been here 12+ months — they're your best salespeople. Ask them for a referral. One text. One ask. Do it this week.`;
  } else if (hasLowPipeline) {
    description = `Your pipeline is dry (${ctx.openLeadCount} leads). Your existing members are your cheapest growth channel. Ask 10 of them for a referral this week. Referral members stick 3x longer than cold leads.`;
  } else {
    description = `You have ${ctx.longTenureActiveCount} loyal members with 12+ months tenure. They're already selling you to their friends — give them a reason to do it formally. One referral ask per member. This week.`;
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
      "Pick 10 long-tenure members and text them a referral ask today",
      "Offer something simple: free month for every sign-up they bring",
      "Track who refers whom — reward it publicly",
      "Review results in 30 days and double down on what works",
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
    description = `You're leaving money on the table. ${fmtDollars(ctx.arm)}/member when the benchmark is ${fmtDollars(ARM_BENCHMARK)}. You don't have a member problem — you have a pricing problem. A ${fmtDollars(Math.round(gap * 0.5))}/mo bump would add ${fmtDollars(Math.round(ctx.activeBillableMembers * gap * 0.5))}/mo. Review your tiers.`;
  } else {
    description = `${fmtDollars(ctx.arm)}/member vs the ${fmtDollars(ARM_BENCHMARK)} benchmark. That gap is costing you ${fmtDollars(potentialUplift)}/mo in revenue you're not collecting. Add a premium tier, raise your base rate, or bundle add-ons. Pick one and do it this month.`;
  }

  return {
    id: "int-pricing",
    category: "pricing",
    title: "Pricing gap is costing you money",
    description,
    impact: gapRatio > 0.4 ? "high" : "medium",
    urgency: "this_month",
    score,
    expectedRevenue: potentialUplift,
    affectedMembers: ctx.activeBillableMembers,
    actions: [
      "Pull your membership mix — how many are on your cheapest plan?",
      "Identify legacy rates that haven't been updated in 12+ months",
      "Add one premium add-on (personal training, nutrition, open gym)",
      "Set a price increase date and communicate it 30 days out",
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
    description = `Attendance dropped ${dropMagnitude.toFixed(1)}% this week (now ${ctx.engagementRate.toFixed(1)}%). That's not a blip — it's a signal. Something changed. Check your schedule, check your coaching, check the vibe. Fix it before it compounds.`;
  } else {
    description = `Attendance slid ${dropMagnitude.toFixed(1)} points this week to ${ctx.engagementRate.toFixed(1)}%. Small drops compound fast. Look at which classes lost people and why. If nothing changed in your schedule, something changed with your members.`;
  }

  return {
    id: "int-engagement",
    category: "engagement",
    title: "Attendance is dropping",
    description,
    impact: dropMagnitude >= 15 ? "high" : "medium",
    urgency: dropMagnitude >= 15 ? "immediate" : "this_week",
    score,
    expectedRevenue: null,
    affectedMembers: null,
    actions: [
      "Pull class-by-class attendance for the last 2 weeks",
      "Identify which time slots lost the most people",
      "Talk to your coaches — what are they seeing on the floor?",
      "Launch a 2-week attendance challenge to stop the slide",
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
    ? `${veryNew.length} new members in their first 2 weeks and they're barely showing up. This is where you lose them. Personal text from the head coach. Name a class. Make it specific.`
    : `${veryNew.length} new member${veryNew.length !== 1 ? "s" : ""} in ${veryNew.length !== 1 ? "their" : "the"} first 2 weeks with almost no attendance. The clock is ticking. Text them today with a specific class and time.`;

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
      "Text each new member today — use their name, pick a class for them",
      "Have the head coach send a personal video or voice note",
      "Book a 10-minute intro call for anyone who hasn't attended yet",
      "Follow up at day 7 and day 14 — mark it on your calendar now",
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
    description = `${recentlyCancelled.length} members walked out in the last 60 days.${recoverableRevenue > 0 ? ` ${fmtDollars(recoverableRevenue)}/mo gone.` : ""} Some are recoverable. Reach out with something real — not a discount. A genuine check-in. 1 in 10 comes back when you do.`;
  } else {
    description = `${recentlyCancelled.length} member${recentlyCancelled.length !== 1 ? "s" : ""} cancelled recently.${recoverableRevenue > 0 ? ` ${fmtDollars(recoverableRevenue)}/mo on the line.` : ""} Call them. Not an email — a call. Ask what happened. Listen. Make it personal.`;
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
      "Call each cancelled member this week — not email, not text",
      "Ask what happened and listen — don't pitch",
      "Offer a no-strings comeback: free week, no re-sign fee",
      "Track who returns — learn what worked for next time",
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
    description = `${lowFillClasses.length} classes are half-empty. ${fullClasses.length} classes are packed. You don't need more members — you need better distribution. Move your best coach to the dead slot. Promote it. Fill it.`;
  } else if (isLowFillProblem) {
    title = "Address low class attendance";
    description = `${lowFillClasses.length} of ${ctx.recentClasses.length} classes are under 40% full (${ctx.avgFillRate.toFixed(0)}% avg fill). Empty classes cost you money and energy. Cut the dead weight, merge the weak slots, or put your best coach in the worst time. Something has to change.`;
  } else {
    title = "Add capacity at peak times";
    description = `${fullClasses.length} of ${ctx.recentClasses.length} classes are at capacity. Members are getting shut out. Every turned-away member is a churn risk. Add a session at peak times or raise the cap — do it this week.`;
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
      "Pull class-by-class fill rates for the last 30 days",
      isLowFillProblem ? "Merge or kill classes running below 30% — stop bleeding energy" : "Add one session at your most packed time slot this week",
      "Move your strongest coach to the weakest slot",
      "Post the updated schedule and tell members about the change",
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
