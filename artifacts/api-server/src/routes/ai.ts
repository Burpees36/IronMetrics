import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { eq, desc, and, sql, gte, lte } from "drizzle-orm";
import { db, aiTasksTable, aiGeneratedContentTable, membersTable, leadsTable, gymsTable, gymStaffTable, subscriptionsTable, aiOperatorSettingsTable } from "@workspace/db";
import { sendMemberEmail, logMemberEmailSent } from "../services/member-email";
import { sendMemberSms, sendLeadSms } from "../services/member-sms";
import { CreateAiTaskBody, GenerateMemberOutreachBody, UpdateAiTaskBody, UpdateAutopilotSettingsBody } from "@workspace/api-zod";
import { generateAiTasks } from "../services/ai-task-generation";
import { assembleMemberContext, buildMemberPersonalizationMeta } from "../services/personalization-context";
import { getEmailService } from "../services/email-service";
import { getSmsService } from "../services/sms-service";
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
  const { classesTable, billingAuditLogsTable } = await import("@workspace/db");
  const { getGymMetrics, getRiskProfiles } = await import("./intelligence/metrics");
  const { computeRSI } = await import("./intelligence/computations");
  const { computeBlendedEngagement } = await import("../blendedMetrics");

  const metrics = await getGymMetrics(gymId);
  const rsiResult = computeRSI(metrics.churnRate, metrics.avgRev, metrics.netGrowth, metrics.avgTenure);
  const rsi = rsiResult.score ?? 0;
  const rsiBand = rsiResult.band;
  const risks = await getRiskProfiles(gymId);
  const criticalRisks = risks.filter(r => r.riskTier === "critical");
  const highRisks = risks.filter(r => r.riskTier === "high");
  const atRisk = criticalRisks.length + highRisks.length;
  const revenueAtRisk = risks.reduce((sum, r) => sum + r.revenueAtRisk, 0);

  const blendedEngagement = await computeBlendedEngagement(gymId);

  const allLeads = await db.select().from(leadsTable).where(eq(leadsTable.gymId, gymId));
  const activeLeads = allLeads.filter(l => l.stage !== "converted" && l.stage !== "lost");
  const staleLeads = allLeads.filter(l => {
    if (l.stage === "converted" || l.stage === "lost") return false;
    const now = new Date();
    const lastContact = l.lastContactDate ? new Date(l.lastContactDate) : new Date(l.createdAt);
    const hours = (now.getTime() - lastContact.getTime()) / (1000 * 60 * 60);
    if (l.stage === "new" && hours > 24) return true;
    if (l.stage === "contacted" && hours > 72) return true;
    return false;
  });

  const failedSubs = await db.select().from(subscriptionsTable).where(and(eq(subscriptionsTable.gymId, gymId), eq(subscriptionsTable.status, "past_due")));
  const failedRev = failedSubs.reduce((sum, s) => sum + parseFloat(s.amount || "0"), 0);

  const [activeCount] = await db.select({ count: count() }).from(membersTable).where(and(eq(membersTable.gymId, gymId), activeMemberCondition(membersTable)));
  const [cancelledCount] = await db.select({ count: count() }).from(membersTable).where(and(eq(membersTable.gymId, gymId), eq(membersTable.status, "cancelled")));
  const [holdCount] = await db.select({ count: count() }).from(membersTable).where(and(eq(membersTable.gymId, gymId), eq(membersTable.status, "hold")));

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const allClasses = await db.select().from(classesTable).where(eq(classesTable.gymId, gymId));
  const todayClasses = allClasses.filter(c => new Date(c.startTime).toISOString().split("T")[0] === todayStr);
  const totalCapacity = todayClasses.reduce((sum, c) => sum + (c.capacity || 0), 0);
  const totalEnrolled = todayClasses.reduce((sum, c) => sum + (c.enrolled || 0), 0);
  const classFillRate = totalCapacity > 0 ? Math.round((totalEnrolled / totalCapacity) * 100) : 0;

  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const recentSuspensions = await db.select({ id: billingAuditLogsTable.id }).from(billingAuditLogsTable).where(
    and(eq(billingAuditLogsTable.gymId, gymId), eq(billingAuditLogsTable.action, "recovery.auto_suspended"), gte(billingAuditLogsTable.createdAt, oneDayAgo))
  );

  const active = Number(activeCount?.count ?? 0);
  const cancelled = Number(cancelledCount?.count ?? 0);
  const onHold = Number(holdCount?.count ?? 0);
  const mrr = metrics.totalRev;

  const rsiLabel = rsiBand;
  const engagementPct = blendedEngagement.engagementRate;

  const urgentItems: string[] = [];
  const thisWeekItems: string[] = [];
  const strategicItems: string[] = [];

  if (criticalRisks.length > 0) {
    urgentItems.push(`Reach out to ${criticalRisks.length} critical-risk member${criticalRisks.length !== 1 ? "s" : ""} — $${Math.round(criticalRisks.reduce((s, r) => s + r.revenueAtRisk, 0))}/mo at stake`);
  }
  if (failedSubs.length > 0) {
    urgentItems.push(`Follow up on ${failedSubs.length} failed payment${failedSubs.length !== 1 ? "s" : ""} ($${Math.round(failedRev)}/mo in recovery)`);
  }
  if (recentSuspensions.length > 0) {
    urgentItems.push(`${recentSuspensions.length} member${recentSuspensions.length !== 1 ? "s were" : " was"} auto-suspended in the last 24 hours — review for manual recovery`);
  }
  if (highRisks.length > 0) {
    thisWeekItems.push(`Check in with ${highRisks.length} high-risk member${highRisks.length !== 1 ? "s" : ""} before they drift further`);
  }
  if (staleLeads.length > 0) {
    thisWeekItems.push(`Re-engage ${staleLeads.length} stale lead${staleLeads.length !== 1 ? "s" : ""} — warm leads cool fast`);
  }
  if (onHold > 0) {
    thisWeekItems.push(`${onHold} member${onHold !== 1 ? "s" : ""} on hold — consider a personal check-in to bring them back`);
  }
  if (classFillRate < 60 && todayClasses.length > 0) {
    strategicItems.push(`Class fill rate is ${classFillRate}% today — consider adjusting schedule or promoting low-fill classes`);
  }
  if (engagementPct < 50) {
    strategicItems.push(`Member engagement is at ${Math.round(engagementPct)}% — explore community events or challenges to boost participation`);
  }
  if (rsi < 60) {
    strategicItems.push(`Retention Stability Index is ${Math.round(rsi)} (${rsiLabel}) — focus on reducing churn signals`);
  }

  let briefContent = `## Owner Brief — ${now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}

### Your Gym at a Glance
| Metric | Value |
|--------|-------|
| Active Members | ${active} |
| MRR | $${Math.round(mrr).toLocaleString()} |
| Retention Stability (RSI) | ${Math.round(rsi)} — ${rsiLabel} |
| Member Engagement | ${Math.round(engagementPct)}% |
| At-Risk Members | ${atRisk} ($${Math.round(revenueAtRisk)}/mo at stake) |
| Active Leads | ${activeLeads.length} (${staleLeads.length} stale) |
| Failed Payments | ${failedSubs.length} ($${Math.round(failedRev)}/mo) |
| Today's Classes | ${todayClasses.length} at ${classFillRate}% fill rate |
| Cancelled | ${cancelled} | On Hold | ${onHold} |
`;

  if (urgentItems.length > 0) {
    briefContent += `\n### 🔴 Urgent — Act Today\n${urgentItems.map((item, i) => `${i + 1}. ${item}`).join("\n")}\n`;
  }
  if (thisWeekItems.length > 0) {
    briefContent += `\n### 🟡 This Week\n${thisWeekItems.map((item, i) => `${i + 1}. ${item}`).join("\n")}\n`;
  }
  if (strategicItems.length > 0) {
    briefContent += `\n### 🔵 Strategic\n${strategicItems.map((item, i) => `${i + 1}. ${item}`).join("\n")}\n`;
  }
  if (urgentItems.length === 0 && thisWeekItems.length === 0) {
    briefContent += `\n### ✅ Looking Good\nNo urgent items right now. Keep engaging your community and monitoring trends.\n`;
  }

  briefContent += `\n*Generated from live gym data — ${now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}*`;

  const [content] = await db.insert(aiGeneratedContentTable).values({
    gymId,
    type: "owner_brief",
    content: briefContent,
    subject: `Owner Brief — ${now.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
    confidence: "0.95",
    isAiGenerated: true,
    contextSummary: `Brief: ${active} active, $${Math.round(mrr)} MRR, RSI ${Math.round(rsi)}, ${atRisk} at-risk, ${failedSubs.length} failed payments`,
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

router.post("/gyms/:gymId/ai/tasks/:taskId/send-sms", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const access = await verifyGymAccess(gymId, req.user!.id);
  if (!access.allowed) { res.status(access.gym ? 403 : 404).json({ error: access.gym ? "You do not have access to this gym" : "Gym not found" }); return; }

  const taskId = parseInt(req.params.taskId, 10);
  if (isNaN(taskId)) { res.status(400).json({ error: "Invalid task ID" }); return; }

  const [task] = await db.select().from(aiTasksTable).where(and(eq(aiTasksTable.id, taskId), eq(aiTasksTable.gymId, gymId)));
  if (!task) { res.status(404).json({ error: "Task not found" }); return; }

  if (task.status === "sent") { res.status(409).json({ error: "Message has already been sent for this task" }); return; }
  if (task.status === "dismissed") { res.status(400).json({ error: "Cannot send message for a dismissed task" }); return; }
  if (!task.targetId || !task.targetType) { res.status(400).json({ error: "Task has no target recipient" }); return; }

  const gym = access.gym;
  const smsService = getSmsService(gym);
  if (!smsService.isConfigured()) {
    res.status(503).json({ error: "SMS not configured. Set up Twilio in Settings to enable text messaging." });
    return;
  }

  let recipientPhone: string | null = null;
  let recipientName = "";

  if (task.targetType === "member") {
    const [member] = await db.select().from(membersTable).where(and(eq(membersTable.id, task.targetId), eq(membersTable.gymId, gymId)));
    if (!member) { res.status(404).json({ error: "Member not found" }); return; }
    recipientPhone = member.phone;
    recipientName = `${member.firstName} ${member.lastName}`;
  } else if (task.targetType === "lead") {
    const [lead] = await db.select().from(leadsTable).where(and(eq(leadsTable.id, task.targetId), eq(leadsTable.gymId, gymId)));
    if (!lead) { res.status(404).json({ error: "Lead not found" }); return; }
    recipientPhone = lead.phone;
    recipientName = `${lead.firstName} ${lead.lastName}`;
  }

  if (!recipientPhone) { res.status(400).json({ error: "Recipient has no phone number" }); return; }

  const firstName = recipientName.split(" ")[0];
  const smsTemplates: Record<string, string> = {
    outreach: `Hey ${firstName}! We miss you at the gym. Want to set up a quick catch-up this week? No pressure - just want to make sure you're doing well. Reply or call us anytime!`,
    leads: `Hi ${firstName}! Thanks for your interest in our gym. We'd love to set up a free No Sweat Intro for you - 20 min, zero pressure. What day works best?`,
    billing: `Hi ${firstName}, quick heads-up - looks like there's a small issue with your payment on file. Super easy to fix! Give us a call or stop by and we'll sort it out in 2 min.`,
  };
  const smsBody = smsTemplates[task.type] || `Hi ${firstName}, this is a message from your gym. Give us a call when you get a chance!`;

  let smsResult;
  if (task.targetType === "member") {
    smsResult = await sendMemberSms({
      memberId: task.targetId,
      gymId,
      to: recipientPhone,
      body: smsBody,
      smsType: task.type,
      timelineTitle: "AI Operator text sent",
      gymConfig: gym,
    });
  } else {
    smsResult = await sendLeadSms({
      leadId: task.targetId,
      gymId,
      to: recipientPhone,
      body: smsBody,
      smsType: task.type,
      gymConfig: gym,
    });
  }

  if (!smsResult.success) {
    res.status(500).json({ error: smsResult.error || "Failed to send SMS" });
    return;
  }

  const smsUpdateData: Record<string, any> = { status: "sent", channel: "sms", updatedAt: new Date() };
  if (!task.actionedAt) {
    smsUpdateData.actionedAt = new Date();
    smsUpdateData.outcome = "pending_observation";
  }
  await db.update(aiTasksTable).set(smsUpdateData).where(eq(aiTasksTable.id, taskId));
  res.json({ success: true, messageSid: smsResult.messageSid, recipientPhone, recipientName });
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
    positive_engagement: 0,
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
    } else if (outcome === "converted" || outcome === "positive_engagement") {
      membersSaved++;
    }
  }

  const resolvedTasks = actionedTasks.filter(t => t.outcome && t.outcome !== "pending_observation" && t.outcome !== "none");
  const successfulTasks = resolvedTasks.filter(t => ["won_back", "reactivated", "converted", "positive_engagement"].includes(t.outcome!));
  const successRate = resolvedTasks.length > 0 ? Math.round((successfulTasks.length / resolvedTasks.length) * 100) : 0;

  const monthlyBreakdown: Record<string, { won_back: number; reactivated: number; converted: number; positive_engagement: number; no_change: number }> = {};
  for (const task of actionedTasks) {
    if (!task.actionedAt || !task.outcome || task.outcome === "pending_observation" || task.outcome === "none") continue;
    const monthKey = `${task.actionedAt.getFullYear()}-${String(task.actionedAt.getMonth() + 1).padStart(2, "0")}`;
    if (!monthlyBreakdown[monthKey]) {
      monthlyBreakdown[monthKey] = { won_back: 0, reactivated: 0, converted: 0, positive_engagement: 0, no_change: 0 };
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

router.get("/gyms/:gymId/ai/autopilot-settings", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const access = await verifyGymAccess(gymId, req.user!.id);
  if (!access.allowed) { res.status(access.gym ? 403 : 404).json({ error: access.gym ? "You do not have access to this gym" : "Gym not found" }); return; }

  let [settings] = await db.select().from(aiOperatorSettingsTable).where(eq(aiOperatorSettingsTable.gymId, gymId));

  if (!settings) {
    [settings] = await db.insert(aiOperatorSettingsTable).values({ gymId }).returning();
  }

  const settingsResponse = {
    autopilotOutreach: settings.autopilotOutreach,
    autopilotBilling: settings.autopilotBilling,
    autopilotLeads: settings.autopilotLeads,
    autopilotCelebrations: settings.autopilotCelebrations,
    channelOutreach: settings.channelOutreach,
    channelBilling: settings.channelBilling,
    channelLeads: settings.channelLeads,
    channelCelebrations: settings.channelCelebrations,
    cooldownDays: settings.cooldownDays,
    cooldownOutreach: settings.cooldownOutreach,
    cooldownBilling: settings.cooldownBilling,
    cooldownLeads: settings.cooldownLeads,
    cooldownCelebrations: settings.cooldownCelebrations,
    digestFrequency: settings.digestFrequency,
    briefingEmailEnabled: settings.briefingEmailEnabled,
    briefingDeliveryHour: settings.briefingDeliveryHour,
    briefingSmsEnabled: settings.briefingSmsEnabled,
  };
  res.json(settingsResponse);
});

router.put("/gyms/:gymId/ai/autopilot-settings", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const access = await verifyGymAccess(gymId, req.user!.id);
  if (!access.allowed) { res.status(access.gym ? 403 : 404).json({ error: access.gym ? "You do not have access to this gym" : "Gym not found" }); return; }

  const body = req.body as Record<string, unknown>;

  const booleanKeys = ["autopilotOutreach", "autopilotBilling", "autopilotLeads", "autopilotCelebrations", "briefingEmailEnabled", "briefingSmsEnabled"];
  const channelKeys = ["channelOutreach", "channelBilling", "channelLeads", "channelCelebrations"];
  const cooldownKeys = ["cooldownDays", "cooldownOutreach", "cooldownBilling", "cooldownLeads", "cooldownCelebrations"];
  const validChannels = ["email", "sms", "both"];
  const validDigest = ["daily", "weekly", "disabled"];

  const updateData: Record<string, unknown> = {};
  const errors: string[] = [];

  for (const key of booleanKeys) {
    if (body[key] !== undefined) {
      if (typeof body[key] !== "boolean") { errors.push(`${key} must be a boolean`); continue; }
      updateData[key] = body[key];
    }
  }
  for (const key of channelKeys) {
    if (body[key] !== undefined) {
      if (!validChannels.includes(body[key] as string)) { errors.push(`${key} must be one of: ${validChannels.join(", ")}`); continue; }
      updateData[key] = body[key];
    }
  }
  for (const key of cooldownKeys) {
    if (body[key] !== undefined) {
      const val = Number(body[key]);
      const maxVal = key === "cooldownCelebrations" ? 365 : 90;
      if (!Number.isFinite(val) || val < 1 || val > maxVal) { errors.push(`${key} must be an integer between 1 and ${maxVal}`); continue; }
      updateData[key] = Math.round(val);
    }
  }
  if (body.digestFrequency !== undefined) {
    if (!validDigest.includes(body.digestFrequency as string)) { errors.push(`digestFrequency must be one of: ${validDigest.join(", ")}`); }
    else updateData.digestFrequency = body.digestFrequency;
  }
  if (body.briefingDeliveryHour !== undefined) {
    const val = Number(body.briefingDeliveryHour);
    if (!Number.isFinite(val) || val < 4 || val > 10) { errors.push("briefingDeliveryHour must be an integer between 4 and 10"); }
    else updateData.briefingDeliveryHour = Math.round(val);
  }

  if (errors.length > 0) {
    res.status(400).json({ error: "Validation failed", details: errors });
    return;
  }

  if (Object.keys(updateData).length === 0) {
    res.status(400).json({ error: "At least one setting must be provided" });
    return;
  }

  let [existing] = await db.select().from(aiOperatorSettingsTable).where(eq(aiOperatorSettingsTable.gymId, gymId));

  let settings;
  if (existing) {
    [settings] = await db.update(aiOperatorSettingsTable).set(updateData).where(eq(aiOperatorSettingsTable.gymId, gymId)).returning();
  } else {
    [settings] = await db.insert(aiOperatorSettingsTable).values({ gymId, ...updateData }).returning();
  }

  res.json({
    autopilotOutreach: settings.autopilotOutreach,
    autopilotBilling: settings.autopilotBilling,
    autopilotLeads: settings.autopilotLeads,
    autopilotCelebrations: settings.autopilotCelebrations,
    channelOutreach: settings.channelOutreach,
    channelBilling: settings.channelBilling,
    channelLeads: settings.channelLeads,
    channelCelebrations: settings.channelCelebrations,
    cooldownDays: settings.cooldownDays,
    cooldownOutreach: settings.cooldownOutreach,
    cooldownBilling: settings.cooldownBilling,
    cooldownLeads: settings.cooldownLeads,
    cooldownCelebrations: settings.cooldownCelebrations,
    digestFrequency: settings.digestFrequency,
    briefingEmailEnabled: settings.briefingEmailEnabled,
    briefingDeliveryHour: settings.briefingDeliveryHour,
    briefingSmsEnabled: settings.briefingSmsEnabled,
  });
});

export default router;
