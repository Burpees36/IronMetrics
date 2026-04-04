import { db, gymsTable, syncRunsTable } from "@workspace/db";
import { eq, and, lt, isNotNull } from "drizzle-orm";
import { runWodifySync } from "../routes/integrations/wodify/sync";

const SYNC_INTERVAL_MS = 4 * 60 * 60 * 1000;
const STUCK_THRESHOLD_MS = 30 * 60 * 1000;

let schedulerTimer: ReturnType<typeof setInterval> | null = null;

async function markStuckSyncs(): Promise<number> {
  const cutoff = new Date(Date.now() - STUCK_THRESHOLD_MS);

  const stuckRuns = await db
    .select({ id: syncRunsTable.id, gymId: syncRunsTable.gymId })
    .from(syncRunsTable)
    .where(
      and(
        eq(syncRunsTable.source, "wodify-api"),
        eq(syncRunsTable.status, "running"),
        lt(syncRunsTable.startedAt, cutoff),
      ),
    );

  for (const run of stuckRuns) {
    const [current] = await db
      .select({ metadata: syncRunsTable.metadata })
      .from(syncRunsTable)
      .where(eq(syncRunsTable.id, run.id));
    const existingMetadata =
      (current?.metadata as Record<string, unknown>) || {};

    await db
      .update(syncRunsTable)
      .set({
        status: "failed",
        completedAt: new Date(),
        metadata: {
          ...existingMetadata,
          progress: {
            phase: "failed",
            message: "Sync marked as failed: exceeded 30-minute timeout",
          },
          stuckDetected: true,
        },
      })
      .where(eq(syncRunsTable.id, run.id));

    console.log(
      `[wodify-sync-scheduler] Marked stuck sync run ${run.id} (gym ${run.gymId}) as failed`,
    );
  }

  return stuckRuns.length;
}

async function runScheduledSyncs(): Promise<void> {
  console.log("[wodify-sync-scheduler] Scheduled run starting...");

  const stuckCount = await markStuckSyncs();
  if (stuckCount > 0) {
    console.log(
      `[wodify-sync-scheduler] Marked ${stuckCount} stuck sync(s) as failed`,
    );
  }

  let gyms: { id: number; name: string; wodifyApiKey: string }[];
  try {
    const rows = await db
      .select({
        id: gymsTable.id,
        name: gymsTable.name,
        wodifyApiKey: gymsTable.wodifyApiKey,
      })
      .from(gymsTable)
      .where(isNotNull(gymsTable.wodifyApiKey));

    gyms = rows.filter(
      (g): g is { id: number; name: string; wodifyApiKey: string } =>
        !!g.wodifyApiKey,
    );
  } catch (err: any) {
    console.error(
      "[wodify-sync-scheduler] Failed to fetch gyms:",
      err.message,
    );
    return;
  }

  if (gyms.length === 0) {
    console.log(
      "[wodify-sync-scheduler] No gyms with Wodify API keys, skipping.",
    );
    return;
  }

  let synced = 0;
  let skipped = 0;
  let errors = 0;

  for (const gym of gyms) {
    try {
      const [existingRun] = await db
        .select({ id: syncRunsTable.id })
        .from(syncRunsTable)
        .where(
          and(
            eq(syncRunsTable.gymId, gym.id),
            eq(syncRunsTable.source, "wodify-api"),
            eq(syncRunsTable.status, "running"),
          ),
        )
        .limit(1);

      if (existingRun) {
        console.log(
          `[wodify-sync-scheduler] Gym ${gym.id} (${gym.name}) already has a running sync, skipping`,
        );
        skipped++;
        continue;
      }

      console.log(
        `[wodify-sync-scheduler] Starting auto-sync for gym ${gym.id} (${gym.name})`,
      );
      await runWodifySync(gym.id, gym.wodifyApiKey, "auto");
      synced++;
    } catch (err: any) {
      errors++;
      console.error(
        `[wodify-sync-scheduler] Error syncing gym ${gym.id} (${gym.name}):`,
        err.message,
      );
    }
  }

  console.log(
    `[wodify-sync-scheduler] Scheduled run complete: ${gyms.length} gyms checked, ${synced} synced, ${skipped} skipped, ${errors} errors`,
  );
}

export function startWodifySyncScheduler(): void {
  if (schedulerTimer) {
    console.warn(
      "[wodify-sync-scheduler] Scheduler already running, skipping duplicate start.",
    );
    return;
  }

  console.log(
    `[wodify-sync-scheduler] Scheduler started (interval: ${SYNC_INTERVAL_MS / 3600000}h)`,
  );

  schedulerTimer = setInterval(() => {
    runScheduledSyncs().catch((err) => {
      console.error(
        "[wodify-sync-scheduler] Unhandled error in scheduled run:",
        err.message,
      );
    });
  }, SYNC_INTERVAL_MS);

  setTimeout(() => {
    runScheduledSyncs().catch((err) => {
      console.error(
        "[wodify-sync-scheduler] Unhandled error in initial run:",
        err.message,
      );
    });
  }, 90_000);
}

export function stopWodifySyncScheduler(): void {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
    console.log("[wodify-sync-scheduler] Scheduler stopped.");
  }
}

export { runScheduledSyncs, markStuckSyncs, SYNC_INTERVAL_MS };
