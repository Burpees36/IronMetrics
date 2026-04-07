import React, { useState, useMemo } from "react";
import { useListStaff, useInviteStaff, useUpdateStaff, useRemoveStaff, getListStaffQueryKey } from "@workspace/api-client-react";
import type { StaffMember } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Loader2, Plus, Mail, Search, Shield, UserX, MoreVertical, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

const ROLE_INFO: Record<string, { label: string; color: string; desc: string }> = {
  gym_owner: { label: "Owner", color: "bg-amber-500/10 text-amber-500 border-amber-500/20", desc: "Full access. Can manage billing, staff, and all settings." },
  admin: { label: "Admin", color: "bg-violet-500/10 text-violet-500 border-violet-500/20", desc: "Full access except ownership transfer and billing." },
  coach: { label: "Coach", color: "bg-blue-500/10 text-blue-500 border-blue-500/20", desc: "Manage programming, classes, and view members." },
  front_desk: { label: "Front Desk", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", desc: "Check-ins, member management, and basic operations." },
  analyst: { label: "Analyst", color: "bg-slate-400/10 text-slate-400 border-slate-400/20", desc: "Read-only access to analytics and reports." },
};

interface Props {
  gymId: number;
}

export function StaffSettings({ gymId }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: staff, isLoading } = useListStaff(gymId, { query: { enabled: !!gymId } });
  const inviteMutation = useInviteStaff();
  const updateMutation = useUpdateStaff();
  const removeMutation = useRemoveStaff();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", firstName: "", lastName: "", role: "coach" });
  const [detailStaff, setDetailStaff] = useState<StaffMember | null>(null);
  const [removeTarget, setRemoveTarget] = useState<StaffMember | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const filtered = useMemo(() => {
    if (!staff) return [];
    return staff.filter(s => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!`${s.firstName} ${s.lastName}`.toLowerCase().includes(q) && !s.email.toLowerCase().includes(q)) return false;
      }
      if (filterRole !== "all" && s.role !== filterRole) return false;
      if (filterStatus === "active" && !s.isActive) return false;
      if (filterStatus === "inactive" && s.isActive) return false;
      return true;
    });
  }, [staff, searchQuery, filterRole, filterStatus]);

  const handleInvite = () => {
    if (!inviteForm.email || !inviteForm.firstName || !inviteForm.lastName) return;
    inviteMutation.mutate(
      { gymId, data: { email: inviteForm.email, firstName: inviteForm.firstName, lastName: inviteForm.lastName, role: inviteForm.role as any } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListStaffQueryKey(gymId) });
          toast({ title: "Staff Invited", description: `${inviteForm.firstName} ${inviteForm.lastName} has been added.` });
          setInviteOpen(false);
          setInviteForm({ email: "", firstName: "", lastName: "", role: "coach" });
        },
        onError: (error: any) => {
          toast({ title: "Error", description: error?.data?.error || error?.message || "Failed to invite.", variant: "destructive" });
        },
      }
    );
  };

  const handleUpdateRole = (staffId: number, role: string) => {
    updateMutation.mutate(
      { gymId, staffId, data: { role: role as any } },
      {
        onSuccess: (updated) => {
          queryClient.invalidateQueries({ queryKey: getListStaffQueryKey(gymId) });
          toast({ title: "Role Updated", description: `Role changed to ${ROLE_INFO[role]?.label || role}.` });
          if (detailStaff?.id === staffId) setDetailStaff(updated as unknown as StaffMember);
        },
        onError: (error: any) => {
          toast({ title: "Error", description: error?.data?.error || error?.message || "Failed to update.", variant: "destructive" });
        },
      }
    );
  };

  const handleToggleActive = (s: StaffMember) => {
    updateMutation.mutate(
      { gymId, staffId: s.id, data: { isActive: !s.isActive } },
      {
        onSuccess: (updated) => {
          queryClient.invalidateQueries({ queryKey: getListStaffQueryKey(gymId) });
          toast({ title: s.isActive ? "Access Suspended" : "Access Restored", description: `${s.firstName} ${s.lastName}'s access has been ${s.isActive ? "suspended" : "restored"}.` });
          if (detailStaff?.id === s.id) setDetailStaff(updated as unknown as StaffMember);
        },
        onError: (error: any) => {
          toast({ title: "Error", description: error?.data?.error || error?.message || "Failed to update.", variant: "destructive" });
        },
      }
    );
  };

  const handleRemove = () => {
    if (!removeTarget) return;
    removeMutation.mutate(
      { gymId, staffId: removeTarget.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListStaffQueryKey(gymId) });
          toast({ title: "Staff Removed", description: `${removeTarget.firstName} ${removeTarget.lastName} has been removed.` });
          setRemoveTarget(null);
          if (detailStaff?.id === removeTarget.id) setDetailStaff(null);
        },
        onError: (error: any) => {
          toast({ title: "Error", description: error?.data?.error || error?.message || "Failed to remove.", variant: "destructive" });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 animate-pulse">
        <div className="h-5 w-40 bg-muted rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center flex-1 w-full sm:w-auto">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search staff..." className="pl-9" />
          </div>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="gym_owner">Owner</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="coach">Coach</SelectItem>
              <SelectItem value="front_desk">Front Desk</SelectItem>
              <SelectItem value="analyst">Analyst</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[120px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <button
          onClick={() => setInviteOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-medium transition-colors shadow-lg shadow-primary/20 w-full sm:w-auto justify-center"
        >
          <Plus className="h-4 w-4" />
          Invite Staff
        </button>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-muted-foreground">
            {staff && staff.length > 0 ? "No staff members match your filters." : "No staff members yet. Invite your first team member."}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((s, i) => {
              const roleInfo = ROLE_INFO[s.role || "coach"] || ROLE_INFO.coach;
              const isOwner = s.role === "gym_owner";
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => setDetailStaff(s)}
                  className="flex items-center gap-4 px-4 sm:px-6 py-4 hover:bg-secondary transition-colors cursor-pointer group"
                >
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0">
                    {s.firstName?.[0]}{s.lastName?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{s.firstName} {s.lastName}</p>
                    <p className="text-sm text-muted-foreground truncate">{s.email}</p>
                  </div>
                  <Badge variant="outline" className={`${roleInfo.color} hidden sm:inline-flex`}>
                    {roleInfo.label}
                  </Badge>
                  <Badge variant={s.isActive ? "default" : "secondary"} className={`text-xs hidden sm:inline-flex ${s.isActive ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : ""}`}>
                    {s.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                      <button className="p-1.5 rounded-lg hover:bg-secondary transition-colors opacity-0 group-hover:opacity-100">
                        <MoreVertical className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={e => e.stopPropagation()}>
                      <DropdownMenuItem onClick={() => setDetailStaff(s)}>View Details</DropdownMenuItem>
                      {!isOwner && (
                        <>
                          <DropdownMenuItem onClick={() => handleToggleActive(s)}>
                            {s.isActive ? "Suspend Access" : "Restore Access"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setRemoveTarget(s)} className="text-destructive focus:text-destructive">
                            Remove from Business
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block" />
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Role Permissions</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(ROLE_INFO).map(([key, info]) => (
            <div key={key} className="p-3 rounded-xl border border-border bg-background">
              <Badge variant="outline" className={`${info.color} mb-2`}>{info.label}</Badge>
              <p className="text-xs text-muted-foreground">{info.desc}</p>
            </div>
          ))}
        </div>
      </motion.div>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Staff Member</DialogTitle>
            <DialogDescription>Add a new team member to your gym.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input value={inviteForm.firstName} onChange={e => setInviteForm(p => ({ ...p, firstName: e.target.value }))} placeholder="First name" />
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input value={inviteForm.lastName} onChange={e => setInviteForm(p => ({ ...p, lastName: e.target.value }))} placeholder="Last name" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" value={inviteForm.email} onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))} placeholder="email@example.com" />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteForm.role} onValueChange={v => setInviteForm(p => ({ ...p, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="coach">Coach</SelectItem>
                  <SelectItem value="front_desk">Front Desk</SelectItem>
                  <SelectItem value="analyst">Analyst</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setInviteOpen(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg border border-border hover:bg-secondary">Cancel</button>
            <button
              onClick={handleInvite}
              disabled={inviteMutation.isPending || !inviteForm.email || !inviteForm.firstName || !inviteForm.lastName}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              {inviteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <Mail className="h-4 w-4" />
              Send Invite
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={!!detailStaff} onOpenChange={open => { if (!open) setDetailStaff(null); }}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{detailStaff?.firstName} {detailStaff?.lastName}</SheetTitle>
            <SheetDescription>Staff member details and access management.</SheetDescription>
          </SheetHeader>
          {detailStaff && (
            <div className="mt-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-xl font-bold text-muted-foreground">
                  {detailStaff.firstName?.[0]}{detailStaff.lastName?.[0]}
                </div>
                <div>
                  <p className="text-lg font-semibold">{detailStaff.firstName} {detailStaff.lastName}</p>
                  <p className="text-sm text-muted-foreground">{detailStaff.email}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-background">
                  <div>
                    <p className="text-sm font-medium">Status</p>
                    <p className="text-xs text-muted-foreground">{detailStaff.isActive ? "This member has active access" : "Access is currently suspended"}</p>
                  </div>
                  <Badge variant={detailStaff.isActive ? "default" : "secondary"} className={detailStaff.isActive ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : ""}>
                    {detailStaff.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>

                <div className="p-3 rounded-xl border border-border bg-background space-y-2">
                  <p className="text-sm font-medium">Role</p>
                  {detailStaff.role === "gym_owner" ? (
                    <Badge variant="outline" className={ROLE_INFO.gym_owner.color}>Owner</Badge>
                  ) : (
                    <Select value={detailStaff.role || "coach"} onValueChange={v => handleUpdateRole(detailStaff.id, v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="coach">Coach</SelectItem>
                        <SelectItem value="front_desk">Front Desk</SelectItem>
                        <SelectItem value="analyst">Analyst</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <p className="text-xs text-muted-foreground">{ROLE_INFO[detailStaff.role || "coach"]?.desc}</p>
                </div>

                {detailStaff.specialties && detailStaff.specialties.length > 0 && (
                  <div className="p-3 rounded-xl border border-border bg-background">
                    <p className="text-sm font-medium mb-2">Specialties</p>
                    <div className="flex flex-wrap gap-1.5">
                      {detailStaff.specialties.map((sp, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{sp}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {detailStaff.joinDate && (
                  <div className="p-3 rounded-xl border border-border bg-background">
                    <p className="text-sm font-medium">Joined</p>
                    <p className="text-sm text-muted-foreground">{detailStaff.joinDate}</p>
                  </div>
                )}
              </div>

              {detailStaff.role !== "gym_owner" && (
                <div className="pt-4 border-t border-border space-y-3">
                  <button
                    onClick={() => handleToggleActive(detailStaff)}
                    disabled={updateMutation.isPending}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
                  >
                    {detailStaff.isActive ? (
                      <><UserX className="h-4 w-4" /> Suspend Access</>
                    ) : (
                      <><Shield className="h-4 w-4" /> Restore Access</>
                    )}
                  </button>
                  <button
                    onClick={() => { setRemoveTarget(detailStaff); setDetailStaff(null); }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <UserX className="h-4 w-4" />
                    Remove from Business
                  </button>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!removeTarget} onOpenChange={open => { if (!open) setRemoveTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Staff Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{removeTarget?.firstName} {removeTarget?.lastName}</strong> from your gym? They will lose all access immediately. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {removeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
