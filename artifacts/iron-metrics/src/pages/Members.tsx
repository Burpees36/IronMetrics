import React, { useState, useEffect, useMemo } from "react";
import { useGym } from "@/store/GymContext";
import { useListMembers, useUpdateMember, useAddMemberNote, getListMembersQueryKey, useListMembershipPlans, useListProgrammingTracks } from "@workspace/api-client-react";
import type { ApiError } from "@workspace/api-client-react/custom-fetch";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Loader2, Search, Plus, Filter, MoreHorizontal, UserCircle, Upload, FileSpreadsheet, ShieldAlert, Users, X as XIcon, ChevronLeft, ChevronRight, GitBranch } from "lucide-react";
import { ImportMembersDialog } from "@/components/members/ImportMembersDialog";
import { SyncStatusBanner } from "@/components/members/SyncStatusBanner";
import { AddMemberWizard } from "@/components/members/AddMemberWizard";
import { Link, useLocation, useSearch } from "wouter";
import { useIsMobile } from "@/hooks/useMobile";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { PageError } from "@/components/ui/page-error";

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
  lastVisitDate?: string | null;
  monthlyRevenue?: string | number | null;
  tags: string[];
  birthDate?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  waiverSigned?: boolean;
  updatedAt?: string | null;
};

function daysSince(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)));
}

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

function FormField({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm text-foreground">{label}{required && <span className="text-destructive ml-0.5">*</span>}</Label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
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
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const urlFilter = urlParams.get("filter");
  const urlIds = urlParams.get("ids");
  const urlSource = urlParams.get("source");
  const urlPlan = urlParams.get("plan");
  const [idsFilter, setIdsFilter] = useState<string | null>(urlIds);
  const [idsSource, setIdsSource] = useState<string | null>(urlSource);
  const [riskViewActive, setRiskViewActive] = useState(urlFilter === "at-risk");

  useEffect(() => {
    if (urlFilter === "at-risk") {
      setRiskViewActive(true);
      setStatusFilter(["active"]);
    } else if (urlFilter === "cancelled") {
      setRiskViewActive(false);
      setStatusFilter(["cancelled"]);
    }
  }, [urlFilter]);

  useEffect(() => {
    setIdsFilter(urlIds);
    setIdsSource(urlSource);
  }, [urlIds, urlSource]);

  useEffect(() => {
    setPlanFilter(urlPlan || "");
  }, [urlPlan]);

  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [syncRefreshKey, setSyncRefreshKey] = useState(0);
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
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  const [noteContent, setNoteContent] = useState("");

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [trackDialogOpen, setTrackDialogOpen] = useState(false);
  const [trackAction, setTrackAction] = useState<"assign" | "remove">("assign");
  const [selectedTrack, setSelectedTrack] = useState("");
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const [tempStatusFilter, setTempStatusFilter] = useState<string[]>([]);
  const [tempRiskFilter, setTempRiskFilter] = useState<string[]>([]);
  const [riskFilter, setRiskFilter] = useState<string[]>([]);
  const [planFilter, setPlanFilter] = useState<string>(urlPlan || "");
  const [tempPlanFilter, setTempPlanFilter] = useState<string>(urlPlan || "");

  const { data: plans } = useListMembershipPlans(activeGymId as number, {
    query: { enabled: !!activeGymId }
  });

  const { data: tracksData } = useListProgrammingTracks(activeGymId as number, {
    query: { enabled: !!activeGymId }
  });

  const PAGE_SIZE = 50;
  const [currentPage, setCurrentPage] = useState(1);

  const filterParams: Record<string, string | number> = {};
  if (search) filterParams.search = search;
  if (idsFilter) filterParams.ids = idsFilter;
  if (statusFilter.length === 1) filterParams.status = statusFilter[0];
  if (planFilter) filterParams.planId = parseInt(planFilter, 10);
  if (riskViewActive) {
    const tiers = riskFilter.length > 0 ? riskFilter.join(",") : "critical,high,moderate";
    filterParams.riskTiers = tiers;
    filterParams.status = "active";
    filterParams.limit = 500;
    filterParams.offset = 0;
  } else if (idsFilter) {
    filterParams.limit = 200;
    filterParams.offset = 0;
  } else {
    filterParams.limit = PAGE_SIZE;
    filterParams.offset = (currentPage - 1) * PAGE_SIZE;
  }

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [search, statusFilter, planFilter]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [currentPage]);

  const { data, isLoading, isError: membersError, refetch: refetchMembers } = useListMembers(activeGymId as number, filterParams as any, {
    query: { enabled: !!activeGymId, placeholderData: (prev: any) => prev } as any
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  const updateMemberMutation = useUpdateMember();
  const addNoteMutation = useAddMemberNote();

  const gymId = activeGymId as number;

  const handleEditMember = () => {
    if (!selectedMember) return;

    const errors: Record<string, string> = {};
    if (!editForm.firstName.trim()) errors.firstName = "First name is required";
    if (!editForm.lastName.trim()) errors.lastName = "Last name is required";
    if (!editForm.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email.trim())) {
      errors.email = "Invalid email format";
    }
    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }
    setEditErrors({});

    updateMemberMutation.mutate({
      gymId,
      memberId: selectedMember.id,
      data: {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        email: editForm.email.trim(),
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
      onError: (err: ApiError) => {
        const errData = err.data as { error?: string; fieldErrors?: Record<string, string> } | null;
        const fieldErrors = errData?.fieldErrors;
        if (fieldErrors) {
          setEditErrors(fieldErrors);
        } else {
          toast({ title: "Error", description: errData?.error || "Failed to update member.", variant: "destructive" });
        }
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
      city: member.city || "",
      state: member.state || "",
      membershipType: member.membershipType || "",
      waiverSigned: member.waiverSigned || false,
    });
    setEditErrors({});
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

  const toggleSelectMember = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === displayMembers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(displayMembers.map((m: MemberFromList) => m.id)));
    }
  };

  const availableTracks = useMemo(() => {
    const tracks = (tracksData as string[] | undefined) ?? [];
    return tracks.filter(t => t !== "default");
  }, [tracksData]);

  const handleBulkTrackAssign = async () => {
    if (!selectedTrack || selectedIds.size === 0) return;
    setBulkUpdating(true);
    const members = (data?.members ?? []) as MemberFromList[];
    const targetMembers = members.filter(m => selectedIds.has(m.id));
    const tagKey = `track:${selectedTrack}`;

    let successCount = 0;
    for (const member of targetMembers) {
      const currentTags = member.tags ?? [];
      let newTags: string[];
      if (trackAction === "assign") {
        if (currentTags.includes(tagKey)) { successCount++; continue; }
        newTags = [...currentTags, tagKey];
      } else {
        if (!currentTags.includes(tagKey)) { successCount++; continue; }
        newTags = currentTags.filter(t => t !== tagKey);
      }
      try {
        await updateMemberMutation.mutateAsync({
          gymId,
          memberId: member.id,
          data: { tags: newTags },
        });
        successCount++;
      } catch {
        // continue with remaining
      }
    }

    queryClient.invalidateQueries({ queryKey: getListMembersQueryKey(gymId) });
    toast({
      title: trackAction === "assign" ? "Track assigned" : "Track removed",
      description: `${successCount} member${successCount !== 1 ? "s" : ""} updated.`,
    });
    setBulkUpdating(false);
    setTrackDialogOpen(false);
    setSelectedIds(new Set());
    setSelectedTrack("");
  };

  const openFilter = () => {
    setTempStatusFilter([...statusFilter]);
    setTempRiskFilter([...riskFilter]);
    setTempPlanFilter(planFilter);
    setFilterOpen(true);
  };

  const applyFilters = () => {
    setStatusFilter(tempStatusFilter);
    setRiskFilter(tempRiskFilter);
    setPlanFilter(tempPlanFilter);
    if (tempRiskFilter.length > 0) {
      setRiskViewActive(true);
    } else if (riskViewActive && tempRiskFilter.length === 0) {
      setRiskViewActive(false);
    }
    setFilterOpen(false);
    const params = new URLSearchParams(searchString);
    if (tempPlanFilter) { params.set("plan", tempPlanFilter); } else { params.delete("plan"); }
    if (tempRiskFilter.length > 0) { params.set("filter", "at-risk"); } else { params.delete("filter"); }
    const qs = params.toString();
    navigate(qs ? `/members?${qs}` : "/members");
  };

  const clearFilters = () => {
    setTempStatusFilter([]);
    setTempRiskFilter([]);
    setTempPlanFilter("");
    setStatusFilter([]);
    setRiskFilter([]);
    setPlanFilter("");
    setRiskViewActive(false);
    setIdsFilter(null);
    setIdsSource(null);
    setFilterOpen(false);
    navigate("/members");
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

  const displayMembers = React.useMemo(() => {
    const members = data?.members ?? [];
    if (!riskViewActive) return members;
    return [...members].sort((a: any, b: any) => (b.riskScore ?? 0) - (a.riskScore ?? 0));
  }, [data?.members, riskViewActive]);

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
            <p className="text-sm md:text-base text-muted-foreground mt-1">Manage your member base.</p>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={openFilter}
              className={`p-2.5 bg-card border border-border rounded-xl hover:bg-muted transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${(statusFilter.length > 0 || planFilter) ? 'border-primary text-primary' : ''}`}
              aria-label="Filter members"
            >
              <Filter className="h-5 w-5 text-muted-foreground" />
              {(statusFilter.length > 0 || planFilter) && <span className="ml-1 text-xs font-medium text-primary">{statusFilter.length + (planFilter ? 1 : 0)}</span>}
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

      <SyncStatusBanner key={syncRefreshKey} onImport={() => setImportOpen(true)} memberCount={data?.total ?? 0} />

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-primary/5 border border-primary/20 rounded-xl">
          <GitBranch className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {selectedIds.size} member{selectedIds.size !== 1 ? "s" : ""} selected
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setTrackAction("assign"); setSelectedTrack(""); setTrackDialogOpen(true); }}
              className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Assign Track
            </button>
            <button
              onClick={() => { setTrackAction("remove"); setSelectedTrack(""); setTrackDialogOpen(true); }}
              className="px-3 py-1.5 text-xs font-medium bg-card border border-border text-foreground rounded-lg hover:bg-muted transition-colors"
            >
              Remove Track
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="p-1.5 hover:bg-primary/10 rounded-lg transition-colors"
              aria-label="Clear selection"
            >
              <XIcon className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}

      {riskViewActive && (
        <div className="flex items-center gap-3 px-4 py-3 bg-destructive/5 border border-destructive/20 rounded-xl">
          <ShieldAlert className="h-5 w-5 text-destructive shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">At-Risk Members</p>
            <p className="text-xs text-muted-foreground">
              {displayMembers.length} member{displayMembers.length !== 1 ? "s" : ""} with elevated churn risk — sorted by score.
              {(() => {
                const totalRev = displayMembers.reduce((sum: number, m: MemberFromList) => sum + (m.monthlyRevenue ? parseFloat(String(m.monthlyRevenue)) : 0), 0);
                return totalRev > 0 ? ` $${Math.round(totalRev).toLocaleString()}/mo at stake.` : "";
              })()}
            </p>
          </div>
          <button
            onClick={() => { setRiskViewActive(false); setStatusFilter([]); setRiskFilter([]); navigate("/members"); }}
            className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors"
            aria-label="Clear at-risk filter"
          >
            <XIcon className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      )}

      {idsFilter && (
        <div className="flex items-center gap-3 px-4 py-3 bg-primary/5 border border-primary/20 rounded-xl">
          <Users className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {displayMembers.length} recently cancelled member{displayMembers.length !== 1 ? "s" : ""} — {idsSource || "Win-back targets"}
            </p>
            <p className="text-xs text-muted-foreground">
              Showing members flagged by AI for outreach.
              {(() => {
                const totalRev = displayMembers.reduce((sum: number, m: MemberFromList) => sum + (m.monthlyRevenue ? parseFloat(String(m.monthlyRevenue)) : 0), 0);
                return totalRev > 0 ? ` $${Math.round(totalRev).toLocaleString()}/mo revenue lost.` : "";
              })()}
            </p>
          </div>
          <button
            onClick={() => { setIdsFilter(null); setIdsSource(null); navigate("/members"); }}
            className="p-1.5 hover:bg-primary/10 rounded-lg transition-colors"
            aria-label="Clear member filter"
          >
            <XIcon className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      )}

      <div className="flex-1 bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {membersError && !data ? (
          <PageError
            title="Unable to load members"
            message="We couldn't load your member list. Check your connection and try again."
            onRetry={() => refetchMembers()}
          />
        ) : isLoading && !data ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
        ) : isMobile ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-border">
            {displayMembers.map((member: any, i: number) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.05, 0.5) }}
                className="p-4 active:bg-secondary transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="shrink-0" onClick={e => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(member.id)}
                      onCheckedChange={() => toggleSelectMember(member.id)}
                      aria-label={`Select ${member.firstName} ${member.lastName}`}
                    />
                  </div>
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
                      {member.riskTier && member.status === "active" ? (
                        <span className={`flex items-center gap-1 text-[10px] font-semibold shrink-0 ${riskColor(member.riskTier)}`}>
                          <div className="h-1.5 w-1.5 rounded-full bg-current" />
                          {member.riskTier.toUpperCase()}
                        </span>
                      ) : null}
                    </div>
                    {idsFilter && (
                      <div className="flex items-center gap-3 mt-1.5 text-[10px]">
                        {member.updatedAt && (
                          <span className="text-muted-foreground">
                            Cancelled {new Date(member.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        )}
                        {member.membershipType && (
                          <span className="text-muted-foreground">{member.membershipType}</span>
                        )}
                        {member.monthlyRevenue ? (
                          <span className="font-semibold text-destructive">${parseFloat(String(member.monthlyRevenue)).toFixed(0)}/mo lost</span>
                        ) : null}
                      </div>
                    )}
                    {riskViewActive && !idsFilter && member.riskTier && (
                      <div className="flex items-center gap-3 mt-1.5 text-[10px]">
                        <div className="flex items-center gap-1.5">
                          <div className="w-10 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-destructive rounded-full" style={{ width: `${member.riskScore ?? 0}%` }} />
                          </div>
                          <span className="font-mono text-muted-foreground">{member.riskScore ?? 0}</span>
                        </div>
                        {(() => {
                          const days = daysSince(member.lastVisitDate);
                          if (days === null) return <span className="text-muted-foreground">No visits</span>;
                          return (
                            <span className={`font-medium ${days > 30 ? "text-destructive" : days > 14 ? "text-orange-500" : "text-muted-foreground"}`}>
                              {days === 0 ? "Today" : days === 1 ? "1d ago" : `${days}d ago`}
                            </span>
                          );
                        })()}
                        {member.monthlyRevenue ? (
                          <span className="font-semibold text-foreground">${parseFloat(String(member.monthlyRevenue)).toFixed(0)}/mo</span>
                        ) : null}
                      </div>
                    )}
                  </Link>
                  <RowActions member={member} />
                </div>
              </motion.div>
            ))}
            {displayMembers.length === 0 && data && (
              <EmptyMemberState hasSearch={!!search || statusFilter.length > 0 || !!planFilter || riskViewActive || !!idsFilter} onImport={() => setImportOpen(true)} onAdd={() => setAddOpen(true)} />
            )}
          </div>
        ) : (
          <div className="overflow-x-auto flex-1 custom-scrollbar">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b border-border sticky top-0 z-10 backdrop-blur-md">
                <tr>
                  <th className="pl-4 pr-2 py-4 w-10">
                    <Checkbox
                      checked={displayMembers.length > 0 && selectedIds.size === displayMembers.length}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all members"
                    />
                  </th>
                  <th className="px-6 py-4 font-semibold">Member</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  {idsFilter ? (
                    <>
                      <th className="px-6 py-4 font-semibold">Cancelled</th>
                      <th className="px-6 py-4 font-semibold">Plan</th>
                      <th className="px-6 py-4 font-semibold">Revenue Lost</th>
                    </>
                  ) : riskViewActive ? (
                    <>
                      <th className="px-6 py-4 font-semibold">Risk</th>
                      <th className="px-6 py-4 font-semibold">Last Visit</th>
                      <th className="px-6 py-4 font-semibold">Revenue</th>
                    </>
                  ) : (
                    <>
                      <th className="px-6 py-4 font-semibold">Membership</th>
                      <th className="px-6 py-4 font-semibold">Risk Tier</th>
                    </>
                  )}
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {displayMembers.map((member: any, i: number) => (
                  <motion.tr
                    key={member.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.05, 0.5) }}
                    className="hover:bg-secondary transition-colors group cursor-pointer"
                    onClick={() => navigate(`/members/${member.id}`)}
                  >
                    <td className="pl-4 pr-2 py-4 w-10" onClick={e => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(member.id)}
                        onCheckedChange={() => toggleSelectMember(member.id)}
                        aria-label={`Select ${member.firstName} ${member.lastName}`}
                      />
                    </td>
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
                    {idsFilter ? (
                      <>
                        <td className="px-6 py-4">
                          {member.updatedAt ? (
                            <span className="text-xs text-foreground">
                              {new Date(member.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              {(() => {
                                const days = daysSince(member.updatedAt);
                                return days !== null ? <span className="text-muted-foreground ml-1">({days}d ago)</span> : null;
                              })()}
                            </span>
                          ) : <span className="text-muted-foreground">-</span>}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {member.membershipType || "—"}
                        </td>
                        <td className="px-6 py-4">
                          {member.monthlyRevenue ? (
                            <span className="text-xs font-semibold text-destructive">${parseFloat(String(member.monthlyRevenue)).toFixed(0)}/mo</span>
                          ) : <span className="text-muted-foreground">-</span>}
                        </td>
                      </>
                    ) : riskViewActive ? (
                      <>
                        <td className="px-6 py-4">
                          {member.riskTier && member.status === "active" ? (
                            <div className="flex items-center gap-2">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                member.riskTier === "critical" ? "bg-destructive/10 text-destructive" :
                                member.riskTier === "high" ? "bg-orange-500/10 text-orange-500" :
                                "bg-amber-500/10 text-amber-500"
                              }`}>{member.riskTier}</span>
                              <div className="flex items-center gap-1.5">
                                <div className="w-10 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-destructive rounded-full" style={{ width: `${member.riskScore ?? 0}%` }} />
                                </div>
                                <span className="text-[10px] font-mono text-muted-foreground">{member.riskScore ?? 0}</span>
                              </div>
                            </div>
                          ) : <span className="text-muted-foreground">-</span>}
                        </td>
                        <td className="px-6 py-4">
                          {(() => {
                            const days = daysSince(member.lastVisitDate);
                            if (days === null) return <span className="text-muted-foreground">No visits</span>;
                            return (
                              <span className={`text-xs font-medium ${days > 30 ? "text-destructive" : days > 14 ? "text-orange-500" : "text-foreground"}`}>
                                {days === 0 ? "Today" : days === 1 ? "Yesterday" : `${days} days ago`}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4">
                          {member.monthlyRevenue ? (
                            <span className="text-xs font-semibold text-foreground">${parseFloat(String(member.monthlyRevenue)).toFixed(0)}/mo</span>
                          ) : <span className="text-muted-foreground">-</span>}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 text-muted-foreground">
                          {member.membershipType || "None"}
                        </td>
                        <td className="px-6 py-4">
                          {member.riskTier && member.status === "active" ? (
                            <span className={`flex items-center gap-1.5 text-xs font-semibold ${riskColor(member.riskTier)}`}>
                              <div className="h-2 w-2 rounded-full bg-current" />
                              {member.riskTier.toUpperCase()}
                            </span>
                          ) : <span className="text-muted-foreground">-</span>}
                        </td>
                      </>
                    )}
                    <td className="px-6 py-4 text-right">
                      <div className="opacity-0 group-hover:opacity-100">
                        <RowActions member={member} />
                      </div>
                    </td>
                  </motion.tr>
                ))}
                {displayMembers.length === 0 && data && (
                  <tr>
                    <td colSpan={idsFilter || riskViewActive ? 6 : 5}>
                      <EmptyMemberState hasSearch={!!search || statusFilter.length > 0 || !!planFilter || riskViewActive || !!idsFilter} onImport={() => setImportOpen(true)} onAdd={() => setAddOpen(true)} />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {data && (
          <div className="p-3 md:p-4 border-t border-border bg-muted/10 text-xs text-muted-foreground flex justify-between items-center shrink-0">
            <span>{idsFilter ? `Showing ${data.total} filtered member${data.total !== 1 ? "s" : ""}` : riskViewActive ? `Showing ${displayMembers.length} at-risk of ${data.total} members` : `Showing ${Math.min((currentPage - 1) * PAGE_SIZE + 1, data.total)}–${Math.min(currentPage * PAGE_SIZE, data.total)} of ${data.total} members`}</span>
            {totalPages > 1 && !riskViewActive && !idsFilter && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 7) {
                    pageNum = i + 1;
                  } else if (currentPage <= 4) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 3) {
                    pageNum = totalPages - 6 + i;
                  } else {
                    pageNum = currentPage - 3 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`min-w-[28px] h-7 rounded-lg text-xs font-medium transition-colors ${
                        currentPage === pageNum
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
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
              <FormField label="First Name" required error={editErrors.firstName}>
                <Input value={editForm.firstName} onChange={e => { setEditForm(f => ({ ...f, firstName: e.target.value })); setEditErrors(prev => { const n = {...prev}; delete n.firstName; return n; }); }} className={editErrors.firstName ? "border-red-400" : ""} />
              </FormField>
              <FormField label="Last Name" required error={editErrors.lastName}>
                <Input value={editForm.lastName} onChange={e => { setEditForm(f => ({ ...f, lastName: e.target.value })); setEditErrors(prev => { const n = {...prev}; delete n.lastName; return n; }); }} className={editErrors.lastName ? "border-red-400" : ""} />
              </FormField>
            </div>
            <FormField label="Email" required error={editErrors.email}>
              <Input type="email" value={editForm.email} onChange={e => { setEditForm(f => ({ ...f, email: e.target.value })); setEditErrors(prev => { const n = {...prev}; delete n.email; return n; }); }} className={editErrors.email ? "border-red-400" : ""} />
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
            {plans && plans.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Membership Plan</h3>
                <Select value={tempPlanFilter || "all"} onValueChange={(v) => setTempPlanFilter(v === "all" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All plans" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All plans</SelectItem>
                    {plans.filter((p: { isActive: boolean }) => p.isActive).map((plan: { id: number; name: string }) => (
                      <SelectItem key={plan.id} value={String(plan.id)}>{plan.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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

      <Dialog open={trackDialogOpen} onOpenChange={setTrackDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{trackAction === "assign" ? "Assign Track" : "Remove Track"}</DialogTitle>
            <DialogDescription>
              {trackAction === "assign"
                ? `Assign a programming track to ${selectedIds.size} selected member${selectedIds.size !== 1 ? "s" : ""}.`
                : `Remove a programming track from ${selectedIds.size} selected member${selectedIds.size !== 1 ? "s" : ""}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label className="text-sm text-foreground mb-2 block">Track</Label>
            {availableTracks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tracks available. Create tracks in the Workouts section first.</p>
            ) : (
              <Select value={selectedTrack} onValueChange={setSelectedTrack}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a track" />
                </SelectTrigger>
                <SelectContent>
                  {availableTracks.map(track => (
                    <SelectItem key={track} value={track}>
                      {track.charAt(0).toUpperCase() + track.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <DialogFooter>
            <button onClick={() => setTrackDialogOpen(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
            <button
              onClick={handleBulkTrackAssign}
              disabled={!selectedTrack || bulkUpdating}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {bulkUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
              {trackAction === "assign" ? "Assign" : "Remove"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportMembersDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImportComplete={() => {
          queryClient.invalidateQueries({ queryKey: getListMembersQueryKey(gymId, filterParams) });
          setSyncRefreshKey((k) => k + 1);
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
      <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
        <UserCircle className="h-7 w-7 text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">No members yet</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
        Get started by importing your existing members from a spreadsheet, or add them one at a time.
      </p>
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={onImport}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-medium text-sm rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
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
