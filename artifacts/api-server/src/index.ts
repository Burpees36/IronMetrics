import { initStripe } from "./stripeClient";
import app from "./app";
import { startBillingMaintenanceScheduler } from "./schedulers/billing-maintenance";
import { startRetentionEngineScheduler } from "./schedulers/retention-engine";
import { startWodifySyncScheduler } from "./schedulers/wodify-sync";
import { startAiTaskScheduler } from "./schedulers/ai-task-scheduler";
import { startRsiSnapshotScheduler } from "./schedulers/rsi-snapshots";
import { startBenchmarkScheduler } from "./schedulers/benchmark-scheduler";
import { startAutopilotDigestScheduler } from "./schedulers/autopilot-digest-scheduler";
import { startAutoPublishScheduler } from "./schedulers/auto-publish-scheduler";
import { startLeadSequenceScheduler } from "./schedulers/lead-sequence-scheduler";
import { startAppointmentReminders } from "./schedulers/appointment-reminders";
import { startBriefingScheduler } from "./schedulers/briefing-scheduler";
import { runOnboardingMigrationCleanup } from "./migrations/onboarding-cleanup";

const REQUIRED_ENV_VARS = [
  "PORT",
  "DATABASE_URL",
  "STRIPE_SECRET_KEY",
  "STRIPE_PUBLISHABLE_KEY",
  "RESEND_API_KEY",
] as const;

const missing = REQUIRED_ENV_VARS.filter((v) => !process.env[v]);
if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missing.join(", ")}. ` +
    "The server cannot start without these. Please set them before running.",
  );
}

const rawPort = process.env["PORT"]!;
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function main() {
  try {
    await initStripe();
  } catch (err: any) {
    console.error("Stripe initialization failed (non-fatal):", err.message);
    console.log("Server will start without Stripe features.");
  }

  await runOnboardingMigrationCleanup();

  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
    startBillingMaintenanceScheduler();
    startRetentionEngineScheduler();
    startWodifySyncScheduler();
    startAiTaskScheduler();
    startRsiSnapshotScheduler();
    startBenchmarkScheduler();
    startAutopilotDigestScheduler();
    startAutoPublishScheduler();
    startLeadSequenceScheduler();
    startAppointmentReminders();
    startBriefingScheduler();
  });
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
