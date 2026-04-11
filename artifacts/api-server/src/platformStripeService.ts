/**
 * @module platformStripeService
 * Manages Stripe products, prices, and subscriptions for the
 * ForgeOS PLATFORM billing (gym-as-customer), separate from
 * the member billing handled by stripeService.ts.
 */
import Stripe from "stripe";
import { getUncachableStripeClient } from "./stripeClient";
import { db, gymsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { TIER_DEFINITIONS, setCachedPriceIds, type SubscriptionTier } from "./tierConfig";

export async function ensurePlatformProducts(): Promise<Record<SubscriptionTier, string>> {
  const stripe = await getUncachableStripeClient();

  const existingProducts = await stripe.products.list({ limit: 100, active: true });
  const existingPrices = await stripe.prices.list({ limit: 100, active: true });

  const priceIds: Partial<Record<SubscriptionTier, string>> = {};

  for (const tier of TIER_DEFINITIONS) {
    const productMetaKey = `iron_metrics_platform_${tier.id}`;

    let product = existingProducts.data.find(
      (p) => p.metadata?.iron_metrics_platform_tier === tier.id
    );

    if (!product) {
      product = await stripe.products.create({
        name: `ForgeOS — ${tier.name}`,
        description: tier.description,
        metadata: {
          iron_metrics_platform_tier: tier.id,
          iron_metrics_platform: "true",
        },
      });
      console.log(`[PLATFORM] Created Stripe product for tier: ${tier.id}`);
    }

    let price = existingPrices.data.find(
      (p) =>
        p.product === product!.id &&
        p.unit_amount === tier.price * 100 &&
        p.recurring?.interval === "month"
    );

    if (!price) {
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: tier.price * 100,
        currency: "usd",
        recurring: { interval: "month" },
        metadata: {
          iron_metrics_platform_tier: tier.id,
          iron_metrics_platform: "true",
        },
      });
      console.log(`[PLATFORM] Created Stripe price for tier: ${tier.id} ($${tier.price}/mo)`);
    }

    priceIds[tier.id] = price.id;
  }

  const finalPriceIds = priceIds as Record<SubscriptionTier, string>;
  setCachedPriceIds(finalPriceIds);
  console.log("[PLATFORM] Price IDs cached:", finalPriceIds);
  return finalPriceIds;
}

export async function getOrCreateGymCustomer(gymId: number): Promise<string> {
  const [gym] = await db.select().from(gymsTable).where(eq(gymsTable.id, gymId));
  if (!gym) throw new Error("Gym not found");

  if (gym.stripeGymCustomerId) return gym.stripeGymCustomerId;

  const stripe = await getUncachableStripeClient();
  const customer = await stripe.customers.create({
    email: gym.email || undefined,
    name: gym.name,
    metadata: { gymId: String(gymId), iron_metrics_platform: "true" },
  });

  await db.update(gymsTable)
    .set({ stripeGymCustomerId: customer.id })
    .where(eq(gymsTable.id, gymId));

  return customer.id;
}

export async function createPlatformCheckoutSession(
  gymId: number,
  tier: SubscriptionTier,
  successUrl: string,
  cancelUrl: string
): Promise<{ url: string; isPortalRedirect?: boolean }> {
  const [gym] = await db.select({
    platformSubscriptionId: gymsTable.platformSubscriptionId,
    platformCancelAtPeriodEnd: gymsTable.platformCancelAtPeriodEnd,
  }).from(gymsTable).where(eq(gymsTable.id, gymId));

  if (!gym) throw new Error("Gym not found");

  if (gym.platformSubscriptionId && !gym.platformCancelAtPeriodEnd) {
    const portalSession = await createPlatformBillingPortalSession(gymId, successUrl);
    return { url: portalSession.url, isPortalRedirect: true };
  }

  const stripe = await getUncachableStripeClient();
  const customerId = await getOrCreateGymCustomer(gymId);
  const priceIds = await ensurePlatformProducts();
  const priceId = priceIds[tier];

  if (!priceId) throw new Error(`No price found for tier: ${tier}`);

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      gymId: String(gymId),
      tier,
      iron_metrics_platform: "true",
    },
    subscription_data: {
      metadata: {
        gymId: String(gymId),
        tier,
        iron_metrics_platform: "true",
      },
    },
    allow_promotion_codes: false,
  });

  return { url: session.url! };
}

export async function createPlatformBillingPortalSession(
  gymId: number,
  returnUrl: string
): Promise<{ url: string }> {
  const stripe = await getUncachableStripeClient();
  const customerId = await getOrCreateGymCustomer(gymId);

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return { url: session.url };
}

export async function cancelPlatformSubscription(gymId: number): Promise<void> {
  const [gym] = await db.select().from(gymsTable).where(eq(gymsTable.id, gymId));
  if (!gym) throw new Error("Gym not found");
  if (!gym.platformSubscriptionId) throw new Error("No active platform subscription");

  const stripe = await getUncachableStripeClient();
  await stripe.subscriptions.update(gym.platformSubscriptionId, {
    cancel_at_period_end: true,
  });

  await db.update(gymsTable)
    .set({ platformCancelAtPeriodEnd: true })
    .where(eq(gymsTable.id, gymId));
}
