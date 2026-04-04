import { db, programmingPreferencesTable } from "@workspace/db";
import { runAutoPublishForGym } from "../routes/programming/generate";

const CHECK_INTERVAL_MS = 60 * 60 * 1000;

let intervalHandle: ReturnType<typeof setInterval> | null = null;

function parseTime(timeStr: string): { hour: number; minute: number } | null {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = parseInt(match[1]!, 10);
  const minute = parseInt(match[2]!, 10);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

function shouldRunNow(autoPublishTime: string): boolean {
  const parsed = parseTime(autoPublishTime);
  if (!parsed) return false;

  const now = new Date();
  const currentHour = now.getUTCHours();
  const currentMinute = now.getUTCMinutes();

  return currentHour === parsed.hour && currentMinute >= parsed.minute && currentMinute < parsed.minute + 60;
}

const lastRunMap = new Map<number, string>();

async function runAutoPublishCheck(): Promise<void> {
  const today = new Date().toISOString().split("T")[0]!;

  let allPrefs: (typeof programmingPreferencesTable.$inferSelect)[];
  try {
    allPrefs = await db
      .select()
      .from(programmingPreferencesTable);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[auto-publish] Failed to fetch preferences:", msg);
    return;
  }

  const enabledGyms = allPrefs.filter(p => p.autoPublishEnabled);
  if (enabledGyms.length === 0) return;

  for (const prefs of enabledGyms) {
    const runKey = `${prefs.gymId}-${today}`;
    if (lastRunMap.get(prefs.gymId) === runKey) continue;

    const publishTime = prefs.autoPublishTime || "20:00";
    if (!shouldRunNow(publishTime)) continue;

    try {
      const result = await runAutoPublishForGym(prefs.gymId, prefs.autoPublishLeadDays || 1);
      lastRunMap.set(prefs.gymId, runKey);
      if (result.published > 0) {
        console.log(`[auto-publish] Gym ${prefs.gymId}: published ${result.published} day(s) through ${result.targetDate}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error(`[auto-publish] Error for gym ${prefs.gymId}:`, msg);
    }
  }
}

export function startAutoPublishScheduler(): void {
  if (intervalHandle) {
    console.warn("[auto-publish] Scheduler already running, skipping duplicate start.");
    return;
  }

  console.log(`[auto-publish] Scheduler started (interval: 1h)`);
  intervalHandle = setInterval(() => {
    runAutoPublishCheck().catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("[auto-publish] Unhandled error:", msg);
    });
  }, CHECK_INTERVAL_MS);
}

export function stopAutoPublishScheduler(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    console.log("[auto-publish] Scheduler stopped.");
  }
}
