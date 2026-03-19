import React, { useState } from "react";
import { useGym } from "@/store/GymContext";
import {
  useCreateHold, useCancelHold,
  getListMemberHoldsQueryKey, getGetMemberBillingHistoryQueryKey, getListSubscriptionsQueryKey,
} from "@workspace/api-client-react";
import { listMemberHolds, getListMemberHoldsQueryOptions } from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PauseCircle, Play, CalendarClock, X } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  memberId: number;
  subscriptionId: number;
  onHoldChange?: () => void;
}

export function HoldsManager({ memberId, subscriptionId, onHoldChange }: Props) {
  const { activeGymId } = useGym();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ startDate: new Date().toISOString().split("T")[0], endDate: "", reason: "" });

  const { data: holds = [], isLoading } = useQuery(
    getListMemberHoldsQueryOptions(activeGymId || 0, memberId, { query: { enabled: !!activeGymId && !!memberId } })
  );

  const createMutation = useCreateHold();
  const cancelMutation = useCancelHold();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListMemberHoldsQueryKey(activeGymId || 0, memberId) });
    queryClient.invalidateQueries({ queryKey: getGetMemberBillingHistoryQueryKey(activeGymId || 0, memberId) });
    queryClient.invalidateQueries({ queryKey: getListSubscriptionsQueryKey(activeGymId || 0) });
    onHoldChange?.();
  };

  const handleCreate = () => {
    if (!activeGymId) return;
    createMutation.mutate(
      { gymId: activeGymId, memberId, data: { subscriptionId, startDate: form.startDate, endDate: form.endDate || undefined, reason: form.reason || undefined } },
      {
        onSuccess: () => {
          toast({ title: "Hold Created", description: form.endDate ? `Hold scheduled from ${form.startDate} to ${form.endDate}` : `Hold starts ${form.startDate}` });
          invalidate();
          setCreateOpen(false);
          setForm({ startDate: new Date().toISOString().split("T")[0], endDate: "", reason: "" });
        },
        onError: (err: any) => toast({ title: "Error", description: err?.message || "Failed to create hold", variant: "destructive" }),
      }
    );
  };

  const handleCancel = (holdId: number) => {
    if (!activeGymId) return;
    cancelMutation.mutate(
      { gymId: activeGymId, holdId },
      {
        onSuccess: () => { toast({ title: "Hold Cancelled" }); invalidate(); },
        onError: (err: any) => toast({ title: "Error", description: err?.message || "Failed", variant: "destructive" }),
      }
    );
  };

  const activeHolds = (holds as any[]).filter(h => h.status === "active" || h.status === "scheduled");
  const pastHolds = (holds as any[]).filter(h => h.status === "completed" || h.status === "cancelled");

  const statusColors: Record<string, string> = {
    scheduled: "bg-blue-500/20 text-blue-400",
    active: "bg-amber-500/20 text-amber-400",
    completed: "bg-green-500/20 text-green-400",
    cancelled: "bg-white/10 text-white/40",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-white/70 flex items-center gap-2">
          <PauseCircle className="w-4 h-4" /> Membership Holds
        </h4>
        <button onClick={() => setCreateOpen(true)} className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1">
          <CalendarClock className="w-3 h-3" /> Schedule Hold
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-white/30" /></div>
      ) : activeHolds.length === 0 && pastHolds.length === 0 ? (
        <div className="text-xs text-white/30 text-center py-3">No holds on this membership</div>
      ) : (
        <div className="space-y-2">
          {activeHolds.map((hold: any) => (
            <div key={hold.id} className="p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[hold.status]}`}>{hold.status}</span>
                <button onClick={() => handleCancel(hold.id)} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                  <X className="w-3 h-3" /> Cancel
                </button>
              </div>
              <div className="text-xs text-white/60 mt-1">
                {hold.startDate}{hold.endDate ? ` → ${hold.endDate}` : " — indefinite"}
              </div>
              {hold.reason && <div className="text-xs text-white/40 mt-1 italic">{hold.reason}</div>}
            </div>
          ))}
          {pastHolds.length > 0 && (
            <details className="text-xs">
              <summary className="text-white/30 cursor-pointer hover:text-white/50">Past holds ({pastHolds.length})</summary>
              <div className="space-y-1 mt-1">
                {pastHolds.map((hold: any) => (
                  <div key={hold.id} className="p-2 rounded bg-white/[0.03] text-white/40">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${statusColors[hold.status]}`}>{hold.status}</span>
                    <span className="ml-2">{hold.startDate}{hold.endDate ? ` → ${hold.endDate}` : ""}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md bg-[hsl(220,20%,12%)] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-amber-400" /> Schedule Hold
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-white/70">Start Date</Label>
              <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                className="bg-white/5 border-white/10 text-white mt-1" />
            </div>
            <div>
              <Label className="text-white/70">End Date (optional)</Label>
              <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                className="bg-white/5 border-white/10 text-white mt-1" min={form.startDate} />
              <div className="text-xs text-white/40 mt-1">Leave blank for indefinite hold</div>
            </div>
            <div>
              <Label className="text-white/70">Reason (optional)</Label>
              <Textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="Vacation, injury, etc." className="bg-white/5 border-white/10 text-white mt-1 min-h-[60px]" />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setCreateOpen(false)} className="px-4 py-2 text-sm text-white/60 hover:text-white">Cancel</button>
            <button onClick={handleCreate} disabled={!form.startDate || createMutation.isPending}
              className="px-4 py-2 text-sm bg-amber-500 text-black rounded-lg hover:bg-amber-400 disabled:opacity-50 flex items-center gap-2">
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Schedule
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
