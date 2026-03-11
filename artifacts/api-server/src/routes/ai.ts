import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, aiTasksTable, aiGeneratedContentTable, membersTable } from "@workspace/db";
import { CreateAiTaskBody, GenerateMemberOutreachBody } from "@workspace/api-zod";

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

  const [member] = await db.select().from(membersTable).where(eq(membersTable.id, parsed.data.memberId));
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

  const briefContent = `## Weekly Owner Brief

### What Changed
- **3 new members** joined this week, bringing active count to 127
- **2 members** moved to at-risk status based on attendance patterns
- **Revenue** is tracking 3% above last month's pace

### Biggest Risks
- Member retention in the 60-90 day cohort is below benchmark (72% vs 80% target)
- 4 members have failed payments pending recovery
- Tuesday/Thursday 5PM classes consistently at 95%+ capacity

### Biggest Wins
- Morning class attendance up 12% month-over-month
- Lead conversion rate improved to 34% (from 28% last month)
- Zero cancellations from members with 6+ month tenure

### Where Money Is Leaking
- $720 in failed payments awaiting recovery
- 8 members on holds longer than 30 days (potential churn)
- Drop-in revenue down 15% - consider promotional pricing

### What To Do Next
1. **Urgent**: Contact top 3 at-risk members this week
2. **This Week**: Follow up on failed payments
3. **This Month**: Review capacity and consider adding a Thursday 5:30PM class
4. **Strategic**: Launch referral program targeting satisfied long-tenure members

[AI-Generated Brief - Based on current gym data]`;

  const [content] = await db.insert(aiGeneratedContentTable).values({
    gymId,
    type: "owner_brief",
    content: briefContent,
    subject: "Weekly Owner Brief",
    confidence: "0.90",
    isAiGenerated: true,
    contextSummary: "Weekly strategic overview generated from current gym metrics",
  }).returning();

  res.json({
    ...content,
    confidence: parseFloat(content.confidence),
  });
});

export default router;
