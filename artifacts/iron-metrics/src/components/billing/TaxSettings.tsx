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
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Calculator className="w-5 h-5 text-amber-400" /> Tax Configuration
        </h3>
        {taxEnabled && (
          <button onClick={handleDisable} disabled={disableMutation.isPending}
            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
            <ToggleRight className="w-4 h-4" /> Disable Tax
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div>
      ) : (
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/70">Status</span>
            <span className={`text-sm font-medium ${taxEnabled ? "text-green-400" : "text-white/40"}`}>
              {taxEnabled ? "Enabled" : "Not configured"}
            </span>
          </div>

          {taxEnabled && !editing && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="text-xs text-white/40">Label</div>
                  <div className="text-sm text-white">{(config as any)?.taxLabel}</div>
                </div>
                <div>
                  <div className="text-xs text-white/40">Rate</div>
                  <div className="text-sm text-white">{(config as any)?.taxRate}%</div>
                </div>
                <div>
                  <div className="text-xs text-white/40">Jurisdiction</div>
                  <div className="text-sm text-white">{(config as any)?.taxJurisdiction || "—"}</div>
                </div>
              </div>
              <button onClick={() => setEditing(true)} className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1">
                <Settings className="w-3 h-3" /> Edit
              </button>
            </>
          )}

          {(!taxEnabled || editing) && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-white/70">Tax Label</Label>
                  <Input value={form.taxLabel} onChange={e => setForm(f => ({ ...f, taxLabel: e.target.value }))}
                    className="bg-white/5 border-white/10 text-white mt-1" placeholder="Sales Tax" />
                </div>
                <div>
                  <Label className="text-white/70">Rate (%)</Label>
                  <Input type="number" min="0" max="100" step="0.01" value={form.taxRate}
                    onChange={e => setForm(f => ({ ...f, taxRate: e.target.value }))}
                    className="bg-white/5 border-white/10 text-white mt-1" placeholder="8.25" />
                </div>
              </div>
              <div>
                <Label className="text-white/70">Jurisdiction (optional)</Label>
                <Input value={form.taxJurisdiction} onChange={e => setForm(f => ({ ...f, taxJurisdiction: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white mt-1" placeholder="TX, CA, etc." />
              </div>
              <div className="flex gap-2">
                {editing && <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-sm text-white/60 hover:text-white">Cancel</button>}
                <button onClick={handleSave} disabled={!form.taxLabel || !form.taxRate || updateMutation.isPending}
                  className="px-4 py-1.5 text-sm bg-amber-500 text-black rounded-lg hover:bg-amber-400 disabled:opacity-50 flex items-center gap-2">
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
