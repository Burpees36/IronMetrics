import React, { useState, useEffect } from "react";
import { useGym } from "@/store/GymContext";
import {
  useUpdateTaxConfig, useDisableTax,
  getTaxConfig, getGetTaxConfigQueryOptions, getGetTaxConfigQueryKey,
} from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Calculator, Settings, ToggleLeft, ToggleRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function TaxSettings() {
  const { activeGymId } = useGym();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery(
    getGetTaxConfigQueryOptions(activeGymId || 0, { query: { enabled: !!activeGymId } })
  );

  const [form, setForm] = useState({ taxLabel: "Sales Tax", taxRate: "0", taxJurisdiction: "" });
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (config) {
      const c = config as any;
      setForm({
        taxLabel: c.taxLabel || "Sales Tax",
        taxRate: String(c.taxRate || 0),
        taxJurisdiction: c.taxJurisdiction || "",
      });
    }
  }, [config]);

  const updateMutation = useUpdateTaxConfig();
  const disableMutation = useDisableTax();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getGetTaxConfigQueryKey(activeGymId || 0) });

  const handleSave = () => {
    if (!activeGymId) return;
    updateMutation.mutate(
      { gymId: activeGymId, data: { taxLabel: form.taxLabel, taxRate: parseFloat(form.taxRate), taxJurisdiction: form.taxJurisdiction || undefined } },
      {
        onSuccess: () => { toast({ title: "Tax Configuration Saved" }); invalidate(); setEditing(false); },
        onError: (err: any) => toast({ title: "Error", description: err?.message || "Failed", variant: "destructive" }),
      }
    );
  };

  const handleDisable = () => {
    if (!activeGymId) return;
    disableMutation.mutate(
      { gymId: activeGymId },
      {
        onSuccess: () => { toast({ title: "Tax Collection Disabled" }); invalidate(); },
        onError: (err: any) => toast({ title: "Error", description: err?.message || "Failed", variant: "destructive" }),
      }
    );
  };

  const taxEnabled = (config as any)?.taxEnabled;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" /> Tax Configuration
        </h3>
        {taxEnabled && (
          <button onClick={handleDisable} disabled={disableMutation.isPending}
            className="text-xs text-destructive hover:text-destructive/80 flex items-center gap-1">
            <ToggleRight className="w-4 h-4" /> Disable Tax
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <span className={`text-sm font-medium ${taxEnabled ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
              {taxEnabled ? "Enabled" : "Not configured"}
            </span>
          </div>

          {taxEnabled && !editing && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">Label</div>
                  <div className="text-sm text-foreground">{(config as any)?.taxLabel}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Rate</div>
                  <div className="text-sm text-foreground">{(config as any)?.taxRate}%</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Jurisdiction</div>
                  <div className="text-sm text-foreground">{(config as any)?.taxJurisdiction || "—"}</div>
                </div>
              </div>
              <button onClick={() => setEditing(true)} className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
                <Settings className="w-3 h-3" /> Edit
              </button>
            </>
          )}

          {(!taxEnabled || editing) && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-muted-foreground">Tax Label</Label>
                  <Input value={form.taxLabel} onChange={e => setForm(f => ({ ...f, taxLabel: e.target.value }))}
                    className="mt-1" placeholder="Sales Tax" />
                </div>
                <div>
                  <Label className="text-muted-foreground">Rate (%)</Label>
                  <Input type="number" min="0" max="100" step="0.01" value={form.taxRate}
                    onChange={e => setForm(f => ({ ...f, taxRate: e.target.value }))}
                    className="mt-1" placeholder="8.25" />
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Jurisdiction (optional)</Label>
                <Input value={form.taxJurisdiction} onChange={e => setForm(f => ({ ...f, taxJurisdiction: e.target.value }))}
                  className="mt-1" placeholder="TX, CA, etc." />
              </div>
              <div className="flex gap-2">
                {editing && <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">Cancel</button>}
                <button onClick={handleSave} disabled={!form.taxLabel || !form.taxRate || updateMutation.isPending}
                  className="px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
                  {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {taxEnabled ? "Update" : "Enable Tax"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
