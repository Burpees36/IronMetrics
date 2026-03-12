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
    and(eq(aiTasksTable.gymId, gymId), eq(aiTasksTable.targetType, "member"), sql`${aiTasksTable.status} IN ('pending', 'approved')`)
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
      description: `${member.firstName} ${member.lastName} has visited ${member.attendanceCount30d} time(s) in the last 30 days and is flagged as ${member.riskTier} risk. ${isCritical ? 'Send a win-back offer with complimentary session.' : 'Send a personalized check-in email.'}`,
      priority: isCritical ? "high" : "medium",
      status: "pending",
      targetId: member.id,
      targetType: "member",
      aiContent: isCritical
        ? `Hi ${member.firstName},\n\nWe've made some exciting changes and added new programming that we think you'd enjoy.\n\nWe'd love to offer you a complimentary drop-in session to come check things out. No pressure, just a chance to reconnect.\n\nWhat day works best for you this week?\n\n[AI-Generated Draft]`
        : `Hi ${member.firstName},\n\nWe noticed it's been a little while since your last visit and wanted to check in. Your progress matters to us, and we'd love to help you get back on track.\n\nWould you like to schedule a quick chat about your goals?\n\n[AI-Generated Draft]`,
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
    and(eq(aiTasksTable.gymId, gymId), eq(aiTasksTable.type, "onboarding"), sql`${aiTasksTable.status} IN ('pending', 'approved')`)
  );
  const existingMemberIds = new Set(existingTasks.map(t => t.targetId));

  const tasks: GeneratedTask[] = [];
  for (const member of newMembers) {
    if (existingMemberIds.has(member.id)) continue;
    tasks.push({
      gymId,
      type: "onboarding",
      title: `Onboarding plan for ${member.firstName} ${member.lastName}`,
      description: `${member.firstName} joined recently. Create a 30-day onboarding plan with coach check-ins and milestone tracking.`,
      priority: "medium",
      status: "pending",
      targetId: member.id,
      targetType: "member",
      aiContent: `Welcome ${member.firstName}!\n\nYour 30-Day Plan:\n- Week 1: Fundamentals classes + gym orientation\n- Week 2: Try 3 different class times to find your favorite\n- Week 3: Coach check-in on goals & scaling options\n- Week 4: First benchmark workout to set your baseline\n\nLet us know if you have any questions!\n\n[AI-Generated Draft]`,
    });
  }
  return tasks;
}

async function generateStaleLeadTasks(gymId: number): Promise<GeneratedTask[]> {
  const staleLeads = await db.select().from(leadsTable).where(
    and(eq(leadsTable.gymId, gymId), eq(leadsTable.isStale, true))
  );

  const existingTasks = await db.select().from(aiTasksTable).where(
    and(eq(aiTasksTable.gymId, gymId), eq(aiTasksTable.type, "leads"), eq(aiTasksTable.targetType, "lead"), sql`${aiTasksTable.status} IN ('pending', 'approved')`)
  );
  const existingLeadIds = new Set(existingTasks.map(t => t.targetId));

  const tasks: GeneratedTask[] = [];
  for (const lead of staleLeads) {
    if (existingLeadIds.has(lead.id)) continue;
    tasks.push({
      gymId,
      type: "leads",
      title: `Follow up on stale lead: ${lead.firstName} ${lead.lastName}`,
      description: `${lead.firstName} ${lead.lastName} was contacted via ${lead.source} but hasn't responded. Send a follow-up message before the lead goes cold.`,
      priority: "medium",
      status: "pending",
      targetId: lead.id,
      targetType: "lead",
      aiContent: `Hi ${lead.firstName},\n\nJust following up on our earlier conversation. We'd love to get you in for a free trial class.\n\nNo commitment — just come see if it's a good fit. What day works best?\n\n[AI-Generated Draft]`,
    });
  }
  return tasks;
}

async function generateFailedPaymentTasks(gymId: number): Promise<GeneratedTask[]> {
  const failedSubs = await db.select().from(subscriptionsTable).where(
    and(eq(subscriptionsTable.gymId, gymId), eq(subscriptionsTable.status, "past_due"))
  );

  const existingTasks = await db.select().from(aiTasksTable).where(
    and(eq(aiTasksTable.gymId, gymId), eq(aiTasksTable.type, "billing"), sql`${aiTasksTable.status} IN ('pending', 'approved')`)
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
      description: `${member.firstName} ${member.lastName}'s subscription (${sub.planName}) has a payment issue. Follow up to resolve billing and retain the member.`,
      priority: "high",
      status: "pending",
      targetId: member.id,
      targetType: "member",
      aiContent: `Hi ${member.firstName},\n\nWe noticed there may be an issue with your payment method on file. We want to make sure your membership stays active so you don't miss any sessions.\n\nCould you take a moment to update your payment information? If you have any questions about your account, please don't hesitate to reach out.\n\n[AI-Generated Draft]`,
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
