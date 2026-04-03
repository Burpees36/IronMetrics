import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { eq, desc, and, sql, gte, lte } from "drizzle-orm";
import { db, aiTasksTable, aiGeneratedContentTable, membersTable, leadsTable, gymsTable, gymStaffTable, subscriptionsTable } from "@workspace/db";
import { sendMemberEmail, logMemberEmailSent } from "../services/member-email";
import { CreateAiTaskBody, GenerateMemberOutreachBody, UpdateAiTaskBody } from "@workspace/api-zod";
import { generateAiTasks } from "../services/ai-task-generation";
import { assembleMemberContext, buildMemberPersonalizationMeta } from "../services/personalization-context";
import { getEmailService } from "../services/email-service";
import { activeMemberCondition } from "../blendedMetrics";
import { getLastAiScanTimestamp } from "../schedulers/ai-task-scheduler";

const router: IRouter = Router();

function parseGymId(params: any): number | null {
  const raw = Array.isArray(params.gymId) ? params.gymId[0] : params.gymId;
  const id = parseInt(raw, 10);
  return isNaN(id) ? null : id;
}

async function verifyGymAccess(gymId: number, userId: string): Promise<{ allowed: boolean; gym?: any }> {
  const [gym] = await db.select().from(gymsTable).where(eq(gymsTable.id, gymId));
  if (!gym) return { allowed: false };

  const isOwner = gym.ownerId === userId;
  if (isOwner) return { allowed: true, gym };

  const [staffEntry] = await db.select().from(gymStaffTable).where(
    and(eq(gymStaffTable.gymId, gymId), eq(gymStaffTable.userId, userId))
  );
  return { allowed: !!staffEntry, gym };
}

router.get("/gyms/:gymId/ai/tasks", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const access = await verifyGymAccess(gymId, req.user!.id);
  if (!access.allowed) { res.status(access.gym ? 403 : 404).json({ error: access.gym ? "You do not have access to this gym" : "Gym not found" }); return; }

  const tasks = await db.select().from(aiTasksTable).where(eq(aiTasksTable.gymId, gymId)).orderBy(desc(aiTasksTable.createdAt));
  res.json(tasks);
});

router.patch("/gyms/:gymId/ai/tasks/:taskId", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const access = await verifyGymAccess(gymId, req.user!.id);
  if (!access.allowed) { res.status(access.gym ? 403 : 404).json({ error: access.gym ? "You do not have access to this gym" : "Gym not found" }); return; }

  const taskId = parseInt(req.params.taskId, 10);
  if (isNaN(taskId)) { res.status(400).json({ error: "Invalid task ID" }); return; }

  const parsed = UpdateAiTaskBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [existing] = await db.select().from(aiTasksTable).where(and(eq(aiTasksTable.id, taskId), eq(aiTasksTable.gymId, gymId)));
  if (!existing) { res.status(404).json({ error: "Task not found" }); return; }

  const updateData: Record<string, any> = {};
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.aiContent !== undefined) updateData.aiContent = parsed.data.aiContent;
  if (parsed.data.subject !== undefined) updateData.subject = parsed.data.subject;

  if (Object.keys(updateData).length === 0) {
    res.status(400).json({ error: "At least one of 'status', 'aiContent', or 'subject' must be provided" });
    return;
  }

  if (updateData.status === "approved") {
    updateData.status = "completed";
  }

  const isBeingActioned = (updateData.status === "completed" || updateData.status === "sent") && !existing.actionedAt;
  if (isBeingActioned) {
    updateData.actionedAt = new Date();
    updateData.outcome = "pending_observation";
  }

  const [updated] = await db.update(aiTasksTable).set(updateData).where(eq(aiTasksTable.id, taskId)).returning();
  res.json(updated);
});

router.post("/gyms/:gymId/ai/tasks", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const access = await verifyGymAccess(gymId, req.user!.id);
  if (!access.allowed) { res.status(access.gym ? 403 : 404).json({ error: access.gym ? "You do not have access to this gym" : "Gym not found" }); return; }

  const parsed = CreateAiTaskBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [task] = await db.insert(aiTasksTable).values({ ...parsed.data, gymId }).returning();
  res.status(201).json(task);
});

router.post("/gyms/:gymId/ai/generate-outreach", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const access = await verifyGymAccess(gymId, req.user!.id);
  if (!access.allowed) { res.status(access.gym ? 403 : 404).json({ error: access.gym ? "You do not have access to this gym" : "Gym not found" }); return; }

  const parsed = GenerateMemberOutreachBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { and: andOp } = await import("drizzle-orm");
  const [member] = await db.select().from(membersTable).where(andOp(eq(membersTable.id, parsed.data.memberId), eq(membersTable.gymId, gymId)));
  if (!member) { res.status(404).json({ error: "Member not found" }); return; }

  const ctx = await assembleMemberContext(member.id, gymId);

  const templates: Record<string, { subject: string; content: string }> = {
    at_risk: {
      subject: `Checking in, ${member.firstName}`,
      content: ctx
        ? `Hi ${member.firstName},\n\nJust wanted to reach out and see how things are going!${ctx.daysSinceLastVisit !== null ? ` It's been about ${ctx.daysSinceLastVisit} days since your last visit` : ` It's been a little while since we've seen you`}, and we genuinely miss having you around.${ctx.favoriteClassName ? `\n\nThe ${ctx.favoriteClassName}${ctx.favoriteTimeSlot ? ` ${ctx.favoriteTimeSlot}` : ""} crew is still going strong.` : ""}${ctx.tenureMonths > 0 ? ` You've been with us for ${ctx.tenureMonths} month${ctx.tenureMonths !== 1 ? "s" : ""} — that commitment matters.` : ""}\n\nI'd love to schedule a quick goal review — even just 10 minutes to check in on your progress.${ctx.lastCoachName ? ` Coach ${ctx.lastCoachName} would be glad to work with you.` : ""}\n\nWant to grab a quick coffee or chat at the gym this week? Let me know what works for you!`
        : `Hi ${member.firstName},\n\nJust wanted to reach out and see how things are going! It's been a little while since we've seen you, and we genuinely miss having you around.\n\nI'd love to schedule a quick goal review — even just 10 minutes to check in on your progress and make sure we're helping you hit your targets. We also have some great upcoming events and challenges that might be right up your alley.\n\nWant to grab a quick coffee or chat at the gym this week? Let me know what works for you!`,
    },
    win_back: {
      subject: ctx?.favoriteClassName ? `The ${ctx.favoriteClassName} crew misses you, ${member.firstName}` : `We'd love to reconnect, ${member.firstName}`,
      content: ctx
        ? `Hi ${member.firstName},\n\nI was thinking about you and wanted to reach out personally.${ctx.tenureMonths > 0 ? ` You've been part of our community for ${ctx.tenureMonths} month${ctx.tenureMonths !== 1 ? "s" : ""}, and that means a lot.` : ""}${ctx.favoriteClassName ? `\n\nThe ${ctx.favoriteClassName} crew has been asking about you.` : ""}${ctx.lastCoachName ? ` Coach ${ctx.lastCoachName} mentioned you the other day.` : ""}\n\nWe've got some exciting new programming and challenges coming up that I think you'd really enjoy.\n\nI'd love to set up a quick goal review session — just 15 minutes to catch up. No pressure at all.\n\nWould you be free for a coffee or a quick chat at the gym this week? I'll buy the coffee.`
        : `Hi ${member.firstName},\n\nI was thinking about you and wanted to reach out personally. We've got some exciting new programming and challenges coming up that I think you'd really enjoy.\n\nI'd love to set up a quick goal review session — just 15 minutes to catch up, see where you're at, and map out a plan that fits your schedule. No pressure at all, just a chance to reconnect.\n\nWould you be free for a coffee or a quick chat at the gym this week? I'll buy the coffee.`,
    },
    celebration: {
      subject: `Congrats on your milestone, ${member.firstName}!`,
      content: ctx?.recentPRs?.length
        ? `Hi ${member.firstName},\n\nWe wanted to take a moment to celebrate — you hit ${ctx.recentPRs.length} PR${ctx.recentPRs.length !== 1 ? "s" : ""} recently${ctx.recentPRs[0] ? `, including ${ctx.recentPRs[0].workoutTitle}` : ""}! Your consistency and effort haven't gone unnoticed.${ctx.tenureMonths > 0 ? `\n\n${ctx.tenureMonths} month${ctx.tenureMonths !== 1 ? "s" : ""} of dedication is something to be proud of.` : ""}\n\nKeep up the amazing work — your dedication inspires everyone at the gym!`
        : `Hi ${member.firstName},\n\nWe wanted to take a moment to celebrate your commitment! Your consistency and effort haven't gone unnoticed.\n\nKeep up the amazing work — your dedication inspires everyone at the gym. We'll be celebrating wins like yours at our next Bright Spots Friday!`,
    },
    billing: {
      subject: `Quick heads-up about your account, ${member.firstName}`,
      content: ctx
        ? `Hi ${member.firstName},\n\nHope you're doing well! I wanted to give you a quick heads-up — it looks like there might be a small hiccup with the payment method on file for your${ctx.planName ? ` ${ctx.planName}` : ""} membership.\n\nThese things happen all the time (expired cards, bank updates, etc.), and it's super easy to fix. We just want to make sure everything stays smooth so you don't miss any sessions.${ctx.tenureMonths > 0 ? `\n\nYou've been with us for ${ctx.tenureMonths} month${ctx.tenureMonths !== 1 ? "s" : ""} — we want to keep it going!` : ""}\n\nYou can update your info anytime, or just give us a call and we'll sort it out together in 2 minutes.\n\nThanks so much, and see you in class!`
        : `Hi ${member.firstName},\n\nHope you're doing well! I wanted to give you a quick heads-up — it looks like there might be a small hiccup with the payment method on file for your membership.\n\nThese things happen all the time (expired cards, bank updates, etc.), and it's super easy to fix. We just want to make sure everything stays smooth so you don't miss any sessions.\n\nYou can update your info anytime, or just give us a call and we'll sort it out together in 2 minutes.\n\nThanks so much, and see you in class!`,
    },
  };

  const template = templates[parsed.data.outreachType] || templates.at_risk;
  const meta = ctx ? buildMemberPersonalizationMeta(ctx) : null;

  const contextParts: string[] = [`Generated for ${member.firstName} ${member.lastName} (${parsed.data.outreachType})`];
  if (meta && meta.dataPoints.length > 0) {
    contextParts.push(`Using: ${meta.dataPoints.join(", ")}`);
  }

  const [content] = await db.insert(aiGeneratedContentTable).values({
    gymId,
    type: `outreach_${parsed.data.outreachType}`,
    content: template.content,
    subject: template.subject,
    confidence: "0.85",
    isAiGenerated: true,
    contextSummary: contextParts.join(". "),
  }).returning();

  res.json({
    ...content,
    confidence: parseFloat(content.confidence),
    confidenceIsDefault: true,
  });
});

router.post("/gyms/:gymId/ai/generate-brief", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const access = await verifyGymAccess(gymId, req.user!.id);
  if (!access.allowed) { res.status(access.gym ? 403 : 404).json({ error: access.gym ? "You do not have access to this gym" : "Gym not found" }); return; }

  const { count } = await import("drizzle-orm");
  const { eq, and, sql } = await import("drizzle-orm");
  const { subscriptionsTable, leadsTable } = await import("@workspace/db");

  const [activeCount] = await db.select({ count: count() }).from(membersTable).where(and(eq(membersTable.gymId, gymId), activeMemberCondition(membersTable)));
  const [cancelledCount] = await db.select({ count: count() }).from(membersTable).where(and(eq(membersTable.gymId, gymId), eq(membersTable.status, "cancelled")));
  const [holdCount] = await db.select({ count: count() }).from(membersTable).where(and(eq(membersTable.gymId, gymId), eq(membersTable.status, "hold")));
  const [leadCount] = await db.select({ count: count() }).from(leadsTable).where(eq(leadsTable.gymId, gymId));
  const subs = await db.select().from(subscriptionsTable).where(and(eq(subscriptionsTable.gymId, gymId), eq(subscriptionsTable.status, "active")));
  const mrr = subs.reduce((sum, s) => sum + parseFloat(s.amount), 0);
  const failedSubs = await db.select().from(subscriptionsTable).where(and(eq(subscriptionsTable.gymId, gymId), eq(subscriptionsTable.status, "past_due")));
  const atRiskMembers = await db.select({ count: count() }).from(membersTable).where(
    and(eq(membersTable.gymId, gymId), activeMemberCondition(membersTable),
      sql`(${membersTable.riskTier} = 'critical' OR ${membersTable.riskTier} = 'high')`)
  );

  const active = Number(activeCount?.count ?? 0);
  const atRisk = Number(atRiskMembers[0]?.count ?? 0);
  const leads = Number(leadCount?.count ?? 0);

  const briefContent = `## Weekly Owner Brief

### Current Snapshot
- **${active} active members** (${Number(cancelledCount?.count ?? 0)} cancelled, ${Number(holdCount?.count ?? 0)} on hold)
- **MRR: $${mrr.toLocaleString()}** from ${subs.length} subscriptions
- **${leads} leads** in pipeline
- **${atRisk} at-risk members** flagged for intervention

### Biggest Risks
- ${atRisk} member${atRisk !== 1 ? 's' : ''} showing elevated churn risk signals
- ${failedSubs.length} subscription${failedSubs.length !== 1 ? 's' : ''} with payment issues
- Members on hold may represent potential churn if not re-engaged

### What To Do Next
1. **Urgent**: Review and contact ${atRisk} at-risk member${atRisk !== 1 ? 's' : ''} this week
2. **This Week**: Follow up on ${failedSubs.length} failed payment${failedSubs.length !== 1 ? 's' : ''}
3. **This Week**: Engage ${leads} open lead${leads !== 1 ? 's' : ''} in pipeline
4. **Strategic**: Review member engagement patterns and class capacity

*Based on current gym data*`;

  const [content] = await db.insert(aiGeneratedContentTable).values({
    gymId,
    type: "owner_brief",
    content: briefContent,
    subject: "Weekly Owner Brief",
    confidence: "0.90",
    isAiGenerated: true,
    contextSummary: `Weekly overview: ${active} active members, $${mrr} MRR, ${atRisk} at-risk`,
  }).returning();

  res.json({
    ...content,
    confidence: parseFloat(content.confidence),
    confidenceIsDefault: true,
  });
});

router.get("/gyms/:gymId/ai/email-status", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const access = await verifyGymAccess(gymId, req.user!.id);
  if (!access.allowed) { res.status(access.gym ? 403 : 404).json({ error: access.gym ? "You do not have access to this gym" : "Gym not found" }); return; }

  const emailService = getEmailService();
  const gymEmailConfigured = !!(access.gym?.fromEmail);
  res.json({
    configured: emailService.isConfigured(),
    gymEmailConfigured,
    fromEmail: access.gym?.fromEmail || null,
    fromName: access.gym?.fromName || null,
  });
});

router.post("/gyms/:gymId/ai/tasks/:taskId/send-email", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const access = await verifyGymAccess(gymId, req.user!.id);
  if (!access.allowed) { res.status(access.gym ? 403 : 404).json({ error: access.gym ? "You do not have access to this gym" : "Gym not found" }); return; }

  const taskId = parseInt(req.params.taskId, 10);
  if (isNaN(taskId)) { res.status(400).json({ error: "Invalid task ID" }); return; }

  const [task] = await db.select().from(aiTasksTable).where(and(eq(aiTasksTable.id, taskId), eq(aiTasksTable.gymId, gymId)));
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }

  if (task.status === "sent") { res.status(409).json({ error: "Email has already been sent for this task" }); return; }
  if (task.status === "dismissed") { res.status(400).json({ error: "Cannot send email for a dismissed task" }); return; }
  if (!task.aiContent) { res.status(400).json({ error: "Task has no content to send" }); return; }
  if (!task.targetId || !task.targetType) { res.status(400).json({ error: "Task has no target recipient" }); return; }

  let recipientEmail: string | null = null;
  let recipientName = "";

  if (task.targetType === "member") {
    const [member] = await db.select().from(membersTable).where(and(eq(membersTable.id, task.targetId), eq(membersTable.gymId, gymId)));
    if (!member) { res.status(404).json({ error: "Member not found" }); return; }
    recipientEmail = member.email;
    recipientName = `${member.firstName} ${member.lastName}`;
  } else if (task.targetType === "lead") {
    const [lead] = await db.select().from(leadsTable).where(and(eq(leadsTable.id, task.targetId), eq(leadsTable.gymId, gymId)));
    if (!lead) { res.status(404).json({ error: "Lead not found" }); return; }
    recipientEmail = lead.email;
    recipientName = `${lead.firstName} ${lead.lastName}`;
  }

  if (!recipientEmail) { res.status(400).json({ error: "Recipient has no email address" }); return; }

  const emailService = getEmailService();
  if (!emailService.isConfigured()) {
    res.status(503).json({ error: "Email service not configured. Set up Resend or SendGrid to enable email sending." });
    return;
  }

  const gym = access.gym;
  if (!gym?.fromEmail) {
    res.status(400).json({ error: "Gym email sender not configured. Go to Settings to set your From Email and From Name." });
    return;
  }

  const subjectMap: Record<string, string> = {
    outreach: `Checking in, ${recipientName.split(" ")[0]}`,
    leads: `Let's connect, ${recipientName.split(" ")[0]}`,
    billing: `Quick heads-up about your account, ${recipientName.split(" ")[0]}`,
  };
  const subject = task.subject || subjectMap[task.type] || `Message from your gym`;

  if (task.targetType === "member" && task.targetId) {
    const result = await sendMemberEmail({
      memberId: task.targetId,
      gymId,
      to: recipientEmail,
      subject,
      text: task.aiContent,
      fromEmail: gym.fromEmail,
      fromName: gym.fromName || undefined,
      emailType: task.type,
      timelineTitle: "AI Operator email sent",
    });

    if (!result.success) {
      res.status(500).json({ error: result.error || "Failed to send email" });
      return;
    }

    const emailUpdateData: Record<string, any> = { status: "sent", updatedAt: new Date() };
    if (!task.actionedAt) {
      emailUpdateData.actionedAt = new Date();
      emailUpdateData.outcome = "pending_observation";
    }
    await db.update(aiTasksTable).set(emailUpdateData).where(eq(aiTasksTable.id, taskId));
    res.json({ success: true, messageId: result.messageId, recipientEmail, recipientName });
  } else {
    const result = await emailService.sendEmail({
      to: recipientEmail,
      subject,
      text: task.aiContent,
      fromEmail: gym.fromEmail,
      fromName: gym.fromName || undefined,
    });

    if (!result.success) {
      res.status(500).json({ error: result.error || "Failed to send email" });
      return;
    }

    const leadEmailUpdateData: Record<string, any> = { status: "sent", updatedAt: new Date() };
    if (!task.actionedAt) {
      leadEmailUpdateData.actionedAt = new Date();
      leadEmailUpdateData.outcome = "pending_observation";
    }
    await db.update(aiTasksTable).set(leadEmailUpdateData).where(eq(aiTasksTable.id, taskId));
    res.json({ success: true, messageId: result.messageId, recipientEmail, recipientName });
  }
});

router.post("/gyms/:gymId/ai/generate-tasks", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const access = await verifyGymAccess(gymId, req.user!.id);
  if (!access.allowed) { res.status(access.gym ? 403 : 404).json({ error: access.gym ? "You do not have access to this gym" : "Gym not found" }); return; }

  try {
    const result = await generateAiTasks(gymId);
    res.json(result);
  } catch (error) {
    console.error("Error generating AI tasks:", error);
    res.status(500).json({ error: "Failed to generate AI tasks" });
  }
});

router.get("/gyms/:gymId/ai/impact", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const access = await verifyGymAccess(gymId, req.user!.id);
  if (!access.allowed) { res.status(access.gym ? 403 : 404).json({ error: access.gym ? "You do not have access to this gym" : "Gym not found" }); return; }

  const conditions: any[] = [eq(aiTasksTable.gymId, gymId), sql`${aiTasksTable.actionedAt} IS NOT NULL`];

  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;
  if (startDate) {
    const parsed = new Date(startDate);
    if (isNaN(parsed.getTime())) { res.status(400).json({ error: "Invalid startDate" }); return; }
    conditions.push(gte(aiTasksTable.actionedAt, parsed));
  }
  if (endDate) {
    const parsed = new Date(endDate);
    if (isNaN(parsed.getTime())) { res.status(400).json({ error: "Invalid endDate" }); return; }
    conditions.push(lte(aiTasksTable.actionedAt, parsed));
  }

  const actionedTasks = await db.select().from(aiTasksTable).where(and(...conditions));

  const totalActioned = actionedTasks.length;
  const outcomeCounts: Record<string, number> = {
    won_back: 0,
    reactivated: 0,
    converted: 0,
    no_change: 0,
    pending_observation: 0,
  };

  let totalRevenueRetained = 0;
  let totalRevenueRecovered = 0;
  let membersSaved = 0;

  for (const task of actionedTasks) {
    const outcome = task.outcome || "none";
    if (outcome in outcomeCounts) {
      outcomeCounts[outcome]++;
    }

    const impact = task.revenueImpact ? parseFloat(task.revenueImpact) : 0;

    if (outcome === "won_back") {
      totalRevenueRetained += impact;
      membersSaved++;
    } else if (outcome === "reactivated") {
      totalRevenueRecovered += impact;
      membersSaved++;
    } else if (outcome === "converted") {
      membersSaved++;
    }
  }

  const resolvedTasks = actionedTasks.filter(t => t.outcome && t.outcome !== "pending_observation" && t.outcome !== "none");
  const successfulTasks = resolvedTasks.filter(t => ["won_back", "reactivated", "converted"].includes(t.outcome!));
  const successRate = resolvedTasks.length > 0 ? Math.round((successfulTasks.length / resolvedTasks.length) * 100) : 0;

  const monthlyBreakdown: Record<string, { won_back: number; reactivated: number; converted: number; no_change: number }> = {};
  for (const task of actionedTasks) {
    if (!task.actionedAt || !task.outcome || task.outcome === "pending_observation" || task.outcome === "none") continue;
    const monthKey = `${task.actionedAt.getFullYear()}-${String(task.actionedAt.getMonth() + 1).padStart(2, "0")}`;
    if (!monthlyBreakdown[monthKey]) {
      monthlyBreakdown[monthKey] = { won_back: 0, reactivated: 0, converted: 0, no_change: 0 };
    }
    if (task.outcome in monthlyBreakdown[monthKey]) {
      (monthlyBreakdown[monthKey] as any)[task.outcome]++;
    }
  }

  const timeline = Object.entries(monthlyBreakdown)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({ month, ...data }));

  res.json({
    totalActioned,
    outcomeCounts,
    successRate,
    membersSaved,
    totalRevenueRetained: Math.round(totalRevenueRetained * 100) / 100,
    totalRevenueRecovered: Math.round(totalRevenueRecovered * 100) / 100,
    timeline,
  });
});

router.get("/gyms/:gymId/ai/last-scan", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const access = await verifyGymAccess(gymId, req.user!.id);
  if (!access.allowed) { res.status(access.gym ? 403 : 404).json({ error: access.gym ? "You do not have access to this gym" : "Gym not found" }); return; }

  const lastAutoScan = getLastAiScanTimestamp();
  res.json({ lastAutoScan: lastAutoScan ? lastAutoScan.toISOString() : null });
});

export default router;
