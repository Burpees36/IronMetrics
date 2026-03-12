import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, aiTasksTable, aiGeneratedContentTable, membersTable } from "@workspace/db";
import { CreateAiTaskBody, GenerateMemberOutreachBody, UpdateAiTaskBody } from "@workspace/api-zod";
import { generateAiTasks } from "../services/ai-task-generation";

const router: IRouter = Router();

function parseGymId(params: any): number | null {
  const raw = Array.isArray(params.gymId) ? params.gymId[0] : params.gymId;
  const id = parseInt(raw, 10);
  return isNaN(id) ? null : id;
}

router.get("/gyms/:gymId/ai/tasks", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const tasks = await db.select().from(aiTasksTable).where(eq(aiTasksTable.gymId, gymId)).orderBy(desc(aiTasksTable.createdAt));
  res.json(tasks);
});

router.patch("/gyms/:gymId/ai/tasks/:taskId", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const taskId = parseInt(req.params.taskId, 10);
  if (isNaN(taskId)) { res.status(400).json({ error: "Invalid task ID" }); return; }

  const parsed = UpdateAiTaskBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [existing] = await db.select().from(aiTasksTable).where(and(eq(aiTasksTable.id, taskId), eq(aiTasksTable.gymId, gymId)));
  if (!existing) { res.status(404).json({ error: "Task not found" }); return; }

  const updateData: Record<string, any> = {};
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.aiContent !== undefined) updateData.aiContent = parsed.data.aiContent;

  if (Object.keys(updateData).length === 0) {
    res.status(400).json({ error: "At least one of 'status' or 'aiContent' must be provided" });
    return;
  }

  if (updateData.status === "approved" && (existing.type === "outreach" || existing.type === "leads" || existing.type === "billing")) {
    updateData.status = "sent";
  } else if (updateData.status === "approved" && (existing.type === "onboarding" || existing.type === "retention" || existing.type === "campaign" || existing.type === "analysis")) {
    updateData.status = "completed";
  }

  const [updated] = await db.update(aiTasksTable).set(updateData).where(eq(aiTasksTable.id, taskId)).returning();
  res.json(updated);
});

router.post("/gyms/:gymId/ai/tasks", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const parsed = CreateAiTaskBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [task] = await db.insert(aiTasksTable).values({ ...parsed.data, gymId }).returning();
  res.status(201).json(task);
});

router.post("/gyms/:gymId/ai/generate-outreach", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const parsed = GenerateMemberOutreachBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { and } = await import("drizzle-orm");
  const [member] = await db.select().from(membersTable).where(and(eq(membersTable.id, parsed.data.memberId), eq(membersTable.gymId, gymId)));
  if (!member) { res.status(404).json({ error: "Member not found" }); return; }

  const templates: Record<string, { subject: string; content: string }> = {
    at_risk: {
      subject: `We miss you, ${member.firstName}!`,
      content: `Hi ${member.firstName},\n\nWe noticed it's been a little while since your last visit and wanted to check in. Your progress matters to us, and we'd love to help you get back on track.\n\nWhether you need to adjust your schedule, try a different class format, or just need some extra motivation, we're here for you.\n\nWould you like to schedule a quick chat about your goals? We can find the best way to make the gym work for your current routine.\n\nLooking forward to seeing you soon!\n\n[AI-Generated Draft - Review before sending]`,
    },
    win_back: {
      subject: `A fresh start at the gym, ${member.firstName}`,
      content: `Hi ${member.firstName},\n\nIt's been a while since we've seen you, and we wanted to reach out. We've made some exciting changes and added new programming that we think you'd enjoy.\n\nWe'd love to offer you a complimentary drop-in session to come check things out. No pressure, just a chance to reconnect.\n\nWhat day works best for you this week?\n\n[AI-Generated Draft - Review before sending]`,
    },
    celebration: {
      subject: `Congrats on your milestone, ${member.firstName}!`,
      content: `Hi ${member.firstName},\n\nWe wanted to take a moment to celebrate your commitment! Your consistency and effort haven't gone unnoticed.\n\nKeep up the amazing work. Your dedication inspires everyone at the gym.\n\n[AI-Generated Draft - Review before sending]`,
    },
    onboarding: {
      subject: `Welcome to the team, ${member.firstName}!`,
      content: `Hi ${member.firstName},\n\nWelcome! We're so excited to have you as part of our community.\n\nHere are a few things to help you get started:\n- Book your first intro session to get oriented\n- Check out the class schedule and find times that work for you\n- Don't hesitate to ask coaches any questions\n- Remember: everyone started somewhere!\n\nLet us know if there's anything we can help with.\n\n[AI-Generated Draft - Review before sending]`,
    },
    billing: {
      subject: `Quick note about your account, ${member.firstName}`,
      content: `Hi ${member.firstName},\n\nWe noticed there may be an issue with your payment method on file. We want to make sure your membership stays active so you don't miss any sessions.\n\nCould you take a moment to update your payment information? If you have any questions about your account, please don't hesitate to reach out.\n\n[AI-Generated Draft - Review before sending]`,
    },
  };

  const template = templates[parsed.data.outreachType] || templates.at_risk;

  const [content] = await db.insert(aiGeneratedContentTable).values({
    gymId,
    type: `outreach_${parsed.data.outreachType}`,
    content: template.content,
    subject: template.subject,
    confidence: "0.85",
    isAiGenerated: true,
    contextSummary: `Generated for ${member.firstName} ${member.lastName} (${parsed.data.outreachType})`,
  }).returning();

  res.json({
    ...content,
    confidence: parseFloat(content.confidence),
  });
});

router.post("/gyms/:gymId/ai/generate-brief", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const { count } = await import("drizzle-orm");
  const { eq, and, sql } = await import("drizzle-orm");
  const { subscriptionsTable, leadsTable } = await import("@workspace/db");

  const [activeCount] = await db.select({ count: count() }).from(membersTable).where(and(eq(membersTable.gymId, gymId), eq(membersTable.status, "active")));
  const [cancelledCount] = await db.select({ count: count() }).from(membersTable).where(and(eq(membersTable.gymId, gymId), eq(membersTable.status, "cancelled")));
  const [holdCount] = await db.select({ count: count() }).from(membersTable).where(and(eq(membersTable.gymId, gymId), eq(membersTable.status, "hold")));
  const [leadCount] = await db.select({ count: count() }).from(leadsTable).where(eq(leadsTable.gymId, gymId));
  const subs = await db.select().from(subscriptionsTable).where(and(eq(subscriptionsTable.gymId, gymId), eq(subscriptionsTable.status, "active")));
  const mrr = subs.reduce((sum, s) => sum + parseFloat(s.amount), 0);
  const failedSubs = await db.select().from(subscriptionsTable).where(and(eq(subscriptionsTable.gymId, gymId), eq(subscriptionsTable.status, "past_due")));
  const atRiskMembers = await db.select({ count: count() }).from(membersTable).where(
    and(eq(membersTable.gymId, gymId), eq(membersTable.status, "active"),
      sql`(${membersTable.riskTier} = 'critical' OR ${membersTable.riskTier} = 'high')`)
  );

  const active = activeCount?.count ?? 0;
  const atRisk = atRiskMembers[0]?.count ?? 0;
  const leads = leadCount?.count ?? 0;

  const briefContent = `## Weekly Owner Brief

### Current Snapshot
- **${active} active members** (${cancelledCount?.count ?? 0} cancelled, ${holdCount?.count ?? 0} on hold)
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

[AI-Generated Brief - Based on current gym data]`;

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
  });
});

router.post("/gyms/:gymId/ai/generate-tasks", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  try {
    const result = await generateAiTasks(gymId);
    res.json(result);
  } catch (error) {
    console.error("Error generating AI tasks:", error);
    res.status(500).json({ error: "Failed to generate AI tasks" });
  }
});

export default router;
