import { eq, and, sql, lte, asc } from "drizzle-orm";
import {
  db,
  leadSequencesTable,
  leadSequenceStepsTable,
  leadSequenceEnrollmentsTable,
  leadSequenceEventsTable,
  leadsTable,
} from "@workspace/db";

export async function processLeadSequences(): Promise<{ processed: number; sent: number; completed: number; errors: number }> {
  let processed = 0;
  let sent = 0;
  let completed = 0;
  let errors = 0;

  try {
    const now = new Date();

    const dueEnrollments = await db
      .select()
      .from(leadSequenceEnrollmentsTable)
      .where(
        and(
          eq(leadSequenceEnrollmentsTable.status, "active"),
          lte(leadSequenceEnrollmentsTable.nextActionAt, now)
        )
      )
      .limit(100);

    for (const enrollment of dueEnrollments) {
      processed++;
      try {
        const [sequence] = await db
          .select()
          .from(leadSequencesTable)
          .where(eq(leadSequencesTable.id, enrollment.sequenceId));

        if (!sequence || !sequence.isEnabled) {
          await db
            .update(leadSequenceEnrollmentsTable)
            .set({
              status: "paused",
              pausedAt: now,
              exitReason: "sequence_disabled",
            })
            .where(eq(leadSequenceEnrollmentsTable.id, enrollment.id));
          continue;
        }

        const steps = await db
          .select()
          .from(leadSequenceStepsTable)
          .where(eq(leadSequenceStepsTable.sequenceId, enrollment.sequenceId))
          .orderBy(asc(leadSequenceStepsTable.stepOrder));

        const currentStep = steps[enrollment.currentStepIndex];
        if (!currentStep) {
          await db
            .update(leadSequenceEnrollmentsTable)
            .set({
              status: "completed",
              completedAt: now,
              exitReason: "all_steps_done",
            })
            .where(eq(leadSequenceEnrollmentsTable.id, enrollment.id));
          completed++;
          continue;
        }

        const [lead] = await db
          .select()
          .from(leadsTable)
          .where(eq(leadsTable.id, enrollment.leadId));

        if (!lead) {
          await db
            .update(leadSequenceEnrollmentsTable)
            .set({
              status: "exited",
              completedAt: now,
              exitReason: "lead_not_found",
            })
            .where(eq(leadSequenceEnrollmentsTable.id, enrollment.id));
          continue;
        }

        if (lead.stage === "converted" || lead.stage === "lost") {
          await db
            .update(leadSequenceEnrollmentsTable)
            .set({
              status: "exited",
              completedAt: now,
              exitReason: `lead_${lead.stage}`,
            })
            .where(eq(leadSequenceEnrollmentsTable.id, enrollment.id));

          await db.insert(leadSequenceEventsTable).values({
            gymId: enrollment.gymId,
            enrollmentId: enrollment.id,
            leadId: enrollment.leadId,
            sequenceId: enrollment.sequenceId,
            eventType: "auto_exited",
            stepIndex: enrollment.currentStepIndex,
            channel: currentStep.channel,
            details: `Lead ${lead.stage}, sequence auto-exited`,
          });
          continue;
        }

        await db.insert(leadSequenceEventsTable).values({
          gymId: enrollment.gymId,
          enrollmentId: enrollment.id,
          leadId: enrollment.leadId,
          sequenceId: enrollment.sequenceId,
          eventType: "step_sent",
          stepIndex: enrollment.currentStepIndex,
          channel: currentStep.channel,
          details: `Sent step ${enrollment.currentStepIndex + 1}: ${currentStep.subject || "(SMS)"}`,
          metadata: {
            channel: currentStep.channel,
            subject: currentStep.subject,
            messagePreview: currentStep.messageContent.substring(0, 200),
          },
        });
        sent++;

        const nextStepIndex = enrollment.currentStepIndex + 1;
        if (nextStepIndex >= steps.length) {
          await db
            .update(leadSequenceEnrollmentsTable)
            .set({
              status: "completed",
              currentStepIndex: nextStepIndex,
              completedAt: now,
              exitReason: "all_steps_done",
            })
            .where(eq(leadSequenceEnrollmentsTable.id, enrollment.id));
          completed++;
        } else {
          const nextStep = steps[nextStepIndex];
          const nextActionAt = new Date(now.getTime() + nextStep.delayMinutes * 60 * 1000);
          await db
            .update(leadSequenceEnrollmentsTable)
            .set({
              currentStepIndex: nextStepIndex,
              nextActionAt,
            })
            .where(eq(leadSequenceEnrollmentsTable.id, enrollment.id));
        }
      } catch (err: any) {
        errors++;
        console.error(`[lead-sequence-engine] Error processing enrollment ${enrollment.id}:`, err.message);
      }
    }
  } catch (err: any) {
    console.error("[lead-sequence-engine] Fatal error:", err.message);
  }

  return { processed, sent, completed, errors };
}

export async function enrollLeadInSequence(
  leadId: number,
  gymId: number,
  triggerStage: string
): Promise<number> {
  let enrolled = 0;

  const sequences = await db
    .select()
    .from(leadSequencesTable)
    .where(
      and(
        eq(leadSequencesTable.gymId, gymId),
        eq(leadSequencesTable.isEnabled, true),
        eq(leadSequencesTable.triggerStage, triggerStage)
      )
    );

  for (const sequence of sequences) {
    const existing = await db
      .select({ id: leadSequenceEnrollmentsTable.id })
      .from(leadSequenceEnrollmentsTable)
      .where(
        and(
          eq(leadSequenceEnrollmentsTable.leadId, leadId),
          eq(leadSequenceEnrollmentsTable.sequenceId, sequence.id),
          sql`${leadSequenceEnrollmentsTable.status} IN ('active', 'paused')`
        )
      );

    if (existing.length > 0) continue;

    const steps = await db
      .select()
      .from(leadSequenceStepsTable)
      .where(eq(leadSequenceStepsTable.sequenceId, sequence.id))
      .orderBy(asc(leadSequenceStepsTable.stepOrder));

    if (steps.length === 0) continue;

    const firstStep = steps[0];
    const nextActionAt = new Date(Date.now() + firstStep.delayMinutes * 60 * 1000);

    const [enrollment] = await db.insert(leadSequenceEnrollmentsTable).values({
      gymId,
      leadId,
      sequenceId: sequence.id,
      status: "active",
      currentStepIndex: 0,
      nextActionAt,
    }).returning();

    await db.insert(leadSequenceEventsTable).values({
      gymId,
      enrollmentId: enrollment.id,
      leadId,
      sequenceId: sequence.id,
      eventType: "enrolled",
      stepIndex: 0,
      details: `Auto-enrolled in "${sequence.name}" (trigger: ${triggerStage})`,
    });

    enrolled++;
  }

  return enrolled;
}

export async function pauseLeadSequences(
  leadId: number,
  gymId: number,
  reason: string
): Promise<number> {
  const now = new Date();

  const activeEnrollments = await db
    .select()
    .from(leadSequenceEnrollmentsTable)
    .where(
      and(
        eq(leadSequenceEnrollmentsTable.leadId, leadId),
        eq(leadSequenceEnrollmentsTable.gymId, gymId),
        eq(leadSequenceEnrollmentsTable.status, "active")
      )
    );

  for (const enrollment of activeEnrollments) {
    await db
      .update(leadSequenceEnrollmentsTable)
      .set({
        status: "paused",
        pausedAt: now,
        exitReason: reason,
      })
      .where(eq(leadSequenceEnrollmentsTable.id, enrollment.id));

    await db.insert(leadSequenceEventsTable).values({
      gymId,
      enrollmentId: enrollment.id,
      leadId,
      sequenceId: enrollment.sequenceId,
      eventType: "paused",
      stepIndex: enrollment.currentStepIndex,
      details: `Sequence paused: ${reason}`,
    });
  }

  return activeEnrollments.length;
}
