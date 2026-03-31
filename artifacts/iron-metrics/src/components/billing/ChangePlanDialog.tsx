import React, { useState, useEffect } from "react";
import { useGym } from "@/store/GymContext";
import {
  useChangePlan, usePreviewPlanChange, useListMembershipPlans,
  getGetMemberBillingHistoryQueryKey, getListSubscriptionsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function formatPrice(price: number, interval?: string) {
  const f = `$${price.toFixed(2)}`;
  if (!interval || interval === "one_time") return f;
  const labels: Record<string, string> = { monthly: "/mo", quarterly: "/qtr", annual: "/yr" };
  return `${f}${labels[interval] || ""}`;
}

interface Props {
  open: boolean;
  onClose: () => void;
  subscription: { id: number; planId: number; planName: string; amount: number; memberId: number };
}

export function ChangePlanDialog({ open, onClose, subscription }: Props) {
  const { activeGymId } = useGym();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [timing, setTiming] = useState<"immediate" | "next_cycle">("immediate");
  const [preview, setPreview] = useState<any>(null);

  const { data: plans } = useListMembershipPlans(activeGymId || 0, { query: { enabled: !!activeGymId } });
  const previewMutation = usePreviewPlanChange();
  const changeMutation = useChangePlan();

  const eligiblePlans = (plans || []).filter(
    (p: any) => p.id !== subscription.planId && p.isActive && p.billingInterval !== "one_time"
  );

  useEffect(() => {
    if (!selectedPlanId || !activeGymId) { setPreview(null); return; }
    previewMutation.mutate(
      { gymId: activeGymId, subscriptionId: subscription.id, data: { newPlanId: parseInt(selectedPlanId, 10) } },
      { onSuccess: (data: any) => setPreview(data), onError: () => setPreview(null) }
    );
  }, [selectedPlanId, activeGymId]);

  const handleConfirm = () => {
    if (!activeGymId || !selectedPlanId) return;
    changeMutation.mutate(
      {
        gymId: activeGymId, subscriptionId: subscription.id,
        data: { newPlanId: parseInt(selectedPlanId, 10), timing },
      },
      {
        onSuccess: (data: any) => {
          toast({ title: "Plan Changed", description: `Switched from ${data.oldPlan} to ${data.newPlan} (${timing === "immediate" ? "effective now" : "next billing cycle"})` });
          queryClient.invalidateQueries({ queryKey: getGetMemberBillingHistoryQueryKey(activeGymId, subscription.memberId) });
          queryClient.invalidateQueries({ queryKey: getListSubscriptionsQueryKey(activeGymId) });
          onClose();
        },
        onError: (err: any) => toast({ title: "Error", description: err?.message || "Failed to change plan", variant: "destructive" }),
      }
    );
  };

  const selectedPlan = eligiblePlans.find((p: any) => p.id === parseInt(selectedPlanId, 10));
  const isUpgrade = selectedPlan && selectedPlan.price > subscription.amount;

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md bg-[hsl(220,20%,12%)] border-white/10 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpDown className="w-5 h-5 text-primary" />
            Change Plan
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="p-3 rounded-lg bg-white/5 border border-white/10">
            <div className="text-xs text-white/50 mb-1">Current Plan</div>
            <div className="font-medium">{subscription.planName}</div>
            <div className="text-primary text-sm">{formatPrice(subscription.amount)}</div>
          </div>

          <div>
            <Label className="text-white/70">New Plan</Label>
            <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1">
                <SelectValue placeholder="Select a plan" />
              </SelectTrigger>
              <SelectContent className="bg-[hsl(220,20%,15%)] border-white/10">
                {eligiblePlans.map((p: any) => (
                  <SelectItem key={p.id} value={String(p.id)} className="text-white focus:bg-white/10 focus:text-white">
                    {p.name} — {formatPrice(p.price, p.billingInterval)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedPlan && (
            <div className="flex items-center gap-2 text-sm">
              {isUpgrade ? (
                <><ArrowUp className="w-4 h-4 text-green-400" /><span className="text-green-400">Upgrade</span></>
              ) : (
                <><ArrowDown className="w-4 h-4 text-blue-400" /><span className="text-blue-400">Downgrade</span></>
              )}
              <span className="text-white/50">to {formatPrice(selectedPlan.price, selectedPlan.billingInterval)}</span>
            </div>
          )}

          <div>
            <Label className="text-white/70">When to apply</Label>
            <Select value={timing} onValueChange={(v) => setTiming(v as any)}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[hsl(220,20%,15%)] border-white/10">
                <SelectItem value="immediate" className="text-white focus:bg-white/10 focus:text-white">Immediately (with proration)</SelectItem>
                <SelectItem value="next_cycle" className="text-white focus:bg-white/10 focus:text-white">Next billing cycle</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {preview && timing === "immediate" && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="text-xs text-primary mb-2 font-medium">Proration Preview</div>
              {preview.immediateCharge > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Charge now</span>
                  <span className="text-white">${preview.immediateCharge.toFixed(2)}</span>
                </div>
              )}
              {preview.credit > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Credit applied</span>
                  <span className="text-green-400">-${preview.credit.toFixed(2)}</span>
                </div>
              )}
              {preview.prorationAmount !== null && (
                <div className="flex justify-between text-sm mt-1 pt-1 border-t border-white/10">
                  <span className="text-white/70">Net amount</span>
                  <span className="font-medium text-white">${preview.prorationAmount.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <button onClick={onClose} className="px-4 py-2 text-sm text-white/60 hover:text-white">Cancel</button>
          <button
            onClick={handleConfirm}
            disabled={!selectedPlanId || changeMutation.isPending}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
          >
            {changeMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirm Change
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
