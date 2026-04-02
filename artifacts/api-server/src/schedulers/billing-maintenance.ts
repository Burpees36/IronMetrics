import { db, gymsTable, scheduledHoldsTable, subscriptionsTable, membersTable } from "@workspace/db";
import { eq, and, lte, sql } from "drizzle-orm";
import { billingRecoveryService } from "../services/billing-recovery";
import { paymentUpdateTokenService } from "../services/payment-update-token";
import { billingAuditLogger } from "../billingAuditLogger";
import { getStripeClient } from "../stripeClient";

const MAINTENANCE_INTERVAL_MS = 1 * 60 * 60 * 1000;

let schedulerTimer: ReturnType<typeof setInterval> | null = null;

async function runMaintenanceForAllGyms(): Promise<void> {
  console.log("[billing-maintenance] Scheduled maintenance run starting...");

  let gyms: { id: number; name: string }[];
  try {
    gyms = await db
      .select({ id: gymsTable.id, name: gymsTable.name })
      .from(gymsTable);
  } catch (err: any) {
    console.error("[billing-maintenance] Failed to fetch gyms:", err.message);
    return;
  }

  if (gyms.length === 0) {
    console.log("[billing-maintenance] No gyms found, skipping.");
    return;
  }

  let totalTokensCleaned = 0;
  let totalRecoveriesArchived = 0;
  let totalGraceEscalated = 0;
  let totalAutoSuspended = 0;
  let totalHoldsActivated = 0;
  let totalHoldsEnded = 0;
  let totalErrors = 0;

  for (const gym of gyms) {
    try {
      const [tokensCleaned, recoveriesArchived] = await Promise.all([
        paymentUpdateTokenService.cleanupExpiredTokens(gym.id),
        billingRecoveryService.archiveOldResolvedRecoveries(gym.id),
      ]);

      const graceResult = await billingRecoveryService.evaluateGraceDeadlines(gym.id);
      const suspensionResult = await billingRecoveryService.evaluateAutoSuspensions(gym.id);
      const holdResult = await processScheduledHolds(gym.id);

      totalTokensCleaned += tokensCleaned;
      totalRecoveriesArchived += recoveriesArchived;
      totalGraceEscalated += graceResult.escalated;
      totalAutoSuspended += suspensionResult.suspended;
      totalHoldsActivated += holdResult.activated;
      totalHoldsEnded += holdResult.ended;
      totalErrors += graceResult.errors + suspensionResult.errors + holdResult.errors;

      if (tokensCleaned > 0 || recoveriesArchived > 0 || graceResult.escalated > 0 || suspensionResult.suspended > 0 || holdResult.activated > 0 || holdResult.ended > 0) {
        await billingAuditLogger.log({
          gymId: gym.id,
          action: "maintenance.scheduled_run",
          entityType: "system",
          source: "system",
          metadata: {
            tokensCleaned,
            recoveriesArchived,
            graceEscalated: graceResult.escalated,
            graceErrors: graceResult.errors,
            autoSuspended: suspensionResult.suspended,
            autoSuspendErrors: suspensionResult.errors,
            holdsActivated: holdResult.activated,
            holdsEnded: holdResult.ended,
          },
        });
      }
    } catch (err: any) {
      totalErrors++;
      console.error(`[billing-maintenance] Error processing gym ${gym.id} (${gym.name}):`, err.message);
    }
  }

  console.log(
    `[billing-maintenance] Scheduled run complete: ${gyms.length} gyms processed, ` +
    `tokens=${totalTokensCleaned}, archived=${totalRecoveriesArchived}, ` +
    `escalated=${totalGraceEscalated}, auto_suspended=${totalAutoSuspended}, holds_started=${totalHoldsActivated}, holds_ended=${totalHoldsEnded}, errors=${totalErrors}`
  );
}

async function processScheduledHolds(gymId: number): Promise<{ activated: number; ended: number; errors: number }> {
  let activated = 0, ended = 0, errors = 0;
  const today = new Date().toISOString().split("T")[0];

  try {
    const holdsToActivate = await db.select().from(scheduledHoldsTable)
      .where(and(
        eq(scheduledHoldsTable.gymId, gymId),
        eq(scheduledHoldsTable.status, "scheduled"),
        lte(scheduledHoldsTable.startDate, today)
      ));

    for (const hold of holdsToActivate) {
      try {
        await db.update(scheduledHoldsTable).set({ status: "active", activatedAt: new Date() })
          .where(eq(scheduledHoldsTable.id, hold.id));

        const [sub] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.id, hold.subscriptionId));
        if (sub?.stripeSubscriptionId) {
          const stripe = await getStripeClient();
          await stripe.subscriptions.update(sub.stripeSubscriptionId, { pause_collection: { behavior: "void" } });
        }
        await db.update(subscriptionsTable).set({ status: "on_hold" }).where(eq(subscriptionsTable.id, hold.subscriptionId));
        await db.update(membersTable).set({ status: "hold" }).where(eq(membersTable.id, hold.memberId));
        activated++;

        await billingAuditLogger.log({
          gymId, memberId: hold.memberId,
          action: "hold.auto_activated", entityType: "hold", entityId: String(hold.id), source: "system",
        });
      } catch (err: any) {
        errors++;
        console.error(`[billing-maintenance] Error activating hold ${hold.id}:`, err.message);
      }
    }

    const holdsToEnd = await db.select().from(scheduledHoldsTable)
      .where(and(
        eq(scheduledHoldsTable.gymId, gymId),
        eq(scheduledHoldsTable.status, "active"),
        sql`${scheduledHoldsTable.endDate} IS NOT NULL AND ${scheduledHoldsTable.endDate} <= ${today}`
      ));

    for (const hold of holdsToEnd) {
      try {
        await db.update(scheduledHoldsTable).set({ status: "completed", endedAt: new Date() })
          .where(eq(scheduledHoldsTable.id, hold.id));

        const [sub] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.id, hold.subscriptionId));
        if (sub?.stripeSubscriptionId) {
          const stripe = await getStripeClient();
          await stripe.subscriptions.update(sub.stripeSubscriptionId, { pause_collection: null });
        }
        await db.update(subscriptionsTable).set({ status: "active" }).where(eq(subscriptionsTable.id, hold.subscriptionId));
        await db.update(membersTable).set({ status: "active" }).where(eq(membersTable.id, hold.memberId));
        ended++;

        await billingAuditLogger.log({
          gymId, memberId: hold.memberId,
          action: "hold.auto_completed", entityType: "hold", entityId: String(hold.id), source: "system",
        });
      } catch (err: any) {
        errors++;
        console.error(`[billing-maintenance] Error ending hold ${hold.id}:`, err.message);
      }
    }
  } catch (err: any) {
    errors++;
    console.error(`[billing-maintenance] Error processing holds for gym ${gymId}:`, err.message);
  }

  return { activated, ended, errors };
}

export function startBillingMaintenanceScheduler(): void {
  if (schedulerTimer) {
    console.warn("[billing-maintenance] Scheduler already running, skipping duplicate start.");
    return;
  }

  console.log(`[billing-maintenance] Scheduler started (interval: ${MAINTENANCE_INTERVAL_MS / 3600000}h)`);

  schedulerTimer = setInterval(() => {
    runMaintenanceForAllGyms().catch((err) => {
      console.error("[billing-maintenance] Unhandled error in scheduled run:", err.message);
    });
  }, MAINTENANCE_INTERVAL_MS);

  setTimeout(() => {
    runMaintenanceForAllGyms().catch((err) => {
      console.error("[billing-maintenance] Unhandled error in initial run:", err.message);
    });
  }, 30_000);
}

export function stopBillingMaintenanceScheduler(): void {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
    console.log("[billing-maintenance] Scheduler stopped.");
  }
}

export { runMaintenanceForAllGyms, MAINTENANCE_INTERVAL_MS };
