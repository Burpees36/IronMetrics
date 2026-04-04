/**
 * @module tierConfig
 * Single source of truth for subscription tier definitions.
 * Used by backend middleware and served to the frontend for gating.
 *
 * Tiers:
 *   - insights ($99/mo): Dashboard, Intelligence, Billing, Retention, AI Operator, Resources, Settings
 *   - growth ($199/mo): Everything in Insights + Members, Leads, Schedule, Workouts, Staff
 *   - pro ($299/mo): Everything in Growth + AI email automation, cohort analytics, revenue forecasting
 *   - none: no access (needs to select a plan)
 *   - beta: full pro access, no payment required
 */

export type SubscriptionTier = "none" | "insights" | "growth" | "pro";

export interface TierDefinition {
  id: SubscriptionTier;
  name: string;
  price: number;
  description: string;
  features: string[];
  allowedRouteGroups: string[];
}

export const ROUTE_GROUPS = {
  insights: [
    "dashboard",
    "intelligence",
    "insights",
    "billing",
    "retention",
    "ai",
    "resources",
    "settings",
    "recommendations",
    "communications",
    "documents",
    "knowledge",
    "reports",
    "onboarding",
    "lead-capture-config",
    "retail",
  ],
  growth: [
    "members",
    "leads",
    "schedule",
    "classes",
    "workouts",
    "programming",
    "attendance",
    "staff",
  ],
  pro: [
    "class-templates",
    "advanced-analytics",
    "ai-email-automation",
    "revenue-forecasting",
  ],
} as const;

const ALL_ROUTE_GROUPS = [
  ...ROUTE_GROUPS.insights,
  ...ROUTE_GROUPS.growth,
  ...ROUTE_GROUPS.pro,
];

export const TIER_DEFINITIONS: TierDefinition[] = [
  {
    id: "insights",
    name: "Insights",
    price: 99,
    description: "Financial intelligence for gyms still using Wodify",
    features: [
      "Dashboard & analytics",
      "Intelligence Hub (RSI, Risk Radar)",
      "AI Operator",
      "Billing & billing recovery",
      "Retention analytics",
      "Resources & recommendation engine",
      "Settings & configuration",
    ],
    allowedRouteGroups: ROUTE_GROUPS.insights as unknown as string[],
  },
  {
    id: "growth",
    name: "Growth",
    price: 199,
    description: "Full Wodify replacement with complete gym management",
    features: [
      "Everything in Insights",
      "Member management",
      "Leads pipeline",
      "Class scheduling",
      "Workouts & programming",
      "Attendance tracking",
      "Staff management",
    ],
    allowedRouteGroups: [
      ...ROUTE_GROUPS.insights,
      ...ROUTE_GROUPS.growth,
    ] as string[],
  },
  {
    id: "pro",
    name: "Pro",
    price: 299,
    description: "Premium tier with AI-powered automation and advanced analytics",
    features: [
      "Everything in Growth",
      "AI-powered email automation (gym-branded sending)",
      "Advanced cohort analytics",
      "Revenue forecasting",
      "Class templates & copy-week scheduling shortcuts",
    ],
    allowedRouteGroups: ALL_ROUTE_GROUPS,
  },
];

export function getTierDefinition(tier: SubscriptionTier): TierDefinition | undefined {
  return TIER_DEFINITIONS.find((t) => t.id === tier);
}

export function isRouteGroupAllowed(
  tier: SubscriptionTier,
  isBetaAccess: boolean,
  routeGroup: string
): boolean {
  if (isBetaAccess) return true;

  const def = getTierDefinition(tier);
  if (!def) return false;

  return def.allowedRouteGroups.includes(routeGroup);
}

export const GATED_ROUTE_GROUPS: Record<string, SubscriptionTier> = {
  members: "growth",
  leads: "growth",
  schedule: "growth",
  classes: "growth",
  workouts: "growth",
  programming: "growth",
  attendance: "growth",
  staff: "growth",
  "class-templates": "pro",
  "advanced-analytics": "pro",
  "ai-email-automation": "pro",
  "revenue-forecasting": "pro",
};

let _cachedPriceIds: Record<SubscriptionTier, string> | null = null;
let _priceIdToTier: Record<string, SubscriptionTier> | null = null;

export function setCachedPriceIds(priceIds: Record<SubscriptionTier, string>): void {
  _cachedPriceIds = priceIds;
  _priceIdToTier = Object.fromEntries(
    Object.entries(priceIds).map(([tier, priceId]) => [priceId, tier as SubscriptionTier])
  );
}

export function getCachedPriceIds(): Record<SubscriptionTier, string> | null {
  return _cachedPriceIds;
}

export function getTierFromPriceId(priceId: string): SubscriptionTier | null {
  return _priceIdToTier?.[priceId] || null;
}
