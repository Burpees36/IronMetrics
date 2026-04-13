import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CreditCard, Zap, TrendingUp, Crown, ExternalLink, AlertCircle, CheckCircle2, Loader2, Calendar, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGym } from "@/store/GymContext";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

import { authFetch } from "@/lib/authFetch";

const API_BASE = import.meta.env.VITE_API_URL || "";

interface PlatformBillingInfo {
  subscriptionTier: string;
  isBetaAccess: boolean;
  platformSubscriptionId: string | null;
  platformCancelAtPeriodEnd: boolean;
  platformCurrentPeriodEnd: string | null;
  tierDefinition: {
    name: string;
    price: number;
    description: string;
  } | null;
  tiers: Array<{
    id: string;
    name: string;
    price: number;
    description: string;
    features?: string[];
  }>;
}

const TIER_ICONS: Record<string, React.ElementType> = {
  insights: Zap,
  growth: TrendingUp,
  pro: Crown,
};

const TIER_COLORS: Record<string, string> = {
  insights: "text-blue-400",
  growth: "text-primary",
  pro: "text-violet-400",
};

async function apiFetchLocal(path: string, options?: RequestInit) {
  const headers = new Headers(options?.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await authFetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(body.error || "Request failed");
  }
  return res.json();
}

export function PlatformBillingSettings() {
  const { activeGymId } = useGym();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [data, setData] = useState<PlatformBillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    if (!activeGymId) return;
    setLoading(true);
    apiFetchLocal(`/api/gyms/${activeGymId}/platform-billing`)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeGymId]);

  const handleManage = async () => {
    if (!activeGymId) return;
    setPortalLoading(true);
    try {
      const baseUrl = window.location.origin;
      const { url } = await apiFetchLocal(`/api/gyms/${activeGymId}/platform-billing/portal`, {
        method: "POST",
        body: JSON.stringify({ returnUrl: `${baseUrl}/settings` }),
      });
      window.location.href = url;
    } catch (err: any) {
      toast({
        title: "Could not open billing portal",
        description: err.message,
        variant: "destructive",
      });
      setPortalLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!activeGymId) return;
    if (!confirm("Cancel your subscription? You'll keep access until the end of the current billing period.")) return;
    setCancelLoading(true);
    try {
      await apiFetchLocal(`/api/gyms/${activeGymId}/platform-billing/cancel`, { method: "POST" });
      toast({
        title: "Subscription cancellation scheduled",
        description: "Your access will continue until the end of the current billing period.",
      });
      const updated = await apiFetchLocal(`/api/gyms/${activeGymId}/platform-billing`);
      setData(updated);
    } catch (err: any) {
      toast({
        title: "Cancellation failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setCancelLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) return null;

  const isNone = data.subscriptionTier === "none" && !data.isBetaAccess;
  const TierIcon = TIER_ICONS[data.subscriptionTier] || Zap;
  const tierColor = TIER_COLORS[data.subscriptionTier] || "text-primary";

  const periodEnd = data.platformCurrentPeriodEnd
    ? new Date(data.platformCurrentPeriodEnd).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="space-y-6">
      {isNone && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 bg-muted rounded-xl flex items-center justify-center shrink-0">
              <CreditCard className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground mb-1">No Active Subscription</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Choose a plan to unlock ForgeOS features for your business.
              </p>
              <Button onClick={() => setLocation("/plan-selection")}>
                <ArrowUpRight className="h-4 w-4 mr-2" />
                View Plans
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {data.isBetaAccess && (() => {
        const proTier = data.tiers.find(t => t.id === "pro");
        return (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-primary/30 rounded-2xl p-6 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Beta Access — Full Pro</h3>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Beta</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Your gym has complimentary beta access with full Pro-tier features. No payment required.
            </p>

            {proTier?.features && proTier.features.length > 0 && (
              <div className="mt-5 pt-4 border-t border-border">
                <p className="text-sm font-medium text-foreground mb-3">Included in your access:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {proTier.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        );
      })()}

      {!isNone && !data.isBetaAccess && data.tierDefinition && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <TierIcon className={`h-6 w-6 ${tierColor}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-foreground">{data.tierDefinition.name}</h3>
                  {data.platformCancelAtPeriodEnd && (
                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-xs">
                      Cancelling
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{data.tierDefinition.description}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-foreground">${data.tierDefinition.price}</p>
              <p className="text-xs text-muted-foreground">/month</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-border bg-background">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Status</p>
              {data.platformCancelAtPeriodEnd ? (
                <p className="text-sm font-semibold text-amber-500">Cancelling</p>
              ) : (
                <p className="text-sm font-semibold text-emerald-500">Active</p>
              )}
            </div>
            <div className="p-4 rounded-xl border border-border bg-background">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Billing Cycle</p>
              <p className="text-sm font-semibold text-foreground">Monthly</p>
            </div>
            <div className="p-4 rounded-xl border border-border bg-background">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                {data.platformCancelAtPeriodEnd ? "Access Until" : "Next Renewal"}
              </p>
              <p className="text-sm font-semibold text-foreground">
                {periodEnd || "—"}
              </p>
            </div>
          </div>

          {data.platformCancelAtPeriodEnd && (
            <div className="mt-4 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-start gap-3">
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-500">
                Your subscription is scheduled to cancel on {periodEnd}. After that date, your gym will be downgraded and access to paid features will be removed.
              </p>
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-border flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={handleManage}
              disabled={portalLoading}
            >
              {portalLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ExternalLink className="h-4 w-4 mr-2" />
              )}
              {data.platformCancelAtPeriodEnd ? "Manage / Reactivate" : "Upgrade or Change Plan"}
            </Button>

            {!data.platformCancelAtPeriodEnd && (
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleCancel}
                disabled={cancelLoading}
              >
                {cancelLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Cancel Subscription
              </Button>
            )}
          </div>
        </motion.div>
      )}

      {(!isNone || data.isBetaAccess) && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-card border border-border rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="text-base font-semibold text-foreground">Available Plans</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {data.isBetaAccess
              ? "ForgeOS offers three tiers. Your beta access includes full Pro features."
              : "Use the billing portal above to upgrade or downgrade between plans."}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {data.tiers.map((tier) => {
              const Icon = TIER_ICONS[tier.id] || Zap;
              const color = TIER_COLORS[tier.id] || "text-primary";
              const isCurrentTier = data.isBetaAccess ? tier.id === "pro" : tier.id === data.subscriptionTier;
              return (
                <div
                  key={tier.id}
                  className={`p-4 rounded-xl border ${
                    isCurrentTier
                      ? "border-primary/40 bg-primary/5"
                      : "border-border bg-background"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`h-4 w-4 ${color}`} />
                    <span className="text-sm font-semibold text-foreground">{tier.name}</span>
                    {isCurrentTier && (
                      <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20 ml-auto">
                        {data.isBetaAccess ? "Your Access" : "Current"}
                      </Badge>
                    )}
                  </div>
                  <p className="text-lg font-bold text-foreground">${tier.price}<span className="text-xs text-muted-foreground font-normal">/mo</span></p>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
