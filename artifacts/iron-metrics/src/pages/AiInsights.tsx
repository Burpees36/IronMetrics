import React, { useState, useMemo, useCallback } from "react";
import { useGym } from "@/store/GymContext";
import {
  useGetIntelligenceOverview,
  useListAiTasks,
  useGenerateOwnerBrief,
  useUpdateAiTask,
  useGenerateAiTasks,
  useGetDashboardStats,
  getListAiTasksQueryKey,
  useSendAiTaskEmail,
  useSendAiTaskSms,
  useGetAiEmailStatus,
  useGetAiLastScan,
  useGetAiImpact,
  useGetAutopilotSettings,
  useUpdateAutopilotSettings,
  getGetAutopilotSettingsQueryKey,
  useGetInterventions,
  useGetDismissedInterventions,
  getGetDismissedInterventionsQueryKey,
  useDismissIntervention,
  useRestoreIntervention,
  getGetInterventionsQueryKey,
} from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  BrainCircuit, Sparkles, Send, CheckCircle2, Clock, Loader2,
  FileText, X, Filter, Users, CreditCard, MessageSquare,
  Target, Megaphone, BarChart3, Edit2, RefreshCw,
  History, Mail, MailCheck, AlertCircle, Info, TrendingUp, TrendingDown, DollarSign,
  UserCheck, Eye, ArrowUpRight, ArrowDownRight, ArrowRight,
  Settings, Zap, ShieldCheck, CalendarDays, Activity, ShieldAlert,
  ChevronDown, ChevronUp, Undo2, ExternalLink,
} from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useIsMobile } from "@/hooks/useMobile";
import { useGymTier } from "@/hooks/useGymTier";

const BASE_URL = import.meta.env.BASE_URL || "/";
const API_BASE = `${BASE_URL}api`.replace(/\/+/g, "/");

const EMAIL_TASK_TYPES = new Set(["outreach", "leads", "billing"]);

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  outreach: { label: "Outreach", icon: Send, color: "bg-blue-500/10 text-blue-500" },
  billing: { label: "Billing", icon: CreditCard, color: "bg-amber-500/10 text-amber-500" },
  retention: { label: "Retention", icon: Users, color: "bg-purple-500/10 text-purple-500" },
  leads: { label: "Leads", icon: Target, color: "bg-cyan-500/10 text-cyan-500" },
  campaign: { label: "Campaign", icon: Megaphone, color: "bg-pink-500/10 text-pink-500" },
  analysis: { label: "Analysis", icon: BarChart3, color: "bg-orange-500/10 text-orange-500" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  sent: { label: "Sent", color: "bg-blue-500/10 text-blue-500" },
  completed: { label: "Completed", color: "bg-emerald-500/10 text-emerald-500" },
  dismissed: { label: "Dismissed", color: "bg-muted text-muted-foreground" },
  approved: { label: "Approved", color: "bg-primary/10 text-primary" },
};

const OUTCOME_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  won_back: { label: "Member returned", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", icon: UserCheck },
  reactivated: { label: "Reactivated", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", icon: ArrowUpRight },
  converted: { label: "Converted", color: "bg-primary/10 text-primary border-primary/20", icon: TrendingUp },
  no_change: { label: "No change", color: "bg-muted text-muted-foreground border-border", icon: ArrowDownRight },
  pending_observation: { label: "Observing", color: "bg-amber-500/10 text-amber-500 border-amber-500/20", icon: Eye },
};

const CATEGORY_ROUTE_MAP: Record<string, { route: string; label: string }> = {
  retention: { route: "/retention", label: "Retention" },
  billing: { route: "/billing", label: "Billing" },
  leads: { route: "/leads", label: "Leads Pipeline" },
  onboarding: { route: "/members", label: "Members" },
  campaign: { route: "/leads", label: "Leads Pipeline" },
  pricing: { route: "/billing", label: "Billing" },
  coaching: { route: "/members", label: "Members" },
  engagement: { route: "/retention", label: "Retention" },
  winback: { route: "/retention", label: "Retention" },
};

const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; color: string; bgColor: string; borderColor: string }> = {
  retention: { icon: Users, color: "text-purple-600", bgColor: "bg-purple-50", borderColor: "border-purple-200" },
  billing: { icon: CreditCard, color: "text-amber-600", bgColor: "bg-amber-50", borderColor: "border-amber-200" },
  onboarding: { icon: UserCheck, color: "text-blue-600", bgColor: "bg-blue-50", borderColor: "border-blue-200" },
  leads: { icon: Target, color: "text-cyan-600", bgColor: "bg-cyan-50", borderColor: "border-cyan-200" },
  campaign: { icon: Megaphone, color: "text-pink-600", bgColor: "bg-pink-50", borderColor: "border-pink-200" },
  pricing: { icon: DollarSign, color: "text-emerald-600", bgColor: "bg-emerald-50", borderColor: "border-emerald-200" },
  engagement: { icon: Activity, color: "text-orange-600", bgColor: "bg-orange-50", borderColor: "border-orange-200" },
};

const URGENCY_CONFIG: Record<string, { label: string; color: string; dotColor: string }> = {
  immediate: { label: "Immediate", color: "bg-red-100 text-red-700 border-red-200", dotColor: "bg-red-500" },
  this_week: { label: "This Week", color: "bg-amber-100 text-amber-700 border-amber-200", dotColor: "bg-amber-500" },
  this_month: { label: "This Month", color: "bg-blue-100 text-blue-700 border-blue-200", dotColor: "bg-blue-500" },
};

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] || { label: type, icon: FileText, color: "bg-secondary text-secondary-foreground" };
}

function isEmailType(type: string) {
  return EMAIL_TASK_TYPES.has(type);
}

function hasTarget(task: { targetId?: number | null; targetType?: string | null }) {
  return task.targetId && task.targetType;
}

function useBenchmarks(gymId: number | null) {
  return useQuery({
    queryKey: ["benchmarks", gymId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/gyms/${gymId}/intelligence/benchmarks`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!gymId,
    staleTime: 60000,
  });
}

function useRsiHistory(gymId: number | null, window: string) {
  return useQuery({
    queryKey: ["rsi-history", gymId, window],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/gyms/${gymId}/intelligence/rsi/history?window=${window}`, { credentials: "include" });
      if (!res.ok) return { window, dataPoints: [], insufficient: true };
      return res.json();
    },
    enabled: !!gymId,
    staleTime: 60000,
  });
}

function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? "bg-primary" : "bg-muted"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

const SMART_ACTION_CATEGORIES = [
  {
    key: "autopilotOutreach",
    channelKey: "channelOutreach",
    cooldownKey: "cooldownOutreach",
    label: "Member Re-engagement",
    subtitle: "Win back members showing signs of leaving",
    icon: Send,
    color: "bg-blue-500/10 text-blue-600",
    borderActive: "border-blue-300",
    explanation: "When a member goes dark — missed classes, declining visits — Iron Metrics flags them and drafts a personal message using their name, favorite class, and activity data. You review it or it sends automatically.",
    timing: "Sent after a member misses their typical attendance pattern — usually 7–14 days of inactivity.",
    defaultCooldown: 14,
    cooldownLabel: "days between re-engagement messages",
    exampleMessage: `"Hey Sarah — we noticed you haven't been to the 6am WOD in a couple weeks. Coach Mike was asking about you! We've got a great partner workout Thursday if you're looking for a reason to get back in. 💪"`,
  },
  {
    key: "autopilotBilling",
    channelKey: "channelBilling",
    cooldownKey: "cooldownBilling",
    label: "Failed Payment Recovery",
    subtitle: "Friendly follow-ups when payments don't go through",
    icon: CreditCard,
    color: "bg-amber-500/10 text-amber-600",
    borderActive: "border-amber-300",
    explanation: "When a payment fails — expired card, insufficient funds — Iron Metrics sends a direct, non-threatening nudge to update their info. Most fix it within 48 hours.",
    timing: "Sent after the first failed payment attempt, with a follow-up if not resolved.",
    defaultCooldown: 1,
    cooldownLabel: "days between payment reminders",
    exampleMessage: `"Hi Jake — your payment didn't go through. Usually just an expired card. Update it online or call us — takes 2 minutes."`,
  },
  {
    key: "autopilotLeads",
    channelKey: "channelLeads",
    cooldownKey: "cooldownLeads",
    label: "Lead Follow-up",
    subtitle: "Keep warm leads from going cold",
    icon: Target,
    color: "bg-cyan-500/10 text-cyan-600",
    borderActive: "border-cyan-300",
    explanation: "When a lead reaches out but doesn't book, Iron Metrics follows up with a direct, personalized message based on their source and interest. Speed wins with leads.",
    timing: "Sent when a lead goes stale — typically 24–72 hours after initial contact with no booking.",
    defaultCooldown: 3,
    cooldownLabel: "days between lead follow-ups",
    exampleMessage: `"Hey Taylor — you asked about CrossFit. The No Sweat Intro is 15 minutes, free, and we'll map out a plan that fits your schedule. Pick a time this week."`,
  },
] as const;

function SmartActionsModal({ gymId, open, onOpenChange }: { gymId: number; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const settingsQueryKey = getGetAutopilotSettingsQueryKey(gymId);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const { data: settings, isLoading } = useGetAutopilotSettings(gymId, {
    query: { enabled: !!gymId },
  });

  const updateSettings = useUpdateAutopilotSettings({
    mutation: {
      onMutate: async ({ data }) => {
        await queryClient.cancelQueries({ queryKey: settingsQueryKey });
        const previous = queryClient.getQueryData(settingsQueryKey);
        queryClient.setQueryData(settingsQueryKey, (old: unknown) => {
          if (!old) return old;
          return { ...(old as Record<string, unknown>), ...data };
        });
        return { previous };
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: settingsQueryKey });
      },
      onError: (_err: unknown, _vars: unknown, context: unknown) => {
        const ctx = context as { previous?: unknown } | undefined;
        if (ctx?.previous) {
          queryClient.setQueryData(settingsQueryKey, ctx.previous);
        }
        toast({ title: "Error", description: "Failed to update settings.", variant: "destructive" });
      },
    },
  });

  const handleUpdate = (updates: Record<string, unknown>) => {
    updateSettings.mutate({ gymId, data: updates as Record<string, unknown> });
  };

  const s = settings as unknown as Record<string, unknown> | undefined;
  const anyEnabled = settings?.autopilotOutreach || settings?.autopilotBilling || settings?.autopilotLeads;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            Smart Actions
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            Smart Actions scans your data, spots problems, and drafts personalized messages — attendance drops, failed payments, stale leads. Every message is built from real behavior, not templates. You control what sends and when.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : settings ? (
          <div className="space-y-4 mt-2">
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-secondary/50 border border-border">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">How it works:</span> Iron Metrics scans your data daily, drafts outreach based on real behavior, and sends it automatically when enabled. Everything that goes out shows up in your task history. No message is ever sent without valid contact info.
              </div>
            </div>

            <div className="space-y-3">
              {SMART_ACTION_CATEGORIES.map((cat) => {
                const isEnabled = !!(s && s[cat.key]);
                const isExpanded = expandedCard === cat.key;
                const currentChannel = s ? (s[cat.channelKey] as string) : "email";
                const currentCooldown = s ? (s[cat.cooldownKey] as number) : cat.defaultCooldown;

                return (
                  <div key={cat.key} className={`rounded-xl border transition-all ${isEnabled ? `bg-card ${cat.borderActive} shadow-sm` : "bg-secondary/30 border-border"}`}>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <button
                          className="flex items-start gap-3 text-left flex-1 min-w-0"
                          onClick={() => setExpandedCard(isExpanded ? null : cat.key)}
                        >
                          <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${cat.color}`}>
                            <cat.icon className="h-4.5 w-4.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground">{cat.label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{cat.subtitle}</p>
                          </div>
                        </button>
                        <div className="flex items-center gap-2 shrink-0 pt-0.5">
                          <span className={`text-[10px] font-semibold uppercase tracking-wider ${isEnabled ? "text-primary" : "text-muted-foreground"}`}>
                            {isEnabled ? "On" : "Off"}
                          </span>
                          <ToggleSwitch
                            checked={isEnabled}
                            onChange={(v) => handleUpdate({ [cat.key]: v })}
                            disabled={updateSettings.isPending}
                          />
                        </div>
                      </div>

                      <AnimatePresence>
                        {(isExpanded || isEnabled) && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-3 space-y-3 pl-12">
                              {isExpanded && (
                                <>
                                  <p className="text-xs text-muted-foreground leading-relaxed">{cat.explanation}</p>
                                  <div className="flex items-start gap-2 text-xs">
                                    <Clock className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                                    <span className="text-muted-foreground"><span className="font-medium text-foreground">Timing:</span> {cat.timing}</span>
                                  </div>
                                  <div className="p-3 rounded-lg bg-muted/50 border border-border">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                                      <MessageSquare className="h-3 w-3" /> Example message
                                    </p>
                                    <p className="text-xs text-foreground/80 italic leading-relaxed">{cat.exampleMessage}</p>
                                  </div>
                                </>
                              )}
                              {isEnabled && (
                                <div className="space-y-3">
                                  <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Send via</p>
                                    <div className="flex gap-1.5">
                                      {(["email", "sms", "both"] as const).map((ch) => (
                                        <button
                                          key={ch}
                                          onClick={() => handleUpdate({ [cat.channelKey]: ch })}
                                          disabled={updateSettings.isPending}
                                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                                            currentChannel === ch
                                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                              : "bg-background text-muted-foreground border-border hover:border-primary/40"
                                          }`}
                                        >
                                          {ch === "email" ? "📧 Email" : ch === "sms" ? "💬 SMS" : "📧💬 Both"}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                                      Wait at least
                                    </p>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="range"
                                        min={1}
                                        max={cat.key === "autopilotBilling" ? 14 : 60}
                                        value={currentCooldown}
                                        onChange={(e) => handleUpdate({ [cat.cooldownKey]: parseInt(e.target.value, 10) })}
                                        disabled={updateSettings.isPending}
                                        className="flex-1 accent-primary h-1"
                                      />
                                      <span className="text-xs font-mono font-semibold text-foreground w-20 text-right">
                                        {currentCooldown} day{currentCooldown !== 1 ? "s" : ""}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">{cat.cooldownLabel}</p>
                                  </div>
                                </div>
                              )}
                              {!isExpanded && (
                                <button
                                  onClick={() => setExpandedCard(cat.key)}
                                  className="text-[10px] text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                                >
                                  Learn more <ChevronDown className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-border pt-4 space-y-3">
              <h3 className="text-xs font-semibold text-foreground flex items-center gap-2">
                <CalendarDays className="h-3.5 w-3.5 text-primary" />
                Action Digest
              </h3>
              <p className="text-xs text-muted-foreground">
                Get a summary of all automated actions sent on your behalf.
              </p>
              <div className="flex gap-2">
                {(["daily", "weekly", "disabled"] as const).map((freq) => (
                  <button
                    key={freq}
                    onClick={() => handleUpdate({ digestFrequency: freq })}
                    disabled={updateSettings.isPending}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                      settings.digestFrequency === freq
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {freq === "daily" ? "📬 Daily" : freq === "weekly" ? "📅 Weekly" : "Off"}
                  </button>
                ))}
              </div>
            </div>

            {anyEnabled && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-medium text-foreground">Your guardrails are active.</span> Every auto-sent message appears in your task history. Messages only go to people with valid contact info, and each person is protected by the cooldown timers you set above.
                </div>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function formatBenchmarkValue(value: number, format: string): string {
  if (format === "currency") return `$${Math.round(value).toLocaleString()}`;
  if (format === "percent") return `${value.toFixed(1)}%`;
  if (format === "months") return `${value.toFixed(1)} mo`;
  return value.toFixed(1);
}

interface BenchmarkInsight {
  conversational: string;
  recommendation: string;
  ctaLabel: string;
  ctaRoute: string;
}

function BenchmarkBar({ comparison }: { comparison: { gymValue: number; industryMedian: number | null; p25: number; p75: number; percentileRank: number | null; percentileLabel: string | null; label: string; format: string; lowerIsBetter?: boolean; insight?: BenchmarkInsight } }) {
  const [, setLocation] = useLocation();
  const [showInsight, setShowInsight] = useState(false);
  const { gymValue, industryMedian, p25, p75, percentileRank, percentileLabel, label, format, insight } = comparison;

  const hasData = industryMedian !== null;
  const allValues = hasData ? [p25, industryMedian, p75, gymValue] : [gymValue];
  const min = Math.min(...allValues) * 0.8;
  const max = Math.max(...allValues) * 1.2 || 1;
  const range = max - min || 1;

  const gymPos = ((gymValue - min) / range) * 100;
  const medianPos = hasData ? (((industryMedian as number) - min) / range) * 100 : 0;

  const badgeColor = percentileRank === null ? "bg-muted text-muted-foreground" :
    percentileRank >= 75 ? "bg-emerald-100 text-emerald-700" :
    percentileRank >= 50 ? "bg-blue-100 text-blue-700" :
    percentileRank >= 25 ? "bg-yellow-100 text-yellow-700" :
    "bg-red-100 text-red-700";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div>
          <h4 className="text-sm font-semibold text-foreground">{label}</h4>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-lg font-bold text-foreground">{formatBenchmarkValue(gymValue, format)}</span>
            {hasData && (
              <span className="text-xs text-muted-foreground">
                vs {formatBenchmarkValue(industryMedian as number, format)} median
              </span>
            )}
          </div>
        </div>
        {percentileLabel && (
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${badgeColor} whitespace-nowrap`}>
            {percentileLabel}
          </span>
        )}
      </div>

      {hasData ? (
        <div className="relative h-8">
          <div className="absolute inset-x-0 top-3 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="absolute h-full bg-muted-foreground/20 rounded-full"
              style={{
                left: `${Math.max(0, ((p25 - min) / range) * 100)}%`,
                width: `${Math.max(1, ((p75 - p25) / range) * 100)}%`,
              }}
            />
          </div>
          <div
            className="absolute top-1 w-0.5 h-6 bg-muted-foreground/40"
            style={{ left: `${Math.max(2, Math.min(98, medianPos))}%` }}
          />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="absolute top-1.5 w-4 h-4 rounded-full bg-primary border-2 border-background shadow-md -ml-2"
            style={{ left: `${Math.max(2, Math.min(98, gymPos))}%` }}
          />
        </div>
      ) : (
        <div className="h-8 flex items-center">
          <div className="w-full h-2 bg-muted rounded-full" />
        </div>
      )}

      {hasData && (
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
          <span>P25: {formatBenchmarkValue(p25, format)}</span>
          <span>P75: {formatBenchmarkValue(p75, format)}</span>
        </div>
      )}

      {insight && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="text-[11px] text-muted-foreground leading-relaxed">{insight.conversational}</p>
          <button
            onClick={() => setShowInsight(!showInsight)}
            className="mt-1.5 text-[10px] font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
          >
            {showInsight ? "Hide advice" : "What should I do?"}
            {showInsight ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          <AnimatePresence>
            {showInsight && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="mt-2 p-2.5 rounded-lg bg-primary/5 border border-primary/10">
                  <p className="text-[11px] text-foreground leading-relaxed mb-2">{insight.recommendation}</p>
                  <button
                    onClick={() => setLocation(insight.ctaRoute)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-[10px] font-semibold hover:bg-primary/90 transition-colors shadow-sm"
                  >
                    {insight.ctaLabel}
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

function BenchmarkSection({ data }: { data: { insufficientData?: boolean; insufficientMessage?: string; sizeLabel?: string; sampleCount?: number; comparisons?: Array<{ metric: string; gymValue: number; industryMedian: number | null; p25: number; p75: number; percentileRank: number | null; percentileLabel: string | null; label: string; format: string }>; computedAt?: string } | null }) {
  if (!data) {
    return (
      <div className="text-center py-8">
        <BarChart3 className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-foreground">Benchmarks Loading</h3>
        <p className="text-xs text-muted-foreground mt-1">Industry benchmarks are being computed...</p>
      </div>
    );
  }

  if (data.insufficientData) {
    return (
      <div className="space-y-4">
        <div className="bg-card border border-border rounded-xl p-6 text-center">
          <Info className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-foreground mb-2">Not Enough Data Yet</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">{data.insufficientMessage}</p>
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg text-xs text-muted-foreground">
            <span>Your size: <strong className="text-foreground">{data.sizeLabel}</strong></span>
            <span>&middot;</span>
            <span>{data.sampleCount} gym{data.sampleCount !== 1 ? "s" : ""} in segment</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {(data.comparisons || []).map((c) => (
            <div key={c.metric} className="bg-card border border-border rounded-xl p-3">
              <h4 className="text-xs font-medium text-muted-foreground mb-1">{c.label}</h4>
              <p className="text-lg font-bold text-foreground">{formatBenchmarkValue(c.gymValue, c.format)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Benchmark comparison pending</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">Industry Benchmarks</h3>
          <p className="text-xs text-muted-foreground">
            Compared against {data.sampleCount} gyms in the <strong>{data.sizeLabel}</strong> segment.
          </p>
        </div>
        {data.computedAt && (
          <span className="text-[10px] text-muted-foreground bg-muted px-3 py-1 rounded-lg">
            Updated {new Date(data.computedAt).toLocaleDateString()}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {(data.comparisons || []).map((comparison) => (
          <BenchmarkBar key={comparison.metric} comparison={comparison} />
        ))}
      </div>
      <div className="bg-muted/50 border border-border rounded-xl p-3 flex items-start gap-3">
        <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground">
          Benchmarks are computed from anonymized, aggregated data across all gyms on the platform.
          No individual gym data is ever exposed. Percentile rankings show where your gym falls
          relative to others of similar size.
        </p>
      </div>
    </div>
  );
}

interface Intervention {
  id: string;
  category: string;
  title: string;
  description: string;
  impact: string;
  urgency: string;
  score: number;
  expectedRevenue: number | null;
  affectedMembers: number | null;
  affectedMemberIds?: number[] | null;
  actions: string[];
  status: string;
}

function InterventionCard({
  intervention,
  onDismiss,
  isExpanded,
  onToggleExpand,
}: {
  intervention: Intervention;
  onDismiss: (id: string) => void;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
}) {
  const [, setLocation] = useLocation();
  const catConfig = CATEGORY_CONFIG[intervention.category] || { icon: BrainCircuit, color: "text-primary", bgColor: "bg-primary/10", borderColor: "border-primary/20" };
  const urgencyConfig = URGENCY_CONFIG[intervention.urgency] || URGENCY_CONFIG.this_month;
  const routeInfo = CATEGORY_ROUTE_MAP[intervention.category];
  const CatIcon = catConfig.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -40, height: 0, marginBottom: 0, transition: { duration: 0.3 } }}
      className={`relative rounded-xl border ${catConfig.borderColor} bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${urgencyConfig.dotColor}`} />

      <div className="p-4 pl-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`h-10 w-10 rounded-xl ${catConfig.bgColor} flex items-center justify-center shrink-0 mt-0.5`}>
              <CatIcon className={`h-5 w-5 ${catConfig.color}`} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="font-semibold text-foreground text-sm leading-tight">{intervention.title}</h3>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${urgencyConfig.color}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${urgencyConfig.dotColor} ${intervention.urgency === "immediate" ? "animate-pulse" : ""}`} />
                  {urgencyConfig.label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{intervention.description}</p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className={`px-2.5 py-1 rounded-lg ${catConfig.bgColor} border ${catConfig.borderColor}`}>
              <span className={`text-lg font-bold ${catConfig.color}`}>{intervention.score}</span>
              <span className="text-[10px] text-muted-foreground ml-0.5">AI</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-3 flex-wrap">
          {intervention.expectedRevenue != null && intervention.expectedRevenue > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200">
              <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-xs font-semibold text-emerald-700">${Math.round(intervention.expectedRevenue).toLocaleString()}</span>
              <span className="text-[10px] text-emerald-600/70">/mo at stake</span>
            </div>
          )}
          {intervention.affectedMembers != null && intervention.affectedMembers > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary border border-border">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">{intervention.affectedMembers}</span>
              <span className="text-[10px] text-muted-foreground">member{intervention.affectedMembers !== 1 ? "s" : ""}</span>
            </div>
          )}
          <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${
            intervention.impact === "high" ? "bg-red-50 text-red-600 border border-red-200" :
            intervention.impact === "medium" ? "bg-amber-50 text-amber-600 border border-amber-200" :
            "bg-secondary text-muted-foreground border border-border"
          }`}>
            {intervention.impact} impact
          </span>
        </div>

        {intervention.actions.length > 0 && (
          <div className="mb-3">
            <button
              onClick={() => onToggleExpand(intervention.id)}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {isExpanded ? "Hide" : "View"} recommended steps ({intervention.actions.length})
            </button>
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 pl-1 space-y-1.5">
                    {intervention.actions.map((action, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                        <span className="text-xs text-muted-foreground leading-relaxed">{action}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <button
            onClick={() => onDismiss(intervention.id)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-md hover:bg-secondary"
          >
            Not now
          </button>
          <button
            onClick={() => {
              if (intervention.affectedMemberIds && intervention.affectedMemberIds.length > 0) {
                setLocation(`/members?ids=${intervention.affectedMemberIds.join(",")}&source=${encodeURIComponent(intervention.title)}`);
              } else {
                setLocation(routeInfo?.route || "/dashboard");
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-xs font-semibold shadow-sm shadow-primary/20 transition-all group"
          >
            Execute Smart Action
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

interface RSIComponentInsight {
  metric: string;
  value: number;
  normalized: number;
  weight: number;
  contribution: number;
  explanation: string;
  lever: string;
  ctaLabel: string;
  ctaRoute: string;
}

function RsiGauge({ rsi }: { rsi: { score: number; band: string; insight: string; trend30d?: number | null; componentInsights?: RSIComponentInsight[] } }) {
  const [, setLocation] = useLocation();
  const [showBreakdown, setShowBreakdown] = useState(false);
  const bandColor = rsi.band === "Strong" || rsi.band === "Excellent" ? "text-emerald-500" :
    rsi.band === "Moderate" ? "text-yellow-500" : "text-destructive";
  const bandBg = rsi.band === "Strong" || rsi.band === "Excellent" ? "bg-emerald-50" :
    rsi.band === "Moderate" ? "bg-yellow-50" : "bg-red-50";

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 text-center">Retention Stability Index</h3>
      <div className="text-center">
        <div className="relative inline-block">
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 128 128">
            <circle cx="64" cy="64" r="52" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-muted" />
            <circle cx="64" cy="64" r="52" stroke="currentColor" strokeWidth="8" fill="transparent"
              strokeDasharray={`${(rsi.score / 100) * 327} 327`}
              className={bandColor}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <span className="text-3xl font-bold text-foreground">{Math.round(rsi.score)}</span>
            <span className={`text-[10px] font-bold mt-0.5 px-2 py-0.5 rounded-full ${bandBg} ${bandColor}`}>{rsi.band}</span>
          </div>
        </div>
        {rsi.trend30d != null && (
          <div className="mt-2 flex items-center justify-center gap-1">
            {rsi.trend30d >= 0 ? <TrendingUp className="h-3 w-3 text-emerald-500" /> : <TrendingDown className="h-3 w-3 text-destructive" />}
            <span className={`text-xs font-medium ${rsi.trend30d >= 0 ? "text-emerald-600" : "text-destructive"}`}>
              {rsi.trend30d >= 0 ? "+" : ""}{rsi.trend30d} pts (30d)
            </span>
          </div>
        )}
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground leading-relaxed text-center">{rsi.insight}</p>

      {rsi.componentInsights && rsi.componentInsights.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors py-1"
          >
            {showBreakdown ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {showBreakdown ? "Hide" : "What's driving this score?"}
          </button>
          <AnimatePresence>
            {showBreakdown && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-2 space-y-3">
                  {rsi.componentInsights.map((ci) => {
                    const barColor = ci.normalized >= 70 ? "bg-emerald-500" : ci.normalized >= 45 ? "bg-yellow-500" : "bg-red-500";
                    return (
                      <div key={ci.metric} className="p-3 rounded-lg bg-secondary/50 border border-border">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold text-foreground">{ci.metric}</span>
                          <span className="text-[10px] font-mono text-muted-foreground">{ci.weight}% weight</span>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full mb-2">
                          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${ci.normalized}%` }} />
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed mb-1">{ci.explanation}</p>
                        <p className="text-[11px] text-foreground font-medium leading-relaxed mb-2">{ci.lever}</p>
                        <button
                          onClick={() => setLocation(ci.ctaRoute)}
                          className="flex items-center gap-1.5 text-[10px] font-semibold text-primary hover:text-primary/80 transition-colors"
                        >
                          {ci.ctaLabel}
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

interface ForecastInsight {
  headline: string;
  currentPace: string;
  leadScenario: string | null;
  churnScenario: string | null;
  ctaLabel: string;
  ctaRoute: string;
}

function RevenueForecastCard({ forecast }: { forecast: { currentMrr: number; expectedMrr3m: number; expectedMrr6m: number; insight?: ForecastInsight } | null }) {
  const [, setLocation] = useLocation();
  const [expanded, setExpanded] = useState(false);

  if (!forecast || !forecast.insight) return null;
  const { insight } = forecast;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="p-4">
        <h3 className="text-xs font-semibold text-foreground flex items-center gap-2 mb-2">
          <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
          Revenue Outlook
        </h3>
        <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">{insight.headline}</p>
        <p className="text-[11px] text-foreground leading-relaxed font-medium">{insight.currentPace}</p>

        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-[10px] font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
        >
          {expanded ? "Hide scenarios" : "What if I..."}
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="mt-2 space-y-2">
                {insight.leadScenario && (
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                    <div className="flex items-start gap-2">
                      <Target className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                      <p className="text-[11px] text-emerald-800 leading-relaxed">{insight.leadScenario}</p>
                    </div>
                  </div>
                )}
                {insight.churnScenario && (
                  <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="flex items-start gap-2">
                      <Users className="h-3.5 w-3.5 text-blue-600 mt-0.5 shrink-0" />
                      <p className="text-[11px] text-blue-800 leading-relaxed">{insight.churnScenario}</p>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => setLocation(insight.ctaRoute)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-[10px] font-semibold hover:bg-primary/90 transition-colors shadow-sm"
                >
                  {insight.ctaLabel}
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function MiniStatCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ElementType; color?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`h-3.5 w-3.5 ${color || "text-primary"}`} />
        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-xl font-bold ${color || "text-foreground"}`}>{value}</p>
    </div>
  );
}

export function AiInsights() {
  const { activeGymId } = useGym();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { tier } = useGymTier();
  const isPro = tier === "pro" || tier === "enterprise";
  const [, setLocation] = useLocation();

  const [smartActionsOpen, setSmartActionsOpen] = useState(false);
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);
  const [briefContent, setBriefContent] = useState<string | null>(null);
  const [briefOpen, setBriefOpen] = useState(false);
  const [editTask, setEditTask] = useState<Record<string, unknown> | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [taskView, setTaskView] = useState<"pending" | "history">("pending");
  const [historyFilter, setHistoryFilter] = useState<string | null>(null);
  const [sendingTaskId, setSendingTaskId] = useState<number | null>(null);
  const [historyAutoFilter, setHistoryAutoFilter] = useState<"all" | "auto" | "manual">("all");
  const [expandedInterventions, setExpandedInterventions] = useState<Set<string>>(new Set());
  const [showDismissed, setShowDismissed] = useState(false);
  const [trendWindow, setTrendWindow] = useState<"30d" | "90d" | "all">("90d");
  const [showRsiTrend, setShowRsiTrend] = useState(false);

  const { data: intel, isLoading: intelLoading, isError: intelError } = useGetIntelligenceOverview(activeGymId as number, {
    query: { enabled: !!activeGymId, retry: 2, staleTime: 30000 }
  });

  const { data: interventions, isLoading: interventionsLoading, isError: interventionsError } = useGetInterventions(activeGymId as number, {
    query: { enabled: !!activeGymId, staleTime: 30000 }
  });

  const { data: dismissedInterventionIds } = useGetDismissedInterventions(activeGymId as number, {
    query: { enabled: !!activeGymId }
  });

  const dismissedInterventions = useMemo(() => new Set(dismissedInterventionIds ?? []), [dismissedInterventionIds]);

  const dismissMutation = useDismissIntervention({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetDismissedInterventionsQueryKey(activeGymId as number) });
      },
    },
  });

  const restoreMutation = useRestoreIntervention({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetDismissedInterventionsQueryKey(activeGymId as number) });
      },
    },
  });

  const { data: rsiHistory } = useRsiHistory(activeGymId, trendWindow);
  const { data: benchmarkData } = useBenchmarks(activeGymId);

  const { data: tasks, isLoading: tasksLoading, isError: tasksError } = useListAiTasks(activeGymId as number, {
    query: { enabled: !!activeGymId }
  });

  const { data: stats } = useGetDashboardStats(activeGymId as number, {
    query: { enabled: !!activeGymId }
  });

  const { data: emailStatus } = useGetAiEmailStatus(activeGymId as number, {
    query: { enabled: !!activeGymId }
  });

  const { data: lastScanData } = useGetAiLastScan(activeGymId as number, {
    query: { enabled: !!activeGymId, refetchInterval: 60_000 }
  });

  const { data: impactData } = useGetAiImpact(activeGymId as number, undefined, {
    query: { enabled: !!activeGymId }
  });

  const platformConfigured = emailStatus?.configured ?? false;
  const gymEmailConfigured = emailStatus?.gymEmailConfigured ?? false;
  const emailReady = platformConfigured && gymEmailConfigured;

  const generateBrief = useGenerateOwnerBrief({
    mutation: {
      onMutate: () => setIsGeneratingBrief(true),
      onSuccess: (data) => {
        setBriefContent((data as unknown as Record<string, unknown>).content as string);
        setBriefOpen(true);
        toast({ title: "Owner Brief Generated", description: "Your weekly brief is ready to review." });
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to generate brief. Please try again.", variant: "destructive" });
      },
      onSettled: () => setIsGeneratingBrief(false),
    }
  });

  const queryKey = getListAiTasksQueryKey(activeGymId as number);

  const updateTask = useUpdateAiTask({
    mutation: {
      onMutate: async ({ taskId, data }) => {
        await queryClient.cancelQueries({ queryKey });
        const previous = queryClient.getQueryData(queryKey);
        queryClient.setQueryData(queryKey, (old: Array<Record<string, unknown>> | undefined) => {
          if (!old) return old;
          if (data.status === 'dismissed' || data.status === 'approved') {
            return old.map((t) => {
              if (t.id !== taskId) return t;
              const newStatus = data.status === 'approved' ? 'completed' : 'dismissed';
              return { ...t, status: newStatus, updatedAt: new Date().toISOString() };
            });
          }
          return old.map((t) => t.id === taskId ? { ...t, ...data } : t);
        });
        return { previous };
      },
      onError: (_err: unknown, _vars: unknown, context: unknown) => {
        const ctx = context as { previous?: unknown } | undefined;
        if (ctx?.previous) {
          queryClient.setQueryData(queryKey, ctx.previous);
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey });
      },
    }
  });

  const sendEmail = useSendAiTaskEmail({
    mutation: {
      onSuccess: (data, variables) => {
        const d = data as unknown as Record<string, unknown>;
        const v = variables as unknown as Record<string, unknown>;
        queryClient.setQueryData(queryKey, (old: Array<Record<string, unknown>> | undefined) => {
          if (!old) return old;
          return old.map((t) => t.id === v.taskId ? { ...t, status: 'sent', channel: 'email', updatedAt: new Date().toISOString() } : t);
        });
        queryClient.invalidateQueries({ queryKey });
        toast({ title: "Email Sent", description: `Email sent to ${d.recipientName} (${d.recipientEmail}).` });
        setSendingTaskId(null);
      },
      onError: (err: unknown) => {
        const error = err as { response?: { data?: { error?: string } } };
        toast({ title: "Failed to Send", description: error?.response?.data?.error || "Could not send email. Please try again.", variant: "destructive" });
        setSendingTaskId(null);
      },
    }
  });

  const sendSms = useSendAiTaskSms({
    mutation: {
      onSuccess: (data, variables) => {
        const d = data as unknown as Record<string, unknown>;
        const v = variables as unknown as Record<string, unknown>;
        queryClient.setQueryData(queryKey, (old: Array<Record<string, unknown>> | undefined) => {
          if (!old) return old;
          return old.map((t) => t.id === v.taskId ? { ...t, status: 'sent', channel: 'sms', updatedAt: new Date().toISOString() } : t);
        });
        queryClient.invalidateQueries({ queryKey });
        toast({ title: "Text Sent", description: `Text sent to ${d.recipientName} (${d.recipientPhone}).` });
        setSendingTaskId(null);
      },
      onError: (err: unknown) => {
        const error = err as { response?: { data?: { error?: string } } };
        toast({ title: "Failed to Send", description: error?.response?.data?.error || "Could not send text. Please try again.", variant: "destructive" });
        setSendingTaskId(null);
      },
    }
  });

  const generateTasksMutation = useGenerateAiTasks({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey });
        queryClient.invalidateQueries({ queryKey: getGetInterventionsQueryKey(activeGymId as number) });
        const result = data as unknown as Record<string, unknown>;
        const created = result.created as number;
        if (created === 0 && result.reason) {
          toast({ title: "Scan Complete", description: result.reason as string });
        } else {
          toast({ title: "Tasks Generated", description: `${created} new task${created !== 1 ? 's' : ''} created from gym data.` });
        }
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to generate tasks.", variant: "destructive" });
      },
    }
  });

  const pendingTasks = useMemo(() => {
    if (!tasks) return [];
    return (tasks as unknown as Array<Record<string, unknown>>).filter((t) => t.status === 'pending');
  }, [tasks]);

  const historyTasks = useMemo(() => {
    if (!tasks) return [];
    return (tasks as unknown as Array<Record<string, unknown>>).filter((t) => ['sent', 'completed', 'dismissed', 'approved'].includes(t.status as string));
  }, [tasks]);

  const filteredPendingTasks = useMemo(() => {
    if (!activeFilter) return pendingTasks;
    return pendingTasks.filter((t) => t.type === activeFilter);
  }, [pendingTasks, activeFilter]);

  const filteredHistoryTasks = useMemo(() => {
    let filtered = historyTasks;
    if (historyFilter) {
      filtered = filtered.filter((t) => t.status === historyFilter);
    }
    if (historyAutoFilter === "auto") {
      filtered = filtered.filter((t) => t.autoSent);
    } else if (historyAutoFilter === "manual") {
      filtered = filtered.filter((t) => !t.autoSent);
    }
    return filtered;
  }, [historyTasks, historyFilter, historyAutoFilter]);

  const typeCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    pendingTasks.forEach((t) => {
      const type = t.type as string;
      map[type] = (map[type] || 0) + 1;
    });
    return map;
  }, [pendingTasks]);

  const historyStatusCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    historyTasks.forEach((t) => {
      const status = t.status as string;
      map[status] = (map[status] || 0) + 1;
    });
    return map;
  }, [historyTasks]);

  const historyAutoCount = useMemo(() => {
    return historyTasks.filter((t) => t.autoSent).length;
  }, [historyTasks]);

  const availableTypes = Object.keys(typeCountMap).sort();
  const pendingCount = pendingTasks.length;

  const activeInterventions = useMemo(() => {
    if (!interventions) return [];
    return (interventions as Intervention[]).filter(i => !dismissedInterventions.has(i.id));
  }, [interventions, dismissedInterventions]);

  const dismissedInterventionList = useMemo(() => {
    if (!interventions) return [];
    return (interventions as Intervention[]).filter(i => dismissedInterventions.has(i.id));
  }, [interventions, dismissedInterventions]);

  const handleDismissIntervention = useCallback((id: string) => {
    dismissMutation.mutate({ gymId: activeGymId as number, data: { interventionId: id } });
    const intervention = (interventions as Intervention[])?.find(i => i.id === id);
    toast({
      title: "Recommendation dismissed",
      description: intervention ? `"${intervention.title}" moved to dismissed.` : "Item dismissed.",
      action: (
        <button
          onClick={() => restoreMutation.mutate({ gymId: activeGymId as number, interventionId: id })}
          className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80"
        >
          <Undo2 className="h-3 w-3" /> Undo
        </button>
      ),
    });
  }, [interventions, toast, dismissMutation, restoreMutation, activeGymId]);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedInterventions(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  function handleApprove(task: Record<string, unknown>) {
    updateTask.mutate(
      { gymId: activeGymId as number, taskId: task.id as number, data: { status: "approved" as const } },
      {
        onSuccess: () => {
          toast({ title: "Task Completed", description: `"${task.title}" has been marked as complete.` });
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to complete task.", variant: "destructive" });
        },
      }
    );
  }

  function handleSendEmail(task: Record<string, unknown>) {
    setSendingTaskId(task.id as number);
    sendEmail.mutate({ gymId: activeGymId as number, taskId: task.id as number });
  }

  function handleSendSms(task: Record<string, unknown>) {
    setSendingTaskId(task.id as number);
    sendSms.mutate({ gymId: activeGymId as number, taskId: task.id as number });
  }

  function handleDismiss(task: Record<string, unknown>) {
    updateTask.mutate(
      { gymId: activeGymId as number, taskId: task.id as number, data: { status: "dismissed" as const } },
      {
        onSuccess: () => {
          toast({ title: "Task Dismissed", description: `"${task.title}" has been dismissed.` });
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to dismiss task.", variant: "destructive" });
        },
      }
    );
  }

  function getDefaultSubject(task: Record<string, unknown>): string {
    const subjectMap: Record<string, string> = {
      outreach: "Checking in",
      leads: "Let's connect",
      billing: "Quick heads-up about your account",
    };
    return subjectMap[task.type as string] || "Message from your gym";
  }

  function openEditModal(task: Record<string, unknown>) {
    setEditTask(task);
    setEditContent((task.aiContent as string) || "");
    setEditSubject((task.subject as string) || getDefaultSubject(task));
  }

  function handleSaveEdit() {
    if (!editTask) return;
    updateTask.mutate(
      { gymId: activeGymId as number, taskId: editTask.id as number, data: { aiContent: editContent, ...(isEmailType(editTask.type as string) ? { subject: editSubject || null } : {}) } },
      {
        onSuccess: () => {
          toast({ title: "Draft Updated", description: "Content has been saved." });
          setEditTask(null);
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to save changes.", variant: "destructive" });
        },
      }
    );
  }

  function handleEditAndApprove() {
    if (!editTask) return;
    updateTask.mutate(
      { gymId: activeGymId as number, taskId: editTask.id as number, data: { aiContent: editContent, ...(isEmailType(editTask.type as string) ? { subject: editSubject || null } : {}), status: "approved" as const } },
      {
        onSuccess: () => {
          toast({ title: "Task Completed", description: `"${editTask.title}" updated and completed.` });
          setEditTask(null);
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to complete task.", variant: "destructive" });
        },
      }
    );
  }

  if (!activeGymId) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">Select a gym to view AI insights.</p>
      </div>
    );
  }

  if (intelLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (intelError || !intel) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">Unable to load AI insights</h3>
          <p className="text-sm text-muted-foreground">Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  const { rsi, topRisks, revenueForecast } = intel;
  const atRiskMembers = stats?.atRiskMembers ?? 0;

  return (
    <div className="space-y-6 pb-10">
      <header className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-9 w-9 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl flex items-center justify-center border border-primary/20">
                <BrainCircuit className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground tracking-tight">AI Insights</h1>
                <p className="text-xs text-muted-foreground">
                  Your gym's strategic advisor
                  {lastScanData?.lastAutoScan && (
                    <span className="ml-1.5 inline-flex items-center gap-1">
                      <span className="text-muted-foreground/50">|</span>
                      <Clock className="h-3 w-3" />
                      Updated {new Date(lastScanData.lastAutoScan).toLocaleString()}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => setSmartActionsOpen(true)}
              className="flex items-center justify-center gap-2 px-3.5 py-2 border rounded-lg font-medium transition-all text-sm min-h-[38px] flex-1 sm:flex-initial bg-card border-border hover:border-primary/50 text-foreground"
            >
              <Zap className="h-4 w-4 text-primary" />
              <span className="hidden sm:inline">Smart Actions</span>
              <span className="sm:hidden">Smart</span>
            </button>
            <button
              onClick={() => generateTasksMutation.mutate({ gymId: activeGymId as number })}
              disabled={generateTasksMutation.isPending}
              className="flex items-center justify-center gap-2 px-3.5 py-2 bg-card border border-border hover:border-primary/50 text-foreground rounded-lg font-medium transition-all text-sm disabled:opacity-50 min-h-[38px] flex-1 sm:flex-initial"
            >
              {generateTasksMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <RefreshCw className="h-4 w-4 text-primary" />}
              <span>Scan Now</span>
            </button>
            <button
              onClick={() => generateBrief.mutate({ gymId: activeGymId as number })}
              disabled={isGeneratingBrief}
              className="flex items-center justify-center gap-2 px-3.5 py-2 bg-card border border-border hover:border-primary/50 text-foreground rounded-lg font-medium transition-all text-sm disabled:opacity-50 min-h-[38px] flex-1 sm:flex-initial"
            >
              {isGeneratingBrief ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Sparkles className="h-4 w-4 text-primary" />}
              <span className="hidden sm:inline">Generate Brief</span>
              <span className="sm:hidden">Brief</span>
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                Recommended Actions
                {activeInterventions.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary">
                    {activeInterventions.length}
                  </span>
                )}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                AI-generated recommendations refreshed with each scan
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {interventionsLoading ? (
              <div className="bg-card border border-border rounded-xl p-8 flex justify-center">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
              </div>
            ) : interventionsError ? (
              <div className="bg-card border border-border rounded-xl p-8 text-center">
                <AlertCircle className="h-10 w-10 text-destructive/50 mx-auto mb-3" />
                <h3 className="font-semibold text-foreground">Unable to load recommendations</h3>
                <p className="text-sm text-muted-foreground mt-1">Please try refreshing the page.</p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {activeInterventions.length > 0 ? (
                  activeInterventions.map((intervention) => (
                    <InterventionCard
                      key={intervention.id}
                      intervention={intervention}
                      onDismiss={handleDismissIntervention}
                      isExpanded={expandedInterventions.has(intervention.id)}
                      onToggleExpand={handleToggleExpand}
                    />
                  ))
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-card border border-emerald-200 rounded-xl p-8 text-center"
                  >
                    <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                    </div>
                    <h3 className="font-semibold text-foreground text-lg">Nothing flagged</h3>
                    <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto leading-relaxed">
                      {dismissedInterventions.size > 0
                        ? "Every recommendation handled. Metrics are clean — use the time to build."
                        : "No issues detected. Metrics look clean. Use the time to build."}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>

          {dismissedInterventionList.length > 0 && (
            <div className="border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setShowDismissed(!showDismissed)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/30 hover:bg-muted/50 transition-colors text-xs font-medium text-muted-foreground"
              >
                <span className="flex items-center gap-2">
                  <X className="h-3.5 w-3.5" />
                  Dismissed ({dismissedInterventionList.length})
                </span>
                {showDismissed ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
              <AnimatePresence>
                {showDismissed && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="divide-y divide-border">
                      {dismissedInterventionList.map((intervention) => {
                        const catConfig = CATEGORY_CONFIG[intervention.category] || { icon: BrainCircuit, color: "text-muted-foreground", bgColor: "bg-muted", borderColor: "border-border" };
                        const CatIcon = catConfig.icon;
                        return (
                          <div key={intervention.id} className="px-4 py-3 flex items-center justify-between opacity-60 hover:opacity-100 transition-opacity">
                            <div className="flex items-center gap-3">
                              <CatIcon className={`h-4 w-4 ${catConfig.color}`} />
                              <span className="text-sm text-foreground">{intervention.title}</span>
                            </div>
                            <button
                              onClick={() => restoreMutation.mutate({ gymId: activeGymId as number, interventionId: intervention.id })}
                              className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                            >
                              <Undo2 className="h-3 w-3" /> Restore
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        <div className="xl:col-span-2 space-y-4">
          <RsiGauge rsi={rsi} />

          <div className="grid grid-cols-2 gap-3">
            <MiniStatCard
              label="Revenue Protected"
              value={impactData?.totalRevenueRetained != null ? `$${Math.round(impactData.totalRevenueRetained).toLocaleString()}` : "--"}
              icon={DollarSign}
              color="text-emerald-600"
            />
            <MiniStatCard
              label="AI Tasks"
              value={String(pendingCount)}
              icon={Activity}
            />
            <MiniStatCard
              label="At-Risk"
              value={String(atRiskMembers)}
              icon={ShieldAlert}
              color={atRiskMembers > 0 ? "text-red-500" : undefined}
            />
            <MiniStatCard
              label="Success Rate"
              value={impactData?.successRate != null ? `${impactData.successRate}%` : "--"}
              icon={TrendingUp}
              color="text-emerald-600"
            />
          </div>

          <RevenueForecastCard forecast={revenueForecast} />

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <h3 className="text-xs font-semibold text-foreground flex items-center gap-2">
                <ShieldAlert className="h-3.5 w-3.5 text-destructive" />
                Risk Radar
              </h3>
              <button
                onClick={() => setLocation("/members?filter=at-risk")}
                className="text-[10px] text-primary hover:text-primary/80 font-medium flex items-center gap-1"
              >
                View all <ExternalLink className="h-3 w-3" />
              </button>
            </div>
            {topRisks.length > 0 ? (
              <div className="divide-y divide-border max-h-[280px] overflow-y-auto">
                {topRisks.slice(0, 5).map((risk) => (
                  <div key={risk.memberId} className="px-3 py-2.5 hover:bg-secondary/30 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-foreground text-xs truncate">{risk.memberName}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                        risk.riskTier === 'critical' ? 'bg-red-100 text-red-600' :
                        risk.riskTier === 'high' ? 'bg-orange-100 text-orange-600' :
                        'bg-yellow-100 text-yellow-600'
                      }`}>{risk.riskTier}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-destructive rounded-full" style={{ width: `${risk.riskScore}%` }} />
                        </div>
                        <span className="font-mono text-muted-foreground">{risk.riskScore}</span>
                      </div>
                      {risk.revenueAtRisk > 0 && (
                        <span className="font-medium text-foreground">${risk.revenueAtRisk}/mo</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center">
                <ShieldCheck className="h-8 w-8 text-emerald-500/50 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No high-risk members</p>
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <button
              onClick={() => setShowRsiTrend(!showRsiTrend)}
              className="w-full p-3 flex items-center justify-between hover:bg-secondary/30 transition-colors"
            >
              <h3 className="text-xs font-semibold text-foreground flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 text-primary" />
                RSI Trend
              </h3>
              {showRsiTrend ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>
            <AnimatePresence>
              {showRsiTrend && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: "auto" }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-3 pb-3">
                    <div className="flex items-center gap-1 mb-2">
                      {(["30d", "90d", "all"] as const).map(w => (
                        <button
                          key={w}
                          onClick={() => setTrendWindow(w)}
                          className={`px-2.5 py-1 text-[10px] font-medium rounded transition-colors ${
                            trendWindow === w ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {w === "30d" ? "30D" : w === "90d" ? "90D" : "All"}
                        </button>
                      ))}
                    </div>
                    {rsiHistory?.insufficient ? (
                      <div className="h-[120px] flex items-center justify-center text-center">
                        <div>
                          <Clock className="h-6 w-6 text-muted-foreground/50 mx-auto mb-1" />
                          <p className="text-[10px] text-muted-foreground">Not enough data yet</p>
                        </div>
                      </div>
                    ) : rsiHistory?.dataPoints && rsiHistory.dataPoints.length > 0 ? (
                      <div className="h-[120px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={rsiHistory.dataPoints} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorRsiSmall" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                              tickFormatter={(val: string) => { const d = new Date(val + 'T00:00:00'); return `${d.getMonth() + 1}/${d.getDate()}`; }}
                              interval="preserveStartEnd" axisLine={false} tickLine={false} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                            <Tooltip
                              contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', fontSize: '11px' }}
                              formatter={(value: number) => [value.toFixed(1), 'RSI']}
                              labelFormatter={(label: string) => { const d = new Date(label + 'T00:00:00'); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }}
                            />
                            <Area type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={1.5}
                              fillOpacity={1} fill="url(#colorRsiSmall)" dot={false} activeDot={{ r: 3, fill: 'hsl(var(--primary))' }} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-[120px] flex items-center justify-center">
                        <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {impactData && (impactData.totalActioned ?? 0) > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                AI Impact Summary
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-muted-foreground">Tasks Actioned</span>
                  <span className="text-sm font-semibold text-foreground">{impactData.totalActioned ?? 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-muted-foreground">Members Saved</span>
                  <span className="text-sm font-semibold text-foreground">{impactData.membersSaved ?? 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-muted-foreground">Revenue Recovered</span>
                  <span className="text-sm font-semibold text-emerald-600">${(impactData.totalRevenueRecovered ?? 0).toLocaleString()}/mo</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <BrainCircuit className="h-4 w-4 text-primary" />
                AI Task Inbox
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">AI-generated tasks that need your review</p>
            </div>
            <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
              <button
                onClick={() => { setTaskView("pending"); setHistoryFilter(null); setHistoryAutoFilter("all"); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  taskView === "pending"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Pending
                {pendingCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-primary/10 text-primary">{pendingCount}</span>
                )}
              </button>
              <button
                onClick={() => { setTaskView("history"); setActiveFilter(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  taskView === "history"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <History className="h-3 w-3" />
                History ({historyTasks.length})
              </button>
            </div>
          </div>

          {taskView === "pending" && availableTypes.length > 1 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              <button
                onClick={() => setActiveFilter(null)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeFilter === null
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Filter className="h-3 w-3" />
                All ({pendingCount})
              </button>
              {availableTypes.map(type => {
                const config = getTypeConfig(type);
                const TypeIcon = config.icon;
                return (
                  <button
                    key={type}
                    onClick={() => setActiveFilter(activeFilter === type ? null : type)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      activeFilter === type
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <TypeIcon className="h-3 w-3" />
                    {config.label} ({typeCountMap[type]})
                  </button>
                );
              })}
            </div>
          )}

          {taskView === "history" && (
            <div className="space-y-2 mt-3">
              {Object.keys(historyStatusCountMap).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setHistoryFilter(null)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      historyFilter === null
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    All ({historyTasks.length})
                  </button>
                  {Object.entries(historyStatusCountMap).sort().map(([status, count]) => {
                    const statusCfg = STATUS_CONFIG[status] || { label: status, color: "bg-muted text-muted-foreground" };
                    return (
                      <button
                        key={status}
                        onClick={() => setHistoryFilter(historyFilter === status ? null : status)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          historyFilter === status
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        {statusCfg.label} ({count})
                      </button>
                    );
                  })}
                </div>
              )}
              {historyAutoCount > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setHistoryAutoFilter("all")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      historyAutoFilter === "all"
                        ? 'bg-primary/20 text-primary border border-primary/30'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    All Sources
                  </button>
                  <button
                    onClick={() => setHistoryAutoFilter(historyAutoFilter === "auto" ? "all" : "auto")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      historyAutoFilter === "auto"
                        ? 'bg-primary/20 text-primary border border-primary/30'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <Zap className="h-3 w-3" />
                    Smart Actions ({historyAutoCount})
                  </button>
                  <button
                    onClick={() => setHistoryAutoFilter(historyAutoFilter === "manual" ? "all" : "manual")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      historyAutoFilter === "manual"
                        ? 'bg-primary/20 text-primary border border-primary/30'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    Manual ({historyTasks.length - historyAutoCount})
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 space-y-3 max-h-[50vh] overflow-y-auto">
          {tasksLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 text-primary animate-spin" /></div>
          ) : tasksError ? (
            <div className="text-center py-12 flex flex-col items-center">
              <X className="h-10 w-10 text-destructive/50 mb-3" />
              <h3 className="text-base font-semibold text-foreground">Failed to load tasks</h3>
              <p className="text-muted-foreground text-sm mt-1">Please try refreshing the page.</p>
            </div>
          ) : taskView === "pending" ? (
            filteredPendingTasks.length > 0 ? (
              <AnimatePresence mode="popLayout">
                {filteredPendingTasks.map((task, i) => {
                  const config = getTypeConfig(task.type as string);
                  const TypeIcon = config.icon;
                  const canEmail = isEmailType(task.type as string) && hasTarget(task as { targetId?: number | null; targetType?: string | null });
                  const isSending = sendingTaskId === (task.id as number);
                  return (
                    <motion.div
                      key={task.id as number}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                      transition={{ delay: i * 0.05 }}
                      className="p-4 rounded-xl border border-border bg-background hover:border-primary/40 transition-colors"
                    >
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${config.color}`}>
                            <TypeIcon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-semibold text-foreground text-sm truncate">{task.title as string}</h4>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Clock className="h-3 w-3" /> {task.createdAt ? new Date(task.createdAt as string).toLocaleDateString() : 'Recently'}
                              <span className="mx-0.5">·</span>
                              <span className="capitalize">{config.label}</span>
                            </p>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                          task.priority === 'high' ? 'bg-destructive/10 text-destructive' : task.priority === 'low' ? 'bg-muted text-muted-foreground' : 'bg-secondary text-secondary-foreground'
                        }`}>
                          {task.priority as string}
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground mb-2">{task.description as string}</p>

                      {task.personalizationMeta ? (() => {
                        try {
                          const meta = JSON.parse(task.personalizationMeta as string);
                          if (meta.dataPoints && meta.dataPoints.length > 0) {
                            return (
                              <div className="mb-2 flex flex-wrap items-center gap-1">
                                <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-muted-foreground mr-1">
                                  <Info className="h-3 w-3" /> Using
                                </span>
                                {meta.dataPoints.map((dp: string, idx: number) => (
                                  <span key={idx} className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
                                    {dp}
                                  </span>
                                ))}
                              </div>
                            );
                          }
                          return null;
                        } catch {
                          return null;
                        }
                      })() : null}

                      {task.aiContent ? (
                        <div className="mb-2 p-3 rounded-lg bg-secondary border border-border text-xs font-mono text-foreground/80 relative whitespace-pre-wrap max-h-32 overflow-y-auto">
                          <div className="absolute -top-3 left-3 bg-background px-2 text-[10px] text-primary uppercase font-bold flex items-center gap-1">
                            <Sparkles className="h-3 w-3" /> Draft
                          </div>
                          {task.aiContent as string}
                        </div>
                      ) : null}

                      <div className="flex flex-wrap justify-end gap-2 pt-1">
                        <button
                          onClick={() => handleDismiss(task)}
                          disabled={updateTask.isPending || isSending}
                          className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-destructive transition-colors min-h-[36px]"
                        >
                          Dismiss
                        </button>
                        <button
                          onClick={() => openEditModal(task)}
                          disabled={isSending}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-border hover:border-primary/40 rounded-lg transition-colors min-h-[36px]"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        {canEmail && isPro && (
                          <>
                            <button
                              onClick={() => emailReady ? handleSendEmail(task) : undefined}
                              disabled={!emailReady || isSending || sendEmail.isPending}
                              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors min-h-[36px] disabled:opacity-50 disabled:cursor-not-allowed ${emailReady ? "text-blue-600 hover:text-blue-500 border border-blue-200 hover:border-blue-300" : "text-muted-foreground border border-border"}`}
                            >
                              {isSending && sendingTaskId === (task.id as number) && !sendSms.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                              Email
                            </button>
                            <button
                              onClick={() => handleSendSms(task)}
                              disabled={isSending || sendSms.isPending}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors min-h-[36px] disabled:opacity-50 disabled:cursor-not-allowed text-emerald-600 hover:text-emerald-500 border border-emerald-200 hover:border-emerald-300"
                            >
                              {isSending && sendingTaskId === (task.id as number) && sendSms.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5" />}
                              Text
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleApprove(task)}
                          disabled={updateTask.isPending || isSending}
                          className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium shadow-sm shadow-primary/20 transition-all min-h-[36px] disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Complete
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            ) : (
              <div className="text-center py-12 flex flex-col items-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-500/50 mb-3" />
                <h3 className="text-base font-semibold text-foreground">Inbox Zero</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  {activeFilter ? `No pending ${getTypeConfig(activeFilter).label.toLowerCase()} tasks.` : 'All AI tasks have been handled.'}
                </p>
              </div>
            )
          ) : (
            filteredHistoryTasks.length > 0 ? (
              <div className="space-y-3">
                {filteredHistoryTasks.map((task) => {
                  const config = getTypeConfig(task.type as string);
                  const TypeIcon = config.icon;
                  const statusCfg = STATUS_CONFIG[task.status as string] || { label: task.status as string, color: "bg-muted text-muted-foreground" };
                  return (
                    <div
                      key={task.id as number}
                      className="p-4 rounded-xl border border-border bg-background/50 opacity-90"
                    >
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${config.color}`}>
                            <TypeIcon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-semibold text-foreground text-sm flex items-center gap-2">
                              {task.title as string}
                              {task.autoSent ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                                  <Zap className="h-3 w-3" />
                                  Auto
                                </span>
                              ) : null}
                            </h4>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Clock className="h-3 w-3" /> {task.updatedAt ? new Date(task.updatedAt as string).toLocaleDateString() : task.createdAt ? new Date(task.createdAt as string).toLocaleDateString() : 'Unknown'}
                              <span className="mx-0.5">·</span>
                              <span className="capitalize">{config.label}</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${statusCfg.color}`}>
                            {task.status === 'sent' && <MailCheck className="h-3 w-3" />}
                            {task.status === 'completed' && <CheckCircle2 className="h-3 w-3" />}
                            {task.status === 'dismissed' && <X className="h-3 w-3" />}
                            {statusCfg.label}
                          </span>
                          {task.outcome && task.outcome !== "none" && OUTCOME_CONFIG[task.outcome as string] ? (() => {
                            const outcomeCfg = OUTCOME_CONFIG[task.outcome as string];
                            const OutcomeIcon = outcomeCfg.icon;
                            return (
                              <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${outcomeCfg.color}`}>
                                <OutcomeIcon className="h-3 w-3" />
                                {outcomeCfg.label}
                              </span>
                            );
                          })() : null}
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground mb-2">{task.description as string}</p>

                      {task.revenueImpact && parseFloat(task.revenueImpact as string) > 0 ? (
                        <div className="flex items-center gap-1.5 mb-2 text-xs text-emerald-600">
                          <DollarSign className="h-3 w-3" />
                          <span className="font-medium">${parseFloat(task.revenueImpact as string).toFixed(2)}/mo</span>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 flex flex-col items-center">
                <History className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <h3 className="text-base font-semibold text-foreground">No History Yet</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  {historyFilter ? `No ${STATUS_CONFIG[historyFilter]?.label.toLowerCase() || historyFilter} tasks.` : historyAutoFilter !== "all" ? `No ${historyAutoFilter === "auto" ? "automated" : "manually approved"} tasks.` : 'Completed and dismissed tasks will appear here.'}
                </p>
              </div>
            )
          )}
        </div>
      </div>

      {!emailReady && pendingTasks.some((t) => isEmailType(t.type as string) && hasTarget(t as { targetId?: number | null; targetType?: string | null })) && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-muted-foreground">
            {!platformConfigured ? (
              <><strong className="text-foreground">Email service not connected.</strong> A Resend or SendGrid integration is needed to enable email sending.</>
            ) : (
              <><strong className="text-foreground">Email sender not configured.</strong> Go to <a href="/settings" className="text-primary underline underline-offset-2 hover:text-primary/80">Settings</a> to set your From Name and From Email.</>
            )}
          </p>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden p-4 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Industry Benchmarks</h2>
        </div>
        <BenchmarkSection data={benchmarkData} />
      </div>

      <SmartActionsModal gymId={activeGymId} open={smartActionsOpen} onOpenChange={setSmartActionsOpen} />

      <Dialog open={!!editTask} onOpenChange={(open) => { if (!open) setEditTask(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Draft Content</DialogTitle>
            <DialogDescription>{editTask?.title as string}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {editTask && isEmailType(editTask.type as string) && (
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email Subject</label>
                <input
                  type="text"
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  placeholder="Email subject line..."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            )}
            <div>
              {editTask && isEmailType(editTask.type as string) && (
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Email Body</label>
              )}
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={10}
                className="w-full rounded-lg border border-border bg-background p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <button
              onClick={() => setEditTask(null)}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={updateTask.isPending}
              className="px-4 py-2 text-sm font-medium border border-border hover:border-primary/40 rounded-lg transition-colors disabled:opacity-50"
            >
              Save Draft
            </button>
            <button
              onClick={handleEditAndApprove}
              disabled={updateTask.isPending}
              className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium shadow-md shadow-primary/20 transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              Save & Complete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={briefOpen} onOpenChange={setBriefOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Owner Brief
            </DialogTitle>
            <DialogDescription>AI-generated weekly strategic overview</DialogDescription>
          </DialogHeader>
          {briefContent && (
            <div className="prose prose-sm max-w-none">
              {briefContent.split('\n').map((line, i) => {
                if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-bold text-foreground mt-4 mb-2">{line.replace('## ', '')}</h2>;
                if (line.startsWith('### ')) return <h3 key={i} className="text-base font-semibold text-foreground mt-3 mb-1">{line.replace('### ', '')}</h3>;
                if (line.startsWith('- **')) {
                  const match = line.match(/^- \*\*(.+?)\*\*(.*)$/);
                  if (match) return <p key={i} className="text-sm text-muted-foreground ml-4 my-0.5"><strong className="text-foreground">{match[1]}</strong>{match[2]}</p>;
                }
                if (line.startsWith('- ')) return <p key={i} className="text-sm text-muted-foreground ml-4 my-0.5">{line.replace('- ', '')}</p>;
                if (line.match(/^\d+\./)) {
                  const match = line.match(/^(\d+\.)\s*\*\*(.+?)\*\*:\s*(.*)$/);
                  if (match) return <p key={i} className="text-sm text-muted-foreground ml-4 my-0.5">{match[1]} <strong className="text-foreground">{match[2]}</strong>: {match[3]}</p>;
                  return <p key={i} className="text-sm text-muted-foreground ml-4 my-0.5">{line}</p>;
                }
                if (line.startsWith('[')) return <p key={i} className="text-xs text-primary/60 mt-4 italic">{line}</p>;
                if (line.trim() === '') return <div key={i} className="h-2" />;
                return <p key={i} className="text-sm text-muted-foreground my-0.5">{line}</p>;
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
