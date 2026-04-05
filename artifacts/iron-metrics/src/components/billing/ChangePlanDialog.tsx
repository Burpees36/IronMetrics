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
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpDown className="w-5 h-5 text-primary" />
            Change Plan
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="p-3 rounded-lg bg-muted/20 border border-border">
            <div className="text-xs text-muted-foreground mb-1">Current Plan</div>
            <div className="font-medium text-foreground">{subscription.planName}</div>
            <div className="text-primary text-sm">{formatPrice(subscription.amount)}</div>
          </div>

          <div>
            <Label>New Plan</Label>
            <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select a plan" />
              </SelectTrigger>
              <SelectContent>
                {eligiblePlans.map((p: any) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name} — {formatPrice(p.price, p.billingInterval)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedPlan && (
            <div className="flex items-center gap-2 text-sm">
              {isUpgrade ? (
                <><ArrowUp className="w-4 h-4 text-emerald-600" /><span className="text-emerald-600">Upgrade</span></>
              ) : (
                <><ArrowDown className="w-4 h-4 text-blue-600" /><span className="text-blue-600">Downgrade</span></>
              )}
              <span className="text-muted-foreground">to {formatPrice(selectedPlan.price, selectedPlan.billingInterval)}</span>
            </div>
          )}

          <div>
            <Label>When to apply</Label>
            <Select value={timing} onValueChange={(v) => setTiming(v as any)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">Immediately (with proration)</SelectItem>
                <SelectItem value="next_cycle">Next billing cycle</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {preview && timing === "immediate" && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="text-xs text-primary mb-2 font-medium">Proration Preview</div>
              {preview.immediateCharge > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Charge now</span>
                  <span className="text-foreground">${preview.immediateCharge.toFixed(2)}</span>
                </div>
              )}
              {preview.credit > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Credit applied</span>
                  <span className="text-emerald-600">-${preview.credit.toFixed(2)}</span>
                </div>
              )}
              {preview.prorationAmount !== null && (
                <div className="flex justify-between text-sm mt-1 pt-1 border-t border-border">
                  <span className="text-muted-foreground">Net amount</span>
                  <span className="font-medium text-foreground">${preview.prorationAmount.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <button onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
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
