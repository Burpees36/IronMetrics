import { useQuery } from "@tanstack/react-query";
import { useGym } from "@/store/GymContext";

const API_BASE = import.meta.env.VITE_API_URL || "";

interface TierDefinition {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  allowedRouteGroups: string[];
}

interface GymTierInfo {
  subscriptionTier: string;
  isBetaAccess: boolean;
  platformCancelAtPeriodEnd: boolean;
  tierDefinition: TierDefinition | null;
  tiers: TierDefinition[];
}

async function fetchGymTier(gymId: number): Promise<GymTierInfo> {
  const res = await fetch(`${API_BASE}/api/gyms/${gymId}/platform-billing`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch tier info");
  return res.json();
}

export function useGymTier() {
  const { activeGymId } = useGym();

  const { data, isLoading } = useQuery({
    queryKey: ["gym-tier", activeGymId],
    queryFn: () => fetchGymTier(activeGymId!),
    enabled: !!activeGymId,
    staleTime: 60_000,
    retry: false,
  });

  const tier = data?.subscriptionTier || "none";
  const isBeta = data?.isBetaAccess || false;
  const allowedRouteGroups = data?.tierDefinition?.allowedRouteGroups || [];

  function canAccess(routeGroup: string): boolean {
    if (isBeta) return true;
    if (tier === "none") return false;
    return allowedRouteGroups.includes(routeGroup);
  }

  return {
    tier,
    isBeta,
    isLoading,
    canAccess,
    cancelPending: data?.platformCancelAtPeriodEnd || false,
    tierDefinition: data?.tierDefinition || null,
    tiers: data?.tiers || [],
  };
}
