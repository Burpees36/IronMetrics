import { processLeadSequences } from "../services/lead-sequence-engine";

const INTERVAL_MS = 15 * 60 * 1000;

let schedulerInterval: ReturnType<typeof setInterval> | null = null;
let lastRunTimestamp: Date | null = null;

async function runLeadSequenceProcessing(): Promise<void> {
  console.log("[lead-sequence-scheduler] Processing lead sequences...");

  try {
    const result = await processLeadSequences();
    lastRunTimestamp = new Date();

    console.log(
      `[lead-sequence-scheduler] Run complete: processed=${result.processed}, sent=${result.sent}, ` +
      `completed=${result.completed}, errors=${result.errors}`
    );
  } catch (err: any) {
    console.error("[lead-sequence-scheduler] Unhandled error:", err.message);
  }
}

export function getLastLeadSequenceRunTimestamp(): Date | null {
  return lastRunTimestamp;
}

export function startLeadSequenceScheduler(): void {
  if (schedulerInterval) {
    console.warn("[lead-sequence-scheduler] Scheduler already running, skipping duplicate start.");
    return;
  }

  console.log(`[lead-sequence-scheduler] Scheduler started (every ${INTERVAL_MS / 60000} minutes)`);

  setTimeout(() => {
    runLeadSequenceProcessing().catch((err) => {
      console.error("[lead-sequence-scheduler] Initial run error:", err.message);
    });
  }, 60_000);

  schedulerInterval = setInterval(() => {
    runLeadSequenceProcessing().catch((err) => {
      console.error("[lead-sequence-scheduler] Interval run error:", err.message);
    });
  }, INTERVAL_MS);
}

export function stopLeadSequenceScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("[lead-sequence-scheduler] Scheduler stopped.");
  }
}
