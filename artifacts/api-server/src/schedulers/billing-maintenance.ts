import { db, gymsTable } from "@workspace/db";
import { billingRecoveryService } from "../services/billing-recovery";
import { paymentUpdateTokenService } from "../services/payment-update-token";
import { billingAuditLogger } from "../billingAuditLogger";

const MAINTENANCE_INTERVAL_MS = 6 * 60 * 60 * 1000;

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
  let totalErrors = 0;

  for (const gym of gyms) {
    try {
      const [tokensCleaned, recoveriesArchived] = await Promise.all([
        paymentUpdateTokenService.cleanupExpiredTokens(gym.id),
        billingRecoveryService.archiveOldResolvedRecoveries(gym.id),
      ]);

      const graceResult = await billingRecoveryService.evaluateGraceDeadlines(gym.id);

      totalTokensCleaned += tokensCleaned;
      totalRecoveriesArchived += recoveriesArchived;
      totalGraceEscalated += graceResult.escalated;
      totalErrors += graceResult.errors;

      if (tokensCleaned > 0 || recoveriesArchived > 0 || graceResult.escalated > 0) {
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
    `escalated=${totalGraceEscalated}, errors=${totalErrors}`
  );
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
