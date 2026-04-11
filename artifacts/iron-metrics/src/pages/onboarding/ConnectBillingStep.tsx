import React, { useState, useEffect } from "react";
import { Loader2, CreditCard, ExternalLink, CheckCircle2, ArrowUpRight, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { StepCard } from "./StepCard";
import { apiFetch } from "./types";
import type { StepProps } from "./types";

interface BillingInfo {
  subscriptionTier: string;
  isBetaAccess: boolean;
  platformSubscriptionId: string | null;
  stripeGymCustomerId: string | null;
  tierDefinition: {
    name: string;
    price: number;
    description: string;
  } | null;
}

export function ConnectBillingStep({ gymId, onComplete, onSkip, onBack, isComplete }: StepProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<BillingInfo | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const { toast } = useToast();

  const fetchBilling = async () => {
    try {
      const result = await apiFetch(`/api/gyms/${gymId}/platform-billing`);
      setData(result);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBilling(); }, [gymId]);

  const hasSubscription = data && (
    data.isBetaAccess ||
    (data.subscriptionTier !== "none" && data.platformSubscriptionId)
  );

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const baseUrl = window.location.origin;
      const { url } = await apiFetch(`/api/gyms/${gymId}/platform-billing/portal`, {
        method: "POST",
        body: JSON.stringify({ returnUrl: `${baseUrl}/onboarding` }),
      });
      window.location.href = url;
    } catch (err: unknown) {
      toast({
        title: "Could not open billing portal",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
      setPortalLoading(false);
    }
  };

  const handleViewPlans = () => {
    window.location.href = `${window.location.origin}/plan-selection`;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <StepCard
      title="Connect Billing"
      description="Set up Stripe so you can charge members for memberships and services."
      onSkip={onSkip}
      onBack={onBack}
    >
      {hasSubscription ? (
        <div className="space-y-4">
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-5 flex items-center gap-4">
            <div className="h-10 w-10 bg-green-500/20 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-400" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-green-400">
                {data?.isBetaAccess ? "Beta Access Active" : `${data?.tierDefinition?.name || "Plan"} Active`}
              </p>
              <p className="text-sm text-muted-foreground">
                {data?.isBetaAccess
                  ? "You have full Pro-tier access during beta. No payment required."
                  : `Your ${data?.tierDefinition?.name} subscription is active.`}
              </p>
            </div>
          </div>

          {!data?.isBetaAccess && (
            <Button variant="outline" onClick={handleManageBilling} disabled={portalLoading}>
              {portalLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ExternalLink className="h-4 w-4 mr-2" />
              )}
              Manage Billing
            </Button>
          )}

          <div className="flex justify-end">
            <Button onClick={onComplete}>
              Continue <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-background/50 border border-border rounded-xl p-6 text-center">
            <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No Subscription Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Choose a plan to unlock ForgeOS features and start billing your members through Stripe.
            </p>
            <Button onClick={handleViewPlans}>
              <ArrowUpRight className="h-4 w-4 mr-2" />
              View Plans
            </Button>
          </div>
        </div>
      )}
    </StepCard>
  );
}
