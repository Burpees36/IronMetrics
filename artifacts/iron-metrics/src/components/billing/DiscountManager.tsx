import React, { useState } from "react";
import { useGym } from "@/store/GymContext";
import {
  useCreateDiscountCode, useUpdateDiscountCode,
  listDiscountCodes, getListDiscountCodesQueryOptions, getListDiscountCodesQueryKey,
} from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Tag, Plus, ToggleLeft, ToggleRight, Percent, DollarSign, Clock } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function DiscountManager() {
  const { activeGymId } = useGym();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", code: "", type: "percentage" as "percentage" | "fixed",
    amount: "", duration: "once" as "once" | "repeating" | "forever",
    durationInMonths: "", maxRedemptions: "", expiresAt: "",
  });

  const { data: codes = [], isLoading } = useQuery(
    getListDiscountCodesQueryOptions(activeGymId || 0, { query: { enabled: !!activeGymId } })
  );

  const createMutation = useCreateDiscountCode();
  const updateMutation = useUpdateDiscountCode();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListDiscountCodesQueryKey(activeGymId || 0) });

  const handleCreate = () => {
    if (!activeGymId || !form.name || !form.code || !form.amount) return;
    createMutation.mutate(
      {
        gymId: activeGymId,
        data: {
          name: form.name, code: form.code.toUpperCase(), type: form.type,
          amount: parseFloat(form.amount), duration: form.duration,
          ...(form.durationInMonths ? { durationInMonths: parseInt(form.durationInMonths, 10) } : {}),
          ...(form.maxRedemptions ? { maxRedemptions: parseInt(form.maxRedemptions, 10) } : {}),
          ...(form.expiresAt ? { expiresAt: form.expiresAt } : {}),
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Discount Created", description: `Code ${form.code.toUpperCase()} is ready to use` });
          invalidate();
          setCreateOpen(false);
          setForm({ name: "", code: "", type: "percentage", amount: "", duration: "once", durationInMonths: "", maxRedemptions: "", expiresAt: "" });
        },
        onError: (err: any) => toast({ title: "Error", description: err?.message || "Failed", variant: "destructive" }),
      }
    );
  };

  const handleToggle = (id: number, isActive: boolean) => {
    if (!activeGymId) return;
    updateMutation.mutate(
      { gymId: activeGymId, id, data: { isActive: !isActive } },
      {
        onSuccess: () => { toast({ title: isActive ? "Discount Deactivated" : "Discount Activated" }); invalidate(); },
        onError: (err: any) => toast({ title: "Error", description: err?.message || "Failed", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Tag className="w-5 h-5 text-primary" /> Discount Codes
        </h3>
        <button onClick={() => setCreateOpen(true)}
          className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-1">
          <Plus className="w-4 h-4" /> New Code
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : (codes as any[]).length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Tag className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <div className="text-sm">No discount codes yet</div>
        </div>
      ) : (
        <div className="space-y-2">
          {(codes as any[]).map((code: any) => (
            <div key={code.id} className={`p-4 rounded-xl border transition-all ${
              code.isActive ? "bg-muted/30 border-border" : "bg-muted/10 border-border/50 opacity-60"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-1 rounded bg-primary/15 text-primary font-mono text-sm font-medium">{code.code}</span>
                  <span className="text-foreground text-sm">{code.name}</span>
                </div>
                <button onClick={() => handleToggle(code.id, code.isActive)} disabled={updateMutation.isPending} className="text-muted-foreground hover:text-foreground disabled:opacity-50">
                  {code.isActive ? <ToggleRight className="w-6 h-6 text-emerald-500" /> : <ToggleLeft className="w-6 h-6" />}
                </button>
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  {code.type === "percentage" ? <Percent className="w-3 h-3" /> : <DollarSign className="w-3 h-3" />}
                  {code.type === "percentage" ? `${code.amount}% off` : `$${code.amount.toFixed(2)} off`}
                </span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {code.duration}</span>
                <span>{code.timesRedeemed}{code.maxRedemptions ? `/${code.maxRedemptions}` : ""} used</span>
                {code.expiresAt && <span>Expires {new Date(code.expiresAt).toLocaleDateString()}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary" /> New Discount Code
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Name</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="mt-1" placeholder="Summer Sale" />
              </div>
              <div>
                <Label>Code</Label>
                <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  className="mt-1 font-mono" placeholder="SUMMER25" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as any }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Amount</Label>
                <Input type="number" min="0.01" step="0.01" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  className="mt-1"
                  placeholder={form.type === "percentage" ? "25" : "10.00"} />
              </div>
            </div>
            <div>
              <Label>Duration</Label>
              <Select value={form.duration} onValueChange={v => setForm(f => ({ ...f, duration: v as any }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">Once</SelectItem>
                  <SelectItem value="repeating">Repeating</SelectItem>
                  <SelectItem value="forever">Forever</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.duration === "repeating" && (
              <div>
                <Label>Duration (months)</Label>
                <Input type="number" min="1" value={form.durationInMonths}
                  onChange={e => setForm(f => ({ ...f, durationInMonths: e.target.value }))}
                  className="mt-1" placeholder="3" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Max Redemptions</Label>
                <Input type="number" min="1" value={form.maxRedemptions}
                  onChange={e => setForm(f => ({ ...f, maxRedemptions: e.target.value }))}
                  className="mt-1" placeholder="Unlimited" />
              </div>
              <div>
                <Label>Expires</Label>
                <Input type="date" value={form.expiresAt}
                  onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                  className="mt-1" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setCreateOpen(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
            <button onClick={handleCreate} disabled={!form.name || !form.code || !form.amount || createMutation.isPending}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Code
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
