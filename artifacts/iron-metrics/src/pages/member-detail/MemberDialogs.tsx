import React from "react";
import { Loader2, AlertTriangle, Search, Users, UserCircle, CheckCircle, Link2, DollarSign, Plus, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AddCardDialog } from "@/components/billing/AddCardDialog";
import { ChangePlanDialog } from "@/components/billing/ChangePlanDialog";

export interface MemberDialogsProps {
  memberId: number;

  chargeOpen: boolean;
  setChargeOpen: (v: boolean) => void;
  chargeForm: { amount: string; description: string };
  setChargeForm: React.Dispatch<React.SetStateAction<{ amount: string; description: string }>>;
  handleCreateCharge: () => void;
  createChargePending: boolean;

  subOpen: boolean;
  setSubOpen: (v: boolean) => void;
  subPlanId: string;
  setSubPlanId: (v: string) => void;
  handleCreateStripeSub: () => void;
  createStripeSubPending: boolean;
  plans: any[] | undefined;

  cancelSubDialog: number | null;
  setCancelSubDialog: (v: number | null) => void;
  cancelAtPeriodEnd: boolean;
  setCancelAtPeriodEnd: (v: boolean) => void;
  cancelReason: string;
  setCancelReason: (v: string) => void;
  handleCancelMemberSub: () => void;
  cancelSubPending: boolean;

  pauseSubConfirm: number | null;
  setPauseSubConfirm: (v: number | null) => void;
  confirmPauseMemberSub: () => void;
  pauseSubPending: boolean;

  removePmConfirm: string | null;
  setRemovePmConfirm: (v: string | null) => void;
  handleRemovePm: (paymentMethodId: string) => void;
  removePmPending: boolean;

  linkOpen: boolean;
  setLinkOpen: (v: boolean) => void;
  linkSearch: string;
  setLinkSearch: (v: string) => void;
  selectedLinkMember: number | null;
  setSelectedLinkMember: (v: number | null) => void;
  filteredLinkMembers: any[];
  handleLinkBilling: () => void;
  linkBillingPending: boolean;

  addCardOpen: boolean;
  setAddCardOpen: (v: boolean) => void;
  addingCardSecret: string | null;
  setAddingCardSecret: (v: string | null) => void;
  onCardSuccess: () => void;

  changePlanSub: any;
  setChangePlanSub: (v: any) => void;

  editOpen: boolean;
  setEditOpen: (v: boolean) => void;
  editForm: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    membershipType: string;
    waiverSigned: boolean;
  };
  setEditForm: React.Dispatch<React.SetStateAction<any>>;
  editErrors: Record<string, string>;
  setEditErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handleEditSave: () => void;
  updatePending: boolean;

  statusAction: "hold" | "cancelled" | "active" | null;
  setStatusAction: (v: "hold" | "cancelled" | "active" | null) => void;
  handleStatusChange: () => void;
}

export function MemberDialogs(props: MemberDialogsProps) {
  const {
    memberId,
    chargeOpen, setChargeOpen, chargeForm, setChargeForm, handleCreateCharge, createChargePending,
    subOpen, setSubOpen, subPlanId, setSubPlanId, handleCreateStripeSub, createStripeSubPending, plans,
    cancelSubDialog, setCancelSubDialog, cancelAtPeriodEnd, setCancelAtPeriodEnd, cancelReason, setCancelReason, handleCancelMemberSub, cancelSubPending,
    pauseSubConfirm, setPauseSubConfirm, confirmPauseMemberSub, pauseSubPending,
    removePmConfirm, setRemovePmConfirm, handleRemovePm, removePmPending,
    linkOpen, setLinkOpen, linkSearch, setLinkSearch, selectedLinkMember, setSelectedLinkMember, filteredLinkMembers, handleLinkBilling, linkBillingPending,
    addCardOpen, setAddCardOpen, addingCardSecret, setAddingCardSecret, onCardSuccess,
    changePlanSub, setChangePlanSub,
    editOpen, setEditOpen, editForm, setEditForm, editErrors, setEditErrors, handleEditSave, updatePending,
    statusAction, setStatusAction, handleStatusChange,
  } = props;

  return (
    <>
      <Dialog open={chargeOpen} onOpenChange={setChargeOpen}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle>One-Time Charge</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Amount ($) *</Label>
              <Input type="number" step="0.01" value={chargeForm.amount} onChange={(e) => setChargeForm(f => ({ ...f, amount: e.target.value }))} placeholder="25.00" className="bg-background border-border" />
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <Input value={chargeForm.description} onChange={(e) => setChargeForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Late cancel fee" className="bg-background border-border" />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setChargeOpen(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
            <button onClick={handleCreateCharge} disabled={createChargePending || !chargeForm.amount || !chargeForm.description} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium transition-colors disabled:opacity-50">
              {createChargePending && <Loader2 className="h-4 w-4 animate-spin" />}
              Charge
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={subOpen} onOpenChange={setSubOpen}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle>Start Subscription</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Plan *</Label>
              <Select value={subPlanId} onValueChange={setSubPlanId}>
                <SelectTrigger className="bg-background border-border"><SelectValue placeholder="Select a plan" /></SelectTrigger>
                <SelectContent>
                  {(plans ?? []).map((p: any) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name} — ${p.price}{p.billingInterval === "one_time" ? "" : `/${p.billingInterval === "annual" ? "yr" : p.billingInterval === "quarterly" ? "qtr" : "mo"}`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setSubOpen(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
            <button onClick={handleCreateStripeSub} disabled={createStripeSubPending || !subPlanId} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium transition-colors disabled:opacity-50">
              {createStripeSubPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Start Subscription
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={cancelSubDialog !== null} onOpenChange={() => setCancelSubDialog(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to cancel this subscription? This affects the member's billing.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={cancelAtPeriodEnd} onChange={() => setCancelAtPeriodEnd(true)} className="accent-primary" />
                <span className="text-sm text-foreground">Cancel at period end</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={!cancelAtPeriodEnd} onChange={() => setCancelAtPeriodEnd(false)} className="accent-destructive" />
                <span className="text-sm text-foreground">Cancel immediately</span>
              </label>
            </div>
            {!cancelAtPeriodEnd && (
              <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/20 flex items-center gap-3">
                <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                <p className="text-xs text-destructive">Immediate cancellation stops billing right now and revokes access.</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Why is this being cancelled?" rows={2} className="bg-background border-border" />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-border hover:bg-secondary">Keep Subscription</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelMemberSub} disabled={cancelSubPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {cancelSubPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Cancel Subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={pauseSubConfirm !== null} onOpenChange={() => setPauseSubConfirm(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Pause Subscription</AlertDialogTitle>
            <AlertDialogDescription>This will pause billing for this member. No invoices will be generated until the subscription is resumed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-border hover:bg-secondary">Keep Active</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPauseMemberSub} disabled={pauseSubPending} className="bg-yellow-600 text-white hover:bg-yellow-700">
              {pauseSubPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Pause Subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={removePmConfirm !== null} onOpenChange={() => setRemovePmConfirm(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Payment Method</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to remove this card? This cannot be undone. If it is used for active subscriptions, those may fail.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-border hover:bg-secondary">Keep Card</AlertDialogCancel>
            <AlertDialogAction onClick={() => removePmConfirm && handleRemovePm(removePmConfirm)} disabled={removePmPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {removePmPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Remove Card
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={linkOpen} onOpenChange={(open) => { setLinkOpen(open); if (!open) { setLinkSearch(""); setSelectedLinkMember(null); } }}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Link Partner Billing</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Search for a member to link to this member's billing. The selected member's subscriptions will be billed to this member.</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={linkSearch}
              onChange={(e) => setLinkSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="pl-9 bg-background border-border"
            />
          </div>
          <div className="max-h-[200px] overflow-y-auto space-y-1">
            {filteredLinkMembers.map((m: any) => (
              <button
                key={m.id}
                onClick={() => setSelectedLinkMember(m.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${
                  selectedLinkMember === m.id ? "bg-primary/10 border border-primary/30" : "bg-muted/20 border border-transparent hover:bg-muted/40"
                }`}
              >
                <UserCircle className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{m.firstName} {m.lastName}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                </div>
                {selectedLinkMember === m.id && <CheckCircle className="h-4 w-4 text-primary ml-auto shrink-0" />}
              </button>
            ))}
            {linkSearch && filteredLinkMembers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No members found.</p>
            )}
          </div>
          <DialogFooter>
            <button onClick={() => setLinkOpen(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
            <button onClick={handleLinkBilling} disabled={!selectedLinkMember || linkBillingPending} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium transition-colors disabled:opacity-50">
              {linkBillingPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Link Billing
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddCardDialog
        open={addCardOpen}
        onOpenChange={(open) => { setAddCardOpen(open); if (!open) setAddingCardSecret(null); }}
        clientSecret={addingCardSecret}
        onSuccess={onCardSuccess}
      />

      {changePlanSub && (
        <ChangePlanDialog
          open={!!changePlanSub}
          onClose={() => setChangePlanSub(null)}
          subscription={{ id: changePlanSub.id, planId: changePlanSub.planId, planName: changePlanSub.planName || "", amount: changePlanSub.amount || 0, memberId }}
        />
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card border-border max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-first">First Name <span className="text-red-400">*</span></Label>
                <Input id="edit-first" value={editForm.firstName} onChange={(e) => { setEditForm((f: any) => ({ ...f, firstName: e.target.value })); setEditErrors(e2 => { const n = {...e2}; delete n.firstName; return n; }); }} className={`bg-background border-border ${editErrors.firstName ? "border-red-400" : ""}`} />
                {editErrors.firstName && <p className="text-xs text-red-400">{editErrors.firstName}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-last">Last Name <span className="text-red-400">*</span></Label>
                <Input id="edit-last" value={editForm.lastName} onChange={(e) => { setEditForm((f: any) => ({ ...f, lastName: e.target.value })); setEditErrors(e2 => { const n = {...e2}; delete n.lastName; return n; }); }} className={`bg-background border-border ${editErrors.lastName ? "border-red-400" : ""}`} />
                {editErrors.lastName && <p className="text-xs text-red-400">{editErrors.lastName}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-email">Email <span className="text-red-400">*</span></Label>
              <Input id="edit-email" type="email" value={editForm.email} onChange={(e) => { setEditForm((f: any) => ({ ...f, email: e.target.value })); setEditErrors(e2 => { const n = {...e2}; delete n.email; return n; }); }} className={`bg-background border-border ${editErrors.email ? "border-red-400" : ""}`} />
              {editErrors.email && <p className="text-xs text-red-400">{editErrors.email}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input id="edit-phone" value={editForm.phone} onChange={(e) => setEditForm((f: any) => ({ ...f, phone: e.target.value }))} className="bg-background border-border" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-membership">Membership Plan</Label>
              <Input id="edit-membership" value={editForm.membershipType} onChange={(e) => setEditForm((f: any) => ({ ...f, membershipType: e.target.value }))} className="bg-background border-border" placeholder="e.g. Unlimited, 3x Week" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-address">Address</Label>
              <Input id="edit-address" value={editForm.address} onChange={(e) => setEditForm((f: any) => ({ ...f, address: e.target.value }))} className="bg-background border-border" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-city">City</Label>
                <Input id="edit-city" value={editForm.city} onChange={(e) => setEditForm((f: any) => ({ ...f, city: e.target.value }))} className="bg-background border-border" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-state">State</Label>
                <Input id="edit-state" value={editForm.state} onChange={(e) => setEditForm((f: any) => ({ ...f, state: e.target.value }))} className="bg-background border-border" placeholder="TX" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-ec-name">Emergency Contact</Label>
                <Input id="edit-ec-name" value={editForm.emergencyContactName} onChange={(e) => setEditForm((f: any) => ({ ...f, emergencyContactName: e.target.value }))} className="bg-background border-border" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-ec-phone">EC Phone</Label>
                <Input id="edit-ec-phone" value={editForm.emergencyContactPhone} onChange={(e) => setEditForm((f: any) => ({ ...f, emergencyContactPhone: e.target.value }))} className="bg-background border-border" />
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
              <input
                type="checkbox"
                id="edit-waiver-detail"
                checked={editForm.waiverSigned}
                onChange={(e) => setEditForm((f: any) => ({ ...f, waiverSigned: e.target.checked }))}
                className="rounded border-border"
              />
              <label htmlFor="edit-waiver-detail" className="text-sm text-foreground cursor-pointer">Liability Waiver Signed</label>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setEditOpen(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
            <button
              onClick={handleEditSave}
              disabled={updatePending}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {updatePending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!statusAction} onOpenChange={(open) => !open && setStatusAction(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusAction === "hold" ? "Place Member on Hold?" : statusAction === "cancelled" ? "Cancel Membership?" : "Reactivate Member?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {statusAction === "hold"
                ? "This will pause the member's access. They can be reactivated later."
                : statusAction === "cancelled"
                ? "This will cancel the member's membership. This action can be reversed by reactivating."
                : "This will restore the member's active status."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-border hover:bg-secondary">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleStatusChange}
              className={statusAction === "active" ? "bg-emerald-600 hover:bg-emerald-700" : statusAction === "hold" ? "bg-yellow-600 hover:bg-yellow-700" : "bg-destructive hover:bg-destructive/90"}
            >
              {statusAction === "hold" ? "Place on Hold" : statusAction === "cancelled" ? "Cancel Membership" : "Reactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
