import { db, gymsTable, membersTable, benchmarksTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { getBlendedGymMetrics, computeBlendedEngagement } from "../blendedMetrics";
import { computeRSI } from "../routes/intelligence/computations";

const BENCHMARK_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
const METRICS = ["rsiScore", "churnRate", "avgRevPerMember", "avgTenure", "engagementRate"] as const;

let schedulerTimer: ReturnType<typeof setInterval> | null = null;

function getSizeSegment(activeMemberCount: number): string {
  if (activeMemberCount < 100) return "small";
  if (activeMemberCount <= 250) return "medium";
  return "large";
}

function computePercentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

interface GymMetricValues {
  rsiScore: number | null;
  churnRate: number;
  avgRevPerMember: number;
  avgTenure: number;
  engagementRate: number;
  sizeSegment: string;
}

export async function computeBenchmarks(): Promise<void> {
  console.log("[benchmark-scheduler] Starting benchmark computation...");

  let gyms: { id: number; name: string }[];
  try {
    gyms = await db.select({ id: gymsTable.id, name: gymsTable.name }).from(gymsTable);
  } catch (err: any) {
    console.error("[benchmark-scheduler] Failed to fetch gyms:", err.message);
    return;
  }

  if (gyms.length === 0) {
    console.log("[benchmark-scheduler] No gyms found, skipping.");
    return;
  }

  const gymMetrics: GymMetricValues[] = [];

  for (const gym of gyms) {
    try {
      const blended = await getBlendedGymMetrics(gym.id);
      const engagement = await computeBlendedEngagement(gym.id);
      const rsi = computeRSI(blended.churnRate, blended.avgRevPerMember, blended.netGrowth, blended.avgTenure, blended.totalMembers);

      gymMetrics.push({
        rsiScore: rsi.score,
        churnRate: blended.churnRate,
        avgRevPerMember: blended.avgRevPerMember,
        avgTenure: blended.avgTenure,
        engagementRate: engagement.engagementRate,
        sizeSegment: getSizeSegment(blended.activeBillableMembers),
      });
    } catch (err: any) {
      console.error(`[benchmark-scheduler] Error computing metrics for gym ${gym.id} (${gym.name}):`, err.message);
    }
  }

  const segments = ["small", "medium", "large"];
  const now = new Date();
  let insertCount = 0;

  for (const segment of segments) {
    const segmentGyms = gymMetrics.filter(g => g.sizeSegment === segment);
    const sampleCount = segmentGyms.length;

    for (const metric of METRICS) {
      const values = segmentGyms.map(g => g[metric]).filter((v): v is number => v !== null).sort((a, b) => a - b);

      const row = {
        metric,
        sizeSegment: segment,
        p25: String(Math.round(computePercentile(values, 25) * 100) / 100),
        p50: String(Math.round(computePercentile(values, 50) * 100) / 100),
        p75: String(Math.round(computePercentile(values, 75) * 100) / 100),
        p90: String(Math.round(computePercentile(values, 90) * 100) / 100),
        sampleCount,
        computedAt: now,
      };

      await db.insert(benchmarksTable).values(row);
      insertCount++;
    }
  }

  console.log(`[benchmark-scheduler] Benchmark computation complete: ${gymMetrics.length} gyms processed, ${insertCount} benchmark rows inserted.`);
}

export function startBenchmarkScheduler(): void {
  if (schedulerTimer) {
    console.warn("[benchmark-scheduler] Scheduler already running, skipping duplicate start.");
    return;
  }

  console.log(`[benchmark-scheduler] Scheduler started (interval: ${BENCHMARK_INTERVAL_MS / 3600000}h)`);

  schedulerTimer = setInterval(() => {
    computeBenchmarks().catch((err) => {
      console.error("[benchmark-scheduler] Unhandled error in scheduled run:", err.message);
    });
  }, BENCHMARK_INTERVAL_MS);

  setTimeout(() => {
    computeBenchmarks().catch((err) => {
      console.error("[benchmark-scheduler] Unhandled error in initial run:", err.message);
    });
  }, 60_000);
}

export function stopBenchmarkScheduler(): void {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
    console.log("[benchmark-scheduler] Scheduler stopped.");
  }
}
