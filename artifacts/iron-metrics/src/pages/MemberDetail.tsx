import React, { useState } from "react";
import { useGym } from "@/store/GymContext";
import {
  useGetMember, useGetMemberTimeline, useUpdateMember, useAddMemberNote,
  getGetMemberQueryKey, getGetMemberTimelineQueryKey, getListMembersQueryKey,
  useGetMemberBillingHistory, useListPaymentMethods, useCreateSetupIntent,
  useCreateStripeSubscription, useCreateOneTimeCharge, useListMembershipPlans,
  useCancelSubscription, usePauseSubscription, useResumeSubscription,
  getGetMemberBillingHistoryQueryKey, getListSubscriptionsQueryKey,
} from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  Loader2, ArrowLeft, UserCircle, Mail, Phone, Calendar, Shield,
  MapPin, StickyNote, Clock, Edit, Pause, XCircle, Play, AlertTriangle,
  CheckCircle, Activity, CreditCard, Plus, DollarSign, Receipt, RefreshCw,
  Send, Copy
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function MemberDetail() {
  const { activeGymId } = useGym();
  const [, params] = useRoute("/members/:memberId");
  const memberId = params?.memberId ? parseInt(params.memberId, 10) : 0;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"overview" | "notes" | "timeline" | "billing">("overview");
  const [editOpen, setEditOpen] = useState(false);
  const [statusAction, setStatusAction] = useState<"hold" | "cancelled" | "active" | null>(null);
  const [noteContent, setNoteContent] = useState("");
  const [chargeOpen, setChargeOpen] = useState(false);
  const [chargeForm, setChargeForm] = useState({ amount: "", description: "" });
  const [subOpen, setSubOpen] = useState(false);
  const [subPlanId, setSubPlanId] = useState("");
  const [cancelSubDialog, setCancelSubDialog] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(true);

  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    membershipType: "",
    waiverSigned: false,
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  const { data: member, isLoading, isError } = useGetMember(activeGymId as number, memberId, {
    query: { enabled: !!activeGymId && !!memberId } as any
  });

  const { data: timeline } = useGetMemberTimeline(activeGymId as number, memberId, {
    query: { enabled: !!activeGymId && !!memberId } as any
  });

  const updateMutation = useUpdateMember();
  const addNoteMutation = useAddMemberNote();

  const { data: billingHistory } = useGetMemberBillingHistory(activeGymId as number, memberId, {
    query: { enabled: !!activeGymId && !!memberId && activeTab === "billing" } as any
  });
  const { data: paymentMethods } = useListPaymentMethods(activeGymId as number, memberId, {
    query: { enabled: !!activeGymId && !!memberId && activeTab === "billing" } as any
  });
  const { data: plans } = useListMembershipPlans(activeGymId as number, {
    query: { enabled: !!activeGymId && activeTab === "billing" }
  });

  const createChargeMutation = useCreateOneTimeCharge();
  const createStripeSubMutation = useCreateStripeSubscription();
  const cancelSubMutation = useCancelSubscription();
  const pauseSubMutation = usePauseSubscription();
  const resumeSubMutation = useResumeSubscription();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getGetMemberQueryKey(activeGymId as number, memberId) });
    queryClient.invalidateQueries({ queryKey: getGetMemberTimelineQueryKey(activeGymId as number, memberId) });
    queryClient.invalidateQueries({ queryKey: getListMembersQueryKey(activeGymId as number) });
  };

  const invalidateBilling = () => {
    invalidateAll();
    queryClient.invalidateQueries({ queryKey: getGetMemberBillingHistoryQueryKey(activeGymId as number, memberId) });
    queryClient.invalidateQueries({ queryKey: getListSubscriptionsQueryKey(activeGymId as number) });
  };

  const [pauseSubConfirm, setPauseSubConfirm] = useState<number | null>(null);
  const [sendingRecoveryLink, setSendingRecoveryLink] = useState(false);

  const BASE_URL_MD = import.meta.env.BASE_URL || "/";
  const API_BASE_MD = `${BASE_URL_MD}api`.replace(/\/\//g, "/");

  const { data: memberRecovery } = useQuery({
    queryKey: ["member-recovery", activeGymId, memberId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_MD}/gyms/${activeGymId}/members/${memberId}/billing/recovery`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!activeGymId && !!memberId && activeTab === "billing",
  });

  const handleSendRecoveryLink = async () => {
    if (!memberRecovery?.id || !activeGymId) return;
    setSendingRecoveryLink(true);
    try {
      const res = await fetch(`${API_BASE_MD}/gyms/${activeGymId}/billing/recovery/${memberRecovery.id}/send-link`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.emailSent) {
        toast({ title: "Update link sent", description: "The member has been emailed a link to update their payment method." });
      } else if (data.updateLink) {
        toast({ title: "Link generated (email not sent)", description: data.error || "Email service may not be configured. Use Copy Link to share manually.", variant: "destructive" });
      } else {
        toast({ title: "Failed to send link", description: data.error || "An error occurred.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to send link", variant: "destructive" });
    } finally {
      setSendingRecoveryLink(false);
    }
  };

  const handleCopyRecoveryLink = async () => {
    if (!memberRecovery?.id || !activeGymId) return;
    try {
      const res = await fetch(`${API_BASE_MD}/gyms/${activeGymId}/billing/recovery/generate-link`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: memberRecovery.memberId, subscriptionId: memberRecovery.subscriptionId }),
      });
      const data = await res.json();
      if (data.updateLink) {
        await navigator.clipboard.writeText(data.updateLink);
        toast({ title: "Link copied", description: "Payment update link copied to clipboard." });
      }
    } catch {
      toast({ title: "Failed to generate link", variant: "destructive" });
    }
  };

  const isBillingMutating = createChargeMutation.isPending || createStripeSubMutation.isPending || cancelSubMutation.isPending || pauseSubMutation.isPending || resumeSubMutation.isPending;

  const handleCreateCharge = () => {
    if (!activeGymId || !chargeForm.amount || !chargeForm.description) return;
    const parsedAmount = parseFloat(chargeForm.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast({ title: "Invalid amount", description: "Please enter a positive dollar amount.", variant: "destructive" });
      return;
    }
    createChargeMutation.mutate(
      { gymId: activeGymId, memberId, data: { amount: parsedAmount, description: chargeForm.description } },
      {
        onSuccess: () => {
          toast({ title: "Charge created", description: `$${chargeForm.amount} charge applied.` });
          setChargeOpen(false);
          setChargeForm({ amount: "", description: "" });
          invalidateBilling();
        },
        onError: (err: any) => toast({ title: "Failed to create charge", description: err?.response?.data?.error || err?.message || "An unexpected error occurred.", variant: "destructive" }),
      }
    );
  };

  const handleCreateStripeSub = () => {
    if (!activeGymId || !subPlanId) return;
    createStripeSubMutation.mutate(
      { gymId: activeGymId, memberId, data: { planId: parseInt(subPlanId) } },
      {
        onSuccess: () => {
          toast({ title: "Subscription created", description: "Stripe subscription started." });
          setSubOpen(false);
          setSubPlanId("");
          invalidateBilling();
        },
        onError: (err: any) => toast({ title: "Failed to create subscription", description: err?.response?.data?.error || err?.message || "An unexpected error occurred.", variant: "destructive" }),
      }
    );
  };

  const handleCancelMemberSub = () => {
    if (!activeGymId || cancelSubDialog === null) return;
    cancelSubMutation.mutate(
      { gymId: activeGymId, subscriptionId: cancelSubDialog, data: { cancelAtPeriodEnd, reason: cancelReason || undefined } },
      {
        onSuccess: () => {
          toast({ title: "Subscription cancelled" });
          setCancelSubDialog(null);
          setCancelReason("");
          invalidateBilling();
        },
        onError: (err: any) => toast({ title: "Failed to cancel subscription", description: err?.response?.data?.error || err?.message || "An unexpected error occurred.", variant: "destructive" }),
      }
    );
  };

  const handlePauseMemberSub = (subId: number) => {
    setPauseSubConfirm(subId);
  };

  const confirmPauseMemberSub = () => {
    if (!activeGymId || pauseSubConfirm === null) return;
    pauseSubMutation.mutate(
      { gymId: activeGymId, subscriptionId: pauseSubConfirm },
      {
        onSuccess: () => { toast({ title: "Subscription paused" }); setPauseSubConfirm(null); invalidateBilling(); },
        onError: (err: any) => { toast({ title: "Failed to pause subscription", description: err?.response?.data?.error || err?.message || "An unexpected error occurred.", variant: "destructive" }); setPauseSubConfirm(null); }
      }
    );
  };

  const handleResumeMemberSub = (subId: number) => {
    if (!activeGymId) return;
    resumeSubMutation.mutate(
      { gymId: activeGymId, subscriptionId: subId },
      {
        onSuccess: () => { toast({ title: "Subscription resumed" }); invalidateBilling(); },
        onError: (err: any) => toast({ title: "Failed to resume subscription", description: err?.response?.data?.error || err?.message || "An unexpected error occurred.", variant: "destructive" })
      }
    );
  };

  const handleEditOpen = () => {
    if (member) {
      setEditForm({
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        phone: member.phone || "",
        address: member.address || "",
        city: member.city || "",
        state: member.state || "",
        emergencyContactName: member.emergencyContactName || "",
        emergencyContactPhone: member.emergencyContactPhone || "",
        membershipType: member.membershipType || "",
        waiverSigned: member.waiverSigned || false,
      });
      setEditErrors({});
      setEditOpen(true);
    }
  };

  const handleEditSave = () => {
    if (!activeGymId) return;

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

    updateMutation.mutate(
      {
        gymId: activeGymId,
        memberId,
        data: {
          firstName: editForm.firstName.trim(),
          lastName: editForm.lastName.trim(),
          email: editForm.email.trim(),
          phone: editForm.phone || null,
          address: editForm.address || null,
          city: editForm.city || null,
          state: editForm.state || null,
          emergencyContactName: editForm.emergencyContactName || null,
          emergencyContactPhone: editForm.emergencyContactPhone || null,
          membershipType: editForm.membershipType || null,
          waiverSigned: editForm.waiverSigned,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Member updated", description: "Profile has been saved." });
          setEditOpen(false);
          invalidateAll();
        },
        onError: (err: any) => {
          const fieldErrors = err?.response?.data?.fieldErrors;
          if (fieldErrors) {
            setEditErrors(fieldErrors);
          } else {
            toast({ title: "Error", description: err?.response?.data?.error || "Failed to update member.", variant: "destructive" });
          }
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
    { key: "billing" as const, label: "Billing", icon: CreditCard },
    { key: "notes" as const, label: "Notes", icon: StickyNote },
    { key: "timeline" as const, label: "Timeline", icon: Clock },
  ];

  const billingData = billingHistory as any;
  const methods = (paymentMethods ?? []) as any[];
  const bSubs = billingData?.subscriptions ?? [];
  const bPayments = billingData?.payments ?? [];
  const bInvoices = billingData?.invoices ?? [];
  const formatDate = (d: any) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
  const subStatusColor = (s: string) => {
    switch (s) {
      case "active": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "paused": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "cancelled": case "cancel_at_period_end": return "bg-destructive/10 text-destructive border-destructive/20";
      case "past_due": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "succeeded": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "failed": return "bg-destructive/10 text-destructive border-destructive/20";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-3">
        <Link href="/members">
          <button className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary">
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
              className="flex items-center gap-2 px-3 py-2 bg-secondary border border-border rounded-xl text-sm font-medium text-foreground hover:bg-secondary transition-colors"
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
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
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
              <div className="text-center p-4 bg-secondary rounded-xl">
                <p className="text-2xl font-bold text-foreground">{member.attendanceCount30d ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Visits (30d)</p>
              </div>
              <div className="text-center p-4 bg-secondary rounded-xl">
                <p className="text-2xl font-bold text-foreground">{member.riskScore ?? "-"}</p>
                <p className="text-xs text-muted-foreground mt-1">Risk Score</p>
              </div>
              <div className="text-center p-4 bg-secondary rounded-xl">
                <p className="text-2xl font-bold text-foreground">{member.lastVisitDate ? new Date(member.lastVisitDate).toLocaleDateString() : "-"}</p>
                <p className="text-xs text-muted-foreground mt-1">Last Visit</p>
              </div>
              <div className="text-center p-4 bg-secondary rounded-xl">
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
                      <span className="inline-block mt-1 px-2 py-0.5 bg-secondary rounded text-[10px] text-muted-foreground font-medium uppercase">{event.type}</span>
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

      {activeTab === "billing" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="flex flex-wrap gap-3">
            <button
              disabled={isBillingMutating}
              onClick={() => setSubOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-medium transition-colors shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" /> Start Subscription
            </button>
            <button
              disabled={isBillingMutating}
              onClick={() => setChargeOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-secondary border border-border rounded-xl text-sm font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <DollarSign className="h-4 w-4" /> One-Time Charge
            </button>
          </div>

          {memberRecovery && (
            <div className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 bg-orange-500/10 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Payment Action Needed</h4>
                    <p className="text-xs text-muted-foreground">
                      {memberRecovery.failedAttempts} failed payment{memberRecovery.failedAttempts > 1 ? "s" : ""}
                      {memberRecovery.amountDue ? ` — $${memberRecovery.amountDue.toFixed(2)} due` : ""}
                      {memberRecovery.lastNotifiedAt ? ` — Last notified: ${new Date(memberRecovery.lastNotifiedAt).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSendRecoveryLink}
                    disabled={sendingRecoveryLink}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 transition-colors disabled:opacity-50"
                  >
                    {sendingRecoveryLink ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                    Send Update Link
                  </button>
                  <button
                    onClick={handleCopyRecoveryLink}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
                  >
                    <Copy className="h-3 w-3" /> Copy Link
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
                <CreditCard className="h-5 w-5 text-primary" /> Subscriptions
              </h3>
              {bSubs.length > 0 ? (
                <div className="space-y-4">
                  {bSubs.map((sub: any) => (
                    <div key={sub.id} className="p-4 bg-muted/20 border border-border rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-foreground">{sub.planName || `Plan #${sub.planId}`}</span>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${subStatusColor(sub.status)}`}>
                          {sub.status === "cancel_at_period_end" ? "Cancelling" : sub.status?.charAt(0).toUpperCase() + sub.status?.slice(1)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground mb-1">
                        <span>Amount</span>
                        <span className="text-foreground font-medium">${sub.amount}/mo</span>
                      </div>
                      {sub.currentPeriodEnd && (
                        <div className="flex justify-between text-sm text-muted-foreground mb-1">
                          <span>Next billing</span>
                          <span className="text-foreground">{formatDate(sub.currentPeriodEnd)}</span>
                        </div>
                      )}
                      {sub.stripeSubscriptionId && (
                        <div className="flex justify-between text-sm text-muted-foreground mb-3">
                          <span>Stripe ID</span>
                          <span className="text-foreground font-mono text-xs">{sub.stripeSubscriptionId.slice(0, 20)}...</span>
                        </div>
                      )}
                      {sub.status === "past_due" && (
                        <div className="flex items-center gap-1.5 my-2 p-2 bg-orange-500/5 rounded-lg border border-orange-500/20">
                          <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                          <span className="text-xs font-medium text-orange-500">Payment action needed</span>
                        </div>
                      )}
                      <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                        {sub.status === "active" && (
                          <>
                            <button disabled={isBillingMutating} onClick={() => handlePauseMemberSub(sub.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                              <Pause className="h-3 w-3" /> Pause
                            </button>
                            <button disabled={isBillingMutating} onClick={() => setCancelSubDialog(sub.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                              <XCircle className="h-3 w-3" /> Cancel
                            </button>
                          </>
                        )}
                        {sub.status === "paused" && (
                          <button disabled={isBillingMutating} onClick={() => handleResumeMemberSub(sub.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            {resumeSubMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />} Resume
                          </button>
                        )}
                        {sub.status === "cancel_at_period_end" && (
                          <button disabled={isBillingMutating} onClick={() => handleResumeMemberSub(sub.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            {resumeSubMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Undo Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No subscriptions found.</p>
              )}
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
                <CreditCard className="h-5 w-5 text-primary" /> Payment Methods
              </h3>
              {methods.length > 0 ? (
                <div className="space-y-3">
                  {methods.map((pm: any) => (
                    <div key={pm.id} className="flex items-center justify-between p-3 bg-muted/20 border border-border rounded-xl">
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium text-foreground capitalize">{pm.brand || "card"} •••• {pm.last4 || "****"}</p>
                          {pm.expMonth && <p className="text-xs text-muted-foreground">Expires {pm.expMonth}/{pm.expYear}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No payment methods on file.</p>
              )}
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" /> Payment History
              </h3>
            </div>
            {bPayments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b border-border">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Date</th>
                      <th className="px-6 py-4 font-semibold">Description</th>
                      <th className="px-6 py-4 font-semibold">Amount</th>
                      <th className="px-6 py-4 font-semibold">Type</th>
                      <th className="px-6 py-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {bPayments.map((p: any) => (
                      <tr key={p.id} className="hover:bg-secondary transition-colors">
                        <td className="px-6 py-4 text-muted-foreground">{formatDate(p.createdAt)}</td>
                        <td className="px-6 py-4 text-foreground">{p.description || "—"}</td>
                        <td className="px-6 py-4 text-foreground font-medium">${p.amount}</td>
                        <td className="px-6 py-4 text-muted-foreground capitalize">{p.type?.replace("_", " ") || "—"}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${subStatusColor(p.status)}`}>
                            {p.status?.charAt(0).toUpperCase() + p.status?.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">No payments recorded yet.</div>
            )}
          </div>

          {bInvoices.length > 0 && (
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-border">
                <h3 className="text-lg font-semibold text-foreground">Invoices</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b border-border">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Date</th>
                      <th className="px-6 py-4 font-semibold">Amount</th>
                      <th className="px-6 py-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {bInvoices.map((inv: any) => (
                      <tr key={inv.id} className="hover:bg-secondary transition-colors">
                        <td className="px-6 py-4 text-muted-foreground">{formatDate(inv.createdAt || inv.dueDate)}</td>
                        <td className="px-6 py-4 text-foreground font-medium">${inv.amount}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${subStatusColor(inv.status)}`}>
                            {inv.status?.charAt(0).toUpperCase() + inv.status?.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </motion.div>
      )}

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
            <button onClick={handleCreateCharge} disabled={createChargeMutation.isPending || !chargeForm.amount || !chargeForm.description} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium transition-colors disabled:opacity-50">
              {createChargeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
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
                    <SelectItem key={p.id} value={String(p.id)}>{p.name} — ${p.price}/{p.billingInterval || "mo"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setSubOpen(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
            <button onClick={handleCreateStripeSub} disabled={createStripeSubMutation.isPending || !subPlanId} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium transition-colors disabled:opacity-50">
              {createStripeSubMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
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
            <AlertDialogAction onClick={handleCancelMemberSub} disabled={cancelSubMutation.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {cancelSubMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
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
            <AlertDialogAction onClick={confirmPauseMemberSub} disabled={pauseSubMutation.isPending} className="bg-yellow-600 text-white hover:bg-yellow-700">
              {pauseSubMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Pause Subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card border-border max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-first">First Name <span className="text-red-400">*</span></Label>
                <Input id="edit-first" value={editForm.firstName} onChange={(e) => { setEditForm(f => ({ ...f, firstName: e.target.value })); setEditErrors(e2 => { const n = {...e2}; delete n.firstName; return n; }); }} className={`bg-background border-border ${editErrors.firstName ? "border-red-400" : ""}`} />
                {editErrors.firstName && <p className="text-xs text-red-400">{editErrors.firstName}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-last">Last Name <span className="text-red-400">*</span></Label>
                <Input id="edit-last" value={editForm.lastName} onChange={(e) => { setEditForm(f => ({ ...f, lastName: e.target.value })); setEditErrors(e2 => { const n = {...e2}; delete n.lastName; return n; }); }} className={`bg-background border-border ${editErrors.lastName ? "border-red-400" : ""}`} />
                {editErrors.lastName && <p className="text-xs text-red-400">{editErrors.lastName}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-email">Email <span className="text-red-400">*</span></Label>
              <Input id="edit-email" type="email" value={editForm.email} onChange={(e) => { setEditForm(f => ({ ...f, email: e.target.value })); setEditErrors(e2 => { const n = {...e2}; delete n.email; return n; }); }} className={`bg-background border-border ${editErrors.email ? "border-red-400" : ""}`} />
              {editErrors.email && <p className="text-xs text-red-400">{editErrors.email}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input id="edit-phone" value={editForm.phone} onChange={(e) => setEditForm(f => ({ ...f, phone: e.target.value }))} className="bg-background border-border" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-membership">Membership Plan</Label>
              <Input id="edit-membership" value={editForm.membershipType} onChange={(e) => setEditForm(f => ({ ...f, membershipType: e.target.value }))} className="bg-background border-border" placeholder="e.g. Unlimited, 3x Week" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-address">Address</Label>
              <Input id="edit-address" value={editForm.address} onChange={(e) => setEditForm(f => ({ ...f, address: e.target.value }))} className="bg-background border-border" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-city">City</Label>
                <Input id="edit-city" value={editForm.city} onChange={(e) => setEditForm(f => ({ ...f, city: e.target.value }))} className="bg-background border-border" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-state">State</Label>
                <Input id="edit-state" value={editForm.state} onChange={(e) => setEditForm(f => ({ ...f, state: e.target.value }))} className="bg-background border-border" placeholder="TX" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-ec-name">Emergency Contact</Label>
                <Input id="edit-ec-name" value={editForm.emergencyContactName} onChange={(e) => setEditForm(f => ({ ...f, emergencyContactName: e.target.value }))} className="bg-background border-border" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-ec-phone">EC Phone</Label>
                <Input id="edit-ec-phone" value={editForm.emergencyContactPhone} onChange={(e) => setEditForm(f => ({ ...f, emergencyContactPhone: e.target.value }))} className="bg-background border-border" />
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
              <input
                type="checkbox"
                id="edit-waiver-detail"
                checked={editForm.waiverSigned}
                onChange={(e) => setEditForm(f => ({ ...f, waiverSigned: e.target.checked }))}
                className="rounded border-border"
              />
              <label htmlFor="edit-waiver-detail" className="text-sm text-foreground cursor-pointer">Liability Waiver Signed</label>
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
    </div>
  );
}
