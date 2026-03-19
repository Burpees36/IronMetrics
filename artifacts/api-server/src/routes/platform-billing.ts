/**
 * @module platform-billing
 * API routes for Iron Metrics platform subscription management.
 * These handle the gym-as-customer billing (gym subscribing to Iron Metrics),
 * separate from the member billing handled in billing.ts.
 *
 * Routes:
 *   GET  /gyms/:gymId/platform-billing         — current plan + status (any gym role)
 *   POST /gyms/:gymId/platform-billing/checkout — create Stripe Checkout session (owner only)
 *   POST /gyms/:gymId/platform-billing/portal   — create Stripe Billing Portal session (owner only)
 *   POST /gyms/:gymId/platform-billing/cancel   — cancel at period end (owner only)
 *
 * Mutation routes are restricted to gym owners only. Non-owner staff can view
 * the current plan status but cannot modify the subscription.
 */
import { Router, type Request, type Response, type NextFunction } from "express";
import { db, gymsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  createPlatformCheckoutSession,
  createPlatformBillingPortalSession,
  cancelPlatformSubscription,
} from "../platformStripeService";
import { TIER_DEFINITIONS, type SubscriptionTier } from "../tierConfig";

function requireGymOwner(req: Request, res: Response, next: NextFunction): void {
  if (req.gymRole !== "owner") {
    res.status(403).json({
      error: "owner_required",
      message: "Only the gym owner can manage the platform subscription.",
    });
    return;
  }
  next();
}

const router = Router();

router.get("/gyms/:gymId/platform-billing", async (req, res): Promise<void> => {
  const gymId = req.gymId!;

  const [gym] = await db.select({
    subscriptionTier: gymsTable.subscriptionTier,
    isBetaAccess: gymsTable.isBetaAccess,
    platformSubscriptionId: gymsTable.platformSubscriptionId,
    platformCancelAtPeriodEnd: gymsTable.platformCancelAtPeriodEnd,
    platformCurrentPeriodEnd: gymsTable.platformCurrentPeriodEnd,
    stripeGymCustomerId: gymsTable.stripeGymCustomerId,
  }).from(gymsTable).where(eq(gymsTable.id, gymId));

  if (!gym) {
    res.status(404).json({ error: "Gym not found" });
    return;
  }

  const tierDef = TIER_DEFINITIONS.find((t) => t.id === gym.subscriptionTier);

  res.json({
    subscriptionTier: gym.subscriptionTier,
    isBetaAccess: gym.isBetaAccess,
    platformSubscriptionId: gym.platformSubscriptionId,
    platformCancelAtPeriodEnd: gym.platformCancelAtPeriodEnd,
    platformCurrentPeriodEnd: gym.platformCurrentPeriodEnd,
    tierDefinition: tierDef || null,
    tiers: TIER_DEFINITIONS,
  });
});

router.post("/gyms/:gymId/platform-billing/checkout", requireGymOwner, async (req, res): Promise<void> => {
  const gymId = req.gymId!;
  const { tier, successUrl, cancelUrl } = req.body;

  if (!tier || !["insights", "growth", "pro"].includes(tier)) {
    res.status(400).json({ error: "Invalid tier. Must be insights, growth, or pro." });
    return;
  }

  if (!successUrl || !cancelUrl) {
    res.status(400).json({ error: "successUrl and cancelUrl are required" });
    return;
  }

  try {
    const session = await createPlatformCheckoutSession(
      gymId,
      tier as SubscriptionTier,
      successUrl,
      cancelUrl
    );
    res.json(session);
  } catch (err: any) {
    console.error("[PLATFORM BILLING] Checkout error:", err.message);
    res.status(500).json({ error: err.message || "Failed to create checkout session" });
  }
});

router.post("/gyms/:gymId/platform-billing/portal", requireGymOwner, async (req, res): Promise<void> => {
  const gymId = req.gymId!;
  const { returnUrl } = req.body;

  if (!returnUrl) {
    res.status(400).json({ error: "returnUrl is required" });
    return;
  }

  try {
    const session = await createPlatformBillingPortalSession(gymId, returnUrl);
    res.json(session);
  } catch (err: any) {
    console.error("[PLATFORM BILLING] Portal error:", err.message);
    res.status(500).json({ error: err.message || "Failed to create billing portal session" });
  }
});

router.post("/gyms/:gymId/platform-billing/cancel", requireGymOwner, async (req, res): Promise<void> => {
  const gymId = req.gymId!;

  try {
    await cancelPlatformSubscription(gymId);
    res.json({ success: true, message: "Subscription will be cancelled at the end of the current billing period." });
  } catch (err: any) {
    console.error("[PLATFORM BILLING] Cancel error:", err.message);
    res.status(500).json({ error: err.message || "Failed to cancel subscription" });
  }
});

export default router;
