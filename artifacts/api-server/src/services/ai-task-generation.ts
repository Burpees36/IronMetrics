import { eq, and, sql, count } from "drizzle-orm";
import { db, aiTasksTable, membersTable, leadsTable, subscriptionsTable } from "@workspace/db";

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
    tasks.push({
      gymId,
      type: "outreach",
      title: isCritical ? `Win back ${member.firstName} ${member.lastName}` : `Re-engage ${member.firstName} ${member.lastName}`,
      description: `${member.firstName} ${member.lastName} has visited ${member.attendanceCount30d} time(s) in the last 30 days and is flagged as ${member.riskTier} risk. ${isCritical ? 'Reach out with a personal invitation to reconnect.' : 'Schedule a goal review or casual catch-up.'}`,
      priority: isCritical ? "high" : "medium",
      status: "pending",
      targetId: member.id,
      targetType: "member",
      aiContent: isCritical
        ? `Hi ${member.firstName},\n\nI was thinking about you and wanted to reach out personally. We've got some exciting new programming and challenges coming up that I think you'd really enjoy.\n\nI'd love to set up a quick goal review session — just 15 minutes to catch up, see where you're at, and map out a plan that fits your schedule. No pressure at all, just a chance to reconnect.\n\nWould you be free for a coffee or a quick chat at the gym this week? I'll buy the coffee.\n\nLooking forward to hearing from you!`
        : `Hi ${member.firstName},\n\nJust wanted to reach out and see how things are going! It's been a little while since we've seen you, and we genuinely miss having you around.\n\nI'd love to schedule a quick goal review — even just 10 minutes to check in on your progress and make sure we're helping you hit your targets. We also have some awesome upcoming events and challenges that might be right up your alley.\n\nWant to grab a quick coffee or chat at the gym this week? Let me know what works for you!`,
    });
  }
  return tasks;
}

async function generateNewMemberOnboardingTasks(gymId: number): Promise<GeneratedTask[]> {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const newMembers = await db.select().from(membersTable).where(
    and(
      eq(membersTable.gymId, gymId),
      eq(membersTable.status, "active"),
      sql`${membersTable.joinDate}::date > ${ninetyDaysAgo.toISOString().split("T")[0]}::date`
    )
  );

  const existingTasks = await db.select().from(aiTasksTable).where(
    and(eq(aiTasksTable.gymId, gymId), eq(aiTasksTable.type, "onboarding"), sql`${aiTasksTable.status} IN ('pending', 'approved', 'sent', 'completed')`)
  );
  const existingMemberIds = new Set(existingTasks.map(t => t.targetId));

  const tasks: GeneratedTask[] = [];
  for (const member of newMembers) {
    if (existingMemberIds.has(member.id)) continue;
    tasks.push({
      gymId,
      type: "onboarding",
      title: `Onboarding plan for ${member.firstName} ${member.lastName}`,
      description: `${member.firstName} joined recently. Set up a structured onboarding path with coach check-ins and milestone tracking.`,
      priority: "medium",
      status: "pending",
      targetId: member.id,
      targetType: "member",
      aiContent: `Welcome ${member.firstName}!\n\nWe're so glad you're here. Here's your personalized 30-Day Onboarding Plan:\n\nWeek 1 — Foundations & Orientation\n- Complete your intro sessions with a coach\n- Tour the facility and meet the team\n- Set your initial goals (strength, fitness, lifestyle)\n\nWeek 2 — Find Your Rhythm\n- Try 3 different class times to find what fits your schedule\n- Pair up with a training buddy\n- Log your first workouts and start tracking progress\n\nWeek 3 — Coach Check-In\n- Scheduled 1-on-1 with your coach to review progress\n- Adjust scaling and movement progressions\n- Talk about nutrition and recovery\n\nWeek 4 — Celebrate Your Wins\n- Complete your first benchmark workout to set your baseline\n- Bright Spots Friday — we'll celebrate your early wins with the community!\n- Map out your next 90-day goals with your coach\n\nRemember: every expert was once a beginner. We're here for you every step of the way!`,
    });
  }
  return tasks;
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
    tasks.push({
      gymId,
      type: "leads",
      title: `Schedule No Sweat Intro: ${lead.firstName} ${lead.lastName}`,
      description: `${lead.firstName} ${lead.lastName} was contacted via ${lead.source} but hasn't booked yet. Invite them to a No Sweat Intro before the lead goes cold.`,
      priority: "medium",
      status: "pending",
      targetId: lead.id,
      targetType: "lead",
      aiContent: `Hi ${lead.firstName},\n\nI wanted to follow up and see if you're still interested in checking us out!\n\nWe'd love to have you in for a No Sweat Intro — it's a free, no-pressure consultation where we sit down, learn about your goals, and show you around the gym. It's completely casual, takes about 20 minutes, and there's zero obligation.\n\nWe find it's the best way for people to see if we're the right fit. No workout required (unless you want to!).\n\nWould any of these times work for you this week?\n- [Morning option]\n- [Afternoon option]\n- [Evening option]\n\nJust let me know, and I'll get you on the calendar!`,
    });
  }
  return tasks;
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
    tasks.push({
      gymId,
      type: "billing",
      title: `Payment issue: ${member.firstName} ${member.lastName}`,
      description: `${member.firstName} ${member.lastName}'s subscription (${sub.planName}) has a payment issue. Reach out warmly to resolve and keep them active.`,
      priority: "high",
      status: "pending",
      targetId: member.id,
      targetType: "member",
      aiContent: `Hi ${member.firstName},\n\nHope you're doing well! I wanted to give you a quick heads-up — it looks like there might be a small hiccup with the payment method on file for your membership.\n\nThese things happen all the time (expired cards, bank updates, etc.), and it's super easy to fix. We just want to make sure everything stays smooth so you don't miss any sessions.\n\nYou can update your info anytime, or just give us a call and we'll sort it out together in 2 minutes.\n\nThanks so much, and see you in class!`,
    });
  }
  return tasks;
}

export async function generateAiTasks(gymId: number): Promise<{ created: number; tasks: any[] }> {
  const [atRiskTasks, onboardingTasks, leadTasks, billingTasks] = await Promise.all([
    generateAtRiskMemberTasks(gymId),
    generateNewMemberOnboardingTasks(gymId),
    generateStaleLeadTasks(gymId),
    generateFailedPaymentTasks(gymId),
  ]);

  const allTasks = [...atRiskTasks, ...onboardingTasks, ...leadTasks, ...billingTasks];

  if (allTasks.length === 0) {
    return { created: 0, tasks: [] };
  }

  const inserted = await db.insert(aiTasksTable).values(allTasks).returning();
  return { created: inserted.length, tasks: inserted };
}
