import React, { useState } from "react";
import { useGym } from "@/store/GymContext";
import {
  useListMembershipPlans, useListSubscriptions, useListMembers, useListPayments, useListRefunds,
  useCreateMembershipPlan, useCreateSubscription, useGetBillingSummary, useGetCancelledMembers,
  useCancelSubscription, usePauseSubscription, useResumeSubscription,
  getListMembershipPlansQueryKey, getListSubscriptionsQueryKey, getGetBillingSummaryQueryKey,
  getListPaymentsQueryKey, getListRefundsQueryKey, getGetCancelledMembersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Loader2, CreditCard, DollarSign, Users, TrendingUp, Plus, AlertTriangle,
  UserMinus, ChevronLeft, ChevronRight, Pause, Play, XCircle, MoreHorizontal,
  Receipt, RefreshCw, ArrowDownRight, Clock
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

type BillingTab = "plans" | "subscriptions" | "payments" | "refunds" | "cancelled";

export function Billing() {
  const { activeGymId } = useGym();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [activeTab, setActiveTab] = useState<BillingTab>("plans");

  const [cancelMonth, setCancelMonth] = useState(() => {
    const now = new Date();
    return { month: now.getMonth(), year: now.getFullYear() };
  });

  const { data: billingSummary } = useGetBillingSummary(activeGymId as number, {
    query: { enabled: !!activeGymId }
  });

  const { data: plans, isLoading: plansLoading } = useListMembershipPlans(activeGymId as number, {
    query: { enabled: !!activeGymId }
  });

  const { data: subscriptions, isLoading: subsLoading } = useListSubscriptions(activeGymId as number, {}, {
    query: { enabled: !!activeGymId }
  });

  const { data: membersData } = useListMembers(activeGymId as number, {}, {
    query: { enabled: !!activeGymId }
  });

  const { data: payments, isLoading: paymentsLoading } = useListPayments(activeGymId as number, {
    query: { enabled: !!activeGymId && activeTab === "payments" }
  });

  const { data: refunds, isLoading: refundsLoading } = useListRefunds(activeGymId as number, {
    query: { enabled: !!activeGymId && activeTab === "refunds" }
  });

  const { data: cancelledData, isLoading: cancelledLoading } = useGetCancelledMembers(
    activeGymId as number,
    { month: cancelMonth.month + 1, year: cancelMonth.year },
    { query: { enabled: !!activeGymId && activeTab === "cancelled" } }
  );

  const createPlanMutation = useCreateMembershipPlan();
  const createSubMutation = useCreateSubscription();
  const cancelMutation = useCancelSubscription();
  const pauseMutation = usePauseSubscription();
  const resumeMutation = useResumeSubscription();

  const [planOpen, setPlanOpen] = useState(false);
  const [planForm, setPlanForm] = useState({ name: "", price: "", billingInterval: "monthly", description: "" });

  const [subOpen, setSubOpen] = useState(false);
  const [subForm, setSubForm] = useState({ memberId: "", planId: "" });

  const [cancelDialog, setCancelDialog] = useState<{ subId: number; memberName: string } | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(true);
  const [pauseConfirm, setPauseConfirm] = useState<{ subId: number; memberName: string } | null>(null);

  if (!activeGymId) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">Select a gym to view billing.</p>
      </div>
    );
  }

  const isLoading = plansLoading || subsLoading;

  const summary = billingSummary as any;
  const mrr = summary?.mrr ?? 0;
  const activeSubs = summary?.activeSubscriptions ?? 0;
  const arm = summary?.arm ?? 0;
  const failedPayments = summary?.failedPayments ?? 0;
  const overdueAccounts = summary?.overdueAccounts ?? 0;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  const members = (membersData as any)?.members ?? membersData ?? [];

  const invalidateBilling = () => {
    queryClient.invalidateQueries({ queryKey: getListSubscriptionsQueryKey(activeGymId) });
    queryClient.invalidateQueries({ queryKey: getListMembershipPlansQueryKey(activeGymId) });
    queryClient.invalidateQueries({ queryKey: getGetBillingSummaryQueryKey(activeGymId) });
    queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey(activeGymId) });
    queryClient.invalidateQueries({ queryKey: getListRefundsQueryKey(activeGymId) });
    queryClient.invalidateQueries({ queryKey: getGetCancelledMembersQueryKey(activeGymId, { month: cancelMonth.month + 1, year: cancelMonth.year }) });
  };

  const handleCreatePlan = () => {
    if (!planForm.name || !planForm.price) return;
    createPlanMutation.mutate(
      {
        gymId: activeGymId,
        data: {
          name: planForm.name,
          price: parseFloat(planForm.price),
          billingInterval: planForm.billingInterval as any,
          description: planForm.description || undefined,
        }
      },
      {
        onSuccess: () => {
          invalidateBilling();
          toast({ title: "Plan created", description: `${planForm.name} has been added.` });
          setPlanOpen(false);
          setPlanForm({ name: "", price: "", billingInterval: "monthly", description: "" });
        },
        onError: (err: any) => toast({ title: "Failed to create plan", description: err?.response?.data?.error || err?.message || "An unexpected error occurred. Please try again.", variant: "destructive" })
      }
    );
  };

  const handleCreateSub = () => {
    if (!subForm.memberId || !subForm.planId) return;
    createSubMutation.mutate(
      {
        gymId: activeGymId,
        data: { memberId: parseInt(subForm.memberId), planId: parseInt(subForm.planId) }
      },
      {
        onSuccess: () => {
          invalidateBilling();
          toast({ title: "Subscription created", description: "New subscription has been added." });
          setSubOpen(false);
          setSubForm({ memberId: "", planId: "" });
        },
        onError: (err: any) => toast({ title: "Failed to create subscription", description: err?.response?.data?.error || err?.message || "An unexpected error occurred. Please try again.", variant: "destructive" })
      }
    );
  };

  const handleCancelSub = () => {
    if (!cancelDialog) return;
    cancelMutation.mutate(
      {
        gymId: activeGymId,
        subscriptionId: cancelDialog.subId,
        data: { cancelAtPeriodEnd, reason: cancelReason || undefined },
      },
      {
        onSuccess: () => {
          invalidateBilling();
          toast({ title: "Subscription cancelled", description: `${cancelDialog.memberName}'s subscription has been cancelled.` });
          setCancelDialog(null);
          setCancelReason("");
        },
        onError: (err: any) => toast({ title: "Failed to cancel subscription", description: err?.response?.data?.error || err?.message || "An unexpected error occurred.", variant: "destructive" })
      }
    );
  };

  const handlePauseSub = (subId: number, memberName: string) => {
    setPauseConfirm({ subId, memberName });
  };

  const confirmPauseSub = () => {
    if (!pauseConfirm) return;
    pauseMutation.mutate(
      { gymId: activeGymId, subscriptionId: pauseConfirm.subId },
      {
        onSuccess: () => {
          invalidateBilling();
          toast({ title: "Subscription paused", description: `${pauseConfirm.memberName}'s billing has been paused.` });
          setPauseConfirm(null);
        },
        onError: (err: any) => { toast({ title: "Failed to pause subscription", description: err?.response?.data?.error || err?.message || "An unexpected error occurred.", variant: "destructive" }); setPauseConfirm(null); }
      }
    );
  };

  const handleResumeSub = (subId: number) => {
    resumeMutation.mutate(
      { gymId: activeGymId, subscriptionId: subId },
      {
        onSuccess: () => {
          invalidateBilling();
          toast({ title: "Subscription resumed" });
        },
        onError: (err: any) => toast({ title: "Failed to resume subscription", description: err?.response?.data?.error || err?.message || "An unexpected error occurred.", variant: "destructive" })
      }
    );
  };

  const isMutating = createPlanMutation.isPending || createSubMutation.isPending || cancelMutation.isPending || pauseMutation.isPending || resumeMutation.isPending;

  const tabs: { key: BillingTab; label: string; icon: React.ElementType }[] = [
    { key: "plans", label: "Plans", icon: CreditCard },
    { key: "subscriptions", label: "Subscriptions", icon: Users },
    { key: "payments", label: "Payments", icon: DollarSign },
    { key: "refunds", label: "Refunds", icon: ArrowDownRight },
    { key: "cancelled", label: "Cancelled", icon: UserMinus },
  ];

  const statusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "paused": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "cancelled": case "cancel_at_period_end": return "bg-destructive/10 text-destructive border-destructive/20";
      case "past_due": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "succeeded": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "pending": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "failed": return "bg-destructive/10 text-destructive border-destructive/20";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  const formatDate = (d: any) => {
    if (!d) return "—";
    const date = new Date(d);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const prevMonth = () => {
    setCancelMonth((prev) => {
      const m = prev.month - 1;
      return m < 0 ? { month: 11, year: prev.year - 1 } : { month: m, year: prev.year };
    });
  };

  const nextMonth = () => {
    setCancelMonth((prev) => {
      const m = prev.month + 1;
      return m > 11 ? { month: 0, year: prev.year + 1 } : { month: m, year: prev.year };
    });
  };

  const monthLabel = new Date(cancelMonth.year, cancelMonth.month).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6 pb-10">
      <header>
        <div className="flex items-center gap-3 mb-1">
          <div className="h-8 w-8 bg-primary/20 rounded-lg flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground">Billing</h1>
        </div>
        <p className="text-muted-foreground mt-1">Plans, subscriptions, revenue, and payment management.</p>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border p-5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">MRR</span>
          </div>
          <p className="text-2xl font-display font-bold text-foreground">${mrr.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">ARR: ${(mrr * 12).toLocaleString()}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-card border border-border p-5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active</span>
          </div>
          <p className="text-2xl font-display font-bold text-foreground">{activeSubs}</p>
          <p className="text-xs text-muted-foreground mt-1">{summary?.totalSubscriptions ?? 0} total</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card border border-border p-5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">ARM</span>
          </div>
          <p className="text-2xl font-display font-bold text-foreground">${Math.round(arm)}</p>
          <p className="text-xs text-muted-foreground mt-1">per member/mo</p>
        </motion.div>

        {failedPayments > 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-destructive/5 border border-destructive/20 p-5 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-xs font-medium text-destructive uppercase tracking-wider">Failed</span>
            </div>
            <p className="text-2xl font-display font-bold text-destructive">{failedPayments}</p>
            <p className="text-xs text-destructive/70 mt-1">need attention</p>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-card border border-border p-5 rounded-2xl shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Receipt className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Collected</span>
            </div>
            <p className="text-2xl font-display font-bold text-foreground">${(summary?.collectionsThisMonth ?? 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">this month</p>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card border border-border p-5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <UserMinus className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cancelled</span>
          </div>
          <p className="text-2xl font-display font-bold text-foreground">{summary?.cancelledThisMonth ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-1">this period</p>
        </motion.div>
      </div>

      <div className="flex gap-1 bg-card border border-border rounded-xl p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === "plans" && (
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Membership Plans</h3>
              <p className="text-sm text-muted-foreground">Manage your gym's plan offerings.</p>
            </div>
            <button onClick={() => setPlanOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-medium transition-colors shadow-lg shadow-primary/20">
              <Plus className="h-5 w-5" />
              <span>New Plan</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-semibold">Plan Name</th>
                  <th className="px-6 py-4 font-semibold">Price</th>
                  <th className="px-6 py-4 font-semibold">Interval</th>
                  <th className="px-6 py-4 font-semibold">Active Members</th>
                  <th className="px-6 py-4 font-semibold">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {plans?.map((plan: any, i: number) => (
                  <motion.tr key={plan.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-semibold text-foreground">{plan.name}</td>
                    <td className="px-6 py-4 text-foreground">${plan.price}</td>
                    <td className="px-6 py-4 text-muted-foreground capitalize">{plan.billingInterval || "monthly"}</td>
                    <td className="px-6 py-4 text-foreground">{plan.memberCount}</td>
                    <td className="px-6 py-4 text-foreground font-medium">${(plan.memberCount * plan.price).toLocaleString()}</td>
                  </motion.tr>
                ))}
                {(!plans || plans.length === 0) && (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">No plans configured yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "subscriptions" && (
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Subscriptions</h3>
              <p className="text-sm text-muted-foreground">Active and historical member subscriptions.</p>
            </div>
            <button onClick={() => setSubOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-medium transition-colors shadow-lg shadow-primary/20">
              <Plus className="h-5 w-5" />
              <span>New Subscription</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-semibold">Member</th>
                  <th className="px-6 py-4 font-semibold">Plan</th>
                  <th className="px-6 py-4 font-semibold">Amount</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Started</th>
                  <th className="px-6 py-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {subscriptions?.map((sub: any, i: number) => (
                  <motion.tr key={sub.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.03, 0.3) }} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <button onClick={() => navigate(`/members/${sub.memberId}`)} className="font-medium text-foreground hover:text-primary transition-colors text-left">
                        {sub.memberName}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{sub.planName}</td>
                    <td className="px-6 py-4 text-foreground">${typeof sub.amount === "number" ? sub.amount : parseFloat(sub.amount || "0")}/mo</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusColor(sub.status)}`}>
                        {sub.status === "cancel_at_period_end" ? "Cancelling" : sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                      </span>
                      {sub.failedPayments > 0 && (
                        <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20">
                          {sub.failedPayments} failed
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{formatDate(sub.currentPeriodStart || sub.createdAt)}</td>
                    <td className="px-6 py-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/members/${sub.memberId}`)}>
                            View Member
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {sub.status === "active" && (
                            <>
                              <DropdownMenuItem disabled={isMutating} onClick={() => handlePauseSub(sub.id, sub.memberName)}>
                                <Pause className="h-4 w-4 mr-2" /> Pause
                              </DropdownMenuItem>
                              <DropdownMenuItem disabled={isMutating} onClick={() => setCancelDialog({ subId: sub.id, memberName: sub.memberName })} className="text-destructive focus:text-destructive">
                                <XCircle className="h-4 w-4 mr-2" /> Cancel
                              </DropdownMenuItem>
                            </>
                          )}
                          {sub.status === "paused" && (
                            <DropdownMenuItem onClick={() => handleResumeSub(sub.id)}>
                              <Play className="h-4 w-4 mr-2" /> Resume
                            </DropdownMenuItem>
                          )}
                          {sub.status === "cancel_at_period_end" && (
                            <DropdownMenuItem onClick={() => handleResumeSub(sub.id)}>
                              <RefreshCw className="h-4 w-4 mr-2" /> Undo Cancel
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </motion.tr>
                ))}
                {(!subscriptions || subscriptions.length === 0) && (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">No subscriptions yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "payments" && (
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">Payment History</h3>
            <p className="text-sm text-muted-foreground">All payment transactions.</p>
          </div>
          {paymentsLoading ? (
            <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Date</th>
                    <th className="px-6 py-4 font-semibold">Member</th>
                    <th className="px-6 py-4 font-semibold">Description</th>
                    <th className="px-6 py-4 font-semibold">Amount</th>
                    <th className="px-6 py-4 font-semibold">Type</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(payments as any[])?.map((p: any) => (
                    <tr key={p.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 text-muted-foreground">{formatDate(p.createdAt)}</td>
                      <td className="px-6 py-4 font-medium text-foreground">{p.memberName}</td>
                      <td className="px-6 py-4 text-muted-foreground">{p.description || "—"}</td>
                      <td className="px-6 py-4 text-foreground font-medium">${p.amount}</td>
                      <td className="px-6 py-4 text-muted-foreground capitalize">{p.type?.replace("_", " ") || "—"}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusColor(p.status)}`}>
                          {p.status?.charAt(0).toUpperCase() + p.status?.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!payments || (payments as any[]).length === 0) && (
                    <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">No payments recorded yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "refunds" && (
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">Refunds</h3>
            <p className="text-sm text-muted-foreground">All refund transactions.</p>
          </div>
          {refundsLoading ? (
            <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Date</th>
                    <th className="px-6 py-4 font-semibold">Member</th>
                    <th className="px-6 py-4 font-semibold">Amount</th>
                    <th className="px-6 py-4 font-semibold">Reason</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(refunds as any[])?.map((r: any) => (
                    <tr key={r.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 text-muted-foreground">{formatDate(r.createdAt)}</td>
                      <td className="px-6 py-4 font-medium text-foreground">{r.memberName}</td>
                      <td className="px-6 py-4 text-destructive font-medium">-${r.amount}</td>
                      <td className="px-6 py-4 text-muted-foreground">{r.reason || "—"}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusColor(r.status)}`}>
                          {r.status?.charAt(0).toUpperCase() + r.status?.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!refunds || (refunds as any[]).length === 0) && (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">No refunds issued.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "cancelled" && (
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Cancelled Members</h3>
                <p className="text-sm text-muted-foreground">Members who cancelled during this period.</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                  <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                </button>
                <span className="text-sm font-medium text-foreground min-w-[140px] text-center">{monthLabel}</span>
                <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>
            {(cancelledData as any)?.lostRevenue > 0 && (
              <div className="mt-4 p-3 rounded-xl bg-destructive/5 border border-destructive/20 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
                <p className="text-sm text-destructive">
                  <span className="font-semibold">${(cancelledData as any)?.lostRevenue?.toLocaleString()}/mo</span> in lost recurring revenue this period
                </p>
              </div>
            )}
          </div>
          {cancelledLoading ? (
            <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <>
              {(cancelledData as any)?.cancelledSubscriptions?.length > 0 && (
                <div className="p-6 border-b border-border">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Cancellation Details</h4>
                  <div className="space-y-3">
                    {(cancelledData as any)?.cancelledSubscriptions?.map((cs: any) => (
                      <div key={cs.subscriptionId} className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                            <UserMinus className="h-5 w-5 text-destructive" />
                          </div>
                          <div>
                            <button onClick={() => navigate(`/members/${cs.memberId}`)} className="font-medium text-foreground hover:text-primary transition-colors">
                              {cs.memberName}
                            </button>
                            <p className="text-sm text-muted-foreground">{cs.planName} — ${cs.amount}/mo</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">{formatDate(cs.cancelledAt)}</p>
                          {cs.cancelReason && <p className="text-xs text-muted-foreground mt-1">Reason: {cs.cancelReason}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="p-6">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">All Cancelled Members</h4>
                {(cancelledData as any)?.cancelledMembers?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b border-border">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Name</th>
                          <th className="px-4 py-3 font-semibold">Email</th>
                          <th className="px-4 py-3 font-semibold">Plan</th>
                          <th className="px-4 py-3 font-semibold">Joined</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {(cancelledData as any)?.cancelledMembers?.map((m: any) => (
                          <tr key={m.id} className="hover:bg-white/5 transition-colors cursor-pointer" onClick={() => navigate(`/members/${m.id}`)}>
                            <td className="px-4 py-3 font-medium text-foreground">{m.firstName} {m.lastName}</td>
                            <td className="px-4 py-3 text-muted-foreground">{m.email}</td>
                            <td className="px-4 py-3 text-muted-foreground">{m.membershipType || "—"}</td>
                            <td className="px-4 py-3 text-muted-foreground">{m.joinDate || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No cancelled members in this period.</p>
                )}
              </div>
            </>
          )}
        </div>
      )}

      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Membership Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Plan Name *</Label>
              <Input value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} placeholder="e.g. Premium Monthly" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price *</Label>
                <Input type="number" step="0.01" value={planForm.price} onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })} placeholder="99.00" />
              </div>
              <div className="space-y-2">
                <Label>Billing Interval</Label>
                <Select value={planForm.billingInterval} onValueChange={(v) => setPlanForm({ ...planForm, billingInterval: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={planForm.description} onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })} placeholder="Plan description..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setPlanOpen(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
            <button
              onClick={handleCreatePlan}
              disabled={createPlanMutation.isPending || !planForm.name || !planForm.price}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {createPlanMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Plan
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={subOpen} onOpenChange={setSubOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Subscription</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Member *</Label>
              <Select value={subForm.memberId} onValueChange={(v) => setSubForm({ ...subForm, memberId: v })}>
                <SelectTrigger><SelectValue placeholder="Select a member" /></SelectTrigger>
                <SelectContent>
                  {(Array.isArray(members) ? members : []).map((m: any) => (
                    <SelectItem key={m.id} value={String(m.id)}>{m.firstName} {m.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Plan *</Label>
              <Select value={subForm.planId} onValueChange={(v) => setSubForm({ ...subForm, planId: v })}>
                <SelectTrigger><SelectValue placeholder="Select a plan" /></SelectTrigger>
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
            <button
              onClick={handleCreateSub}
              disabled={createSubMutation.isPending || !subForm.memberId || !subForm.planId}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {createSubMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Subscription
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!cancelDialog} onOpenChange={() => setCancelDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel {cancelDialog?.memberName}'s subscription? This action affects their billing.
            </AlertDialogDescription>
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
              <Textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Why is this member cancelling?" rows={2} />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelSub} disabled={cancelMutation.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {cancelMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Cancel Subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!pauseConfirm} onOpenChange={() => setPauseConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pause Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              This will pause billing for {pauseConfirm?.memberName}. No invoices will be generated until the subscription is resumed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Active</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPauseSub} disabled={pauseMutation.isPending} className="bg-yellow-600 text-white hover:bg-yellow-700">
              {pauseMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Pause Subscription
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
