import { useState } from "react";
import { useGym } from "@/store/GymContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  getListDiscountCodesQueryOptions,
  useApplyDiscountToSubscription,
  useRemoveDiscountFromSubscription,
} from "@workspace/api-client-react";
import { Tag, X, Loader2, Plus } from "lucide-react";

interface Props {
  subscriptionId: number;
  stripeSubscriptionId?: string;
}

export function SubscriptionDiscount({ subscriptionId, stripeSubscriptionId }: Props) {
  const { activeGymId } = useGym();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showApply, setShowApply] = useState(false);
  const [selectedCode, setSelectedCode] = useState("");

  const { data: discountCodes } = useQuery({
    ...getListDiscountCodesQueryOptions(activeGymId as number),
    enabled: !!activeGymId && showApply,
  });

  const applyMutation = useApplyDiscountToSubscription();
  const removeMutation = useRemoveDiscountFromSubscription();

  const activeCodes = (discountCodes as any[])?.filter((d: any) => d.isActive) ?? [];

  const handleApply = () => {
    if (!activeGymId || !selectedCode) return;
    applyMutation.mutate(
      { gymId: activeGymId, subscriptionId, data: { discountId: parseInt(selectedCode) } },
      {
        onSuccess: () => {
          toast({ title: "Discount applied" });
          setShowApply(false);
          setSelectedCode("");
          queryClient.invalidateQueries();
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  };

  const handleRemove = () => {
    if (!activeGymId) return;
    removeMutation.mutate(
      { gymId: activeGymId, subscriptionId },
      {
        onSuccess: () => {
          toast({ title: "Discount removed" });
          queryClient.invalidateQueries();
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  };

  if (!stripeSubscriptionId) return null;

  return (
    <div className="flex items-center gap-2 mt-2">
      <Tag className="h-3.5 w-3.5 text-muted-foreground" />
      {showApply ? (
        <div className="flex items-center gap-2 flex-1">
          <select
            value={selectedCode}
            onChange={(e) => setSelectedCode(e.target.value)}
            className="h-7 text-xs rounded-md border border-border bg-background px-2 flex-1 max-w-[180px]"
          >
            <option value="">Select discount...</option>
            {activeCodes.map((d: any) => (
              <option key={d.id} value={d.id}>{d.code} ({d.type === "percentage" ? `${d.amount}%` : `$${d.amount}`})</option>
            ))}
          </select>
          <button
            onClick={handleApply}
            disabled={!selectedCode || applyMutation.isPending}
            className="px-2 py-1 text-xs font-medium rounded-md bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50"
          >
            {applyMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Apply"}
          </button>
          <button
            onClick={() => { setShowApply(false); setSelectedCode(""); }}
            className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowApply(true)}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-violet-500/10 text-violet-500 hover:bg-violet-500/20 transition-colors"
          >
            <Plus className="h-3 w-3" /> Discount
          </button>
          <button
            onClick={handleRemove}
            disabled={removeMutation.isPending}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
          >
            {removeMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
            Remove Discount
          </button>
        </div>
      )}
    </div>
  );
}
