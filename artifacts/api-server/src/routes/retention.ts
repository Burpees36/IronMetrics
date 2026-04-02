import { Router, type IRouter } from "express";
import { eq, and, sql, count, desc, asc } from "drizzle-orm";
import {
  db, retentionSequencesTable, retentionSequenceStepsTable,
  memberSequenceEnrollmentsTable, retentionSequenceEventsTable,
  membersTable
} from "@workspace/db";
import { requireGymAccess } from "../middlewares/requireGymAccess";

const router: IRouter = Router();

router.use("/gyms/:gymId", requireGymAccess);

const DEFAULT_SEQUENCES = [
  {
    name: "Miss You",
    description: "Re-engage members who have stopped attending",
    type: "miss_you",
    triggerConfig: { type: "no_attendance", days: 10 },
    cooldownDays: 30,
    steps: [
      { stepOrder: 1, actionType: "email", delayDays: 0, config: { 
        subject: "We miss you at {{gym_name}}!", 
        body: "Hi {{first_name}},\n\nWe noticed you haven't been in lately and wanted to check in. This is usually where people start slipping and we don't want that for you.\n\n" +
          "Let’s make this simple:\n" +
          "→ Pick one class this week\n" +
          "→ Show up\n" +
          "→ We’ll handle the rest\n\n" + 
        "See you soon,\n{{gym_name}}" } },
      { stepOrder: 2, actionType: "task", delayDays: 3, config: { 
        title: "Personal check-in: {{first_name}} {{last_name}}",           
        description:
        "Call (do NOT text first).\n\n" +                                   
        "Ask: 'What’s been getting in the way of coming in?'\n\n" +
        "Listen fully. Then offer ONE solution:\n" +
         "- New class time\n" +
         "- Scaled programming\n" +
         "- Accountability plan\n\n" +                                       
        "GOAL: Get them verbally committed to their next class before ending the call.",
        assignTo: "coach" } },
      { stepOrder: 3, actionType: "email", delayDays: 7, config: { 
      subject: "Let’s get one win this week, {{first_name}}",
        body:
          "Hi {{first_name}},\n\n" +
          "You don’t need a perfect week — you just need one win.\n\n" +
          "One class. That’s it.\n\n" +
          "Momentum starts small, and we’ll build from there.\n\n" +
          "We’ve got your back — just show up once this week.\n\n" +
          "{{gym_name}}" } },
      { stepOrder: 4, actionType: "task", delayDays: 14, config: { 
      title: "Escalation: Owner outreach — {{first_name}}",
        description:
          "Member has not returned after initial outreach.\n\n" +
          "Owner call or voice message required.\n\n" +
          "Focus:\n" +
          "- Reinforce value of membership\n" +
          "- Offer adjustment (schedule, plan, hold)\n\n" +
          "GOAL: Save membership or uncover true churn reason.",
        assignTo: "owner" } },
    ],
  },
  {
    name: "Check-In",
    description: "Reach out to members showing moderate risk signals",
    type: "check_in",
    triggerConfig: { type: "risk_score", threshold: 50 },
    cooldownDays: 45,
    steps: [
      { stepOrder: 1, actionType: "email", delayDays: 0, config: { 
      subject: "Something’s off — let’s fix it",
        body:
          "Hey {{first_name}},\n\n" +
          "Quick check — your attendance has dropped off a bit.\n\n" +
          "That usually means one of three things:\n" +
          "• Schedule isn’t working\n" +
          "• Workouts feel off\n" +
          "• Life got busy\n\n" +
          "Totally normal — but if we don’t fix it now, it turns into quitting later.\n\n" +
          "Let’s get ahead of it.\n\n" +
          "Reply “YES” and we’ll set up a quick 10-minute plan.\n\n" +
          "{{gym_name}}" } },
      { stepOrder: 2, actionType: "task", delayDays: 5, config: { 
      title: "Book goal review with {{first_name}}",
        description:
          "Schedule a 10-minute goal review.\n\n" +
          "Agenda:\n" +
          "1. Identify barrier\n" +
          "2. Adjust training schedule\n" +
          "3. Lock in next 2 class dates\n\n" +
          "GOAL: Member leaves with a clear plan + booked classes.",
        assignTo: "coach" } },
      { stepOrder: 3, actionType: "email", delayDays: 10, config: { 
      subject: "We adjusted things for you",
        body:
          "Hi {{first_name}},\n\n" +
          "We’ve made some adjustments on our end to help you stay consistent.\n\n" +
          "Now it just comes down to showing up.\n\n" +
          "Even one or two classes this week puts you back on track.\n\n" +
          "We’re here — let’s keep this moving.\n\n" +
          "{{gym_name}}" } },
      {
        stepOrder: 4, actionType: "task", delayDays: 12, config: {
          title: "Check attendance recovery — {{first_name}}",
          description:
            "Review if attendance improved.\n\n" +
            "If NOT:\n" +
            "- Escalate to owner\n" +
            "- Consider membership adjustment or added support\n\n" +
            "GOAL: Prevent progression to high-risk.",
          assignTo: "coach" } },
    ],
  },

  {
    name: "Win Back",
    description: "Intensive outreach for high-risk members near cancellation",
    type: "win_back",
    triggerConfig: { type: "risk_score", threshold: 80 },
    cooldownDays: 60,
    steps: [
      { stepOrder: 1, actionType: "task", delayDays: 0, config: { 
        title: "URGENT: Call {{first_name}} {{last_name}} now",
          description:
            "High churn risk.\n\n" +
            "Call immediately.\n\n" +
            "Script:\n" +
            "- 'Hey, I wanted to check in — haven’t seen you much lately.'\n" +
            "- 'What’s been going on?'\n\n" +
            "Offer solution:\n" +
            "- Adjust plan\n" +
            "- Schedule reset\n" +
            "- Membership hold if needed\n\n" +
            "GOAL: Get commitment or uncover churn reason.", 
        assignTo: "owner" } },
      { stepOrder: 2, actionType: "email", delayDays: 1, config: { 
        subject: "{{first_name}}, we want to help", 
        body: "Hi {{first_name}},\n\nI wanted to reach out personally. We value you and want to make sure you're getting the most out of this membership.\n\nIf something isn't working — schedule, programming, anything — I'd love to chat and find a solution together.\n\Reply or call us — we’ll make a plan that works.\n\n{{gym_name}}" } },
      { stepOrder: 3, actionType: "task", delayDays: 7, config: { 
      title: "Offer retention option — {{first_name}}",
        description:
          "If still disengaged, offer:\n" +
          "- Membership downgrade\n" +
          "- Temporary hold\n" +
          "- Personal training intro\n\n" +
          "GOAL: Keep them connected instead of cancelling.",
        assignTo: "owner" } },
      { stepOrder: 4, actionType: "email", delayDays: 14, config: { 
        subject: "We'd love to have you back, {{first_name}}", 
        body: "Hi {{first_name}},\n\nWe understand life gets busy. If you need a break, we offer membership holds. If there's something we can do differently, we're all ears.\n\nYour health and fitness journey matters to us — we're here whenever you're ready.\n\nWarmly,\n{{gym_name}}" } },
    ],
  },
  {
    name: "Onboarding Journey",
    description: "Proactive 5-phase onboarding protocol guiding new members from first day through their 90-day goal review",
    type: "onboarding_journey",
    triggerConfig: { type: "new_member_join", joinDays: 3 },
    cooldownDays: 365,
    steps: [
      { stepOrder: 1, actionType: "email", delayDays: 0, config: {
        subject: "Welcome to {{gym_name}}, {{first_name}}!",
        body:
          "Hi {{first_name}},\n\n" +
          "We're so glad you're here! You just took the biggest step — showing up.\n\n" +
          "Here's what happens next:\n" +
          "→ Your No Sweat Intro (NSI) is where we learn about your goals and build your personalized plan\n" +
          "→ We'll get you scheduled for OnRamp sessions to learn the foundations\n" +
          "→ From there, you'll ease into group classes with full support\n\n" +
          "Every expert was once a beginner. We're here for you every step of the way.\n\n" +
          "See you soon,\n{{gym_name}}" } },
      { stepOrder: 2, actionType: "task", delayDays: 1, config: {
        title: "NSI follow-up: {{first_name}} {{last_name}}",
        description:
          "Confirm NSI is scheduled (should be within 48 hours of sign-up).\n\n" +
          "During the NSI:\n" +
          "- Ask 3-4 motivational interview questions (why now, what they've tried, goals)\n" +
          "- Create their prescription (PT, semi-private, group, nutrition, or combo)\n" +
          "- Fill out their goal sheet and do InBody scan if available\n" +
          "- Schedule their first OnRamp session before they leave\n\n" +
          "GOAL: Member leaves with a clear plan and their first OnRamp on the calendar.",
        assignTo: "coach" } },
      { stepOrder: 3, actionType: "email", delayDays: 7, config: {
        subject: "How's your first week going, {{first_name}}?",
        body:
          "Hi {{first_name}},\n\n" +
          "You've been with us for a week now — how are you feeling?\n\n" +
          "By now you should be getting comfortable with the basics. A few reminders:\n" +
          "• Don't worry about scaling — every workout is adjustable to you\n" +
          "• Try a couple different class times to find your rhythm\n" +
          "• Ask your coach anything — that's what we're here for\n\n" +
          "The first few weeks are about building the habit. You're doing great.\n\n" +
          "{{gym_name}}" } },
      { stepOrder: 4, actionType: "task", delayDays: 14, config: {
        title: "Day 14 check-in: {{first_name}} {{last_name}}",
        description:
          "Quick 5-minute check-in before or after class.\n\n" +
          "Ask:\n" +
          "- How are you feeling?\n" +
          "- Any questions or things that aren't clicking?\n" +
          "- Still tracking your habits?\n\n" +
          "Check attendance — if < 3 visits/week, help adjust schedule.\n" +
          "Introduce them to 2-3 regular members at their class time.\n\n" +
          "GOAL: Reinforce habit, build social connections, remove any friction.",
        assignTo: "coach" } },
      { stepOrder: 5, actionType: "email", delayDays: 30, config: {
        subject: "One month strong, {{first_name}}!",
        body:
          "Hi {{first_name}},\n\n" +
          "You've been with us for a month — and that's a real milestone.\n\n" +
          "Most people who make it past 30 days build a lasting routine. You're right on track.\n\n" +
          "Keep showing up consistently and trust the process. The results are coming.\n\n" +
          "If anything needs adjusting — schedule, programming, nutrition — just let us know.\n\n" +
          "Proud of you,\n{{gym_name}}" } },
      { stepOrder: 6, actionType: "task", delayDays: 60, config: {
        title: "Day 60 habit check: {{first_name}} {{last_name}}",
        description:
          "Review attendance and engagement over the past 2 months.\n\n" +
          "Check:\n" +
          "- Attendance consistency (target: 3+ visits/week)\n" +
          "- Habits tracking progress\n" +
          "- Any barriers or concerns\n\n" +
          "If attendance is slipping, offer adjustments (class time, programming, accountability partner).\n" +
          "Remind them their 90-day goal review is coming up — keep momentum going.\n\n" +
          "GOAL: Ensure member is on track for a strong 90-day review.",
        assignTo: "coach" } },
      { stepOrder: 7, actionType: "task", delayDays: 85, config: {
        title: "Schedule 90-day goal review: {{first_name}} {{last_name}}",
        description:
          "Schedule the 90-day goal review appointment.\n\n" +
          "Prep:\n" +
          "- Pull their original goals from the NSI\n" +
          "- Prepare InBody scan comparison if available\n" +
          "- Note workout improvements and attendance stats\n\n" +
          "This is the most important appointment after the NSI — it turns a new member into a long-term member.\n\n" +
          "GOAL: Get the review on the calendar within the next 5 days.",
        assignTo: "coach" } },
      { stepOrder: 8, actionType: "email", delayDays: 90, config: {
        subject: "90 days — look what you've done, {{first_name}}!",
        body:
          "Hi {{first_name}},\n\n" +
          "90 days. You showed up, put in the work, and stuck with it.\n\n" +
          "That's not a small thing — it's everything.\n\n" +
          "Your coach will be going over your progress and setting new goals with you. This is where the next chapter starts.\n\n" +
          "We're so proud of how far you've come. Here's to the next 90 days and beyond.\n\n" +
          "{{gym_name}}" } },
    ],
  }
];


router.get("/gyms/:gymId/retention/sequences", async (req, res): Promise<void> => {
  try {
    const gymId = Number(req.params.gymId);

    const sequences = await db.select().from(retentionSequencesTable)
      .where(eq(retentionSequencesTable.gymId, gymId))
      .orderBy(asc(retentionSequencesTable.createdAt));

    const sequenceIds = sequences.map(s => s.id);

    let enrollmentCounts: Record<number, number> = {};
    if (sequenceIds.length > 0) {
      const counts = await db.select({
        sequenceId: memberSequenceEnrollmentsTable.sequenceId,
        count: count(),
      }).from(memberSequenceEnrollmentsTable)
        .where(and(
          eq(memberSequenceEnrollmentsTable.gymId, gymId),
          eq(memberSequenceEnrollmentsTable.status, "active")
        ))
        .groupBy(memberSequenceEnrollmentsTable.sequenceId);

      for (const c of counts) {
        enrollmentCounts[c.sequenceId] = Number(c.count);
      }
    }

    const result = sequences.map(s => ({
      ...s,
      activeEnrollments: enrollmentCounts[s.id] || 0,
    }));

    res.json(result);
  } catch (err: any) {
    console.error("[retention] GET sequences error:", err.message);
    res.status(500).json({ error: "Failed to load sequences" });
  }
});

router.post("/gyms/:gymId/retention/sequences/seed-defaults", async (req, res): Promise<void> => {
  try {
    const gymId = Number(req.params.gymId);
    const gymRole = (req as any).gymRole;
    if (!["owner", "admin"].includes(gymRole)) {
      res.status(403).json({ error: "Only owners and admins can manage retention sequences" });
      return;
    }

    const existing = await db.select({ id: retentionSequencesTable.id, type: retentionSequencesTable.type })
      .from(retentionSequencesTable)
      .where(eq(retentionSequencesTable.gymId, gymId));

    const existingTypes = new Set(existing.map(s => s.type));

    const toCreate = DEFAULT_SEQUENCES.filter(def => !existingTypes.has(def.type));

    if (toCreate.length === 0) {
      res.status(400).json({ error: "All default sequences already exist." });
      return;
    }

    const created = [];
    for (const def of toCreate) {
      const [seq] = await db.insert(retentionSequencesTable).values({
        gymId,
        name: def.name,
        description: def.description,
        type: def.type,
        isEnabled: false,
        triggerConfig: def.triggerConfig,
        cooldownDays: def.cooldownDays,
      }).returning();

      for (const step of def.steps) {
        await db.insert(retentionSequenceStepsTable).values({
          sequenceId: seq.id,
          stepOrder: step.stepOrder,
          actionType: step.actionType,
          delayDays: step.delayDays,
          config: step.config,
        });
      }

      created.push(seq);
    }

    res.status(201).json(created);
  } catch (err: any) {
    console.error("[retention] seed-defaults error:", err.message);
    res.status(500).json({ error: "Failed to seed default sequences" });
  }
});

router.get("/gyms/:gymId/retention/sequences/:sequenceId", async (req, res): Promise<void> => {
  try {
    const gymId = Number(req.params.gymId);
    const sequenceId = Number(req.params.sequenceId);

    const [sequence] = await db.select().from(retentionSequencesTable)
      .where(and(eq(retentionSequencesTable.id, sequenceId), eq(retentionSequencesTable.gymId, gymId)));

    if (!sequence) { res.status(404).json({ error: "Sequence not found" }); return; }

    const steps = await db.select().from(retentionSequenceStepsTable)
      .where(eq(retentionSequenceStepsTable.sequenceId, sequenceId))
      .orderBy(asc(retentionSequenceStepsTable.stepOrder));

    const [enrollCount] = await db.select({ count: count() }).from(memberSequenceEnrollmentsTable)
      .where(and(
        eq(memberSequenceEnrollmentsTable.sequenceId, sequenceId),
        eq(memberSequenceEnrollmentsTable.status, "active")
      ));

    res.json({ ...sequence, steps, activeEnrollments: Number(enrollCount.count) });
  } catch (err: any) {
    console.error("[retention] GET sequence detail error:", err.message);
    res.status(500).json({ error: "Failed to load sequence" });
  }
});

router.post("/gyms/:gymId/retention/sequences", async (req, res): Promise<void> => {
  try {
    const gymId = Number(req.params.gymId);
    const gymRole = (req as any).gymRole;
    if (!["owner", "admin"].includes(gymRole)) {
      res.status(403).json({ error: "Only owners and admins can create sequences" });
      return;
    }

    const { name, description, type, triggerConfig, cooldownDays, steps } = req.body;
    if (!name) { res.status(400).json({ error: "Sequence name is required" }); return; }

    const [seq] = await db.insert(retentionSequencesTable).values({
      gymId,
      name,
      description: description || null,
      type: type || "custom",
      isEnabled: false,
      triggerConfig: triggerConfig || {},
      cooldownDays: cooldownDays ?? 30,
    }).returning();

    if (steps && Array.isArray(steps)) {
      for (const step of steps) {
        await db.insert(retentionSequenceStepsTable).values({
          sequenceId: seq.id,
          stepOrder: step.stepOrder,
          actionType: step.actionType,
          delayDays: step.delayDays ?? 0,
          config: step.config || {},
        });
      }
    }

    res.status(201).json(seq);
  } catch (err: any) {
    console.error("[retention] POST sequence error:", err.message);
    res.status(500).json({ error: "Failed to create sequence" });
  }
});

router.put("/gyms/:gymId/retention/sequences/:sequenceId", async (req, res): Promise<void> => {
  try {
    const gymId = Number(req.params.gymId);
    const sequenceId = Number(req.params.sequenceId);
    const gymRole = (req as any).gymRole;
    if (!["owner", "admin"].includes(gymRole)) {
      res.status(403).json({ error: "Only owners and admins can edit sequences" });
      return;
    }

    const [existing] = await db.select().from(retentionSequencesTable)
      .where(and(eq(retentionSequencesTable.id, sequenceId), eq(retentionSequencesTable.gymId, gymId)));
    if (!existing) { res.status(404).json({ error: "Sequence not found" }); return; }

    const { name, description, isEnabled, triggerConfig, cooldownDays, steps } = req.body;

    const [updated] = await db.update(retentionSequencesTable).set({
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(isEnabled !== undefined ? { isEnabled } : {}),
      ...(triggerConfig !== undefined ? { triggerConfig } : {}),
      ...(cooldownDays !== undefined ? { cooldownDays } : {}),
    }).where(eq(retentionSequencesTable.id, sequenceId)).returning();

    if (steps && Array.isArray(steps)) {
      await db.delete(retentionSequenceStepsTable).where(eq(retentionSequenceStepsTable.sequenceId, sequenceId));
      for (const step of steps) {
        await db.insert(retentionSequenceStepsTable).values({
          sequenceId,
          stepOrder: step.stepOrder,
          actionType: step.actionType,
          delayDays: step.delayDays ?? 0,
          config: step.config || {},
        });
      }
    }

    res.json(updated);
  } catch (err: any) {
    console.error("[retention] PUT sequence error:", err.message);
    res.status(500).json({ error: "Failed to update sequence" });
  }
});

router.delete("/gyms/:gymId/retention/sequences/:sequenceId", async (req, res): Promise<void> => {
  try {
    const gymId = Number(req.params.gymId);
    const sequenceId = Number(req.params.sequenceId);
    const gymRole = (req as any).gymRole;
    if (!["owner", "admin"].includes(gymRole)) {
      res.status(403).json({ error: "Only owners and admins can delete sequences" });
      return;
    }

    const [existing] = await db.select().from(retentionSequencesTable)
      .where(and(eq(retentionSequencesTable.id, sequenceId), eq(retentionSequencesTable.gymId, gymId)));
    if (!existing) { res.status(404).json({ error: "Sequence not found" }); return; }

    await db.update(memberSequenceEnrollmentsTable)
      .set({ status: "exited", exitReason: "sequence_deleted", completedAt: new Date() })
      .where(and(
        eq(memberSequenceEnrollmentsTable.sequenceId, sequenceId),
        eq(memberSequenceEnrollmentsTable.status, "active")
      ));

    await db.delete(retentionSequenceStepsTable).where(eq(retentionSequenceStepsTable.sequenceId, sequenceId));
    await db.delete(retentionSequencesTable).where(eq(retentionSequencesTable.id, sequenceId));

    res.json({ message: "Sequence deleted" });
  } catch (err: any) {
    console.error("[retention] DELETE sequence error:", err.message);
    res.status(500).json({ error: "Failed to delete sequence" });
  }
});

router.get("/gyms/:gymId/retention/enrollments", async (req, res): Promise<void> => {
  try {
    const gymId = Number(req.params.gymId);
    const statusFilter = (req.query.status as string) || "active";

    const enrollments = await db.select({
      id: memberSequenceEnrollmentsTable.id,
      memberId: memberSequenceEnrollmentsTable.memberId,
      sequenceId: memberSequenceEnrollmentsTable.sequenceId,
      status: memberSequenceEnrollmentsTable.status,
      currentStepIndex: memberSequenceEnrollmentsTable.currentStepIndex,
      nextActionAt: memberSequenceEnrollmentsTable.nextActionAt,
      enrolledAt: memberSequenceEnrollmentsTable.enrolledAt,
      completedAt: memberSequenceEnrollmentsTable.completedAt,
      exitReason: memberSequenceEnrollmentsTable.exitReason,
      memberFirstName: membersTable.firstName,
      memberLastName: membersTable.lastName,
      memberEmail: membersTable.email,
      memberRiskTier: membersTable.riskTier,
    }).from(memberSequenceEnrollmentsTable)
      .innerJoin(membersTable, eq(memberSequenceEnrollmentsTable.memberId, membersTable.id))
      .where(and(
        eq(memberSequenceEnrollmentsTable.gymId, gymId),
        eq(memberSequenceEnrollmentsTable.status, statusFilter)
      ))
      .orderBy(desc(memberSequenceEnrollmentsTable.enrolledAt))
      .limit(100);

    res.json(enrollments);
  } catch (err: any) {
    console.error("[retention] GET enrollments error:", err.message);
    res.status(500).json({ error: "Failed to load enrollments" });
  }
});

router.post("/gyms/:gymId/retention/enrollments/:enrollmentId/exit", async (req, res): Promise<void> => {
  try {
    const gymId = Number(req.params.gymId);
    const enrollmentId = Number(req.params.enrollmentId);

    const [enrollment] = await db.select().from(memberSequenceEnrollmentsTable)
      .where(and(
        eq(memberSequenceEnrollmentsTable.id, enrollmentId),
        eq(memberSequenceEnrollmentsTable.gymId, gymId)
      ));

    if (!enrollment) { res.status(404).json({ error: "Enrollment not found" }); return; }
    if (enrollment.status !== "active") { res.status(400).json({ error: "Enrollment is not active" }); return; }

    await db.update(memberSequenceEnrollmentsTable).set({
      status: "exited",
      exitReason: "manual_staff",
      completedAt: new Date(),
    }).where(eq(memberSequenceEnrollmentsTable.id, enrollmentId));

    await db.insert(retentionSequenceEventsTable).values({
      gymId,
      enrollmentId,
      memberId: enrollment.memberId,
      sequenceId: enrollment.sequenceId,
      eventType: "manual_exit",
      stepIndex: enrollment.currentStepIndex,
      details: "Staff manually exited member from sequence",
    });

    res.json({ message: "Member removed from sequence" });
  } catch (err: any) {
    console.error("[retention] exit enrollment error:", err.message);
    res.status(500).json({ error: "Failed to exit enrollment" });
  }
});

router.get("/gyms/:gymId/retention/events", async (req, res): Promise<void> => {
  try {
    const gymId = Number(req.params.gymId);
    const limit = Math.min(Number(req.query.limit) || 50, 100);

    const events = await db.select({
      id: retentionSequenceEventsTable.id,
      enrollmentId: retentionSequenceEventsTable.enrollmentId,
      memberId: retentionSequenceEventsTable.memberId,
      sequenceId: retentionSequenceEventsTable.sequenceId,
      eventType: retentionSequenceEventsTable.eventType,
      stepIndex: retentionSequenceEventsTable.stepIndex,
      details: retentionSequenceEventsTable.details,
      metadata: retentionSequenceEventsTable.metadata,
      createdAt: retentionSequenceEventsTable.createdAt,
      memberFirstName: membersTable.firstName,
      memberLastName: membersTable.lastName,
    }).from(retentionSequenceEventsTable)
      .innerJoin(membersTable, eq(retentionSequenceEventsTable.memberId, membersTable.id))
      .where(eq(retentionSequenceEventsTable.gymId, gymId))
      .orderBy(desc(retentionSequenceEventsTable.createdAt))
      .limit(limit);

    res.json(events);
  } catch (err: any) {
    console.error("[retention] GET events error:", err.message);
    res.status(500).json({ error: "Failed to load events" });
  }
});

router.post("/gyms/:gymId/retention/enroll", async (req, res): Promise<void> => {
  try {
    const gymId = Number(req.params.gymId);
    const gymRole = (req as any).gymRole;
    if (!["owner", "admin", "coach"].includes(gymRole)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }

    const { memberId, sequenceId } = req.body;
    if (!memberId || !sequenceId) {
      res.status(400).json({ error: "memberId and sequenceId are required" });
      return;
    }

    const [member] = await db.select({ id: membersTable.id }).from(membersTable)
      .where(and(eq(membersTable.id, memberId), eq(membersTable.gymId, gymId))).limit(1);
    if (!member) { res.status(404).json({ error: "Member not found in this gym" }); return; }

    const [sequence] = await db.select().from(retentionSequencesTable)
      .where(and(eq(retentionSequencesTable.id, sequenceId), eq(retentionSequencesTable.gymId, gymId)));
    if (!sequence) { res.status(404).json({ error: "Sequence not found" }); return; }

    const [existingActive] = await db.select({ id: memberSequenceEnrollmentsTable.id })
      .from(memberSequenceEnrollmentsTable)
      .where(and(
        eq(memberSequenceEnrollmentsTable.memberId, memberId),
        eq(memberSequenceEnrollmentsTable.sequenceId, sequenceId),
        eq(memberSequenceEnrollmentsTable.status, "active")
      )).limit(1);

    if (existingActive) {
      res.status(400).json({ error: "Member is already enrolled in this sequence" });
      return;
    }

    const steps = await db.select().from(retentionSequenceStepsTable)
      .where(eq(retentionSequenceStepsTable.sequenceId, sequenceId))
      .orderBy(asc(retentionSequenceStepsTable.stepOrder));

    const firstStep = steps[0];
    const nextActionAt = firstStep
      ? new Date(Date.now() + firstStep.delayDays * 24 * 60 * 60 * 1000)
      : null;

    const [enrollment] = await db.insert(memberSequenceEnrollmentsTable).values({
      gymId,
      memberId,
      sequenceId,
      status: "active",
      currentStepIndex: 0,
      nextActionAt,
      triggerSnapshot: { source: "manual" },
    }).returning();

    await db.insert(retentionSequenceEventsTable).values({
      gymId,
      enrollmentId: enrollment.id,
      memberId,
      sequenceId,
      eventType: "enrolled",
      stepIndex: 0,
      details: "Manually enrolled by staff",
    });

    res.status(201).json(enrollment);
  } catch (err: any) {
    console.error("[retention] manual enroll error:", err.message);
    res.status(500).json({ error: "Failed to enroll member" });
  }
});

export default router;
