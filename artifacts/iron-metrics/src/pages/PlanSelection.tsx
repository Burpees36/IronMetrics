import React, { useState } from "react";
import { useGym } from "@/store/GymContext";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Check, Dumbbell, Loader2, Zap, TrendingUp, Crown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useGymTier } from "@/hooks/useGymTier";

const API_BASE = import.meta.env.VITE_API_URL || "";

interface TierVisualConfig {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
  popular?: boolean;
}

const TIER_VISUAL: Record<string, TierVisualConfig> = {
  insights: {
    icon: Zap,
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
    borderColor: "border-blue-400/30",
  },
  growth: {
    icon: TrendingUp,
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/30",
    popular: true,
  },
  pro: {
    icon: Crown,
    color: "text-violet-400",
    bgColor: "bg-violet-400/10",
    borderColor: "border-violet-400/30",
  },
};

export function PlanSelection() {
  const { activeGymId } = useGym();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const { tiers: apiTiers, isLoading: tiersLoading } = useGymTier();

  const handleSelect = async (tierId: string) => {
    if (!activeGymId) return;
    setLoading(tierId);

    try {
      const baseUrl = window.location.origin;
      const res = await fetch(`${API_BASE}/api/gyms/${activeGymId}/platform-billing/checkout`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: tierId,
          successUrl: `${baseUrl}/onboarding?subscribed=1`,
          cancelUrl: `${baseUrl}/plan-selection`,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Failed to create checkout" }));
        throw new Error(body.error || "Failed to create checkout session");
      }

      const { url } = await res.json();
      window.location.href = url;
    } catch (err: any) {
      toast({
        title: "Checkout failed",
        description: err.message || "Could not start checkout. Please try again.",
        variant: "destructive",
      });
      setLoading(null);
    }
  };

  if (!activeGymId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Select a gym first.</p>
      </div>
    );
  }

  if (tiersLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[80vh]">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <Dumbbell className="h-8 w-8 text-primary" />
            <span className="font-display font-bold text-2xl tracking-tight text-foreground">
              IRON<span className="text-primary">METRICS</span>
            </span>
          </div>
          <h1 className="text-4xl font-display font-bold text-foreground mb-4">
            Choose your plan
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Start with the plan that fits your gym. Upgrade or downgrade anytime from Settings.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(apiTiers.length > 0 ? apiTiers : []).map((apiTier, i) => {
            const visual = TIER_VISUAL[apiTier.id];
            const Icon = visual?.icon ?? Zap;
            const isLoading = loading === apiTier.id;
            const isPopular = visual?.popular ?? false;
            return (
              <motion.div
                key={apiTier.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`relative bg-card border rounded-2xl p-6 flex flex-col ${
                  isPopular
                    ? "border-primary/50 shadow-lg shadow-primary/10"
                    : "border-border"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground text-xs px-3 py-1">
                      Most Popular
                    </Badge>
                  </div>
                )}

                <div className={`h-12 w-12 ${visual?.bgColor ?? "bg-primary/10"} rounded-xl flex items-center justify-center mb-4`}>
                  <Icon className={`h-6 w-6 ${visual?.color ?? "text-primary"}`} />
                </div>

                <h2 className="text-xl font-semibold text-foreground mb-1">{apiTier.name}</h2>
                <p className="text-sm text-muted-foreground mb-4">{apiTier.description}</p>

                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold text-foreground">${apiTier.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>

                <ul className="space-y-2 mb-8 flex-1">
                  {apiTier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleSelect(apiTier.id)}
                  disabled={!!loading}
                  className={`w-full ${
                    isPopular
                      ? ""
                      : "variant-outline bg-secondary hover:bg-secondary/80 text-foreground border border-border"
                  }`}
                  variant={isPopular ? "default" : "outline"}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ArrowRight className="h-4 w-4 mr-2" />
                  )}
                  {isLoading ? "Redirecting..." : `Get ${apiTier.name}`}
                </Button>
              </motion.div>
            );
          })}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-sm text-muted-foreground mt-8"
        >
          Secure payments powered by Stripe. Cancel anytime from Settings.
        </motion.p>
      </div>
    </div>
  );
}
