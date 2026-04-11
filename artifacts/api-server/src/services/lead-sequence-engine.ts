import { eq, and, sql, lte, asc, desc, or } from "drizzle-orm";
import {
  db,
  leadSequencesTable,
  leadSequenceStepsTable,
  leadSequenceEnrollmentsTable,
  leadSequenceEventsTable,
  leadsTable,
  aiTasksTable,
  gymsTable,
} from "@workspace/db";
import { isWithinQuietHours, getNextBusinessHourDate } from "./sequence-utils";

async function createSequenceExhaustionAlert(
  gymId: number,
  enrollmentId: number,
  leadId: number,
  sequenceId: number,
): Promise<void> {
  try {
    const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, leadId));
    if (!lead || lead.stage === "converted") return;

    const [sequence] = await db.select().from(leadSequencesTable).where(eq(leadSequencesTable.id, sequenceId));
    const sequenceName = sequence?.name || "Unknown Sequence";
    const leadName = `${lead.firstName || ""} ${lead.lastName || ""}`.trim() || "Unknown Lead";

    await db.insert(aiTasksTable).values({
      gymId,
      type: "outreach",
      subtype: "sequence_exhaustion",
      title: `Personal follow-up needed: ${leadName} completed ${sequenceName} without booking`,
      description: `${leadName} has completed all steps of the "${sequenceName}" nurture sequence but hasn't converted (current stage: ${lead.stage}). A personal follow-up is recommended to prevent this lead from going cold.`,
      priority: "high",
      status: "pending",
      targetId: leadId,
      targetType: "lead",
    });

    await db.insert(leadSequenceEventsTable).values({
      gymId,
      enrollmentId,
      leadId,
      sequenceId,
      eventType: "exhaustion_alert_created",
      stepIndex: null,
      details: `All steps completed without conversion — AI task created for personal follow-up`,
    });

    console.log(`[lead-sequence-engine] Created exhaustion alert for lead ${leadId} in sequence "${sequenceName}" (gym ${gymId})`);
  } catch (err: any) {
    console.error(`[lead-sequence-engine] Error creating exhaustion alert for enrollment ${enrollmentId}:`, err.message);
  }
}

const RETRY_DELAY_MS = 5 * 60 * 1000;
const BATCH_LIMIT = 20;

export async function processLeadSequences(): Promise<{ processed: number; sent: number; completed: number; errors: number; deferred: number }> {
  let processed = 0;
  let sent = 0;
  let completed = 0;
  let errors = 0;
  let deferred = 0;

  try {
    const now = new Date();

    const dueEnrollments = await db
      .select()
      .from(leadSequenceEnrollmentsTable)
      .where(
        and(
          or(
            eq(leadSequenceEnrollmentsTable.status, "active"),
            eq(leadSequenceEnrollmentsTable.status, "retry_pending")
          ),
          lte(leadSequenceEnrollmentsTable.nextActionAt, now)
        )
      )
      .limit(BATCH_LIMIT);

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
          await createSequenceExhaustionAlert(enrollment.gymId, enrollment.id, enrollment.leadId, enrollment.sequenceId);
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

        const [gym] = await db
          .select({ timezone: gymsTable.timezone })
          .from(gymsTable)
          .where(eq(gymsTable.id, enrollment.gymId));

        const timezone = gym?.timezone || "America/New_York";
        if (isWithinQuietHours(timezone)) {
          const nextOpen = getNextBusinessHourDate(timezone);
          await db
            .update(leadSequenceEnrollmentsTable)
            .set({ nextActionAt: nextOpen })
            .where(eq(leadSequenceEnrollmentsTable.id, enrollment.id));
          deferred++;
          console.log(`[lead-sequence-engine] Deferred enrollment ${enrollment.id} to ${nextOpen.toISOString()} (quiet hours)`);
          continue;
        }

        const isRetry = enrollment.status === "retry_pending";

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
          await createSequenceExhaustionAlert(enrollment.gymId, enrollment.id, enrollment.leadId, enrollment.sequenceId);
          completed++;
        } else {
          const nextStep = steps[nextStepIndex];
          const nextActionAt = new Date(now.getTime() + nextStep.delayMinutes * 60 * 1000);
          await db
            .update(leadSequenceEnrollmentsTable)
            .set({
              status: "active",
              currentStepIndex: nextStepIndex,
              nextActionAt,
            })
            .where(eq(leadSequenceEnrollmentsTable.id, enrollment.id));
        }
      } catch (err: any) {
        errors++;

        const isRetry = enrollment.status === "retry_pending";
        if (isRetry) {
          console.error(`[lead-sequence-engine] Retry failed for enrollment ${enrollment.id}, marking step failed and advancing:`, err.message);

          await db.insert(leadSequenceEventsTable).values({
            gymId: enrollment.gymId,
            enrollmentId: enrollment.id,
            leadId: enrollment.leadId,
            sequenceId: enrollment.sequenceId,
            eventType: "step_failed",
            stepIndex: enrollment.currentStepIndex,
            details: `Step failed after retry: ${err.message}`,
          });

          const steps = await db
            .select()
            .from(leadSequenceStepsTable)
            .where(eq(leadSequenceStepsTable.sequenceId, enrollment.sequenceId))
            .orderBy(asc(leadSequenceStepsTable.stepOrder));

          const nextStepIndex = enrollment.currentStepIndex + 1;
          if (nextStepIndex >= steps.length) {
            await db
              .update(leadSequenceEnrollmentsTable)
              .set({
                status: "completed",
                currentStepIndex: nextStepIndex,
                completedAt: new Date(),
                exitReason: "all_steps_done",
              })
              .where(eq(leadSequenceEnrollmentsTable.id, enrollment.id));
          } else {
            const nextStep = steps[nextStepIndex];
            const nextActionAt = new Date(Date.now() + nextStep.delayMinutes * 60 * 1000);
            await db
              .update(leadSequenceEnrollmentsTable)
              .set({
                status: "active",
                currentStepIndex: nextStepIndex,
                nextActionAt,
              })
              .where(eq(leadSequenceEnrollmentsTable.id, enrollment.id));
          }
        } else {
          console.error(`[lead-sequence-engine] Error processing enrollment ${enrollment.id}, scheduling retry:`, err.message);

          await db.insert(leadSequenceEventsTable).values({
            gymId: enrollment.gymId,
            enrollmentId: enrollment.id,
            leadId: enrollment.leadId,
            sequenceId: enrollment.sequenceId,
            eventType: "step_error",
            stepIndex: enrollment.currentStepIndex,
            details: `Error (will retry): ${err.message}`,
          });

          await db
            .update(leadSequenceEnrollmentsTable)
            .set({
              status: "retry_pending",
              nextActionAt: new Date(Date.now() + RETRY_DELAY_MS),
            })
            .where(eq(leadSequenceEnrollmentsTable.id, enrollment.id));
        }
      }
    }
  } catch (err: any) {
    console.error("[lead-sequence-engine] Fatal error:", err.message);
  }

  return { processed, sent, completed, errors, deferred };
}

export async function enrollLeadInSequence(
  leadId: number,
  gymId: number,
  triggerStage: string,
  onlySequenceId?: number
): Promise<number> {
  let enrolled = 0;

  const conditions = [
    eq(leadSequencesTable.gymId, gymId),
    eq(leadSequencesTable.isEnabled, true),
    eq(leadSequencesTable.triggerStage, triggerStage),
  ];
  if (onlySequenceId !== undefined) {
    conditions.push(eq(leadSequencesTable.id, onlySequenceId));
  }

  const sequences = await db
    .select()
    .from(leadSequencesTable)
    .where(and(...conditions));

  for (const sequence of sequences) {
    const existing = await db
      .select({ id: leadSequenceEnrollmentsTable.id })
      .from(leadSequenceEnrollmentsTable)
      .where(
        and(
          eq(leadSequenceEnrollmentsTable.leadId, leadId),
          eq(leadSequenceEnrollmentsTable.sequenceId, sequence.id),
          sql`${leadSequenceEnrollmentsTable.status} IN ('active', 'paused', 'retry_pending')`
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
        sql`${leadSequenceEnrollmentsTable.status} IN ('active', 'retry_pending')`
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
