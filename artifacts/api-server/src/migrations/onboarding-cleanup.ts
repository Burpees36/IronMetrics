import { eq, and, inArray } from "drizzle-orm";
import {
  db,
  aiTasksTable,
  retentionSequencesTable,
  retentionSequenceEventsTable,
  memberSequenceEnrollmentsTable,
} from "@workspace/db";

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
      .where(
        and(
          eq(retentionSequencesTable.type, "new_member"),
          eq(retentionSequencesTable.name, "New Member Support"),
        ),
      );

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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[onboarding-cleanup] Migration cleanup failed (non-fatal):", message);
  }
}
