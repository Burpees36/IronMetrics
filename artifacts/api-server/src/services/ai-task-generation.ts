import { eq, and, sql } from "drizzle-orm";
import { db, aiTasksTable, membersTable, leadsTable, subscriptionsTable } from "@workspace/db";
import { calculateRiskScore, getRiskTier } from "../routes/intelligence/computations";
import {
  assembleMemberContext,
  assembleLeadContext,
  buildMemberPersonalizationMeta,
  buildLeadPersonalizationMeta,
  type MemberContext,
  type LeadContext,
} from "./personalization-context";

const MAX_PENDING_TASKS = 5;

const PRIORITY_ORDER: Record<string, number> = {
  critical_outreach: 0,
  high_outreach: 1,
  billing: 2,
  leads: 3,
};

interface GeneratedTask {
  gymId: number;
  type: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  targetId?: number;
  targetType?: string;
  aiContent?: string;
  subject?: string;
  personalizationMeta?: string;
  _sortKey?: number;
}

async function refreshRiskScores(gymId: number): Promise<void> {
  const members = await db.select().from(membersTable).where(
    and(eq(membersTable.gymId, gymId), eq(membersTable.status, "active"))
  );

  for (const m of members) {
    const now = new Date();
    const daysSinceLastVisit = m.lastVisitDate
      ? Math.floor((now.getTime() - new Date(m.lastVisitDate).getTime()) / (1000 * 60 * 60 * 24))
      : (m.daysSinceLastAttendance ?? 999);
    const freshScore = calculateRiskScore(daysSinceLastVisit, m.attendanceCount30d);
    const freshTier = getRiskTier(freshScore);

    const storedScore = m.riskScore ? parseFloat(m.riskScore) : null;
    if (storedScore === null || Math.abs(storedScore - freshScore) >= 1 || m.riskTier !== freshTier) {
      await db.update(membersTable)
        .set({ riskScore: String(Math.round(freshScore)), riskTier: freshTier })
        .where(eq(membersTable.id, m.id));
    }
  }
}

function buildCriticalOutreachContent(ctx: MemberContext): { content: string; subject: string } {
  const variants: ((c: MemberContext) => { content: string; subject: string })[] = [];

  if (ctx.favoriteClassName) {
    variants.push((c) => ({
      subject: `The ${c.favoriteClassName} crew misses you, ${c.firstName}`,
      content: `Hi ${c.firstName},\n\nI wanted to reach out personally — the ${c.favoriteClassName}${c.favoriteTimeSlot ? ` ${c.favoriteTimeSlot}` : ""} crew has been asking about you.${c.lastCoachName ? ` Coach ${c.lastCoachName} mentioned it the other day.` : ""}\n\nYou've been part of our community for ${c.tenureMonths} month${c.tenureMonths !== 1 ? "s" : ""} and we genuinely miss having you around. We've got some exciting new programming coming up that I think you'd love.\n\nI'd love to set up a quick 15-minute catch-up — no pressure at all, just a chance to reconnect and see how we can help.\n\nWould you be free for a coffee or a quick chat this week? I'll buy the coffee.\n\nLooking forward to hearing from you!`,
    }));
  }

  if (ctx.lastCoachName) {
    variants.push((c) => ({
      subject: `Coach ${c.lastCoachName} was asking about you, ${c.firstName}`,
      content: `Hi ${c.firstName},\n\nCoach ${c.lastCoachName} was asking about you the other day, and it got me thinking — we should reconnect.\n\nYou've been with us for ${c.tenureMonths} month${c.tenureMonths !== 1 ? "s" : ""}${c.favoriteClassName ? ` and we know how much you loved ${c.favoriteClassName}` : ""}. We'd hate to see you drift away.\n\nI'd love to set up a quick goal review — just 15 minutes to catch up, see where you're at, and figure out a plan that works for your schedule. Zero pressure.\n\nWould any day this week work for a quick coffee or chat at the gym?\n\nHope to see you soon!`,
    }));
  }

  if (ctx.recentPRs.length > 0) {
    variants.push((c) => ({
      subject: `Don't lose your momentum, ${c.firstName}`,
      content: `Hi ${c.firstName},\n\nI was looking back at your recent results and wanted to remind you — you hit ${c.recentPRs.length} PR${c.recentPRs.length !== 1 ? "s" : ""} in the last few months${c.recentPRs[0] ? ` (including ${c.recentPRs[0].workoutTitle})` : ""}. That's real progress.\n\nI'd hate to see that momentum fade.${c.favoriteClassName ? ` ${c.favoriteClassName} is still going strong` : ""}${c.lastCoachName ? ` and Coach ${c.lastCoachName} would love to help you build on those gains.` : "."}\n\nLet's set up a quick 15-minute session to map out your next goals. No pressure — just a chance to reconnect.\n\nWhat day works best for you this week?`,
    }));
  }

  variants.push((c) => ({
    subject: `We'd love to reconnect, ${c.firstName}`,
    content: `Hi ${c.firstName},\n\nI was thinking about you and wanted to reach out personally.${c.tenureMonths > 0 ? ` You've been part of our community for ${c.tenureMonths} month${c.tenureMonths !== 1 ? "s" : ""}, and that means a lot to us.` : ""}\n\nWe've got some exciting new programming and challenges coming up that I think you'd really enjoy.${c.favoriteClassName ? ` Especially if you loved ${c.favoriteClassName} — there's more of that energy coming.` : ""}\n\nI'd love to set up a quick goal review session — just 15 minutes to catch up, see where you're at, and map out a plan that fits your schedule. No pressure at all.\n\nWould you be free for a coffee or a quick chat at the gym this week? I'll buy the coffee.\n\nLooking forward to hearing from you!`,
  }));

  const idx = Math.floor(Math.random() * variants.length);
  return variants[idx](ctx);
}

function buildHighRiskOutreachContent(ctx: MemberContext): { content: string; subject: string } {
  const variants: ((c: MemberContext) => { content: string; subject: string })[] = [];

  if (ctx.attendanceTrend === "declining" && ctx.attendancePrior30d > 0) {
    variants.push((c) => ({
      subject: `Everything okay, ${c.firstName}?`,
      content: `Hi ${c.firstName},\n\nJust wanted to check in — we noticed you've gone from ${c.attendancePrior30d}x to ${c.attendanceLast30d}x in the last month. Everything okay?\n\nLife gets busy, and we totally get it.${c.favoriteClassName ? ` Your ${c.favoriteClassName} crew is still going strong and would love to see you back.` : ""}\n\nI'd love to schedule a quick 10-minute goal review — just to check in on your progress and make sure we're helping you hit your targets. We also have some awesome upcoming events and challenges that might be right up your alley.\n\nWant to grab a quick coffee or chat this week? Let me know what works!`,
    }));
  }

  if (ctx.favoriteTimeSlot) {
    variants.push((c) => ({
      subject: `Checking in, ${c.firstName}`,
      content: `Hi ${c.firstName},\n\nJust wanted to reach out and see how things are going! It's been a little while since we've seen you${c.favoriteTimeSlot ? ` at the ${c.favoriteTimeSlot} sessions` : ""}, and we genuinely miss having you around.${c.tenureMonths > 0 ? `\n\nYou've been with us for ${c.tenureMonths} month${c.tenureMonths !== 1 ? "s" : ""} — that kind of commitment is impressive.` : ""}\n\nI'd love to schedule a quick goal review — even just 10 minutes to check in on your progress.${c.lastCoachName ? ` Coach ${c.lastCoachName} can work with you on a refreshed plan.` : ""}\n\nWant to grab a quick coffee or chat at the gym this week? Let me know what works for you!`,
    }));
  }

  if (ctx.recentPRs.length > 0) {
    variants.push((c) => ({
      subject: `Keep the streak going, ${c.firstName}!`,
      content: `Hi ${c.firstName},\n\nHey, congrats on those recent PRs! ${c.recentPRs[0] ? `Crushing ${c.recentPRs[0].workoutTitle}` : "That progress"} is no joke.\n\nWe've noticed things have slowed down a bit lately, and we want to make sure we're still helping you hit your goals.${c.favoriteClassName ? ` ${c.favoriteClassName} sessions are a great way to keep building on that momentum.` : ""}\n\nWant to come in for a quick goal review this week? 10 minutes, zero pressure. Just want to make sure you've got a plan that works.\n\nLet me know what day works best!`,
    }));
  }

  variants.push((c) => ({
    subject: `Checking in, ${c.firstName}`,
    content: `Hi ${c.firstName},\n\nJust wanted to reach out and see how things are going! It's been a little while since we've seen you, and we genuinely miss having you around.${c.tenureMonths > 0 ? `\n\nYou've been part of our community for ${c.tenureMonths} month${c.tenureMonths !== 1 ? "s" : ""}, and we value that.` : ""}\n\nI'd love to schedule a quick goal review — even just 10 minutes to check in on your progress and make sure we're helping you hit your targets. We also have some awesome upcoming events and challenges that might be right up your alley.\n\nWant to grab a quick coffee or chat at the gym this week? Let me know what works for you!`,
  }));

  const idx = Math.floor(Math.random() * variants.length);
  return variants[idx](ctx);
}

async function generateAtRiskMemberTasks(gymId: number): Promise<GeneratedTask[]> {
  const atRiskMembers = await db.select().from(membersTable).where(
    and(
      eq(membersTable.gymId, gymId),
      eq(membersTable.status, "active"),
      sql`(${membersTable.riskTier} = 'critical' OR ${membersTable.riskTier} = 'high')`
    )
  );

  const existingTasks = await db.select().from(aiTasksTable).where(
    and(eq(aiTasksTable.gymId, gymId), eq(aiTasksTable.targetType, "member"), sql`${aiTasksTable.status} IN ('pending', 'approved', 'sent', 'completed')`)
  );
  const existingMemberIds = new Set(existingTasks.map(t => t.targetId));

  const tasks: GeneratedTask[] = [];
  for (const member of atRiskMembers) {
    if (existingMemberIds.has(member.id)) continue;

    const isCritical = member.riskTier === "critical";
    const ctx = await assembleMemberContext(member.id, gymId);

    let content: string;
    let subject: string;
    let personalizationMeta: string | undefined;

    if (ctx) {
      const meta = buildMemberPersonalizationMeta(ctx);
      personalizationMeta = JSON.stringify(meta);

      if (isCritical) {
        const generated = buildCriticalOutreachContent(ctx);
        content = generated.content;
        subject = generated.subject;
      } else {
        const generated = buildHighRiskOutreachContent(ctx);
        content = generated.content;
        subject = generated.subject;
      }
    } else {
      content = isCritical
        ? `Hi ${member.firstName},\n\nI was thinking about you and wanted to reach out personally. We've got some exciting new programming and challenges coming up that I think you'd really enjoy.\n\nI'd love to set up a quick goal review session — just 15 minutes to catch up, see where you're at, and map out a plan that fits your schedule. No pressure at all, just a chance to reconnect.\n\nWould you be free for a coffee or a quick chat at the gym this week? I'll buy the coffee.\n\nLooking forward to hearing from you!`
        : `Hi ${member.firstName},\n\nJust wanted to reach out and see how things are going! It's been a little while since we've seen you, and we genuinely miss having you around.\n\nI'd love to schedule a quick goal review — even just 10 minutes to check in on your progress and make sure we're helping you hit your targets. We also have some awesome upcoming events and challenges that might be right up your alley.\n\nWant to grab a quick coffee or chat at the gym this week? Let me know what works for you!`;
      subject = isCritical
        ? `We'd love to reconnect, ${member.firstName}`
        : `Checking in, ${member.firstName}`;
    }

    const descParts: string[] = [];
    descParts.push(`${member.firstName} ${member.lastName} has visited ${member.attendanceCount30d} time(s) in the last 30 days and is flagged as ${member.riskTier} risk.`);
    if (ctx) {
      if (ctx.favoriteClassName) descParts.push(`Favorite class: ${ctx.favoriteClassName}.`);
      if (ctx.lastCoachName) descParts.push(`Last coach: ${ctx.lastCoachName}.`);
      if (ctx.tenureMonths > 0) descParts.push(`Member for ${ctx.tenureMonths} month${ctx.tenureMonths !== 1 ? "s" : ""}.`);
    }
    descParts.push(isCritical ? "Reach out with a personal invitation to reconnect." : "Schedule a goal review or casual catch-up.");

    tasks.push({
      gymId,
      type: "outreach",
      title: isCritical ? `Win back ${member.firstName} ${member.lastName}` : `Re-engage ${member.firstName} ${member.lastName}`,
      description: descParts.join(" "),
      priority: isCritical ? "high" : "medium",
      status: "pending",
      targetId: member.id,
      targetType: "member",
      aiContent: content,
      subject,
      personalizationMeta,
      _sortKey: isCritical ? PRIORITY_ORDER.critical_outreach : PRIORITY_ORDER.high_outreach,
    });
  }
  return tasks;
}

function buildStaleLeadContent(ctx: LeadContext): { content: string; subject: string } {
  const variants: ((c: LeadContext) => { content: string; subject: string })[] = [];

  if (ctx.source) {
    variants.push((c) => ({
      subject: `Following up from ${c.source}, ${c.firstName}`,
      content: `Hi ${c.firstName},\n\nI wanted to follow up since you reached out through ${c.source} about ${c.daysSinceCreated} day${c.daysSinceCreated !== 1 ? "s" : ""} ago.${c.notes ? ` I see you were interested in ${c.notes} — we'd love to tell you more about that.` : ""}\n\nWe'd love to have you in for a No Sweat Intro — it's a free, no-pressure consultation where we sit down, learn about your goals, and show you around the gym. It takes about 20 minutes, and there's zero obligation.\n\nWould any of these times work for you this week?\n- [Morning option]\n- [Afternoon option]\n- [Evening option]\n\nJust let me know, and I'll get you on the calendar!`,
    }));
  }

  if (ctx.notes) {
    variants.push((c) => ({
      subject: `Still interested in checking us out, ${c.firstName}?`,
      content: `Hi ${c.firstName},\n\nI saw that you mentioned interest in ${c.notes} when you first reached out${c.source ? ` via ${c.source}` : ""}. That's awesome — it's one of the things our members love most about training here.\n\nIt's been ${c.daysSinceCreated} day${c.daysSinceCreated !== 1 ? "s" : ""} since then, and I just wanted to make sure you didn't slip through the cracks. We'd love to set up a No Sweat Intro — a free, 20-minute consultation to learn about your goals and show you around.\n\nNo workout required (unless you want to!). What day this week works best for you?`,
    }));
  }

  variants.push((c) => ({
    subject: `Let's connect, ${c.firstName}`,
    content: `Hi ${c.firstName},\n\nI wanted to follow up and see if you're still interested in checking us out!${c.source ? ` It's been ${c.daysSinceCreated} day${c.daysSinceCreated !== 1 ? "s" : ""} since you reached out through ${c.source}.` : ` It's been ${c.daysSinceCreated} day${c.daysSinceCreated !== 1 ? "s" : ""} since you inquired.`}\n\nWe'd love to have you in for a No Sweat Intro — it's a free, no-pressure consultation where we sit down, learn about your goals, and show you around the gym. It's completely casual, takes about 20 minutes, and there's zero obligation.\n\nWe find it's the best way for people to see if we're the right fit. No workout required (unless you want to!).\n\nWould any of these times work for you this week?\n- [Morning option]\n- [Afternoon option]\n- [Evening option]\n\nJust let me know, and I'll get you on the calendar!`,
  }));

  const idx = Math.floor(Math.random() * variants.length);
  return variants[idx](ctx);
}

async function generateStaleLeadTasks(gymId: number): Promise<GeneratedTask[]> {
  const staleLeads = await db.select().from(leadsTable).where(
    and(eq(leadsTable.gymId, gymId), eq(leadsTable.isStale, true))
  );

  const existingTasks = await db.select().from(aiTasksTable).where(
    and(eq(aiTasksTable.gymId, gymId), eq(aiTasksTable.type, "leads"), eq(aiTasksTable.targetType, "lead"), sql`${aiTasksTable.status} IN ('pending', 'approved', 'sent', 'completed')`)
  );
  const existingLeadIds = new Set(existingTasks.map(t => t.targetId));

  const tasks: GeneratedTask[] = [];
  for (const lead of staleLeads) {
    if (existingLeadIds.has(lead.id)) continue;

    const ctx = await assembleLeadContext(lead.id, gymId);
    let content: string;
    let subject: string;
    let personalizationMeta: string | undefined;
    let description: string;

    if (ctx) {
      const meta = buildLeadPersonalizationMeta(ctx);
      personalizationMeta = JSON.stringify(meta);
      const generated = buildStaleLeadContent(ctx);
      content = generated.content;
      subject = generated.subject;

      const descParts: string[] = [];
      descParts.push(`${lead.firstName} ${lead.lastName}`);
      if (ctx.source) descParts.push(`reached out via ${ctx.source}`);
      descParts.push(`${ctx.daysSinceCreated} day${ctx.daysSinceCreated !== 1 ? "s" : ""} ago`);
      descParts.push(`but hasn't booked yet (stage: ${ctx.stage}).`);
      if (ctx.notes) descParts.push(`Interest: ${ctx.notes}.`);
      descParts.push("Invite them to a No Sweat Intro before the lead goes cold.");
      description = descParts.join(" ");
    } else {
      content = `Hi ${lead.firstName},\n\nI wanted to follow up and see if you're still interested in checking us out!\n\nWe'd love to have you in for a No Sweat Intro — it's a free, no-pressure consultation where we sit down, learn about your goals, and show you around the gym. It's completely casual, takes about 20 minutes, and there's zero obligation.\n\nWe find it's the best way for people to see if we're the right fit. No workout required (unless you want to!).\n\nWould any of these times work for you this week?\n- [Morning option]\n- [Afternoon option]\n- [Evening option]\n\nJust let me know, and I'll get you on the calendar!`;
      subject = `Let's connect, ${lead.firstName}`;
      description = `${lead.firstName} ${lead.lastName} was contacted via ${lead.source} but hasn't booked yet. Invite them to a No Sweat Intro before the lead goes cold.`;
    }

    tasks.push({
      gymId,
      type: "leads",
      title: `Schedule No Sweat Intro: ${lead.firstName} ${lead.lastName}`,
      description,
      priority: "medium",
      status: "pending",
      targetId: lead.id,
      targetType: "lead",
      aiContent: content,
      subject,
      personalizationMeta,
      _sortKey: PRIORITY_ORDER.leads,
    });
  }
  return tasks;
}

function buildBillingContent(ctx: MemberContext, sub: { planName: string; amount: string }): { content: string; subject: string } {
  const variants: ((c: MemberContext) => { content: string; subject: string })[] = [];

  if (ctx.tenureMonths >= 6) {
    variants.push((c) => ({
      subject: `Quick heads-up about your account, ${c.firstName}`,
      content: `Hi ${c.firstName},\n\nYou've been with us for ${c.tenureMonths} months now, and we truly appreciate your commitment. I wanted to give you a personal heads-up — it looks like there's a small hiccup with the payment method on file for your ${sub.planName} membership.\n\nThese things happen all the time (expired cards, bank updates, etc.), and it's super easy to fix. We just want to make sure everything stays smooth so you don't miss any sessions${c.favoriteClassName ? ` — especially ${c.favoriteClassName}` : ""}.\n\nYou can update your info anytime, or just give us a call and we'll sort it out together in 2 minutes.\n\nThanks so much for being a valued member!`,
    }));
  }

  variants.push((c) => ({
    subject: `Quick heads-up about your account, ${c.firstName}`,
    content: `Hi ${c.firstName},\n\nHope you're doing well! I wanted to give you a quick heads-up — it looks like there might be a small hiccup with the payment method on file for your ${sub.planName} membership.\n\nThese things happen all the time (expired cards, bank updates, etc.), and it's super easy to fix. We just want to make sure everything stays smooth so you don't miss any sessions.\n\nYou can update your info anytime, or just give us a call and we'll sort it out together in 2 minutes.${c.tenureMonths > 0 ? `\n\nYou've been with us for ${c.tenureMonths} month${c.tenureMonths !== 1 ? "s" : ""} — we want to keep it going!` : ""}\n\nThanks so much, and see you in class!`,
  }));

  const idx = Math.floor(Math.random() * variants.length);
  return variants[idx](ctx);
}

async function generateFailedPaymentTasks(gymId: number): Promise<GeneratedTask[]> {
  const failedSubs = await db.select().from(subscriptionsTable).where(
    and(eq(subscriptionsTable.gymId, gymId), eq(subscriptionsTable.status, "past_due"))
  );

  const existingTasks = await db.select().from(aiTasksTable).where(
    and(eq(aiTasksTable.gymId, gymId), eq(aiTasksTable.type, "billing"), sql`${aiTasksTable.status} IN ('pending', 'approved', 'sent', 'completed')`)
  );
  const existingMemberIds = new Set(existingTasks.map(t => t.targetId));

  const tasks: GeneratedTask[] = [];
  for (const sub of failedSubs) {
    if (existingMemberIds.has(sub.memberId)) continue;
    const [member] = await db.select().from(membersTable).where(eq(membersTable.id, sub.memberId));
    if (!member) continue;

    const ctx = await assembleMemberContext(member.id, gymId);
    let content: string;
    let subject: string;
    let personalizationMeta: string | undefined;

    if (ctx) {
      const meta = buildMemberPersonalizationMeta(ctx);
      meta.dataPoints.push(`Plan: ${sub.planName}`);
      personalizationMeta = JSON.stringify(meta);
      const generated = buildBillingContent(ctx, { planName: sub.planName, amount: sub.amount });
      content = generated.content;
      subject = generated.subject;
    } else {
      content = `Hi ${member.firstName},\n\nHope you're doing well! I wanted to give you a quick heads-up — it looks like there might be a small hiccup with the payment method on file for your membership.\n\nThese things happen all the time (expired cards, bank updates, etc.), and it's super easy to fix. We just want to make sure everything stays smooth so you don't miss any sessions.\n\nYou can update your info anytime, or just give us a call and we'll sort it out together in 2 minutes.\n\nThanks so much, and see you in class!`;
      subject = `Quick heads-up about your account, ${member.firstName}`;
    }

    tasks.push({
      gymId,
      type: "billing",
      title: `Payment issue: ${member.firstName} ${member.lastName}`,
      description: `${member.firstName} ${member.lastName}'s subscription (${sub.planName}) has a payment issue.${ctx && ctx.tenureMonths > 0 ? ` Member for ${ctx.tenureMonths} month${ctx.tenureMonths !== 1 ? "s" : ""}.` : ""} Reach out warmly to resolve and keep them active.`,
      priority: "high",
      status: "pending",
      targetId: member.id,
      targetType: "member",
      aiContent: content,
      subject,
      personalizationMeta,
      _sortKey: PRIORITY_ORDER.billing,
    });
  }
  return tasks;
}

export async function generateAiTasks(gymId: number): Promise<{ created: number; tasks: any[] }> {
  await refreshRiskScores(gymId);

  const [atRiskTasks, leadTasks, billingTasks] = await Promise.all([
    generateAtRiskMemberTasks(gymId),
    generateStaleLeadTasks(gymId),
    generateFailedPaymentTasks(gymId),
  ]);

  const allCandidates = [...atRiskTasks, ...leadTasks, ...billingTasks];

  if (allCandidates.length === 0) {
    return { created: 0, tasks: [] };
  }

  allCandidates.sort((a, b) => (a._sortKey ?? 99) - (b._sortKey ?? 99));

  const [pendingCount] = await db.select({ count: sql<number>`count(*)` })
    .from(aiTasksTable)
    .where(and(eq(aiTasksTable.gymId, gymId), eq(aiTasksTable.status, "pending")));

  const currentPending = Number(pendingCount?.count ?? 0);
  const slotsAvailable = Math.max(0, MAX_PENDING_TASKS - currentPending);

  if (slotsAvailable === 0) {
    return { created: 0, tasks: [] };
  }

  const toInsert = allCandidates.slice(0, slotsAvailable).map(({ _sortKey, ...task }) => task);

  const inserted = await db.insert(aiTasksTable).values(toInsert).returning();
  return { created: inserted.length, tasks: inserted };
}
