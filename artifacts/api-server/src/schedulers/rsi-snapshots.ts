import { db, gymsTable, rsiSnapshotsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { getGymMetrics } from "../routes/intelligence/metrics";
import { computeRSI } from "../routes/intelligence/computations";

const RSI_SNAPSHOT_INTERVAL_MS = 24 * 60 * 60 * 1000;

let schedulerTimer: ReturnType<typeof setInterval> | null = null;

async function takeRsiSnapshotsForAllGyms(): Promise<void> {
  console.log("[rsi-snapshots] Scheduled snapshot run starting...");

  let gyms: { id: number; name: string }[];
  try {
    gyms = await db.select({ id: gymsTable.id, name: gymsTable.name }).from(gymsTable);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[rsi-snapshots] Failed to fetch gyms:", message);
    return;
  }

  if (gyms.length === 0) {
    console.log("[rsi-snapshots] No gyms found, skipping.");
    return;
  }

  const today = new Date().toISOString().split("T")[0];
  let saved = 0;
  let skipped = 0;
  let errors = 0;

  for (const gym of gyms) {
    try {
      const existing = await db.select({ id: rsiSnapshotsTable.id })
        .from(rsiSnapshotsTable)
        .where(and(eq(rsiSnapshotsTable.gymId, gym.id), eq(rsiSnapshotsTable.recordedAt, today)));

      if (existing.length > 0) {
        skipped++;
        continue;
      }

      const metrics = await getGymMetrics(gym.id);
      const rsi = computeRSI(metrics.churnRate, metrics.avgRev, metrics.netGrowth, metrics.avgTenure);

      const churnNorm = Math.max(0, Math.min(100, 100 - metrics.churnRate * 7));
      const revNorm = Math.min(100, (metrics.avgRev / 200) * 100);
      const growthNorm = Math.max(0, Math.min(100, 50 + metrics.netGrowth * 5));
      const tenureNorm = Math.min(100, (metrics.avgTenure / 24) * 100);

      await db.insert(rsiSnapshotsTable).values({
        gymId: gym.id,
        score: String(rsi.score),
        band: rsi.band,
        churnNorm: String(Math.round(churnNorm * 10) / 10),
        revNorm: String(Math.round(revNorm * 10) / 10),
        growthNorm: String(Math.round(growthNorm * 10) / 10),
        tenureNorm: String(Math.round(tenureNorm * 10) / 10),
        recordedAt: today,
      });

      saved++;
    } catch (err: unknown) {
      errors++;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[rsi-snapshots] Error snapshotting gym ${gym.id} (${gym.name}):`, message);
    }
  }

  console.log(
    `[rsi-snapshots] Snapshot run complete: ${gyms.length} gyms, saved=${saved}, skipped=${skipped}, errors=${errors}`
  );
}

export function startRsiSnapshotScheduler(): void {
  if (schedulerTimer) {
    console.warn("[rsi-snapshots] Scheduler already running, skipping duplicate start.");
    return;
  }

  console.log(`[rsi-snapshots] Scheduler started (interval: ${RSI_SNAPSHOT_INTERVAL_MS / 3600000}h)`);

  schedulerTimer = setInterval(() => {
    takeRsiSnapshotsForAllGyms().catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[rsi-snapshots] Unhandled error in scheduled run:", message);
    });
  }, RSI_SNAPSHOT_INTERVAL_MS);

  setTimeout(() => {
    takeRsiSnapshotsForAllGyms().catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[rsi-snapshots] Unhandled error in initial run:", message);
    });
  }, 45_000);
}

export function stopRsiSnapshotScheduler(): void {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
    console.log("[rsi-snapshots] Scheduler stopped.");
  }
}

export { takeRsiSnapshotsForAllGyms, RSI_SNAPSHOT_INTERVAL_MS };
