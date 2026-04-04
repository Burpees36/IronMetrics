import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CreditCard, Receipt, ArrowUpRight, Zap, ShieldOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useGym } from "@/store/GymContext";
import { useGetGym, useUpdateGym, getGetGymQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export function BillingSettings() {
  const { activeGymId } = useGym();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: gym } = useGetGym(activeGymId as number, { query: { enabled: !!activeGymId } });
  const updateGym = useUpdateGym();

  const [autoSuspendEnabled, setAutoSuspendEnabled] = useState(true);
  const [bufferDays, setBufferDays] = useState(3);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (gym) {
      setAutoSuspendEnabled(gym.autoSuspendEnabled ?? true);
      setBufferDays(gym.autoSuspendBufferDays ?? 3);
      setHasChanges(false);
    }
  }, [gym]);

  const handleSave = () => {
    if (!activeGymId) return;
    const clampedDays = Math.max(1, Math.min(30, bufferDays));
    updateGym.mutate(
      { gymId: activeGymId, data: { autoSuspendEnabled, autoSuspendBufferDays: clampedDays } },
      {
        onSuccess: () => {
          toast({ title: "Settings saved", description: "Auto-suspension policy updated." });
          setHasChanges(false);
          queryClient.invalidateQueries({ queryKey: getGetGymQueryKey(activeGymId) });
        },
        onError: (err: any) => {
          toast({ title: "Failed to save", description: err?.message || "An error occurred.", variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Current Plan</h3>
            </div>
            <p className="text-sm text-muted-foreground">Your subscription and billing details.</p>
          </div>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Pro</Badge>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-border bg-background">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Status</p>
            <p className="text-sm font-semibold text-emerald-500">Active</p>
          </div>
          <div className="p-4 rounded-xl border border-border bg-background">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Billing Cycle</p>
            <p className="text-sm font-semibold text-foreground">Monthly</p>
          </div>
          <div className="p-4 rounded-xl border border-border bg-background">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Next Renewal</p>
            <p className="text-sm font-semibold text-foreground">—</p>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-border">
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-foreground hover:bg-secondary transition-colors text-sm font-medium">
            <ArrowUpRight className="h-4 w-4" />
            Manage Subscription
          </button>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <ShieldOff className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Auto-Suspension Policy</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Automatically suspend members who fail to resolve payment issues after the grace period expires.
        </p>

        <div className="space-y-5">
          <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-background">
            <div>
              <p className="text-sm font-medium text-foreground">Enable Auto-Suspension</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                When enabled, members will be automatically suspended after the buffer period.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={autoSuspendEnabled}
              onClick={() => { setAutoSuspendEnabled(!autoSuspendEnabled); setHasChanges(true); }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                autoSuspendEnabled ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoSuspendEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {autoSuspendEnabled && (
            <div className="p-4 rounded-xl border border-border bg-background">
              <label className="text-sm font-medium text-foreground block mb-2">
                Post-Grace Buffer Period (days)
              </label>
              <p className="text-xs text-muted-foreground mb-3">
                After the 14-day grace period expires, how many additional days to wait before auto-suspending.
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={bufferDays}
                  onChange={(e) => {
                    setBufferDays(parseInt(e.target.value) || 3);
                    setHasChanges(true);
                  }}
                  className="w-20 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <span className="text-sm text-muted-foreground">days after grace period ends</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Total time before suspension: {14 + bufferDays} days (14 grace + {bufferDays} buffer)
              </p>
            </div>
          )}

          <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Auto-suspension pauses the member's Stripe subscription and sets their status to inactive.
              Members can be reactivated by updating their payment method, or staff can manually override.
              Full cancellation remains a manual staff decision.
            </p>
          </div>

          {hasChanges && (
            <div className="flex justify-end pt-2">
              <button
                onClick={handleSave}
                disabled={updateGym.isPending}
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {updateGym.isPending ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <CreditCard className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Payment Method</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Manage how you pay for your subscription.</p>
        <div className="p-4 rounded-xl border border-dashed border-border bg-background text-center">
          <p className="text-sm text-muted-foreground">Payment method management will be available through Stripe integration.</p>
          <button className="mt-3 text-sm text-primary hover:underline">Set Up Payment Method</button>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Receipt className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Billing History</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">View past invoices and receipts.</p>
        <div className="p-6 rounded-xl border border-dashed border-border bg-background text-center">
          <p className="text-sm text-muted-foreground">No billing history available yet.</p>
        </div>
      </motion.div>
    </div>
  );
}
