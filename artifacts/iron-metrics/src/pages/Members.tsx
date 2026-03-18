import React, { useState } from "react";
import { useGym } from "@/store/GymContext";
import { useListMembers, useUpdateMember, useAddMemberNote, getListMembersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Loader2, Search, Plus, Filter, MoreHorizontal, UserCircle, Upload, FileSpreadsheet } from "lucide-react";
import { ImportMembersDialog } from "@/components/members/ImportMembersDialog";
import { AddMemberWizard } from "@/components/members/AddMemberWizard";
import { Link, useLocation } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

type MemberFromList = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  status: string;
  membershipType?: string | null;
  profileImageUrl?: string | null;
  riskTier?: string | null;
  riskScore?: number | null;
  tags: string[];
  birthDate?: string | null;
  address?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
};

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "hold", label: "Hold" },
  { value: "cancelled", label: "Cancelled" },
  { value: "prospect", label: "Prospect" },
];

const RISK_OPTIONS = [
  { value: "healthy", label: "Healthy" },
  { value: "moderate", label: "Moderate" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm text-foreground">{label}{required && <span className="text-destructive ml-0.5">*</span>}</Label>
      {children}
    </div>
  );
}

export function Members() {
  const { activeGymId } = useGym();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [statusChangeOpen, setStatusChangeOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberFromList | null>(null);
  const [pendingStatus, setPendingStatus] = useState<string>("");

  const [editForm, setEditForm] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    emergencyContactName: "", emergencyContactPhone: "",
    tags: "", birthDate: "", address: "", city: "", state: "",
    membershipType: "", waiverSigned: false,
  });

  const [noteContent, setNoteContent] = useState("");

  const [tempStatusFilter, setTempStatusFilter] = useState<string[]>([]);
  const [tempRiskFilter, setTempRiskFilter] = useState<string[]>([]);

  const filterParams: Record<string, string> = {};
  if (search) filterParams.search = search;
  if (statusFilter.length === 1) filterParams.status = statusFilter[0];

  const { data, isLoading } = useListMembers(activeGymId as number, filterParams, {
    query: { enabled: !!activeGymId, placeholderData: (prev: any) => prev } as any
  });

  const updateMemberMutation = useUpdateMember();
  const addNoteMutation = useAddMemberNote();

  const gymId = activeGymId as number;

  const handleEditMember = () => {
    if (!selectedMember) return;
    updateMemberMutation.mutate({
      gymId,
      memberId: selectedMember.id,
      data: {
        firstName: editForm.firstName || undefined,
        lastName: editForm.lastName || undefined,
        email: editForm.email || undefined,
        phone: editForm.phone || null,
        emergencyContactName: editForm.emergencyContactName || null,
        emergencyContactPhone: editForm.emergencyContactPhone || null,
        tags: editForm.tags ? editForm.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        birthDate: editForm.birthDate || null,
        address: editForm.address || null,
        city: editForm.city || null,
        state: editForm.state || null,
        membershipType: editForm.membershipType || null,
        waiverSigned: editForm.waiverSigned,
      },
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMembersQueryKey(gymId) });
        toast({ title: "Member updated", description: `${editForm.firstName} ${editForm.lastName} has been updated.` });
        setEditOpen(false);
        setSelectedMember(null);
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to update member." });
      },
    });
  };

  const handleAddNote = () => {
    if (!selectedMember || !noteContent.trim()) return;
    addNoteMutation.mutate({
      gymId,
      memberId: selectedMember.id,
      data: { content: noteContent.trim() },
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMembersQueryKey(gymId) });
        toast({ title: "Note added", description: `Note added for ${selectedMember.firstName} ${selectedMember.lastName}.` });
        setNoteOpen(false);
        setNoteContent("");
        setSelectedMember(null);
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to add note." });
      },
    });
  };

  const handleStatusChange = () => {
    if (!selectedMember || !pendingStatus) return;
    updateMemberMutation.mutate({
      gymId,
      memberId: selectedMember.id,
      data: { status: pendingStatus as any },
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMembersQueryKey(gymId) });
        toast({ title: "Status updated", description: `${selectedMember.firstName} ${selectedMember.lastName} is now ${pendingStatus}.` });
        setStatusChangeOpen(false);
        setPendingStatus("");
        setSelectedMember(null);
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to update status." });
      },
    });
  };

  const openEdit = (member: MemberFromList) => {
    setSelectedMember(member);
    setEditForm({
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      phone: member.phone || "",
      emergencyContactName: member.emergencyContactName || "",
      emergencyContactPhone: member.emergencyContactPhone || "",
      tags: (member.tags || []).join(", "),
      birthDate: member.birthDate || "",
      address: member.address || "",
      city: (member as any).city || "",
      state: (member as any).state || "",
      membershipType: member.membershipType || "",
      waiverSigned: (member as any).waiverSigned || false,
    });
    setEditOpen(true);
  };

  const openNote = (member: MemberFromList) => {
    setSelectedMember(member);
    setNoteContent("");
    setNoteOpen(true);
  };

  const openStatusChange = (member: MemberFromList, newStatus: string) => {
    setSelectedMember(member);
    setPendingStatus(newStatus);
    setStatusChangeOpen(true);
  };

  const openFilter = () => {
    setTempStatusFilter([...statusFilter]);
    setTempRiskFilter([]);
    setFilterOpen(true);
  };

  const applyFilters = () => {
    setStatusFilter(tempStatusFilter);
    setFilterOpen(false);
  };

  const clearFilters = () => {
    setTempStatusFilter([]);
    setTempRiskFilter([]);
    setStatusFilter([]);
    setFilterOpen(false);
  };

  const toggleTempStatus = (val: string) => {
    setTempStatusFilter(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  };

  const toggleTempRisk = (val: string) => {
    setTempRiskFilter(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  };

  const statusBadge = (status: string) => {
    const cls = status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
      status === 'inactive' ? 'bg-muted text-muted-foreground border-border' :
      status === 'hold' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
      'bg-destructive/10 text-destructive border-destructive/20';
    return cls;
  };

  const riskColor = (tier: string) => {
    return tier === 'critical' ? 'text-red-500' :
      tier === 'high' ? 'text-orange-500' :
      tier === 'healthy' ? 'text-emerald-500' : 'text-yellow-500';
  };

  const getStatusActions = (member: MemberFromList) => {
    const actions: { label: string; status: string }[] = [];
    if (member.status !== 'hold') actions.push({ label: "Place on Hold", status: "hold" });
    if (member.status !== 'active') actions.push({ label: "Reactivate", status: "active" });
    if (member.status !== 'cancelled') actions.push({ label: "Cancel Membership", status: "cancelled" });
    return actions;
  };

  const RowActions = ({ member }: { member: MemberFromList }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="p-2 text-muted-foreground hover:text-primary transition-colors" aria-label={`Actions for ${member.firstName} ${member.lastName}`} onClick={(e) => e.stopPropagation()}>
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/members/${member.id}`); }}>
          View Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(member); }}>
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openNote(member); }}>
          Add Note
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {getStatusActions(member).map(action => (
          <DropdownMenuItem key={action.status} onClick={(e) => { e.stopPropagation(); openStatusChange(member, action.status); }}>
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-4 md:space-y-6 h-full flex flex-col">
      <header className="flex flex-col gap-3 md:gap-4 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Directory</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">Manage your gym's member base.</p>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={openFilter}
              className={`p-2.5 bg-card border border-border rounded-xl hover:bg-muted transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${statusFilter.length > 0 ? 'border-primary text-primary' : ''}`}
              aria-label="Filter members"
            >
              <Filter className="h-5 w-5 text-muted-foreground" />
              {statusFilter.length > 0 && <span className="ml-1 text-xs font-medium text-primary">{statusFilter.length}</span>}
            </button>
            <button
              onClick={() => setImportOpen(true)}
              className="flex items-center gap-2 px-3 md:px-4 py-2.5 bg-card border border-border hover:bg-muted rounded-xl font-medium transition-colors min-h-[44px]"
              aria-label="Import members"
            >
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="hidden sm:inline text-sm">Import</span>
            </button>
            <button
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-2 px-3 md:px-4 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-medium transition-colors shadow-lg shadow-primary/20 min-h-[44px]"
            >
              <Plus className="h-5 w-5" />
              <span className="hidden sm:inline">Add Member</span>
            </button>
          </div>
        </div>
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all min-h-[44px]"
          />
        </div>
      </header>

      <div className="flex-1 bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {isLoading && !data ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
        ) : isMobile ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-border">
            {data?.members.map((member: any, i: number) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.05, 0.5) }}
                className="p-4 active:bg-secondary transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Link href={`/members/${member.id}`} className="h-10 w-10 bg-muted rounded-full overflow-hidden flex items-center justify-center shrink-0">
                    {member.profileImageUrl ? (
                      <img src={member.profileImageUrl} alt={member.firstName} className="w-full h-full object-cover" />
                    ) : (
                      <UserCircle className="h-6 w-6 text-muted-foreground" />
                    )}
                  </Link>
                  <Link href={`/members/${member.id}`} className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-foreground truncate">{member.firstName} {member.lastName}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border shrink-0 ${statusBadge(member.status)}`}>
                        {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-muted-foreground truncate">{member.email}</span>
                      {member.riskTier ? (
                        <span className={`flex items-center gap-1 text-[10px] font-semibold shrink-0 ${riskColor(member.riskTier)}`}>
                          <div className="h-1.5 w-1.5 rounded-full bg-current" />
                          {member.riskTier.toUpperCase()}
                        </span>
                      ) : null}
                    </div>
                  </Link>
                  <RowActions member={member} />
                </div>
              </motion.div>
            ))}
            {data?.members.length === 0 && (
              <EmptyMemberState hasSearch={!!search || statusFilter.length > 0} onImport={() => setImportOpen(true)} onAdd={() => setAddOpen(true)} />
            )}
          </div>
        ) : (
          <div className="overflow-x-auto flex-1 custom-scrollbar">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b border-border sticky top-0 z-10 backdrop-blur-md">
                <tr>
                  <th className="px-6 py-4 font-semibold">Member</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Membership</th>
                  <th className="px-6 py-4 font-semibold">Risk Tier</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data?.members.map((member: any, i: number) => (
                  <motion.tr
                    key={member.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.05, 0.5) }}
                    className="hover:bg-secondary transition-colors group cursor-pointer"
                    onClick={() => navigate(`/members/${member.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-muted rounded-full overflow-hidden flex items-center justify-center">
                          {member.profileImageUrl ? (
                            <img src={member.profileImageUrl} alt={member.firstName} className="w-full h-full object-cover" />
                          ) : (
                            <UserCircle className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{member.firstName} {member.lastName}</div>
                          <div className="text-xs text-muted-foreground">{member.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusBadge(member.status)}`}>
                        {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {member.membershipType || "None"}
                    </td>
                    <td className="px-6 py-4">
                       {member.riskTier ? (
                         <span className={`flex items-center gap-1.5 text-xs font-semibold ${riskColor(member.riskTier)}`}>
                           <div className={`h-2 w-2 rounded-full bg-current`} />
                           {member.riskTier.toUpperCase()}
                         </span>
                       ) : <span className="text-muted-foreground">-</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="opacity-0 group-hover:opacity-100">
                        <RowActions member={member} />
                      </div>
                    </td>
                  </motion.tr>
                ))}
                {data?.members.length === 0 && (
                  <tr>
                    <td colSpan={5}>
                      <EmptyMemberState hasSearch={!!search || statusFilter.length > 0} onImport={() => setImportOpen(true)} onAdd={() => setAddOpen(true)} />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {data && (
          <div className="p-3 md:p-4 border-t border-border bg-muted/10 text-xs text-muted-foreground flex justify-between items-center shrink-0">
            <span>Showing {data.members.length} of {data.total} members</span>
          </div>
        )}
      </div>

      <AddMemberWizard open={addOpen} onOpenChange={setAddOpen} />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
            <DialogDescription>Update member information.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="First Name" required>
                <Input value={editForm.firstName} onChange={e => setEditForm(f => ({ ...f, firstName: e.target.value }))} />
              </FormField>
              <FormField label="Last Name" required>
                <Input value={editForm.lastName} onChange={e => setEditForm(f => ({ ...f, lastName: e.target.value }))} />
              </FormField>
            </div>
            <FormField label="Email" required>
              <Input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
            </FormField>
            <FormField label="Phone">
              <Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
            </FormField>
            <FormField label="Date of Birth">
              <Input type="date" value={editForm.birthDate} onChange={e => setEditForm(f => ({ ...f, birthDate: e.target.value }))} />
            </FormField>
            <FormField label="Membership Plan">
              <Input value={editForm.membershipType} onChange={e => setEditForm(f => ({ ...f, membershipType: e.target.value }))} placeholder="e.g. Unlimited, 3x Week" />
            </FormField>
            <FormField label="Address">
              <Input value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} placeholder="123 Main St" />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="City">
                <Input value={editForm.city} onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))} placeholder="Austin" />
              </FormField>
              <FormField label="State">
                <Input value={editForm.state} onChange={e => setEditForm(f => ({ ...f, state: e.target.value }))} placeholder="TX" />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Emergency Contact">
                <Input value={editForm.emergencyContactName} onChange={e => setEditForm(f => ({ ...f, emergencyContactName: e.target.value }))} />
              </FormField>
              <FormField label="Emergency Phone">
                <Input value={editForm.emergencyContactPhone} onChange={e => setEditForm(f => ({ ...f, emergencyContactPhone: e.target.value }))} />
              </FormField>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
              <Checkbox
                id="edit-waiver"
                checked={editForm.waiverSigned}
                onCheckedChange={(c) => setEditForm(f => ({ ...f, waiverSigned: !!c }))}
              />
              <label htmlFor="edit-waiver" className="text-sm text-foreground cursor-pointer">Liability Waiver Signed</label>
            </div>
            <FormField label="Tags">
              <Input value={editForm.tags} onChange={e => setEditForm(f => ({ ...f, tags: e.target.value }))} placeholder="vip, morning-class" />
            </FormField>
          </div>
          <DialogFooter>
            <button onClick={() => setEditOpen(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
            <button
              onClick={handleEditMember}
              disabled={updateMemberMutation.isPending}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {updateMemberMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
            <DialogDescription>
              {selectedMember ? `Add a note for ${selectedMember.firstName} ${selectedMember.lastName}.` : "Add a note."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <textarea
              value={noteContent}
              onChange={e => setNoteContent(e.target.value)}
              placeholder="Enter your note..."
              rows={4}
              className="w-full bg-transparent border border-input rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>
          <DialogFooter>
            <button onClick={() => setNoteOpen(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
            <button
              onClick={handleAddNote}
              disabled={!noteContent.trim() || addNoteMutation.isPending}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {addNoteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Add Note
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={statusChangeOpen} onOpenChange={setStatusChangeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingStatus === 'hold' ? 'Place on Hold' : pendingStatus === 'active' ? 'Reactivate Member' : 'Cancel Membership'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedMember && (
                <>
                  Are you sure you want to {pendingStatus === 'hold' ? 'place' : pendingStatus === 'active' ? 'reactivate' : 'cancel the membership of'}{' '}
                  <span className="font-semibold text-foreground">{selectedMember.firstName} {selectedMember.lastName}</span>
                  {pendingStatus === 'hold' ? ' on hold' : ''}? This action can be reversed later.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleStatusChange} disabled={updateMemberMutation.isPending}>
              {updateMemberMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" className="w-80 overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Filter Members</SheetTitle>
            <SheetDescription>Narrow down the member list.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Status</h3>
              <div className="space-y-2">
                {STATUS_OPTIONS.map(opt => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={tempStatusFilter.includes(opt.value)}
                      onCheckedChange={() => toggleTempStatus(opt.value)}
                    />
                    <span className="text-sm text-foreground">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Risk Tier</h3>
              <div className="space-y-2">
                {RISK_OPTIONS.map(opt => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={tempRiskFilter.includes(opt.value)}
                      onCheckedChange={() => toggleTempRisk(opt.value)}
                    />
                    <span className="text-sm text-foreground">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-8 flex gap-2">
            <button onClick={clearFilters} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors">
              Clear
            </button>
            <button onClick={applyFilters} className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
              Apply
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <ImportMembersDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImportComplete={() => {
          queryClient.invalidateQueries({ queryKey: getListMembersQueryKey(gymId, filterParams) });
        }}
      />
    </div>
  );
}

function EmptyMemberState({ hasSearch, onImport, onAdd }: { hasSearch: boolean; onImport: () => void; onAdd: () => void }) {
  if (hasSearch) {
    return (
      <div className="px-6 py-12 text-center text-muted-foreground">
        No members found matching your search.
      </div>
    );
  }

  return (
    <div className="px-6 py-16 text-center">
      <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
        <UserCircle className="h-7 w-7 text-amber-400" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">No members yet</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
        Get started by importing your existing members from a spreadsheet, or add them one at a time.
      </p>
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={onImport}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-black font-medium text-sm rounded-xl hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
        >
          <FileSpreadsheet className="h-4 w-4" />
          Import from CSV
        </button>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border text-foreground font-medium text-sm rounded-xl hover:bg-muted transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Manually
        </button>
      </div>
    </div>
  );
}
