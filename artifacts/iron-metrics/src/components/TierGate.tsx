import React from "react";
import { useGymTier } from "@/hooks/useGymTier";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { Loader2 } from "lucide-react";

interface TierGateProps {
  routeGroup: string;
  feature: string;
  requiredTier?: "growth" | "pro";
  children: React.ReactNode;
}

export function TierGate({ routeGroup, feature, requiredTier = "growth", children }: TierGateProps) {
  const { canAccess, isLoading } = useGymTier();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!canAccess(routeGroup)) {
    return <UpgradePrompt feature={feature} requiredTier={requiredTier} />;
  }

  return <>{children}</>;
}
