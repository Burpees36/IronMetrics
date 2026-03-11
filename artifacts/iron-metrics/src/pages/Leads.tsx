import React, { useState } from "react";
import { useGym } from "@/store/GymContext";
import { useListLeads, useCreateLead, useUpdateLead, useConvertLeadToMember, getListLeadsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Loader2, Search, Plus, Target, Phone, Mail, MoreHorizontal, UserCheck, Edit, ArrowRight, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STAGE_COLORS: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  contacted: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  scheduled: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  trial: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  converted: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  lost: "bg-destructive/10 text-destructive border-destructive/20",
};

const STAGE_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  scheduled: "Scheduled",
  trial: "Trial",
  converted: "Converted",
  lost: "Lost",
};

const ALL_STAGES = ["new", "contacted", "scheduled", "trial", "converted", "lost"];

const SOURCE_OPTIONS = [
  { value: "website", label: "Website" },
  { value: "referral", label: "Referral" },
  { value: "walk_in", label: "Walk-in" },
  { value: "social_media", label: "Social Media" },
  { value: "other", label: "Other" },
];

export function Leads() {
  const { activeGymId } = useGym();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string | undefined>(undefined);

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    source: "",
    notes: "",
  });

  const [editFormData, setEditFormData] = useState({
    notes: "",
    source: "",
    stage: "",
  });

  const params = { search: search || undefined, stage: stageFilter };
  const { data: leads, isLoading } = useListLeads(activeGymId as number, params, {
    query: { enabled: !!activeGymId, queryKey: getListLeadsQueryKey(activeGymId as number, params) }
  });

  const createLeadMutation = useCreateLead();
  const updateLeadMutation = useUpdateLead();
  const convertLeadMutation = useConvertLeadToMember();

  const invalidateLeads = () => {
    queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey(activeGymId as number) });
  };

  const handleAddLead = () => {
    if (!activeGymId || !formData.firstName || !formData.lastName || !formData.email) return;
    createLeadMutation.mutate(
      {
        gymId: activeGymId,
        data: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone || null,
          source: formData.source || null,
          notes: formData.notes || null,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Lead created", description: `${formData.firstName} ${formData.lastName} added to pipeline.` });
          invalidateLeads();
          setAddOpen(false);
          setFormData({ firstName: "", lastName: "", email: "", phone: "", source: "", notes: "" });
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to create lead." });
        },
      }
    );
  };

  const handleEditLead = () => {
    if (!activeGymId || !selectedLead) return;
    updateLeadMutation.mutate(
      {
        gymId: activeGymId,
        leadId: selectedLead.id,
        data: {
          ...(editFormData.stage ? { stage: editFormData.stage as any } : {}),
          ...(editFormData.notes !== undefined ? { notes: editFormData.notes || null } : {}),
          ...(editFormData.source !== undefined ? { source: editFormData.source || null } : {}),
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Lead updated", description: `${selectedLead.firstName} ${selectedLead.lastName} updated.` });
          invalidateLeads();
          setEditOpen(false);
          setSelectedLead(null);
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to update lead." });
        },
      }
    );
  };

  const handleMoveStage = (lead: any, newStage: string) => {
    if (!activeGymId) return;
    updateLeadMutation.mutate(
      {
        gymId: activeGymId,
        leadId: lead.id,
        data: { stage: newStage as any },
      },
      {
        onSuccess: () => {
          toast({ title: "Stage updated", description: `${lead.firstName} ${lead.lastName} moved to ${STAGE_LABELS[newStage] || newStage}.` });
          invalidateLeads();
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to update stage." });
        },
      }
    );
  };

  const handleConvert = () => {
    if (!activeGymId || !selectedLead) return;
    convertLeadMutation.mutate(
      { gymId: activeGymId, leadId: selectedLead.id },
      {
        onSuccess: () => {
          toast({ title: "Lead converted", description: `${selectedLead.firstName} ${selectedLead.lastName} is now a member!` });
          invalidateLeads();
          setConvertOpen(false);
          setSelectedLead(null);
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to convert lead." });
        },
      }
    );
  };

  const openEdit = (lead: any) => {
    setSelectedLead(lead);
    setEditFormData({
      notes: lead.notes || "",
      source: lead.source || "",
      stage: lead.stage || "",
    });
    setEditOpen(true);
  };

  const openConvert = (lead: any) => {
    setSelectedLead(lead);
    setConvertOpen(true);
  };

  if (!activeGymId) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">Select a gym to view leads.</p>
      </div>
    );
  }

  const stageCounts: Record<string, number> = {};
  if (leads) {
    for (const lead of leads) {
      stageCounts[lead.stage] = (stageCounts[lead.stage] || 0) + 1;
    }
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-8 w-8 bg-primary/20 rounded-lg flex items-center justify-center">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground">Lead Pipeline</h1>
          </div>
          <p className="text-muted-foreground mt-1">Track and convert prospective members.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
          </div>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-medium transition-colors shadow-lg shadow-primary/20"
          >
            <Plus className="h-5 w-5" />
            <span className="hidden sm:inline">Add Lead</span>
          </button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2 shrink-0">
        <button
          onClick={() => setStageFilter(undefined)}
          className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
            !stageFilter ? "bg-primary/20 text-primary border-primary/30" : "bg-muted/30 text-muted-foreground border-border hover:bg-muted/50"
          }`}
        >
          All{leads ? ` (${leads.length})` : ""}
        </button>
        {ALL_STAGES.map((stage) => (
          <button
            key={stage}
            onClick={() => setStageFilter(stageFilter === stage ? undefined : stage)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
              stageFilter === stage
                ? STAGE_COLORS[stage] || "bg-muted text-muted-foreground border-border"
                : "bg-muted/30 text-muted-foreground border-border hover:bg-muted/50"
            }`}
          >
            {STAGE_LABELS[stage] || stage}{stageCounts[stage] ? ` (${stageCounts[stage]})` : ""}
          </button>
        ))}
      </div>

      <div className="flex-1 bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto flex-1 custom-scrollbar">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b border-border sticky top-0 z-10 backdrop-blur-md">
                <tr>
                  <th className="px-6 py-4 font-semibold">Lead</th>
                  <th className="px-6 py-4 font-semibold">Stage</th>
                  <th className="px-6 py-4 font-semibold">Source</th>
                  <th className="px-6 py-4 font-semibold">Contact</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {leads?.map((lead: any, i: number) => (
                  <motion.tr
                    key={lead.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.05, 0.5) }}
                    className="hover:bg-white/5 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-semibold text-foreground">{lead.firstName} {lead.lastName}</div>
                        <div className="text-xs text-muted-foreground">{lead.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${STAGE_COLORS[lead.stage] || 'bg-muted text-muted-foreground border-border'}`}>
                        {STAGE_LABELS[lead.stage] || lead.stage}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground capitalize">{lead.source || "—"}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {lead.phone && <Phone className="h-4 w-4 text-muted-foreground" />}
                        {lead.email && <Mail className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-2 text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100">
                            <MoreHorizontal className="h-5 w-5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => openEdit(lead)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Lead
                          </DropdownMenuItem>
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <ArrowRight className="h-4 w-4 mr-2" />
                              Move Stage
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              {ALL_STAGES.filter((s) => s !== lead.stage).map((stage) => (
                                <DropdownMenuItem key={stage} onClick={() => handleMoveStage(lead, stage)}>
                                  <span className={`inline-block w-2 h-2 rounded-full mr-2 ${STAGE_COLORS[stage]?.split(" ")[0]?.replace("/10", "") || "bg-muted"}`} />
                                  {STAGE_LABELS[stage]}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          <DropdownMenuSeparator />
                          {lead.stage !== "converted" && (
                            <DropdownMenuItem onClick={() => openConvert(lead)}>
                              <UserCheck className="h-4 w-4 mr-2" />
                              Convert to Member
                            </DropdownMenuItem>
                          )}
                          {lead.stage !== "lost" && (
                            <DropdownMenuItem
                              onClick={() => handleMoveStage(lead, "lost")}
                              className="text-destructive focus:text-destructive"
                            >
                              <X className="h-4 w-4 mr-2" />
                              Mark as Lost
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </motion.tr>
                ))}
                {leads?.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      No leads found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {leads && (
          <div className="p-4 border-t border-border bg-muted/10 text-xs text-muted-foreground shrink-0">
            <span>Showing {leads.length} lead{leads.length !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
            <DialogDescription>Enter the lead's information to add them to your pipeline.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-firstName">First Name *</Label>
                <Input
                  id="add-firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="First name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-lastName">Last Name *</Label>
                <Input
                  id="add-lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Last name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-email">Email *</Label>
              <Input
                id="add-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-phone">Phone</Label>
              <Input
                id="add-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(555) 123-4567"
              />
            </div>
            <div className="space-y-2">
              <Label>Source</Label>
              <Select value={formData.source} onValueChange={(val) => setFormData({ ...formData, source: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-notes">Notes</Label>
              <Input
                id="add-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any notes about this lead..."
              />
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setAddOpen(false)}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddLead}
              disabled={!formData.firstName || !formData.lastName || !formData.email || createLeadMutation.isPending}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {createLeadMutation.isPending ? "Creating..." : "Add Lead"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Lead</DialogTitle>
            <DialogDescription>
              {selectedLead ? `Update ${selectedLead.firstName} ${selectedLead.lastName}'s information.` : "Update lead information."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Stage</Label>
              <Select value={editFormData.stage} onValueChange={(val) => setEditFormData({ ...editFormData, stage: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  {ALL_STAGES.map((stage) => (
                    <SelectItem key={stage} value={stage}>{STAGE_LABELS[stage]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Source</Label>
              <Select value={editFormData.source} onValueChange={(val) => setEditFormData({ ...editFormData, source: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Input
                id="edit-notes"
                value={editFormData.notes}
                onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                placeholder="Notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setEditOpen(false)}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleEditLead}
              disabled={updateLeadMutation.isPending}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {updateLeadMutation.isPending ? "Saving..." : "Save Changes"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={convertOpen} onOpenChange={setConvertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convert Lead to Member</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedLead
                ? `Are you sure you want to convert ${selectedLead.firstName} ${selectedLead.lastName} to a full member? This will create a new member record.`
                : "Are you sure you want to convert this lead?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConvert}
              disabled={convertLeadMutation.isPending}
            >
              {convertLeadMutation.isPending ? "Converting..." : "Convert to Member"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
