import { eq, and, sql, desc, gte } from "drizzle-orm";
import { db, aiTasksTable, aiOperatorSettingsTable, gymsTable } from "@workspace/db";
import { getEmailService } from "../services/email-service";

const DAILY_HOUR = 18;
const WEEKLY_DAY = 1;

let digestTimer: ReturnType<typeof setTimeout> | null = null;

function msUntilNextDigestCheck(): number {
  const now = new Date();
  const next = new Date(now);
  next.setHours(DAILY_HOUR, 0, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime() - now.getTime();
}

async function buildDigestContent(
  gymId: number,
  gymName: string,
  since: Date
): Promise<{ subject: string; text: string; taskCount: number } | null> {
  const autoSentTasks = await db
    .select()
    .from(aiTasksTable)
    .where(
      and(
        eq(aiTasksTable.gymId, gymId),
        eq(aiTasksTable.autoSent, true),
        eq(aiTasksTable.status, "sent"),
        gte(aiTasksTable.updatedAt, since)
      )
    )
    .orderBy(desc(aiTasksTable.updatedAt));

  if (autoSentTasks.length === 0) {
    return null;
  }

  const byType: Record<string, typeof autoSentTasks> = {};
  for (const task of autoSentTasks) {
    if (!byType[task.type]) byType[task.type] = [];
    byType[task.type].push(task);
  }

  const typeLabels: Record<string, string> = {
    outreach: "Member Outreach",
    billing: "Billing Follow-Up",
    leads: "Lead Follow-Up",
  };

  let body = `Auto-Pilot Digest for ${gymName}\n`;
  body += `${"=".repeat(40)}\n\n`;
  body += `Period: ${since.toLocaleDateString()} - ${new Date().toLocaleDateString()}\n`;
  body += `Total auto-sent emails: ${autoSentTasks.length}\n\n`;

  for (const [type, tasks] of Object.entries(byType)) {
    const label = typeLabels[type] || type;
    body += `${label} (${tasks.length})\n`;
    body += `${"-".repeat(30)}\n`;
    for (const task of tasks) {
      const date = task.updatedAt
        ? new Date(task.updatedAt).toLocaleDateString()
        : "Unknown";
      body += `  - ${task.title} (${date})\n`;
    }
    body += "\n";
  }

  body += `\nTo adjust auto-pilot settings, visit your AI Operator dashboard.\n`;

  const subject = `Auto-Pilot Digest: ${autoSentTasks.length} email${autoSentTasks.length !== 1 ? "s" : ""} sent automatically`;

  return { subject, text: body, taskCount: autoSentTasks.length };
}

async function sendDigests(): Promise<void> {
  console.log("[autopilot-digest] Running digest check...");

  const emailService = getEmailService();
  if (!emailService.isConfigured()) {
    console.log("[autopilot-digest] Email service not configured, skipping.");
    return;
  }

  const allSettings = await db.select().from(aiOperatorSettingsTable);
  const now = new Date();
  const isMonday = now.getDay() === WEEKLY_DAY;

  for (const settings of allSettings) {
    if (settings.digestFrequency === "disabled") continue;
    if (settings.digestFrequency === "weekly" && !isMonday) continue;

    const hasAnyAutopilot =
      settings.autopilotOutreach || settings.autopilotBilling || settings.autopilotLeads;
    if (!hasAnyAutopilot) continue;

    const [gym] = await db
      .select()
      .from(gymsTable)
      .where(eq(gymsTable.id, settings.gymId));
    if (!gym?.email) continue;

    const since = new Date();
    if (settings.digestFrequency === "weekly") {
      since.setDate(since.getDate() - 7);
    } else {
      since.setDate(since.getDate() - 1);
    }

    try {
      const digest = await buildDigestContent(settings.gymId, gym.name, since);
      if (!digest) {
        console.log(
          `[autopilot-digest] No auto-sent tasks for gym ${settings.gymId}, skipping digest.`
        );
        continue;
      }

      const result = await emailService.sendEmail({
        to: gym.email,
        subject: digest.subject,
        text: digest.text,
        fromEmail: gym.fromEmail || undefined,
        fromName: gym.fromName || gym.name,
      });

      if (result.success) {
        console.log(
          `[autopilot-digest] Sent ${settings.digestFrequency} digest to ${gym.email} for gym ${gym.name} (${digest.taskCount} tasks)`
        );
      } else {
        console.error(
          `[autopilot-digest] Failed to send digest for gym ${settings.gymId}: ${result.error}`
        );
      }
    } catch (err: any) {
      console.error(
        `[autopilot-digest] Error building digest for gym ${settings.gymId}:`,
        err.message
      );
    }
  }
}

function scheduleNextDigest(): void {
  const delayMs = msUntilNextDigestCheck();
  const nextDate = new Date(Date.now() + delayMs);
  console.log(
    `[autopilot-digest] Next digest check at ${nextDate.toISOString()} (in ${Math.round(delayMs / 60000)} minutes)`
  );

  digestTimer = setTimeout(async () => {
    try {
      await sendDigests();
    } catch (err: any) {
      console.error("[autopilot-digest] Unhandled error:", err.message);
    }
    scheduleNextDigest();
  }, delayMs);
}

export function startAutopilotDigestScheduler(): void {
  if (digestTimer) {
    console.warn("[autopilot-digest] Scheduler already running, skipping.");
    return;
  }

  console.log(
    `[autopilot-digest] Scheduler started (daily at ${DAILY_HOUR}:00)`
  );
  scheduleNextDigest();
}

export function stopAutopilotDigestScheduler(): void {
  if (digestTimer) {
    clearTimeout(digestTimer);
    digestTimer = null;
    console.log("[autopilot-digest] Scheduler stopped.");
  }
}
