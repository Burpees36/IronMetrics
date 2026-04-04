import { eq, inArray } from "drizzle-orm";
import {
  db,
  aiTasksTable,
  retentionSequencesTable,
  retentionSequenceStepsTable,
  retentionSequenceEventsTable,
  memberSequenceEnrollmentsTable,
  gymsTable,
} from "@workspace/db";
import { DEFAULT_SEQUENCES } from "../routes/retention";

export async function runOnboardingMigrationCleanup(): Promise<void> {
  try {
    const deletedTasks = await db
      .delete(aiTasksTable)
      .where(eq(aiTasksTable.type, "onboarding"))
      .returning({ id: aiTasksTable.id });

    if (deletedTasks.length > 0) {
      console.log(`[onboarding-cleanup] Removed ${deletedTasks.length} legacy onboarding AI task(s)`);
    }

    const newMemberSequences = await db
      .select({ id: retentionSequencesTable.id })
      .from(retentionSequencesTable)
      .where(eq(retentionSequencesTable.type, "new_member"));

    if (newMemberSequences.length > 0) {
      const sequenceIds = newMemberSequences.map((s) => s.id);

      const enrollments = await db
        .select({ id: memberSequenceEnrollmentsTable.id })
        .from(memberSequenceEnrollmentsTable)
        .where(inArray(memberSequenceEnrollmentsTable.sequenceId, sequenceIds));

      if (enrollments.length > 0) {
        const enrollmentIds = enrollments.map((e) => e.id);

        await db
          .delete(retentionSequenceEventsTable)
          .where(inArray(retentionSequenceEventsTable.enrollmentId, enrollmentIds));

        await db
          .delete(memberSequenceEnrollmentsTable)
          .where(inArray(memberSequenceEnrollmentsTable.id, enrollmentIds));
      }

      await db
        .delete(retentionSequencesTable)
        .where(inArray(retentionSequencesTable.id, sequenceIds));

      console.log(`[onboarding-cleanup] Removed ${newMemberSequences.length} "New Member Support" sequence(s) and ${enrollments.length} enrollment(s)`);
    }

    const allGyms = await db.select({ id: gymsTable.id }).from(gymsTable);
    const allSequences = await db
      .select({ gymId: retentionSequencesTable.gymId, type: retentionSequencesTable.type })
      .from(retentionSequencesTable);

    const gymTypeMap = new Map<number, Set<string>>();
    for (const seq of allSequences) {
      if (!gymTypeMap.has(seq.gymId)) {
        gymTypeMap.set(seq.gymId, new Set());
      }
      gymTypeMap.get(seq.gymId)!.add(seq.type);
    }

    let totalSeeded = 0;
    for (const gym of allGyms) {
      const existingTypes = gymTypeMap.get(gym.id) ?? new Set();
      const toSeed = DEFAULT_SEQUENCES.filter((def) => !existingTypes.has(def.type));
      if (toSeed.length === 0) continue;

      for (const def of toSeed) {
        const [seq] = await db.insert(retentionSequencesTable).values({
          gymId: gym.id,
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

        totalSeeded++;
      }
    }

    if (totalSeeded > 0) {
      console.log(`[onboarding-cleanup] Seeded ${totalSeeded} missing default sequence(s) across ${allGyms.length} gym(s)`);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[onboarding-cleanup] Migration cleanup failed (non-fatal):", message);
  }
}
