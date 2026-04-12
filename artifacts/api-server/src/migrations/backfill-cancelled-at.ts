import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

export async function runBackfillCancelledAt(): Promise<void> {
  try {
    const countBefore = await db.execute(sql`
      SELECT COUNT(*) AS cnt FROM subscriptions
      WHERE status = 'cancelled' AND cancelled_at IS NULL
    `);
    const missing = Number(countBefore.rows[0]?.cnt ?? 0);
    if (missing === 0) return;

    await db.execute(sql`
      UPDATE subscriptions s
      SET cancelled_at = m.updated_at
      FROM members m
      WHERE s.member_id = m.id
        AND m.status = 'cancelled'
        AND s.status = 'cancelled'
        AND s.cancelled_at IS NULL
    `);

    const countAfter = await db.execute(sql`
      SELECT COUNT(*) AS cnt FROM subscriptions
      WHERE status = 'cancelled' AND cancelled_at IS NULL
    `);
    const remaining = Number(countAfter.rows[0]?.cnt ?? 0);
    const filled = missing - remaining;

    if (filled > 0) {
      console.log(`[backfill-cancelled-at] Backfilled cancelledAt on ${filled} subscription(s)`);
    }
    if (remaining > 0) {
      console.log(`[backfill-cancelled-at] ${remaining} cancelled subscription(s) still missing cancelledAt (member may not be cancelled)`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[backfill-cancelled-at] Failed:", msg);
  }
}
