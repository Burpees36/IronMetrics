import React, { useState } from "react";
import { useGym } from "@/store/GymContext";
import {
  useAdjustMemberBalance,
  getMemberBalance, getGetMemberBalanceQueryOptions,
} from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Wallet, Plus, Minus } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  memberId: number;
}

export function MemberBalance({ memberId }: Props) {
  const { activeGymId } = useGym();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [form, setForm] = useState({ amount: "", description: "", type: "add" as "add" | "remove" });

  const { data: balanceData, isLoading } = useQuery(
    getGetMemberBalanceQueryOptions(activeGymId || 0, memberId, { query: { enabled: !!activeGymId && !!memberId } })
  );

  const adjustMutation = useAdjustMemberBalance();
  const balance = (balanceData as any)?.balance ?? 0;

  const handleAdjust = () => {
    if (!activeGymId || !form.amount || !form.description) return;
    const amount = parseFloat(form.amount) * (form.type === "remove" ? -1 : 1);
    adjustMutation.mutate(
      { gymId: activeGymId, memberId, data: { amount, description: form.description } },
      {
        onSuccess: (data: any) => {
          toast({ title: "Balance Updated", description: `New balance: $${data.newBalance?.toFixed(2)}` });
          queryClient.invalidateQueries({ queryKey: [`/api/gyms/${activeGymId}/members/${memberId}/balance`] });
          setAdjustOpen(false);
          setForm({ amount: "", description: "", type: "add" });
        },
        onError: (err: any) => toast({ title: "Error", description: err?.message || "Failed", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" /> Account Credit
        </h4>
        <button onClick={() => setAdjustOpen(true)} className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
          <Plus className="w-3 h-3" /> Adjust
        </button>
      </div>

      <div className="p-3 rounded-lg bg-muted/20 border border-border">
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">Balance</span>
            <span className={`text-lg font-semibold ${balance > 0 ? "text-emerald-600" : balance < 0 ? "text-destructive" : "text-muted-foreground"}`}>
              ${balance.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" /> Adjust Credit
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              <button
                onClick={() => setForm(f => ({ ...f, type: "add" }))}
                className={`flex-1 py-2 rounded-lg text-sm flex items-center justify-center gap-1 border ${
                  form.type === "add" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "bg-muted/20 text-muted-foreground border-border"
                }`}
              >
                <Plus className="w-3 h-3" /> Add Credit
              </button>
              <button
                onClick={() => setForm(f => ({ ...f, type: "remove" }))}
                className={`flex-1 py-2 rounded-lg text-sm flex items-center justify-center gap-1 border ${
                  form.type === "remove" ? "bg-destructive/10 text-destructive border-destructive/30" : "bg-muted/20 text-muted-foreground border-border"
                }`}
              >
                <Minus className="w-3 h-3" /> Remove
              </button>
            </div>
            <div>
              <Label>Amount ($)</Label>
              <Input type="number" min="0.01" step="0.01" value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                className="mt-1" placeholder="25.00" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="mt-1" placeholder="Referral bonus, comp class, etc." />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setAdjustOpen(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
            <button onClick={handleAdjust} disabled={!form.amount || !form.description || adjustMutation.isPending}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
              {adjustMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {form.type === "add" ? "Add Credit" : "Deduct"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
