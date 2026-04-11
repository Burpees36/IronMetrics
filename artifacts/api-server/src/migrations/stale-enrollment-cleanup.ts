import { eq, and, inArray } from "drizzle-orm";
import { db, membersTable, memberSequenceEnrollmentsTable } from "@workspace/db";
import { exitMemberSequences } from "../schedulers/retention-engine";

export async function runStaleEnrollmentCleanup(): Promise<void> {
  try {
    const staleEnrollments = await db
      .select({
        memberId: memberSequenceEnrollmentsTable.memberId,
        gymId: memberSequenceEnrollmentsTable.gymId,
      })
      .from(memberSequenceEnrollmentsTable)
      .leftJoin(membersTable, eq(memberSequenceEnrollmentsTable.memberId, membersTable.id))
      .where(
        and(
          eq(memberSequenceEnrollmentsTable.status, "active"),
          inArray(membersTable.status, ["cancelled", "hold"]),
        ),
      );

    if (staleEnrollments.length === 0) return;

    const uniqueMembers = new Map<string, { memberId: number; gymId: number }>();
    for (const row of staleEnrollments) {
      const key = `${row.memberId}:${row.gymId}`;
      if (!uniqueMembers.has(key)) {
        uniqueMembers.set(key, { memberId: row.memberId, gymId: row.gymId });
      }
    }

    let totalExited = 0;
    for (const { memberId, gymId } of uniqueMembers.values()) {
      try {
        const count = await exitMemberSequences(memberId, gymId, "member_inactive");
        totalExited += count;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[stale-enrollment-cleanup] Failed to exit sequences for member ${memberId}:`, msg);
      }
    }

    if (totalExited > 0) {
      console.log(`[stale-enrollment-cleanup] Exited ${totalExited} stale enrollment(s) across ${uniqueMembers.size} inactive member(s)`);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[stale-enrollment-cleanup] Cleanup failed (non-fatal):", message);
  }
}
