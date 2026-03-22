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
    name: "New Member Support",
    description: "Extra support for new members showing early signs of disengagement",
    type: "new_member",
    triggerConfig: { type: "new_member_decline", joinDays: 90, inactiveDays: 7 },
    cooldownDays: 30,
    steps: [
      { stepOrder: 1, actionType: "email", delayDays: 0, config: { 
        subject: "Quick check-in, {{first_name}}!", 
        body: "Hi {{first_name}},\n\nWelcome to the family! We noticed you might not have made it in recently and wanted to check in.\n\nStarting a new fitness routine can be tough. Here are some tips:\n• Try a different class time if your schedule changed\n• Don't worry about scaling — every workout is adjustable\n• Come say hi even if you're not sure what to do\n\nWe're here to help!\n\n{{gym_name}}" } },
      { stepOrder: 2, actionType: "task", delayDays: 2, config: { 
      title: "New member check-in — {{first_name}}",
        description:
          "Reach out personally.\n\n" +
          "Ask:\n" +
          "- How are they feeling?\n" +
          "- Any confusion or hesitation?\n\n" +
          "GOAL: Remove friction, make them feel welcome + schedule next class.",
        assignTo: "coach" } },
      { stepOrder: 3, actionType: "email", delayDays: 7, config: { 
        subject: "Your {{gym_name}} journey", 
        body:
        "Hi {{first_name}},\n\n" +
        "You don’t need to be perfect — you just need to be consistent.\n\n" +
        "Every class you show up to builds momentum.\n\n" +
        "We believe in you and we're here to support you every step of the way.\n\nSee you soon,\n {{gym_name}}" } },
      {
        stepOrder: 4,
        actionType: "task",
        delayDays: 10,
        config: {
          title: "Review first 2 weeks — {{first_name}}",
          description:
            "Check attendance.\n\n" +
            "If <3 visits/week:\n" +
            "- Adjust schedule\n" +
            "- Reinforce habit expectations\n\n" +
            "GOAL: Lock in routine before day 30.",
          assignTo: "coach"
        }
      }
   ]
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

    const existing = await db.select({ id: retentionSequencesTable.id })
      .from(retentionSequencesTable)
      .where(eq(retentionSequencesTable.gymId, gymId))
      .limit(1);

    if (existing.length > 0) {
      res.status(400).json({ error: "Sequences already exist. Delete existing sequences before re-seeding." });
      return;
    }

    const created = [];
    for (const def of DEFAULT_SEQUENCES) {
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
