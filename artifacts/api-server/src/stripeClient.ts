import Stripe from "stripe";
import { StripeSync, runMigrations } from "stripe-replit-sync";

let stripeInstance: Stripe | null = null;
let stripeSyncInstance: StripeSync | null = null;

function getStripeSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY environment variable is required.");
  }
  return key;
}

export async function getUncachableStripeClient(): Promise<Stripe> {
  return new Stripe(getStripeSecretKey());
}

export async function getStripeClient(): Promise<Stripe> {
  if (!stripeInstance) {
    stripeInstance = new Stripe(getStripeSecretKey());
  }
  return stripeInstance;
}

export async function getStripeSync(): Promise<StripeSync> {
  if (!stripeSyncInstance) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL environment variable is required for Stripe sync.");
    }
    stripeSyncInstance = new StripeSync({
      stripeSecretKey: getStripeSecretKey(),
      stripeAccountId: process.env.STRIPE_ACCOUNT_ID || undefined,
      poolConfig: { connectionString: databaseUrl },
    });
  }
  return stripeSyncInstance;
}

export async function getPublishableKey(): Promise<string> {
  const key = process.env.STRIPE_PUBLISHABLE_KEY;
  if (!key) {
    throw new Error("STRIPE_PUBLISHABLE_KEY environment variable is required.");
  }
  return key;
}

export async function initStripe(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required for Stripe integration.");
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.warn("STRIPE_SECRET_KEY not set — Stripe features will be unavailable.");
    return;
  }

  console.log("Initializing Stripe schema...");
  await runMigrations({ databaseUrl, schema: "stripe" } as any);
  console.log("Stripe schema ready");

  const stripeSync = await getStripeSync();

  console.log("Setting up managed webhook...");
  const domains = process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN || "";
  const webhookBaseUrl = `https://${domains.split(",")[0]}`;
  try {
    const result = await stripeSync.findOrCreateManagedWebhook(
      `${webhookBaseUrl}/api/stripe/webhook`
    );
    console.log("Webhook configured:", (result as any)?.webhook?.url || "setup complete");
  } catch (err: any) {
    console.warn("Webhook setup warning (non-fatal):", err.message);
  }

  console.log("Syncing Stripe data...");
  stripeSync.syncBackfill()
    .then(() => console.log("Stripe data synced"))
    .catch((err: any) => console.error("Error syncing Stripe data:", err.message));

  console.log("Ensuring platform products/prices exist...");
  const { ensurePlatformProducts } = await import("./platformStripeService");
  ensurePlatformProducts()
    .then(() => console.log("Platform products/prices ready"))
    .catch((err: any) => console.warn("Platform product setup warning:", err.message));
}
