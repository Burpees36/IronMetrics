import React, { useState } from "react";
import { useGym } from "@/store/GymContext";
import { useGetMember, useGetMemberTimeline, useUpdateMember, useAddMemberNote, getGetMemberQueryKey, getGetMemberTimelineQueryKey, getListMembersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  Loader2, ArrowLeft, UserCircle, Mail, Phone, Calendar, Shield,
  MapPin, StickyNote, Clock, Edit, Pause, XCircle, Play, AlertTriangle,
  CheckCircle, Activity, CreditCard, Plus
} from "lucide-react";
import { Link } from "wouter";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function MemberDetail() {
  const { activeGymId } = useGym();
  const [, params] = useRoute("/members/:memberId");
  const memberId = params?.memberId ? parseInt(params.memberId, 10) : 0;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"overview" | "notes" | "timeline">("overview");
  const [editOpen, setEditOpen] = useState(false);
  const [statusAction, setStatusAction] = useState<"hold" | "cancelled" | "active" | null>(null);
  const [noteContent, setNoteContent] = useState("");

  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
  });

  const { data: member, isLoading, isError } = useGetMember(activeGymId as number, memberId, {
    query: { enabled: !!activeGymId && !!memberId } as any
  });

  const { data: timeline } = useGetMemberTimeline(activeGymId as number, memberId, {
    query: { enabled: !!activeGymId && !!memberId } as any
  });

  const updateMutation = useUpdateMember();
  const addNoteMutation = useAddMemberNote();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getGetMemberQueryKey(activeGymId as number, memberId) });
    queryClient.invalidateQueries({ queryKey: getGetMemberTimelineQueryKey(activeGymId as number, memberId) });
    queryClient.invalidateQueries({ queryKey: getListMembersQueryKey(activeGymId as number) });
  };

  const handleEditOpen = () => {
    if (member) {
      setEditForm({
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        phone: member.phone || "",
        address: member.address || "",
        emergencyContactName: member.emergencyContactName || "",
        emergencyContactPhone: member.emergencyContactPhone || "",
      });
      setEditOpen(true);
    }
  };

  const handleEditSave = () => {
    if (!activeGymId) return;
    updateMutation.mutate(
      {
        gymId: activeGymId,
        memberId,
        data: {
          firstName: editForm.firstName,
          lastName: editForm.lastName,
          email: editForm.email,
          phone: editForm.phone || null,
          address: editForm.address || null,
          emergencyContactName: editForm.emergencyContactName || null,
          emergencyContactPhone: editForm.emergencyContactPhone || null,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Member updated", description: "Profile has been saved." });
          setEditOpen(false);
          invalidateAll();
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to update member." });
        },
      }
    );
  };

  const handleStatusChange = () => {
    if (!activeGymId || !statusAction) return;
    updateMutation.mutate(
      { gymId: activeGymId, memberId, data: { status: statusAction } },
      {
        onSuccess: () => {
          toast({ title: "Status updated", description: `Member has been set to ${statusAction}.` });
          setStatusAction(null);
          invalidateAll();
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to update status." });
        },
      }
    );
  };

  const handleAddNote = () => {
    if (!activeGymId || !noteContent.trim()) return;
    addNoteMutation.mutate(
      { gymId: activeGymId, memberId, data: { content: noteContent.trim() } },
      {
        onSuccess: () => {
          toast({ title: "Note added", description: "Note has been saved." });
          setNoteContent("");
          invalidateAll();
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to add note." });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (isError || !member) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Member not found.</p>
        <Link href="/members" className="text-primary hover:underline text-sm">Back to Members</Link>
      </div>
    );
  }

  const statusColor = member.status === "active" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
    : member.status === "hold" ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
    : member.status === "inactive" ? "bg-muted text-muted-foreground border-border"
    : "bg-destructive/10 text-destructive border-destructive/20";

  const riskColor = member.riskTier === "critical" ? "text-red-500"
    : member.riskTier === "high" ? "text-orange-500"
    : member.riskTier === "healthy" ? "text-emerald-500"
    : "text-yellow-500";

  const tabs = [
    { key: "overview" as const, label: "Overview", icon: Activity },
    { key: "notes" as const, label: "Notes", icon: StickyNote },
    { key: "timeline" as const, label: "Timeline", icon: Clock },
  ];

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-3">
        <Link href="/members">
          <button className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-white/5">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </Link>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Member Profile</h1>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl p-6 shadow-sm"
      >
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          <div className="h-20 w-20 bg-muted rounded-full overflow-hidden flex items-center justify-center shrink-0">
            {member.profileImageUrl ? (
              <img src={member.profileImageUrl} alt={member.firstName} className="w-full h-full object-cover" />
            ) : (
              <UserCircle className="h-12 w-12 text-muted-foreground" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
              <h2 className="text-2xl font-bold text-foreground">{member.firstName} {member.lastName}</h2>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusColor}`}>
                  {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                </span>
                {member.riskTier && (
                  <span className={`flex items-center gap-1.5 text-xs font-semibold ${riskColor}`}>
                    <div className="h-2 w-2 rounded-full bg-current" />
                    {member.riskTier.toUpperCase()} RISK
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0" />
                <span className="truncate">{member.email}</span>
              </div>
              {member.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4 shrink-0" />
                  <span>{member.phone}</span>
                </div>
              )}
              {member.joinDate && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4 shrink-0" />
                  <span>Joined {new Date(member.joinDate).toLocaleDateString()}</span>
                </div>
              )}
              {member.address && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span className="truncate">{member.address}</span>
                </div>
              )}
              {member.emergencyContactName && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Shield className="h-4 w-4 shrink-0" />
                  <span className="truncate">Emergency: {member.emergencyContactName} {member.emergencyContactPhone ? `(${member.emergencyContactPhone})` : ""}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              onClick={handleEditOpen}
              className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-border rounded-xl text-sm font-medium text-foreground hover:bg-white/10 transition-colors"
            >
              <Edit className="h-4 w-4" /> Edit
            </button>
            {member.status === "active" && (
              <>
                <button
                  onClick={() => setStatusAction("hold")}
                  className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-sm font-medium text-yellow-500 hover:bg-yellow-500/20 transition-colors"
                >
                  <Pause className="h-4 w-4" /> Hold
                </button>
                <button
                  onClick={() => setStatusAction("cancelled")}
                  className="flex items-center gap-2 px-3 py-2 bg-destructive/10 border border-destructive/20 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/20 transition-colors"
                >
                  <XCircle className="h-4 w-4" /> Cancel
                </button>
              </>
            )}
            {(member.status === "hold" || member.status === "cancelled" || member.status === "inactive") && (
              <button
                onClick={() => setStatusAction("active")}
                className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-sm font-medium text-emerald-500 hover:bg-emerald-500/20 transition-colors"
              >
                <Play className="h-4 w-4" /> Reactivate
              </button>
            )}
          </div>
        </div>
      </motion.div>

      <div className="flex gap-1 bg-card border border-border rounded-xl p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex-1 justify-center ${
              activeTab === tab.key
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
              <CreditCard className="h-5 w-5 text-primary" /> Subscription
            </h3>
            {member.activeSubscription ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">Plan</span>
                  <span className="text-foreground font-medium">{member.activeSubscription.planName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">Status</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                    member.activeSubscription.status === "active" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-muted text-muted-foreground border-border"
                  }`}>{member.activeSubscription.status}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">Amount</span>
                  <span className="text-foreground font-medium">${parseFloat(member.activeSubscription.amount).toFixed(2)}/mo</span>
                </div>
                {member.activeSubscription.currentPeriodEnd && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-sm">Next Billing</span>
                    <span className="text-foreground">{new Date(member.activeSubscription.currentPeriodEnd).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No active subscription.</p>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5 text-primary" /> Recent Attendance
            </h3>
            {member.recentAttendance && member.recentAttendance.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                {member.recentAttendance.map((att) => (
                  <div key={att.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium text-foreground">{att.className || "Open Gym"}</p>
                      <p className="text-xs text-muted-foreground">{new Date(att.checkinTime).toLocaleString()}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                      att.status === "present" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                      : att.status === "late_cancel" ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                      : "bg-destructive/10 text-destructive border-destructive/20"
                    }`}>{att.status.replace("_", " ")}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No recent attendance records.</p>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card border border-border rounded-2xl p-6 shadow-sm lg:col-span-2">
            <h3 className="text-lg font-semibold text-foreground mb-4">Member Stats</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-white/5 rounded-xl">
                <p className="text-2xl font-bold text-foreground">{member.attendanceCount30d ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Visits (30d)</p>
              </div>
              <div className="text-center p-4 bg-white/5 rounded-xl">
                <p className="text-2xl font-bold text-foreground">{member.riskScore ?? "-"}</p>
                <p className="text-xs text-muted-foreground mt-1">Risk Score</p>
              </div>
              <div className="text-center p-4 bg-white/5 rounded-xl">
                <p className="text-2xl font-bold text-foreground">{member.lastVisitDate ? new Date(member.lastVisitDate).toLocaleDateString() : "-"}</p>
                <p className="text-xs text-muted-foreground mt-1">Last Visit</p>
              </div>
              <div className="text-center p-4 bg-white/5 rounded-xl">
                <p className="text-2xl font-bold text-foreground">{member.tags?.length || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Tags</p>
              </div>
            </div>
            {member.tags && member.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {member.tags.map((tag) => (
                  <span key={tag} className="px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium border border-primary/20">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      )}

      {activeTab === "notes" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground mb-4">Add Note</h3>
            <div className="flex gap-3">
              <Textarea
                placeholder="Write a note about this member..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                className="flex-1 bg-background border-border min-h-[80px]"
              />
              <button
                onClick={handleAddNote}
                disabled={!noteContent.trim() || addNoteMutation.isPending}
                className="self-end flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-medium transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                {addNoteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {member.notes && member.notes.length > 0 ? member.notes.map((note) => (
              <div key={note.id} className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">{note.authorName}</span>
                  <span className="text-xs text-muted-foreground">{new Date(note.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{note.content}</p>
              </div>
            )) : (
              <div className="bg-card border border-border rounded-2xl p-8 text-center">
                <StickyNote className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No notes yet.</p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {activeTab === "timeline" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-6">Activity Timeline</h3>
          {timeline && timeline.length > 0 ? (
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
              <div className="space-y-6">
                {timeline.map((event) => (
                  <div key={event.id} className="relative flex gap-4 pl-10">
                    <div className="absolute left-2.5 top-1 h-3 w-3 rounded-full bg-primary border-2 border-card" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-medium text-foreground">{event.title}</h4>
                        <span className="text-xs text-muted-foreground shrink-0">{new Date(event.date).toLocaleDateString()}</span>
                      </div>
                      {event.description && (
                        <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
                      )}
                      <span className="inline-block mt-1 px-2 py-0.5 bg-white/5 rounded text-[10px] text-muted-foreground font-medium uppercase">{event.type}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No timeline events.</p>
            </div>
          )}
        </motion.div>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-first">First Name</Label>
                <Input id="edit-first" value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} className="bg-background border-border" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-last">Last Name</Label>
                <Input id="edit-last" value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} className="bg-background border-border" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input id="edit-email" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="bg-background border-border" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input id="edit-phone" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="bg-background border-border" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">Address</Label>
              <Input id="edit-address" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} className="bg-background border-border" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-ec-name">Emergency Contact</Label>
                <Input id="edit-ec-name" value={editForm.emergencyContactName} onChange={(e) => setEditForm({ ...editForm, emergencyContactName: e.target.value })} className="bg-background border-border" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-ec-phone">EC Phone</Label>
                <Input id="edit-ec-phone" value={editForm.emergencyContactPhone} onChange={(e) => setEditForm({ ...editForm, emergencyContactPhone: e.target.value })} className="bg-background border-border" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setEditOpen(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
            <button
              onClick={handleEditSave}
              disabled={updateMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
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
            <AlertDialogCancel className="bg-transparent border-border hover:bg-white/5">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleStatusChange}
              className={statusAction === "active" ? "bg-emerald-600 hover:bg-emerald-700" : statusAction === "hold" ? "bg-yellow-600 hover:bg-yellow-700" : "bg-destructive hover:bg-destructive/90"}
            >
              {statusAction === "hold" ? "Place on Hold" : statusAction === "cancelled" ? "Cancel Membership" : "Reactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
