import { Router, type IRouter } from "express";
import { eq, and, sql, count, desc, asc } from "drizzle-orm";
import {
  db, leadSequencesTable, leadSequenceStepsTable,
  leadSequenceEnrollmentsTable, leadSequenceEventsTable,
  leadsTable
} from "@workspace/db";
import { DEFAULT_LEAD_SEQUENCES } from "../services/lead-sequence-defaults";
import { enrollLeadInSequence, pauseLeadSequences } from "../services/lead-sequence-engine";

const router: IRouter = Router();

router.get("/gyms/:gymId/lead-sequences", async (req, res): Promise<void> => {
  try {
    const gymId = Number(req.params.gymId);

    const sequences = await db.select().from(leadSequencesTable)
      .where(eq(leadSequencesTable.gymId, gymId))
      .orderBy(asc(leadSequencesTable.createdAt));

    const sequenceIds = sequences.map(s => s.id);

    let enrollmentCounts: Record<number, number> = {};
    let sentCounts: Record<number, number> = {};
    let completedCounts: Record<number, number> = {};
    let convertedCounts: Record<number, number> = {};

    if (sequenceIds.length > 0) {
      const activeCounts = await db.select({
        sequenceId: leadSequenceEnrollmentsTable.sequenceId,
        count: count(),
      }).from(leadSequenceEnrollmentsTable)
        .where(and(
          eq(leadSequenceEnrollmentsTable.gymId, gymId),
          eq(leadSequenceEnrollmentsTable.status, "active")
        ))
        .groupBy(leadSequenceEnrollmentsTable.sequenceId);

      for (const c of activeCounts) {
        enrollmentCounts[c.sequenceId] = Number(c.count);
      }

      const totalSent = await db.select({
        sequenceId: leadSequenceEventsTable.sequenceId,
        count: count(),
      }).from(leadSequenceEventsTable)
        .where(and(
          eq(leadSequenceEventsTable.gymId, gymId),
          eq(leadSequenceEventsTable.eventType, "step_sent")
        ))
        .groupBy(leadSequenceEventsTable.sequenceId);

      for (const c of totalSent) {
        sentCounts[c.sequenceId] = Number(c.count);
      }

      const totalCompleted = await db.select({
        sequenceId: leadSequenceEnrollmentsTable.sequenceId,
        count: count(),
      }).from(leadSequenceEnrollmentsTable)
        .where(and(
          eq(leadSequenceEnrollmentsTable.gymId, gymId),
          eq(leadSequenceEnrollmentsTable.status, "completed")
        ))
        .groupBy(leadSequenceEnrollmentsTable.sequenceId);

      for (const c of totalCompleted) {
        completedCounts[c.sequenceId] = Number(c.count);
      }

      const totalConverted = await db.select({
        sequenceId: leadSequenceEnrollmentsTable.sequenceId,
        count: count(),
      }).from(leadSequenceEnrollmentsTable)
        .where(and(
          eq(leadSequenceEnrollmentsTable.gymId, gymId),
          eq(leadSequenceEnrollmentsTable.status, "exited"),
          eq(leadSequenceEnrollmentsTable.exitReason, "lead_converted")
        ))
        .groupBy(leadSequenceEnrollmentsTable.sequenceId);

      for (const c of totalConverted) {
        convertedCounts[c.sequenceId] = Number(c.count);
      }
    }

    const result = sequences.map(s => ({
      ...s,
      activeEnrollments: enrollmentCounts[s.id] || 0,
      totalSent: sentCounts[s.id] || 0,
      totalCompleted: completedCounts[s.id] || 0,
      totalConverted: convertedCounts[s.id] || 0,
    }));

    res.json(result);
  } catch (err: any) {
    console.error("[lead-sequences] GET sequences error:", err.message);
    res.status(500).json({ error: "Failed to load lead sequences" });
  }
});

router.post("/gyms/:gymId/lead-sequences/seed-defaults", async (req, res): Promise<void> => {
  try {
    const gymId = Number(req.params.gymId);
    const gymRole = (req as any).gymRole;
    if (!["owner", "gym_owner", "admin"].includes(gymRole)) {
      res.status(403).json({ error: "Only owners and admins can manage lead sequences" });
      return;
    }

    const existing = await db.select({ id: leadSequencesTable.id, type: leadSequencesTable.type })
      .from(leadSequencesTable)
      .where(eq(leadSequencesTable.gymId, gymId));

    const existingTypes = new Set(existing.map(s => s.type));
    const toCreate = DEFAULT_LEAD_SEQUENCES.filter(def => !existingTypes.has(def.type));

    if (toCreate.length === 0) {
      res.status(400).json({ error: "All default sequences already exist." });
      return;
    }

    const created = [];
    for (const def of toCreate) {
      const [seq] = await db.insert(leadSequencesTable).values({
        gymId,
        name: def.name,
        description: def.description,
        type: def.type,
        isEnabled: false,
        triggerStage: def.triggerStage,
      }).returning();

      for (const step of def.steps) {
        await db.insert(leadSequenceStepsTable).values({
          sequenceId: seq.id,
          stepOrder: step.stepOrder,
          channel: step.channel,
          delayMinutes: step.delayMinutes,
          subject: step.subject,
          messageContent: step.messageContent,
        });
      }

      created.push(seq);
    }

    res.status(201).json(created);
  } catch (err: any) {
    console.error("[lead-sequences] seed-defaults error:", err.message);
    res.status(500).json({ error: "Failed to seed default sequences" });
  }
});

router.get("/gyms/:gymId/lead-sequences/performance", async (req, res): Promise<void> => {
  try {
    const gymId = Number(req.params.gymId);

    const sequences = await db.select().from(leadSequencesTable)
      .where(eq(leadSequencesTable.gymId, gymId));

    const metrics = [];
    for (const seq of sequences) {
      const [totalEnrolled] = await db.select({ count: count() })
        .from(leadSequenceEnrollmentsTable)
        .where(and(
          eq(leadSequenceEnrollmentsTable.sequenceId, seq.id),
          eq(leadSequenceEnrollmentsTable.gymId, gymId)
        ));

      const [activeCount] = await db.select({ count: count() })
        .from(leadSequenceEnrollmentsTable)
        .where(and(
          eq(leadSequenceEnrollmentsTable.sequenceId, seq.id),
          eq(leadSequenceEnrollmentsTable.gymId, gymId),
          eq(leadSequenceEnrollmentsTable.status, "active")
        ));

      const [completedCount] = await db.select({ count: count() })
        .from(leadSequenceEnrollmentsTable)
        .where(and(
          eq(leadSequenceEnrollmentsTable.sequenceId, seq.id),
          eq(leadSequenceEnrollmentsTable.gymId, gymId),
          eq(leadSequenceEnrollmentsTable.status, "completed")
        ));

      const [convertedCount] = await db.select({ count: count() })
        .from(leadSequenceEnrollmentsTable)
        .where(and(
          eq(leadSequenceEnrollmentsTable.sequenceId, seq.id),
          eq(leadSequenceEnrollmentsTable.gymId, gymId),
          eq(leadSequenceEnrollmentsTable.status, "exited"),
          eq(leadSequenceEnrollmentsTable.exitReason, "lead_converted")
        ));

      const [sentCount] = await db.select({ count: count() })
        .from(leadSequenceEventsTable)
        .where(and(
          eq(leadSequenceEventsTable.sequenceId, seq.id),
          eq(leadSequenceEventsTable.gymId, gymId),
          eq(leadSequenceEventsTable.eventType, "step_sent")
        ));

      const total = Number(totalEnrolled.count);
      const completed = Number(completedCount.count);
      const converted = Number(convertedCount.count);

      metrics.push({
        sequenceId: seq.id,
        sequenceName: seq.name,
        sequenceType: seq.type,
        isEnabled: seq.isEnabled,
        triggerStage: seq.triggerStage,
        totalEnrolled: total,
        activeEnrollments: Number(activeCount.count),
        completedEnrollments: completed,
        convertedLeads: converted,
        totalMessagesSent: Number(sentCount.count),
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        conversionRate: total > 0 ? Math.round((converted / total) * 100) : 0,
      });
    }

    res.json(metrics);
  } catch (err: any) {
    console.error("[lead-sequences] GET performance error:", err.message);
    res.status(500).json({ error: "Failed to load performance metrics" });
  }
});

router.get("/gyms/:gymId/lead-sequences/lead/:leadId/status", async (req, res): Promise<void> => {
  try {
    const gymId = Number(req.params.gymId);
    const leadId = Number(req.params.leadId);

    const enrollments = await db.select({
      id: leadSequenceEnrollmentsTable.id,
      sequenceId: leadSequenceEnrollmentsTable.sequenceId,
      status: leadSequenceEnrollmentsTable.status,
      currentStepIndex: leadSequenceEnrollmentsTable.currentStepIndex,
      nextActionAt: leadSequenceEnrollmentsTable.nextActionAt,
      enrolledAt: leadSequenceEnrollmentsTable.enrolledAt,
      completedAt: leadSequenceEnrollmentsTable.completedAt,
      exitReason: leadSequenceEnrollmentsTable.exitReason,
      sequenceName: leadSequencesTable.name,
      sequenceType: leadSequencesTable.type,
    }).from(leadSequenceEnrollmentsTable)
      .innerJoin(leadSequencesTable, eq(leadSequenceEnrollmentsTable.sequenceId, leadSequencesTable.id))
      .where(and(
        eq(leadSequenceEnrollmentsTable.gymId, gymId),
        eq(leadSequenceEnrollmentsTable.leadId, leadId)
      ))
      .orderBy(desc(leadSequenceEnrollmentsTable.enrolledAt));

    const events = await db.select().from(leadSequenceEventsTable)
      .where(and(
        eq(leadSequenceEventsTable.gymId, gymId),
        eq(leadSequenceEventsTable.leadId, leadId)
      ))
      .orderBy(desc(leadSequenceEventsTable.createdAt))
      .limit(20);

    res.json({ enrollments, events });
  } catch (err: any) {
    console.error("[lead-sequences] GET lead status error:", err.message);
    res.status(500).json({ error: "Failed to load lead sequence status" });
  }
});

router.post("/gyms/:gymId/lead-sequences/enroll/:leadId", async (req, res): Promise<void> => {
  try {
    const gymId = Number(req.params.gymId);
    const leadId = Number(req.params.leadId);
    const { sequenceId } = req.body;

    if (!sequenceId) {
      res.status(400).json({ error: "sequenceId is required" });
      return;
    }

    const [lead] = await db.select().from(leadsTable)
      .where(and(eq(leadsTable.id, leadId), eq(leadsTable.gymId, gymId)));
    if (!lead) { res.status(404).json({ error: "Lead not found" }); return; }

    const [sequence] = await db.select().from(leadSequencesTable)
      .where(and(eq(leadSequencesTable.id, sequenceId), eq(leadSequencesTable.gymId, gymId)));
    if (!sequence) { res.status(404).json({ error: "Sequence not found" }); return; }

    const existing = await db.select({ id: leadSequenceEnrollmentsTable.id })
      .from(leadSequenceEnrollmentsTable)
      .where(and(
        eq(leadSequenceEnrollmentsTable.leadId, leadId),
        eq(leadSequenceEnrollmentsTable.sequenceId, sequenceId),
        eq(leadSequenceEnrollmentsTable.status, "active")
      ));

    if (existing.length > 0) {
      res.status(409).json({ error: "Lead is already enrolled in this sequence" });
      return;
    }

    const steps = await db.select().from(leadSequenceStepsTable)
      .where(eq(leadSequenceStepsTable.sequenceId, sequenceId))
      .orderBy(asc(leadSequenceStepsTable.stepOrder));

    if (steps.length === 0) {
      res.status(400).json({ error: "Sequence has no steps" });
      return;
    }

    const nextActionAt = new Date(Date.now() + steps[0].delayMinutes * 60 * 1000);

    const [enrollment] = await db.insert(leadSequenceEnrollmentsTable).values({
      gymId,
      leadId,
      sequenceId,
      status: "active",
      currentStepIndex: 0,
      nextActionAt,
    }).returning();

    await db.insert(leadSequenceEventsTable).values({
      gymId,
      enrollmentId: enrollment.id,
      leadId,
      sequenceId,
      eventType: "enrolled",
      stepIndex: 0,
      details: `Manually enrolled in "${sequence.name}"`,
    });

    res.status(201).json(enrollment);
  } catch (err: any) {
    console.error("[lead-sequences] enroll error:", err.message);
    res.status(500).json({ error: "Failed to enroll lead" });
  }
});

router.post("/gyms/:gymId/lead-sequences/enrollments/:enrollmentId/exit", async (req, res): Promise<void> => {
  try {
    const gymId = Number(req.params.gymId);
    const enrollmentId = Number(req.params.enrollmentId);

    const [enrollment] = await db.select().from(leadSequenceEnrollmentsTable)
      .where(and(
        eq(leadSequenceEnrollmentsTable.id, enrollmentId),
        eq(leadSequenceEnrollmentsTable.gymId, gymId)
      ));

    if (!enrollment) { res.status(404).json({ error: "Enrollment not found" }); return; }
    if (enrollment.status !== "active" && enrollment.status !== "paused") {
      res.status(400).json({ error: "Enrollment is not active" });
      return;
    }

    await db.update(leadSequenceEnrollmentsTable)
      .set({ status: "exited", completedAt: new Date(), exitReason: "manual_exit" })
      .where(eq(leadSequenceEnrollmentsTable.id, enrollmentId));

    await db.insert(leadSequenceEventsTable).values({
      gymId,
      enrollmentId,
      leadId: enrollment.leadId,
      sequenceId: enrollment.sequenceId,
      eventType: "exited",
      stepIndex: enrollment.currentStepIndex,
      details: "Manually removed from sequence",
    });

    res.json({ message: "Enrollment exited" });
  } catch (err: any) {
    console.error("[lead-sequences] exit enrollment error:", err.message);
    res.status(500).json({ error: "Failed to exit enrollment" });
  }
});

router.get("/gyms/:gymId/lead-sequences/:sequenceId", async (req, res): Promise<void> => {
  try {
    const gymId = Number(req.params.gymId);
    const sequenceId = Number(req.params.sequenceId);

    const [sequence] = await db.select().from(leadSequencesTable)
      .where(and(eq(leadSequencesTable.id, sequenceId), eq(leadSequencesTable.gymId, gymId)));

    if (!sequence) { res.status(404).json({ error: "Sequence not found" }); return; }

    const steps = await db.select().from(leadSequenceStepsTable)
      .where(eq(leadSequenceStepsTable.sequenceId, sequenceId))
      .orderBy(asc(leadSequenceStepsTable.stepOrder));

    const [enrollCount] = await db.select({ count: count() }).from(leadSequenceEnrollmentsTable)
      .where(and(
        eq(leadSequenceEnrollmentsTable.sequenceId, sequenceId),
        eq(leadSequenceEnrollmentsTable.status, "active")
      ));

    res.json({ ...sequence, steps, activeEnrollments: Number(enrollCount.count) });
  } catch (err: any) {
    console.error("[lead-sequences] GET sequence detail error:", err.message);
    res.status(500).json({ error: "Failed to load sequence" });
  }
});

router.post("/gyms/:gymId/lead-sequences", async (req, res): Promise<void> => {
  try {
    const gymId = Number(req.params.gymId);
    const gymRole = (req as any).gymRole;
    if (!["owner", "gym_owner", "admin"].includes(gymRole)) {
      res.status(403).json({ error: "Only owners and admins can create sequences" });
      return;
    }

    const { name, description, type, triggerStage, steps } = req.body;
    if (!name) { res.status(400).json({ error: "Sequence name is required" }); return; }

    const [seq] = await db.insert(leadSequencesTable).values({
      gymId,
      name,
      description: description || null,
      type: type || "custom",
      isEnabled: false,
      triggerStage: triggerStage || "new",
    }).returning();

    if (steps && Array.isArray(steps)) {
      for (const step of steps) {
        await db.insert(leadSequenceStepsTable).values({
          sequenceId: seq.id,
          stepOrder: step.stepOrder,
          channel: step.channel || "email",
          delayMinutes: step.delayMinutes ?? 0,
          subject: step.subject || null,
          messageContent: step.messageContent || "",
        });
      }
    }

    res.status(201).json(seq);
  } catch (err: any) {
    console.error("[lead-sequences] POST sequence error:", err.message);
    res.status(500).json({ error: "Failed to create sequence" });
  }
});

router.put("/gyms/:gymId/lead-sequences/:sequenceId", async (req, res): Promise<void> => {
  try {
    const gymId = Number(req.params.gymId);
    const sequenceId = Number(req.params.sequenceId);
    const gymRole = (req as any).gymRole;
    if (!["owner", "gym_owner", "admin"].includes(gymRole)) {
      res.status(403).json({ error: "Only owners and admins can edit sequences" });
      return;
    }

    const [existing] = await db.select().from(leadSequencesTable)
      .where(and(eq(leadSequencesTable.id, sequenceId), eq(leadSequencesTable.gymId, gymId)));
    if (!existing) { res.status(404).json({ error: "Sequence not found" }); return; }

    const { name, description, isEnabled, triggerStage, steps } = req.body;

    const [updated] = await db.update(leadSequencesTable).set({
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(isEnabled !== undefined ? { isEnabled } : {}),
      ...(triggerStage !== undefined ? { triggerStage } : {}),
    }).where(eq(leadSequencesTable.id, sequenceId)).returning();

    if (steps && Array.isArray(steps)) {
      await db.delete(leadSequenceStepsTable).where(eq(leadSequenceStepsTable.sequenceId, sequenceId));
      for (const step of steps) {
        await db.insert(leadSequenceStepsTable).values({
          sequenceId,
          stepOrder: step.stepOrder,
          channel: step.channel || "email",
          delayMinutes: step.delayMinutes ?? 0,
          subject: step.subject || null,
          messageContent: step.messageContent || "",
        });
      }
    }

    res.json(updated);

    if (isEnabled === true && !existing.isEnabled) {
      const effectiveTriggerStage = updated.triggerStage;
      if (effectiveTriggerStage) {
        (async () => {
          try {
            const matchingLeads = await db.select({ id: leadsTable.id })
              .from(leadsTable)
              .where(and(
                eq(leadsTable.gymId, gymId),
                eq(leadsTable.stage, effectiveTriggerStage)
              ));

            let totalEnrolled = 0;
            for (const lead of matchingLeads) {
              totalEnrolled += await enrollLeadInSequence(lead.id, gymId, effectiveTriggerStage, sequenceId);
            }
            console.log(`[lead-sequences] Immediate enrollment scan: ${totalEnrolled} leads enrolled in sequence ${sequenceId}`);
          } catch (err: any) {
            console.error("[lead-sequences] Immediate enrollment scan failed:", err.message);
          }
        })();
      }
    }
  } catch (err: any) {
    console.error("[lead-sequences] PUT sequence error:", err.message);
    res.status(500).json({ error: "Failed to update sequence" });
  }
});

router.delete("/gyms/:gymId/lead-sequences/:sequenceId", async (req, res): Promise<void> => {
  try {
    const gymId = Number(req.params.gymId);
    const sequenceId = Number(req.params.sequenceId);
    const gymRole = (req as any).gymRole;
    if (!["owner", "gym_owner", "admin"].includes(gymRole)) {
      res.status(403).json({ error: "Only owners and admins can delete sequences" });
      return;
    }

    const [existing] = await db.select().from(leadSequencesTable)
      .where(and(eq(leadSequencesTable.id, sequenceId), eq(leadSequencesTable.gymId, gymId)));
    if (!existing) { res.status(404).json({ error: "Sequence not found" }); return; }

    await db.update(leadSequenceEnrollmentsTable)
      .set({ status: "exited", exitReason: "sequence_deleted", completedAt: new Date() })
      .where(and(
        eq(leadSequenceEnrollmentsTable.sequenceId, sequenceId),
        eq(leadSequenceEnrollmentsTable.status, "active")
      ));

    await db.delete(leadSequenceStepsTable).where(eq(leadSequenceStepsTable.sequenceId, sequenceId));
    await db.delete(leadSequencesTable).where(eq(leadSequencesTable.id, sequenceId));

    res.json({ message: "Sequence deleted" });
  } catch (err: any) {
    console.error("[lead-sequences] DELETE sequence error:", err.message);
    res.status(500).json({ error: "Failed to delete sequence" });
  }
});

router.get("/gyms/:gymId/lead-sequences/:sequenceId/enrollments", async (req, res): Promise<void> => {
  try {
    const gymId = Number(req.params.gymId);
    const sequenceId = Number(req.params.sequenceId);

    const enrollments = await db.select({
      id: leadSequenceEnrollmentsTable.id,
      leadId: leadSequenceEnrollmentsTable.leadId,
      sequenceId: leadSequenceEnrollmentsTable.sequenceId,
      status: leadSequenceEnrollmentsTable.status,
      currentStepIndex: leadSequenceEnrollmentsTable.currentStepIndex,
      nextActionAt: leadSequenceEnrollmentsTable.nextActionAt,
      enrolledAt: leadSequenceEnrollmentsTable.enrolledAt,
      completedAt: leadSequenceEnrollmentsTable.completedAt,
      exitReason: leadSequenceEnrollmentsTable.exitReason,
      leadFirstName: leadsTable.firstName,
      leadLastName: leadsTable.lastName,
      leadEmail: leadsTable.email,
      leadStage: leadsTable.stage,
    }).from(leadSequenceEnrollmentsTable)
      .innerJoin(leadsTable, eq(leadSequenceEnrollmentsTable.leadId, leadsTable.id))
      .where(and(
        eq(leadSequenceEnrollmentsTable.gymId, gymId),
        eq(leadSequenceEnrollmentsTable.sequenceId, sequenceId)
      ))
      .orderBy(desc(leadSequenceEnrollmentsTable.enrolledAt))
      .limit(100);

    res.json(enrollments);
  } catch (err: any) {
    console.error("[lead-sequences] GET enrollments error:", err.message);
    res.status(500).json({ error: "Failed to load enrollments" });
  }
});

export { enrollLeadInSequence, pauseLeadSequences };
export default router;
