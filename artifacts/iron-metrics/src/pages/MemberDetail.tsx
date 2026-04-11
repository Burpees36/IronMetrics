import React, { useState } from "react";
import { useGym } from "@/store/GymContext";
import {
  useGetMember, useGetMemberTimeline, useUpdateMember, useAddMemberNote,
  getGetMemberQueryKey, getGetMemberTimelineQueryKey, getListMembersQueryKey,
  useGetMemberBillingHistory, useListPaymentMethods, useCreateSetupIntent,
  useCreateStripeSubscription, useCreateOneTimeCharge, useListMembershipPlans,
  useCancelSubscription, usePauseSubscription, useResumeSubscription,
  getGetMemberBillingHistoryQueryKey, getListSubscriptionsQueryKey,
  useSetDefaultPaymentMethod, useRemovePaymentMethod,
  useGetMemberLinkedBilling, useLinkMemberBilling, useUnlinkMemberBilling,
  getListPaymentMethodsQueryKey, getGetMemberLinkedBillingQueryKey,
  useListMembers, useListClasses, useCheckInToClass,
  useSendMemberSms,
  useListAppointments,
} from "@workspace/api-client-react";
import type { GymClass } from "@workspace/api-client-react";
import type { ApiError } from "@workspace/api-client-react/custom-fetch";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  Loader2, ArrowLeft, UserCircle, Mail, Phone, Calendar, Shield,
  MapPin, StickyNote, Clock, Edit, Pause, XCircle, Play, AlertTriangle,
  Activity, CreditCard, Plus, DollarSign, Receipt, RefreshCw,
  Send, Copy, Star, Trash2, Link2, Unlink, Search, Users, CheckCircle, MessageSquare
} from "lucide-react";
import { Link } from "wouter";
import { Textarea } from "@/components/ui/textarea";
import { HoldsManager } from "@/components/billing/HoldsManager";
import { InvoiceTable } from "@/components/billing/InvoiceTable";
import { MemberBalance } from "@/components/billing/MemberBalance";
import { SubscriptionDiscount } from "@/components/billing/SubscriptionDiscount";
import { statusColor, riskColor, subStatusColor, formatDate } from "./member-detail/helpers";
import { MemberDialogs } from "./member-detail/MemberDialogs";
import { MemberTrackAssignment } from "./member-detail/MemberTrackAssignment";

export function MemberDetail() {
  const { activeGymId } = useGym();
  const [, params] = useRoute("/members/:memberId");
  const memberId = params?.memberId ? parseInt(params.memberId, 10) : 0;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"overview" | "notes" | "timeline" | "billing" | "appointments">("overview");
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
  const [changePlanSub, setChangePlanSub] = useState<any>(null);
  const [smsOpen, setSmsOpen] = useState(false);
  const [smsMessage, setSmsMessage] = useState("");

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
    profileImageUrl: "",
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  const memberEnabled = !!activeGymId && !!memberId;
  const { data: member, isLoading, isError } = useGetMember(activeGymId as number, memberId, {
    query: { enabled: memberEnabled },
  });

  const { data: timeline } = useGetMemberTimeline(activeGymId as number, memberId, {
    query: { enabled: memberEnabled },
  });

  const updateMutation = useUpdateMember();
  const addNoteMutation = useAddMemberNote();

  const { data: memberAppointments } = useListAppointments(activeGymId as number, { memberId: memberId }, {
    query: { enabled: !!activeGymId && !!memberId && activeTab === "appointments" },
  });

  const billingEnabled = !!activeGymId && !!memberId && activeTab === "billing";
  const { data: billingHistory } = useGetMemberBillingHistory(activeGymId as number, memberId, {
    query: { enabled: billingEnabled },
  });
  const { data: paymentMethods } = useListPaymentMethods(activeGymId as number, memberId, {
    query: { enabled: billingEnabled },
  });
  const { data: plans } = useListMembershipPlans(activeGymId as number, {
    query: { enabled: !!activeGymId && activeTab === "billing" }
  });

  const { data: linkedBilling } = useGetMemberLinkedBilling(activeGymId as number, memberId, {
    query: { enabled: billingEnabled },
  });
  const { data: allMembers } = useListMembers(activeGymId as number, {}, {
    query: { enabled: !!activeGymId && activeTab === "billing" },
  });

  const createChargeMutation = useCreateOneTimeCharge();
  const createStripeSubMutation = useCreateStripeSubscription();
  const cancelSubMutation = useCancelSubscription();
  const pauseSubMutation = usePauseSubscription();
  const resumeSubMutation = useResumeSubscription();
  const setDefaultPmMutation = useSetDefaultPaymentMethod();
  const removePmMutation = useRemovePaymentMethod();
  const linkBillingMutation = useLinkMemberBilling();
  const unlinkBillingMutation = useUnlinkMemberBilling();
  const createSetupIntentMutation = useCreateSetupIntent();
  const sendSmsMutation = useSendMemberSms();

  const [addCardOpen, setAddCardOpen] = useState(false);
  const [removePmConfirm, setRemovePmConfirm] = useState<string | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkSearch, setLinkSearch] = useState("");
  const [selectedLinkMember, setSelectedLinkMember] = useState<number | null>(null);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const { data: todayClasses, isLoading: classesLoading } = useListClasses(activeGymId as number, {
    startDate: todayStart.toISOString(),
    endDate: todayEnd.toISOString(),
  }, {
    query: { enabled: !!activeGymId && checkinOpen },
  });

  const checkInMutation = useCheckInToClass();

  const handleCheckin = () => {
    if (!activeGymId || !selectedClassId) return;
    checkInMutation.mutate(
      { gymId: activeGymId, classId: selectedClassId, data: { memberId } },
      {
        onSuccess: () => {
          toast({ title: "Checked in", description: "Member has been checked into the class." });
          setCheckinOpen(false);
          setSelectedClassId(null);
          invalidateAll();
        },
        onError: (err: unknown) => {
          const apiErr = err as ApiError | undefined;
          const errData = apiErr?.data as { error?: string } | null | undefined;
          const msg = errData?.error || apiErr?.message || "Check-in failed";
          toast({ title: "Check-in failed", description: msg, variant: "destructive" });
        },
      }
    );
  };

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getGetMemberQueryKey(activeGymId as number, memberId) });
    queryClient.invalidateQueries({ queryKey: getGetMemberTimelineQueryKey(activeGymId as number, memberId) });
    queryClient.invalidateQueries({ queryKey: getListMembersQueryKey(activeGymId as number) });
  };

  const invalidateBilling = () => {
    invalidateAll();
    queryClient.invalidateQueries({ queryKey: getGetMemberBillingHistoryQueryKey(activeGymId as number, memberId) });
    queryClient.invalidateQueries({ queryKey: getListSubscriptionsQueryKey(activeGymId as number) });
    queryClient.invalidateQueries({ queryKey: getListPaymentMethodsQueryKey(activeGymId as number, memberId) });
    queryClient.invalidateQueries({ queryKey: getGetMemberLinkedBillingQueryKey(activeGymId as number, memberId) });
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

  const handleSendSms = () => {
    if (!activeGymId || !memberId || !smsMessage.trim()) return;
    sendSmsMutation.mutate(
      { gymId: activeGymId, memberId, data: { message: smsMessage.trim() } },
      {
        onSuccess: (data) => {
          toast({ title: "Text Sent", description: `Text sent to ${(data as any).recipientName} (${(data as any).recipientPhone}).` });
          setSmsOpen(false);
          setSmsMessage("");
          queryClient.invalidateQueries({ queryKey: getGetMemberTimelineQueryKey(activeGymId, memberId) });
        },
        onError: (err: unknown) => {
          const error = err as { response?: { data?: { error?: string } } };
          toast({ title: "Failed to Send", description: error?.response?.data?.error || "Could not send text.", variant: "destructive" });
        },
      }
    );
  };

  const isBillingMutating = createChargeMutation.isPending || createStripeSubMutation.isPending || cancelSubMutation.isPending || pauseSubMutation.isPending || resumeSubMutation.isPending || setDefaultPmMutation.isPending || removePmMutation.isPending || linkBillingMutation.isPending || unlinkBillingMutation.isPending;

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

  const handleSetDefaultPm = (paymentMethodId: string) => {
    if (!activeGymId) return;
    setDefaultPmMutation.mutate(
      { gymId: activeGymId, memberId, paymentMethodId },
      {
        onSuccess: () => { toast({ title: "Default payment method updated" }); invalidateBilling(); },
        onError: (err: any) => toast({ title: "Failed to set default", description: err?.response?.data?.error || err?.message, variant: "destructive" })
      }
    );
  };

  const handleRemovePm = (paymentMethodId: string) => {
    if (!activeGymId) return;
    removePmMutation.mutate(
      { gymId: activeGymId, memberId, paymentMethodId },
      {
        onSuccess: () => { toast({ title: "Payment method removed" }); setRemovePmConfirm(null); invalidateBilling(); },
        onError: (err: any) => { setRemovePmConfirm(null); toast({ title: "Failed to remove", description: err?.response?.data?.error || err?.message, variant: "destructive" }); }
      }
    );
  };

  const handleLinkBilling = () => {
    if (!activeGymId || !selectedLinkMember) return;
    linkBillingMutation.mutate(
      { gymId: activeGymId, memberId, data: { linkedMemberId: selectedLinkMember } },
      {
        onSuccess: () => { toast({ title: "Billing linked successfully" }); setLinkOpen(false); setSelectedLinkMember(null); setLinkSearch(""); invalidateBilling(); },
        onError: (err: any) => toast({ title: "Failed to link billing", description: err?.response?.data?.error || err?.message, variant: "destructive" })
      }
    );
  };

  const handleUnlinkBilling = () => {
    if (!activeGymId) return;
    unlinkBillingMutation.mutate(
      { gymId: activeGymId, memberId },
      {
        onSuccess: () => { toast({ title: "Billing unlinked" }); invalidateBilling(); },
        onError: (err: any) => toast({ title: "Failed to unlink", description: err?.response?.data?.error || err?.message, variant: "destructive" })
      }
    );
  };

  const [addingCardSecret, setAddingCardSecret] = useState<string | null>(null);

  const handleAddCard = async () => {
    if (!activeGymId) return;
    createSetupIntentMutation.mutate(
      { gymId: activeGymId, memberId },
      {
        onSuccess: (data: any) => {
          if (data?.clientSecret) {
            setAddingCardSecret(data.clientSecret);
            setAddCardOpen(true);
          }
        },
        onError: (err: any) => toast({ title: "Failed to start card setup", description: err?.response?.data?.error || err?.message, variant: "destructive" })
      }
    );
  };

  const linkedBillingData = linkedBilling as any;
  const filteredLinkMembers = ((allMembers as any)?.members ?? []).filter((m: any) =>
    m.id !== memberId &&
    (linkSearch === "" || `${m.firstName} ${m.lastName} ${m.email}`.toLowerCase().includes(linkSearch.toLowerCase()))
  ).slice(0, 10);

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
        profileImageUrl: member.profileImageUrl || "",
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
          profileImageUrl: editForm.profileImageUrl || null,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Member updated", description: "Profile has been saved." });
          setEditOpen(false);
          invalidateAll();
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

  const sColor = statusColor(member.status);
  const rColor = riskColor(member.riskTier);

  const tabs = [
    { key: "overview" as const, label: "Overview", icon: Activity },
    { key: "billing" as const, label: "Billing", icon: CreditCard },
    { key: "notes" as const, label: "Notes", icon: StickyNote },
    { key: "timeline" as const, label: "Timeline", icon: Clock },
    { key: "appointments" as const, label: "Appointments", icon: Calendar },
  ];

  const billingData = billingHistory as any;
  const methods = (paymentMethods ?? []) as any[];
  const bSubs = billingData?.subscriptions ?? [];
  const bPayments = billingData?.payments ?? [];
  const bInvoices = billingData?.invoices ?? [];

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
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${sColor}`}>
                  {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                </span>
                {member.riskTier && (
                  <span className={`flex items-center gap-1.5 text-xs font-semibold ${rColor}`}>
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
              onClick={() => { setCheckinOpen(true); setSelectedClassId(null); }}
              className="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary/20 rounded-xl text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
            >
              <CheckCircle className="h-4 w-4" /> Check In
            </button>
            <button
              onClick={handleEditOpen}
              className="flex items-center gap-2 px-3 py-2 bg-secondary border border-border rounded-xl text-sm font-medium text-foreground hover:bg-secondary transition-colors"
            >
              <Edit className="h-4 w-4" /> Edit
            </button>
            {member.phone && (
              <button
                onClick={() => { setSmsOpen(true); setSmsMessage(""); }}
                className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-sm font-medium text-emerald-600 hover:bg-emerald-500/20 transition-colors"
              >
                <MessageSquare className="h-4 w-4" /> Send Text
              </button>
            )}
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
                  <span className="text-foreground font-medium">${Number(member.activeSubscription.amount).toFixed(2)}</span>
                </div>
                {member.activeSubscription.currentPeriodEnd && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-sm">Next Billing</span>
                    <span className="text-foreground">{new Date(member.activeSubscription.currentPeriodEnd).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            ) : member.membershipType ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">Plan</span>
                  <span className="text-foreground font-medium">{member.membershipType}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">Status</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium border bg-amber-500/10 text-amber-500 border-amber-500/20">No active billing</span>
                </div>
                <p className="text-xs text-muted-foreground">Subscription can be set up from the Billing tab.</p>
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

          <MemberTrackAssignment
            member={member}
            gymId={activeGymId as number}
            onUpdate={invalidateAll}
          />
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
                    <div className={`absolute left-2.5 top-1 h-3 w-3 rounded-full border-2 border-card ${
                      event.type === "email_sent" ? "bg-blue-500" : "bg-primary"
                    }`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {event.type === "email_sent" && <Mail className="h-3.5 w-3.5 text-blue-500" />}
                          <h4 className="text-sm font-medium text-foreground">{event.title}</h4>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">{new Date(event.date).toLocaleDateString()}</span>
                      </div>
                      {event.description && (
                        <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
                      )}
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-medium uppercase ${
                        event.type === "email_sent" ? "bg-blue-500/10 text-blue-500" : "bg-secondary text-muted-foreground"
                      }`}>{event.type === "email_sent" ? "EMAIL SENT" : event.type}</span>
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
                        <span className="text-foreground font-medium">${sub.amount}{sub.billingInterval === "one_time" ? "" : `/${sub.billingInterval === "annual" ? "yr" : sub.billingInterval === "quarterly" ? "qtr" : "mo"}`}</span>
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
                      {sub.status === "active" && sub.stripeSubscriptionId && (
                        <SubscriptionDiscount subscriptionId={sub.id} stripeSubscriptionId={sub.stripeSubscriptionId} />
                      )}
                      <div className="flex gap-2 mt-3 pt-3 border-t border-border flex-wrap">
                        {sub.status === "active" && (
                          <>
                            {sub.stripeSubscriptionId && (
                              <button disabled={isBillingMutating} onClick={() => setChangePlanSub(sub)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                <Activity className="h-3 w-3" /> Change Plan
                              </button>
                            )}
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
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" /> Payment Methods
                </h3>
                <button
                  onClick={handleAddCard}
                  disabled={createSetupIntentMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                >
                  {createSetupIntentMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                  Add Card
                </button>
              </div>
              {methods.length > 0 ? (
                <div className="space-y-3">
                  {methods.map((pm: any) => (
                    <div key={pm.id} className="flex items-center justify-between p-3 bg-muted/20 border border-border rounded-xl">
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-foreground capitalize">{pm.brand || "card"} •••• {pm.last4 || "****"}</p>
                            {pm.isDefault && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">DEFAULT</span>
                            )}
                          </div>
                          {pm.expMonth && <p className="text-xs text-muted-foreground">Expires {pm.expMonth}/{pm.expYear}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {!pm.isDefault && (
                          <button
                            onClick={() => handleSetDefaultPm(pm.id)}
                            disabled={setDefaultPmMutation.isPending}
                            title="Set as default"
                            className="p-1.5 text-muted-foreground hover:text-primary rounded-lg hover:bg-primary/10 transition-colors disabled:opacity-50"
                          >
                            <Star className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => setRemovePmConfirm(pm.id)}
                          title="Remove card"
                          className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No payment methods on file.</p>
              )}
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" /> Couples / Linked Billing
              </h3>
              {!linkedBillingData?.isPrimaryPayer && !linkedBillingData?.isDependent && (
                <button
                  onClick={() => setLinkOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  <Link2 className="h-3 w-3" /> Link Partner
                </button>
              )}
            </div>

            {linkedBillingData?.isPrimaryPayer && linkedBillingData.dependents?.length > 0 ? (
              <div className="space-y-3">
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl">
                  <p className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Star className="h-4 w-4 text-primary" /> Primary Payer
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">This member pays for the linked members below.</p>
                </div>
                {linkedBillingData.dependents.map((dep: any) => (
                  <div key={dep.id} className="flex items-center justify-between p-3 bg-muted/20 border border-border rounded-xl">
                    <div className="flex items-center gap-3">
                      <UserCircle className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{dep.firstName} {dep.lastName}</p>
                        <p className="text-xs text-muted-foreground">{dep.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={handleUnlinkBilling}
                      disabled={unlinkBillingMutation.isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-50"
                    >
                      {unlinkBillingMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unlink className="h-3 w-3" />}
                      Unlink
                    </button>
                  </div>
                ))}
              </div>
            ) : linkedBillingData?.isDependent && linkedBillingData.primaryPayer ? (
              <div className="space-y-3">
                <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                  <p className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-blue-500" /> Linked to Partner
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Billing for this member is handled by their partner.</p>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/20 border border-border rounded-xl">
                  <div className="flex items-center gap-3">
                    <UserCircle className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{linkedBillingData.primaryPayer.firstName} {linkedBillingData.primaryPayer.lastName}</p>
                      <p className="text-xs text-muted-foreground">{linkedBillingData.primaryPayer.email} — pays for this member</p>
                    </div>
                  </div>
                  <button
                    onClick={handleUnlinkBilling}
                    disabled={unlinkBillingMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-50"
                  >
                    {unlinkBillingMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unlink className="h-3 w-3" />}
                    Unlink
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No linked billing. Use "Link Partner" to set up a couples plan where one member pays for both.</p>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {bSubs.length > 0 && bSubs[0]?.id && (
              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <HoldsManager memberId={memberId} subscriptionId={bSubs[0].id} onHoldChange={() => queryClient.invalidateQueries({ queryKey: getGetMemberBillingHistoryQueryKey(activeGymId as number, memberId) })} />
              </div>
            )}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <MemberBalance memberId={memberId} />
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <InvoiceTable memberId={memberId} />
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

      {smsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSmsOpen(false)}>
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <MessageSquare className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Send Text Message</h3>
                <p className="text-xs text-muted-foreground">To {member.firstName} {member.lastName} ({member.phone})</p>
              </div>
            </div>
            <Textarea
              value={smsMessage}
              onChange={(e) => setSmsMessage(e.target.value)}
              placeholder="Type your message..."
              className="mb-2 min-h-[100px]"
              maxLength={1600}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{smsMessage.length}/1600</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setSmsOpen(false)}
                  className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendSms}
                  disabled={!smsMessage.trim() || sendSmsMutation.isPending}
                  className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {sendSmsMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "appointments" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-primary" /> Appointment History
            </h3>
            {!memberAppointments || memberAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No appointments found for this member.</p>
            ) : (
              <div className="space-y-3">
                {memberAppointments.map((appt: any) => {
                  const start = new Date(appt.startTime);
                  const end = new Date(appt.endTime);
                  const statusColors: Record<string, string> = {
                    scheduled: "bg-sky-500/10 text-sky-500 border-sky-500/20",
                    completed: "bg-green-500/10 text-green-500 border-green-500/20",
                    cancelled: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
                    no_show: "bg-red-500/10 text-red-500 border-red-500/20",
                  };
                  return (
                    <div key={appt.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium text-foreground">
                          {start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          {" · "}
                          {start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} – {end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {appt.coachName || "No coach"}{appt.notes ? ` · ${appt.notes}` : ""}
                        </span>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusColors[appt.status] || statusColors.scheduled}`}>
                        {appt.status === "no_show" ? "No Show" : appt.status.charAt(0).toUpperCase() + appt.status.slice(1)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      )}

      <MemberDialogs
        memberId={memberId}
        chargeOpen={chargeOpen}
        setChargeOpen={setChargeOpen}
        chargeForm={chargeForm}
        setChargeForm={setChargeForm}
        handleCreateCharge={handleCreateCharge}
        createChargePending={createChargeMutation.isPending}
        subOpen={subOpen}
        setSubOpen={setSubOpen}
        subPlanId={subPlanId}
        setSubPlanId={setSubPlanId}
        handleCreateStripeSub={handleCreateStripeSub}
        createStripeSubPending={createStripeSubMutation.isPending}
        plans={plans as any}
        cancelSubDialog={cancelSubDialog}
        setCancelSubDialog={setCancelSubDialog}
        cancelAtPeriodEnd={cancelAtPeriodEnd}
        setCancelAtPeriodEnd={setCancelAtPeriodEnd}
        cancelReason={cancelReason}
        setCancelReason={setCancelReason}
        handleCancelMemberSub={handleCancelMemberSub}
        cancelSubPending={cancelSubMutation.isPending}
        pauseSubConfirm={pauseSubConfirm}
        setPauseSubConfirm={setPauseSubConfirm}
        confirmPauseMemberSub={confirmPauseMemberSub}
        pauseSubPending={pauseSubMutation.isPending}
        removePmConfirm={removePmConfirm}
        setRemovePmConfirm={setRemovePmConfirm}
        handleRemovePm={handleRemovePm}
        removePmPending={removePmMutation.isPending}
        linkOpen={linkOpen}
        setLinkOpen={setLinkOpen}
        linkSearch={linkSearch}
        setLinkSearch={setLinkSearch}
        selectedLinkMember={selectedLinkMember}
        setSelectedLinkMember={setSelectedLinkMember}
        filteredLinkMembers={filteredLinkMembers}
        handleLinkBilling={handleLinkBilling}
        linkBillingPending={linkBillingMutation.isPending}
        addCardOpen={addCardOpen}
        setAddCardOpen={setAddCardOpen}
        addingCardSecret={addingCardSecret}
        setAddingCardSecret={setAddingCardSecret}
        onCardSuccess={() => { toast({ title: "Card added successfully" }); invalidateBilling(); }}
        changePlanSub={changePlanSub}
        setChangePlanSub={setChangePlanSub}
        editOpen={editOpen}
        setEditOpen={setEditOpen}
        editForm={editForm}
        setEditForm={setEditForm}
        editErrors={editErrors}
        setEditErrors={setEditErrors}
        handleEditSave={handleEditSave}
        updatePending={updateMutation.isPending}
        statusAction={statusAction}
        setStatusAction={setStatusAction}
        handleStatusChange={handleStatusChange}
        checkinOpen={checkinOpen}
        setCheckinOpen={setCheckinOpen}
        selectedClassId={selectedClassId}
        setSelectedClassId={setSelectedClassId}
        todayClasses={todayClasses}
        classesLoading={classesLoading && checkinOpen}
        handleCheckin={handleCheckin}
        checkinPending={checkInMutation.isPending}
      />
    </div>
  );
}
