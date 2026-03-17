import { initStripe } from "./stripeClient";
import app from "./app";
import { startBillingMaintenanceScheduler } from "./schedulers/billing-maintenance";
import { startRetentionEngineScheduler } from "./schedulers/retention-engine";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

try {
  await initStripe();
} catch (err: any) {
  console.error("Stripe initialization failed (non-fatal):", err.message);
  console.log("Server will start without Stripe features.");
}

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  startBillingMaintenanceScheduler();
  startRetentionEngineScheduler();
});
