import { db, gymsTable, membersTable, retentionSequencesTable, retentionSequenceStepsTable, memberSequenceEnrollmentsTable, retentionSequenceEventsTable, attendanceTable, aiTasksTable } from "@workspace/db";
import { sendMemberEmail } from "../services/member-email";
import { eq, and, sql, lte, ne, desc, gte, count, asc } from "drizzle-orm";
import { getEmailService } from "../services/email-service";

const RETENTION_INTERVAL_MS = 2 * 60 * 60 * 1000;

let schedulerTimer: ReturnType<typeof setInterval> | null = null;

function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || "");
}

interface TriggerConfig {
  type: string;
  days?: number;
  threshold?: number;
  joinDays?: number;
  inactiveDays?: number;
}

async function evaluateTriggersForGym(gymId: number): Promise<void> {
  const sequences = await db.select().from(retentionSequencesTable)
    .where(and(
      eq(retentionSequencesTable.gymId, gymId),
      eq(retentionSequencesTable.isEnabled, true)
    ));

  if (sequences.length === 0) return;

  const activeMembers = await db.select({
    id: membersTable.id,
    firstName: membersTable.firstName,
    lastName: membersTable.lastName,
    email: membersTable.email,
    riskScore: membersTable.riskScore,
    riskTier: membersTable.riskTier,
    lastVisitDate: membersTable.lastVisitDate,
    joinDate: membersTable.joinDate,
    createdAt: membersTable.createdAt,
    status: membersTable.status,
  }).from(membersTable)
    .where(and(eq(membersTable.gymId, gymId), eq(membersTable.status, "active")));

  for (const sequence of sequences) {
    const trigger = sequence.triggerConfig as TriggerConfig;
    if (!trigger || !trigger.type) continue;

    const steps = await db.select().from(retentionSequenceStepsTable)
      .where(eq(retentionSequenceStepsTable.sequenceId, sequence.id))
      .orderBy(asc(retentionSequenceStepsTable.stepOrder));

    if (steps.length === 0) continue;

    for (const member of activeMembers) {
      const shouldEnroll = evaluateTrigger(trigger, member);
      if (!shouldEnroll) continue;

      const [existingActive] = await db.select({ id: memberSequenceEnrollmentsTable.id })
        .from(memberSequenceEnrollmentsTable)
        .where(and(
          eq(memberSequenceEnrollmentsTable.memberId, member.id),
          eq(memberSequenceEnrollmentsTable.sequenceId, sequence.id),
          eq(memberSequenceEnrollmentsTable.status, "active")
        )).limit(1);

      if (existingActive) continue;

      const [recentExit] = await db.select({ completedAt: memberSequenceEnrollmentsTable.completedAt })
        .from(memberSequenceEnrollmentsTable)
        .where(and(
          eq(memberSequenceEnrollmentsTable.memberId, member.id),
          eq(memberSequenceEnrollmentsTable.sequenceId, sequence.id),
          ne(memberSequenceEnrollmentsTable.status, "active")
        ))
        .orderBy(desc(memberSequenceEnrollmentsTable.completedAt))
        .limit(1);

      if (recentExit?.completedAt) {
        const cooldownEnd = new Date(recentExit.completedAt.getTime() + sequence.cooldownDays * 24 * 60 * 60 * 1000);
        if (new Date() < cooldownEnd) continue;
      }

      const firstStep = steps[0];
      const nextActionAt = new Date(Date.now() + firstStep.delayDays * 24 * 60 * 60 * 1000);

      const [enrollment] = await db.insert(memberSequenceEnrollmentsTable).values({
        gymId,
        memberId: member.id,
        sequenceId: sequence.id,
        status: "active",
        currentStepIndex: 0,
        nextActionAt,
        triggerSnapshot: { trigger: trigger.type, riskScore: member.riskScore, lastVisit: member.lastVisitDate },
      }).returning();

      await db.insert(retentionSequenceEventsTable).values({
        gymId,
        enrollmentId: enrollment.id,
        memberId: member.id,
        sequenceId: sequence.id,
        eventType: "enrolled",
        stepIndex: 0,
        details: `Auto-enrolled via ${trigger.type} trigger`,
      });

      console.log(`[retention-engine] Enrolled member ${member.id} in sequence "${sequence.name}" (gym ${gymId})`);
    }
  }
}

function evaluateTrigger(trigger: TriggerConfig, member: {
  riskScore: string | null;
  lastVisitDate: Date | null;
  joinDate: string | null;
  createdAt: Date;
}): boolean {
  const now = new Date();

  switch (trigger.type) {
    case "no_attendance": {
      const days = trigger.days || 10;
      if (!member.lastVisitDate) return true;
      const daysSinceVisit = (now.getTime() - member.lastVisitDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceVisit >= days;
    }
    case "risk_score": {
      const threshold = trigger.threshold || 50;
      const score = member.riskScore ? parseFloat(member.riskScore) : 0;
      return score >= threshold;
    }
    case "new_member_decline": {
      const joinDays = trigger.joinDays || 90;
      const inactiveDays = trigger.inactiveDays || 7;
      const joinDateStr = member.joinDate || member.createdAt.toISOString().split("T")[0];
      const joinDate = new Date(joinDateStr);
      const memberAgeDays = (now.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24);
      if (memberAgeDays > joinDays) return false;
      if (!member.lastVisitDate) return memberAgeDays > inactiveDays;
      const daysSinceVisit = (now.getTime() - member.lastVisitDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceVisit >= inactiveDays;
    }
    case "new_member_join": {
      const joinDays = trigger.joinDays || 3;
      const joinDateStr = member.joinDate || member.createdAt.toISOString().split("T")[0];
      const joinDate = new Date(joinDateStr);
      const memberAgeDays = (now.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24);
      return memberAgeDays <= joinDays;
    }
    default:
      return false;
  }
}

async function advanceDueSteps(gymId: number): Promise<void> {
  const now = new Date();

  const dueEnrollments = await db.select().from(memberSequenceEnrollmentsTable)
    .where(and(
      eq(memberSequenceEnrollmentsTable.gymId, gymId),
      eq(memberSequenceEnrollmentsTable.status, "active"),
      lte(memberSequenceEnrollmentsTable.nextActionAt, now)
    ));

  for (const enrollment of dueEnrollments) {
    try {
      const [member] = await db.select().from(membersTable)
        .where(eq(membersTable.id, enrollment.memberId));

      if (!member || member.status !== "active") {
        await exitEnrollment(enrollment.id, gymId, enrollment.memberId, enrollment.sequenceId, enrollment.currentStepIndex, "member_inactive");
        continue;
      }

      const [sequence] = await db.select().from(retentionSequencesTable)
        .where(eq(retentionSequencesTable.id, enrollment.sequenceId));

      if (member.lastVisitDate && sequence?.type !== "onboarding_journey") {
        const daysSinceVisit = (now.getTime() - member.lastVisitDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceVisit < 3) {
          await exitEnrollment(enrollment.id, gymId, enrollment.memberId, enrollment.sequenceId, enrollment.currentStepIndex, "re_engaged");
          continue;
        }
      }

      const steps = await db.select().from(retentionSequenceStepsTable)
        .where(eq(retentionSequenceStepsTable.sequenceId, enrollment.sequenceId))
        .orderBy(asc(retentionSequenceStepsTable.stepOrder));

      if (enrollment.currentStepIndex >= steps.length) {
        await exitEnrollment(enrollment.id, gymId, enrollment.memberId, enrollment.sequenceId, enrollment.currentStepIndex, "completed");
        continue;
      }

      const currentStep = steps[enrollment.currentStepIndex];
      const [gym] = await db.select().from(gymsTable).where(eq(gymsTable.id, gymId));

      const templateVars: Record<string, string> = {
        first_name: member.firstName,
        last_name: member.lastName,
        gym_name: gym?.name || "Your Gym",
        member_email: member.email,
      };

      const stepConfig = currentStep.config as Record<string, any>;
      await executeStep(currentStep.actionType, stepConfig, templateVars, member, gym, gymId, enrollment.id, enrollment.sequenceId, enrollment.currentStepIndex);

      const nextStepIndex = enrollment.currentStepIndex + 1;
      if (nextStepIndex >= steps.length) {
        await exitEnrollment(enrollment.id, gymId, enrollment.memberId, enrollment.sequenceId, nextStepIndex, "completed");
      } else {
        const nextStep = steps[nextStepIndex];
        const nextActionAt = new Date(now.getTime() + nextStep.delayDays * 24 * 60 * 60 * 1000);
        await db.update(memberSequenceEnrollmentsTable).set({
          currentStepIndex: nextStepIndex,
          nextActionAt,
        }).where(eq(memberSequenceEnrollmentsTable.id, enrollment.id));
      }
    } catch (err: any) {
      console.error(`[retention-engine] Error advancing enrollment ${enrollment.id}:`, err.message);
      await db.insert(retentionSequenceEventsTable).values({
        gymId,
        enrollmentId: enrollment.id,
        memberId: enrollment.memberId,
        sequenceId: enrollment.sequenceId,
        eventType: "step_error",
        stepIndex: enrollment.currentStepIndex,
        details: `Error: ${err.message}`,
      });
    }
  }
}

async function executeStep(
  actionType: string,
  config: Record<string, any>,
  vars: Record<string, string>,
  member: { id: number; email: string; firstName: string; lastName: string },
  gym: { id: number; name: string; fromEmail?: string | null; fromName?: string | null } | undefined,
  gymId: number,
  enrollmentId: number,
  sequenceId: number,
  stepIndex: number,
): Promise<void> {
  if (actionType === "email") {
    const subject = renderTemplate(config.subject || "", vars);
    const body = renderTemplate(config.body || "", vars);
    const emailService = getEmailService();

    if (emailService.isConfigured()) {
      const result = await sendMemberEmail({
        memberId: member.id,
        gymId,
        to: member.email,
        subject,
        text: body,
        html: `<div style="font-family:sans-serif;white-space:pre-line;">${body}</div>`,
        fromEmail: gym?.fromEmail || undefined,
        fromName: gym?.fromName || gym?.name || undefined,
        emailType: "retention",
        timelineTitle: "Retention email sent",
      });

      await db.insert(retentionSequenceEventsTable).values({
        gymId,
        enrollmentId,
        memberId: member.id,
        sequenceId,
        eventType: result.success ? "email_sent" : "email_failed",
        stepIndex,
        details: result.success ? `Email sent: ${subject}` : `Email failed: ${result.error}`,
        metadata: { messageId: result.messageId },
      });
    } else {
      await db.insert(retentionSequenceEventsTable).values({
        gymId,
        enrollmentId,
        memberId: member.id,
        sequenceId,
        eventType: "email_skipped",
        stepIndex,
        details: "No email service configured",
      });
    }
  } else if (actionType === "task") {
    const title = renderTemplate(config.title || "", vars);
    const description = renderTemplate(config.description || "", vars);

    await db.insert(aiTasksTable).values({
      gymId,
      type: "retention",
      title,
      description,
      priority: "high",
      status: "pending",
      targetId: member.id,
      targetType: "member",
    });

    await db.insert(retentionSequenceEventsTable).values({
      gymId,
      enrollmentId,
      memberId: member.id,
      sequenceId,
      eventType: "task_created",
      stepIndex,
      details: `Task created: ${title}`,
    });
  }
}

async function exitEnrollment(
  enrollmentId: number,
  gymId: number,
  memberId: number,
  sequenceId: number,
  stepIndex: number,
  reason: string,
): Promise<void> {
  await db.update(memberSequenceEnrollmentsTable).set({
    status: reason === "completed" ? "completed" : "exited",
    exitReason: reason,
    completedAt: new Date(),
  }).where(eq(memberSequenceEnrollmentsTable.id, enrollmentId));

  await db.insert(retentionSequenceEventsTable).values({
    gymId,
    enrollmentId,
    memberId,
    sequenceId,
    eventType: `exit_${reason}`,
    stepIndex,
    details: `Enrollment ended: ${reason}`,
  });

  console.log(`[retention-engine] Enrollment ${enrollmentId} exited: ${reason}`);
}

async function runRetentionForAllGyms(): Promise<void> {
  console.log("[retention-engine] Scheduled run starting...");

  let gyms: { id: number; name: string }[];
  try {
    gyms = await db.select({ id: gymsTable.id, name: gymsTable.name }).from(gymsTable);
  } catch (err: any) {
    console.error("[retention-engine] Failed to fetch gyms:", err.message);
    return;
  }

  if (gyms.length === 0) {
    console.log("[retention-engine] No gyms found, skipping.");
    return;
  }

  let totalEnrolled = 0;
  let totalAdvanced = 0;
  let totalErrors = 0;

  for (const gym of gyms) {
    try {
      await evaluateTriggersForGym(gym.id);
      await advanceDueSteps(gym.id);
    } catch (err: any) {
      totalErrors++;
      console.error(`[retention-engine] Error processing gym ${gym.id} (${gym.name}):`, err.message);
    }
  }

  console.log(`[retention-engine] Scheduled run complete: ${gyms.length} gyms processed, errors=${totalErrors}`);
}

export function startRetentionEngineScheduler(): void {
  if (schedulerTimer) {
    console.warn("[retention-engine] Scheduler already running, skipping duplicate start.");
    return;
  }

  console.log(`[retention-engine] Scheduler started (interval: ${RETENTION_INTERVAL_MS / 3600000}h)`);

  schedulerTimer = setInterval(() => {
    runRetentionForAllGyms().catch((err) => {
      console.error("[retention-engine] Unhandled error in scheduled run:", err.message);
    });
  }, RETENTION_INTERVAL_MS);

  setTimeout(() => {
    runRetentionForAllGyms().catch((err) => {
      console.error("[retention-engine] Unhandled error in initial run:", err.message);
    });
  }, 60_000);
}

export function stopRetentionEngineScheduler(): void {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
    console.log("[retention-engine] Scheduler stopped.");
  }
}

export { runRetentionForAllGyms, evaluateTrigger, renderTemplate, RETENTION_INTERVAL_MS };
