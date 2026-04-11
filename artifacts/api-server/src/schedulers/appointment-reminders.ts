import { db, appointmentsTable } from "@workspace/db";
import { eq, and, lte, gte, sql } from "drizzle-orm";

const REMINDER_INTERVAL_MS = 5 * 60 * 1000;
let reminderTimer: ReturnType<typeof setInterval> | null = null;

async function sendReminders(): Promise<void> {
  const now = new Date();
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
  const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const twentyThreeHoursFromNow = new Date(now.getTime() + 23 * 60 * 60 * 1000);

  try {
    const upcoming24h = await db
      .select()
      .from(appointmentsTable)
      .where(
        and(
          eq(appointmentsTable.status, "scheduled"),
          eq(appointmentsTable.reminderSent24h, false),
          lte(appointmentsTable.startTime, twentyFourHoursFromNow),
          gte(appointmentsTable.startTime, twentyThreeHoursFromNow)
        )
      );

    for (const appt of upcoming24h) {
      console.log(
        `[appointment-reminders] 24h reminder: Appointment #${appt.id} ` +
        `(${appt.memberName || appt.leadName || "unknown"}) with ${appt.coachName} ` +
        `at ${appt.startTime.toISOString()}`
      );
      await db
        .update(appointmentsTable)
        .set({ reminderSent24h: true })
        .where(eq(appointmentsTable.id, appt.id));
    }

    const upcoming1h = await db
      .select()
      .from(appointmentsTable)
      .where(
        and(
          eq(appointmentsTable.status, "scheduled"),
          eq(appointmentsTable.reminderSent1h, false),
          lte(appointmentsTable.startTime, oneHourFromNow),
          gte(appointmentsTable.startTime, now)
        )
      );

    for (const appt of upcoming1h) {
      console.log(
        `[appointment-reminders] 1h reminder: Appointment #${appt.id} ` +
        `(${appt.memberName || appt.leadName || "unknown"}) with ${appt.coachName} ` +
        `at ${appt.startTime.toISOString()}`
      );
      await db
        .update(appointmentsTable)
        .set({ reminderSent1h: true })
        .where(eq(appointmentsTable.id, appt.id));
    }

    if (upcoming24h.length > 0 || upcoming1h.length > 0) {
      console.log(
        `[appointment-reminders] Sent ${upcoming24h.length} 24h and ${upcoming1h.length} 1h reminders`
      );
    }
  } catch (err: any) {
    console.error("[appointment-reminders] Error sending reminders:", err.message);
  }
}

export function startAppointmentReminders(): void {
  if (reminderTimer) {
    console.warn("[appointment-reminders] Already running, skipping duplicate start.");
    return;
  }

  console.log("[appointment-reminders] Reminder scheduler started (checking every 5 minutes)");

  setTimeout(() => {
    sendReminders().catch((err) => {
      console.error("[appointment-reminders] Error in initial run:", err.message);
    });
  }, 30_000);

  reminderTimer = setInterval(() => {
    sendReminders().catch((err) => {
      console.error("[appointment-reminders] Error in scheduled run:", err.message);
    });
  }, REMINDER_INTERVAL_MS);
}

export function stopAppointmentReminders(): void {
  if (reminderTimer) {
    clearInterval(reminderTimer);
    reminderTimer = null;
    console.log("[appointment-reminders] Reminder scheduler stopped.");
  }
}
