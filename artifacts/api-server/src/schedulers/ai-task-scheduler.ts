import { db, gymsTable } from "@workspace/db";
import { generateAiTasks } from "../services/ai-task-generation";
import { runOutcomeDetection } from "../services/outcome-detection";

const DEFAULT_SCAN_HOUR = 5;
const DEFAULT_SCAN_MINUTE = 0;

let schedulerTimer: ReturnType<typeof setTimeout> | null = null;
let lastRunTimestamp: Date | null = null;

function getConfiguredScanTime(): { hour: number; minute: number } {
  const hourEnv = process.env["AI_SCAN_HOUR"];
  const minuteEnv = process.env["AI_SCAN_MINUTE"];
  const hour = hourEnv ? parseInt(hourEnv, 10) : DEFAULT_SCAN_HOUR;
  const minute = minuteEnv ? parseInt(minuteEnv, 10) : DEFAULT_SCAN_MINUTE;
  return {
    hour: isNaN(hour) || hour < 0 || hour > 23 ? DEFAULT_SCAN_HOUR : hour,
    minute: isNaN(minute) || minute < 0 || minute > 59 ? DEFAULT_SCAN_MINUTE : minute,
  };
}

function msUntilNextRun(): number {
  const { hour, minute } = getConfiguredScanTime();
  const now = new Date();
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime() - now.getTime();
}

async function runAiTaskGenerationForAllGyms(): Promise<void> {
  console.log("[ai-task-scheduler] Scheduled task generation starting...");

  let gyms: { id: number; name: string }[];
  try {
    gyms = await db
      .select({ id: gymsTable.id, name: gymsTable.name })
      .from(gymsTable);
  } catch (err: any) {
    console.error("[ai-task-scheduler] Failed to fetch gyms:", err.message);
    return;
  }

  if (gyms.length === 0) {
    console.log("[ai-task-scheduler] No gyms found, skipping.");
    lastRunTimestamp = new Date();
    return;
  }

  let totalCreated = 0;
  let totalErrors = 0;

  for (const gym of gyms) {
    try {
      const result = await generateAiTasks(gym.id);
      totalCreated += result.created;
    } catch (err: any) {
      totalErrors++;
      console.error(`[ai-task-scheduler] Error generating tasks for gym ${gym.id} (${gym.name}):`, err.message);
    }
  }

  let outcomeResult = { evaluated: 0, updated: 0 };
  try {
    outcomeResult = await runOutcomeDetection();
  } catch (err: any) {
    console.error("[ai-task-scheduler] Error running outcome detection:", err.message);
  }

  lastRunTimestamp = new Date();

  console.log(
    `[ai-task-scheduler] Scheduled run complete: ${gyms.length} gyms processed, ` +
    `tasks_created=${totalCreated}, errors=${totalErrors}, ` +
    `outcomes_evaluated=${outcomeResult.evaluated}, outcomes_updated=${outcomeResult.updated}`
  );
}

function scheduleNextRun(): void {
  const delayMs = msUntilNextRun();
  const { hour, minute } = getConfiguredScanTime();
  const nextRunDate = new Date(Date.now() + delayMs);
  console.log(`[ai-task-scheduler] Next run scheduled at ${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")} (in ${Math.round(delayMs / 60000)} minutes, at ${nextRunDate.toISOString()})`);

  schedulerTimer = setTimeout(async () => {
    try {
      await runAiTaskGenerationForAllGyms();
    } catch (err: any) {
      console.error("[ai-task-scheduler] Unhandled error in scheduled run:", err.message);
    }
    scheduleNextRun();
  }, delayMs);
}

export function getLastAiScanTimestamp(): Date | null {
  return lastRunTimestamp;
}

export function startAiTaskScheduler(): void {
  if (schedulerTimer) {
    console.warn("[ai-task-scheduler] Scheduler already running, skipping duplicate start.");
    return;
  }

  const { hour, minute } = getConfiguredScanTime();
  console.log(`[ai-task-scheduler] Scheduler started (daily at ${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")})`);

  setTimeout(() => {
    runAiTaskGenerationForAllGyms().catch((err) => {
      console.error("[ai-task-scheduler] Unhandled error in initial run:", err.message);
    });
  }, 90_000);

  scheduleNextRun();
}

export function stopAiTaskScheduler(): void {
  if (schedulerTimer) {
    clearTimeout(schedulerTimer);
    schedulerTimer = null;
    console.log("[ai-task-scheduler] Scheduler stopped.");
  }
}

export { runAiTaskGenerationForAllGyms };
