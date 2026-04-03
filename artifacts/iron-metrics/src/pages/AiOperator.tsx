import React, { useState, useMemo } from "react";
import { useGym } from "@/store/GymContext";
import { useListAiTasks, useGenerateOwnerBrief, useUpdateAiTask, useGenerateAiTasks, useGetDashboardStats, getListAiTasksQueryKey, useSendAiTaskEmail, useGetAiEmailStatus, useGetAiLastScan, useGetAiImpact, useGetAutopilotSettings, useUpdateAutopilotSettings, getGetAutopilotSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
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
  Bot, Sparkles, Send, CheckCircle2, Clock, Loader2,
  FileText, X, Filter, Users, CreditCard,
  Target, Megaphone, BarChart3, Edit2, RefreshCw,
  History, Mail, MailCheck, AlertCircle, Info, TrendingUp, DollarSign,
  UserCheck, Eye, ArrowUpRight, ArrowDownRight,
  Settings, Zap, ShieldCheck, CalendarDays,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

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

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] || { label: type, icon: FileText, color: "bg-secondary text-secondary-foreground" };
}

function isEmailType(type: string) {
  return EMAIL_TASK_TYPES.has(type);
}

function hasTarget(task: any) {
  return task.targetId && task.targetType;
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

function AutopilotSettingsPanel({ gymId }: { gymId: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const settingsQueryKey = getGetAutopilotSettingsQueryKey(gymId);

  const { data: settings, isLoading } = useGetAutopilotSettings(gymId, {
    query: { enabled: !!gymId },
  });

  const updateSettings = useUpdateAutopilotSettings({
    mutation: {
      onMutate: async ({ data }) => {
        await queryClient.cancelQueries({ queryKey: settingsQueryKey });
        const previous = queryClient.getQueryData(settingsQueryKey);
        queryClient.setQueryData(settingsQueryKey, (old: any) => {
          if (!old) return old;
          return { ...old, ...data };
        });
        return { previous };
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: settingsQueryKey });
        toast({ title: "Auto-Pilot Updated", description: "Settings saved successfully." });
      },
      onError: (_err: any, _vars: any, context: any) => {
        if (context?.previous) {
          queryClient.setQueryData(settingsQueryKey, context.previous);
        }
        toast({ title: "Error", description: "Failed to update settings.", variant: "destructive" });
      },
    },
  });

  const handleToggle = (key: string, value: boolean) => {
    updateSettings.mutate({
      gymId,
      data: { [key]: value } as any,
    });
  };

  const handleCooldown = (days: number) => {
    updateSettings.mutate({
      gymId,
      data: { cooldownDays: days } as any,
    });
  };

  const handleDigestFrequency = (freq: string) => {
    updateSettings.mutate({
      gymId,
      data: { digestFrequency: freq } as any,
    });
  };

  const anyEnabled = settings?.autopilotOutreach || settings?.autopilotBilling || settings?.autopilotLeads;

  return (
    <>
      <button
        onClick={() => setSettingsOpen(true)}
        className={`flex items-center justify-center gap-2 px-4 py-2.5 border rounded-xl font-medium transition-all shadow-sm min-h-[44px] flex-1 sm:flex-initial ${
          anyEnabled
            ? "bg-primary/10 border-primary/30 text-primary hover:border-primary/50"
            : "bg-card border-border hover:border-primary/50 text-foreground"
        }`}
      >
        {anyEnabled ? <Zap className="h-5 w-5" /> : <Settings className="h-5 w-5 text-primary" />}
        <span>Auto-Pilot{anyEnabled ? " On" : ""}</span>
      </button>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Auto-Pilot Settings
            </DialogTitle>
            <DialogDescription>
              Enable auto-pilot to let the AI Operator send emails automatically. You'll stay informed through digest summaries.
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : settings ? (
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Auto-Send Categories
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full flex items-center justify-center bg-blue-500/10 text-blue-500">
                        <Send className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Outreach</p>
                        <p className="text-xs text-muted-foreground">At-risk member re-engagement</p>
                      </div>
                    </div>
                    <ToggleSwitch
                      checked={settings.autopilotOutreach}
                      onChange={(v) => handleToggle("autopilotOutreach", v)}
                      disabled={updateSettings.isPending}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full flex items-center justify-center bg-amber-500/10 text-amber-500">
                        <CreditCard className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Billing</p>
                        <p className="text-xs text-muted-foreground">Failed payment follow-ups</p>
                      </div>
                    </div>
                    <ToggleSwitch
                      checked={settings.autopilotBilling}
                      onChange={(v) => handleToggle("autopilotBilling", v)}
                      disabled={updateSettings.isPending}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full flex items-center justify-center bg-cyan-500/10 text-cyan-500">
                        <Target className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Leads</p>
                        <p className="text-xs text-muted-foreground">Stale lead follow-ups</p>
                      </div>
                    </div>
                    <ToggleSwitch
                      checked={settings.autopilotLeads}
                      onChange={(v) => handleToggle("autopilotLeads", v)}
                      disabled={updateSettings.isPending}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Cooldown Period
                </h3>
                <p className="text-xs text-muted-foreground">
                  Minimum days between auto-emails to the same person.
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={90}
                    value={settings.cooldownDays}
                    onChange={(e) => handleCooldown(parseInt(e.target.value, 10))}
                    disabled={updateSettings.isPending}
                    className="flex-1 accent-primary"
                  />
                  <span className="text-sm font-mono font-medium text-foreground w-16 text-right">
                    {settings.cooldownDays} day{settings.cooldownDays !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  Digest Frequency
                </h3>
                <p className="text-xs text-muted-foreground">
                  How often you receive a summary of auto-piloted actions.
                </p>
                <div className="flex gap-2">
                  {(["daily", "weekly", "disabled"] as const).map((freq) => (
                    <button
                      key={freq}
                      onClick={() => handleDigestFrequency(freq)}
                      disabled={updateSettings.isPending}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                        settings.digestFrequency === freq
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-muted/50 text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                      }`}
                    >
                      {freq.charAt(0).toUpperCase() + freq.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {anyEnabled && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground">
                  <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Safety guardrails active</p>
                    <p className="mt-0.5">
                      Auto-pilot only sends to contacts with valid email addresses and respects a {settings.cooldownDays}-day cooldown per person. Disable any category at any time to revert to manual approval.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function AiOperator() {
  const { activeGymId } = useGym();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);
  const [briefContent, setBriefContent] = useState<string | null>(null);
  const [briefOpen, setBriefOpen] = useState(false);
  const [editTask, setEditTask] = useState<any | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"pending" | "history" | "impact">("pending");
  const [historyFilter, setHistoryFilter] = useState<string | null>(null);
  const [sendingTaskId, setSendingTaskId] = useState<number | null>(null);
  const [historyAutoFilter, setHistoryAutoFilter] = useState<"all" | "auto" | "manual">("all");

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
      onSuccess: (data: any) => {
        setBriefContent(data.content);
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
        queryClient.setQueryData(queryKey, (old: any[] | undefined) => {
          if (!old) return old;
          if (data.status === 'dismissed' || data.status === 'approved') {
            return old.map((t: any) => {
              if (t.id !== taskId) return t;
              const newStatus = data.status === 'approved' ? 'completed' : 'dismissed';
              return { ...t, status: newStatus, updatedAt: new Date().toISOString() };
            });
          }
          return old.map((t: any) => t.id === taskId ? { ...t, ...data } : t);
        });
        return { previous };
      },
      onError: (_err: any, _vars: any, context: any) => {
        if (context?.previous) {
          queryClient.setQueryData(queryKey, context.previous);
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey });
      },
    }
  });

  const sendEmail = useSendAiTaskEmail({
    mutation: {
      onSuccess: (data: any, variables: any) => {
        queryClient.setQueryData(queryKey, (old: any[] | undefined) => {
          if (!old) return old;
          return old.map((t: any) => t.id === variables.taskId ? { ...t, status: 'sent', updatedAt: new Date().toISOString() } : t);
        });
        queryClient.invalidateQueries({ queryKey });
        toast({ title: "Email Sent", description: `Email sent to ${data.recipientName} (${data.recipientEmail}).` });
        setSendingTaskId(null);
      },
      onError: (err: any) => {
        toast({ title: "Failed to Send", description: err?.response?.data?.error || "Could not send email. Please try again.", variant: "destructive" });
        setSendingTaskId(null);
      },
    }
  });

  const generateTasksMutation = useGenerateAiTasks({
    mutation: {
      onSuccess: (data: any) => {
        queryClient.invalidateQueries({ queryKey });
        toast({ title: "Tasks Generated", description: `${data.created} new task${data.created !== 1 ? 's' : ''} created from gym data.` });
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to generate tasks.", variant: "destructive" });
      },
    }
  });

  const pendingTasks = useMemo(() => {
    if (!tasks) return [];
    return tasks.filter((t: any) => t.status === 'pending');
  }, [tasks]);

  const historyTasks = useMemo(() => {
    if (!tasks) return [];
    return tasks.filter((t: any) => ['sent', 'completed', 'dismissed', 'approved'].includes(t.status));
  }, [tasks]);

  const filteredPendingTasks = useMemo(() => {
    if (!activeFilter) return pendingTasks;
    return pendingTasks.filter((t: any) => t.type === activeFilter);
  }, [pendingTasks, activeFilter]);

  const filteredHistoryTasks = useMemo(() => {
    let filtered = historyTasks;
    if (historyFilter) {
      filtered = filtered.filter((t: any) => t.status === historyFilter);
    }
    if (historyAutoFilter === "auto") {
      filtered = filtered.filter((t: any) => t.autoSent);
    } else if (historyAutoFilter === "manual") {
      filtered = filtered.filter((t: any) => !t.autoSent);
    }
    return filtered;
  }, [historyTasks, historyFilter, historyAutoFilter]);

  const typeCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    pendingTasks.forEach((t: any) => {
      map[t.type] = (map[t.type] || 0) + 1;
    });
    return map;
  }, [pendingTasks]);

  const historyStatusCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    historyTasks.forEach((t: any) => {
      map[t.status] = (map[t.status] || 0) + 1;
    });
    return map;
  }, [historyTasks]);

  const historyAutoCount = useMemo(() => {
    return historyTasks.filter((t: any) => t.autoSent).length;
  }, [historyTasks]);

  const availableTypes = Object.keys(typeCountMap).sort();

  const activeMembers = stats?.activeMembers ?? 0;
  const atRiskMembers = stats?.atRiskMembers ?? 0;
  const pendingCount = pendingTasks.length;

  function handleApprove(task: any) {
    updateTask.mutate(
      { gymId: activeGymId as number, taskId: task.id, data: { status: "approved" as const } },
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

  function handleSendEmail(task: any) {
    setSendingTaskId(task.id);
    sendEmail.mutate({ gymId: activeGymId as number, taskId: task.id });
  }

  function handleDismiss(task: any) {
    updateTask.mutate(
      { gymId: activeGymId as number, taskId: task.id, data: { status: "dismissed" as const } },
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

  function getDefaultSubject(task: any): string {
    const subjectMap: Record<string, string> = {
      outreach: "Checking in",
      leads: "Let's connect",
      billing: "Quick heads-up about your account",
    };
    return subjectMap[task.type] || "Message from your gym";
  }

  function openEditModal(task: any) {
    setEditTask(task);
    setEditContent(task.aiContent || "");
    setEditSubject(task.subject || getDefaultSubject(task));
  }

  function handleSaveEdit() {
    if (!editTask) return;
    updateTask.mutate(
      { gymId: activeGymId as number, taskId: editTask.id, data: { aiContent: editContent, ...(isEmailType(editTask.type) ? { subject: editSubject || null } : {}) } },
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
      { gymId: activeGymId as number, taskId: editTask.id, data: { aiContent: editContent, ...(isEmailType(editTask.type) ? { subject: editSubject || null } : {}), status: "approved" as const } },
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
        <p className="text-muted-foreground">Select a gym to continue.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 h-full flex flex-col">
      <header className="flex flex-col gap-3 md:gap-4 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-8 w-8 bg-primary/20 rounded-lg flex items-center justify-center border border-primary/30 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">AI Operator</h1>
            </div>
            <p className="text-sm md:text-base text-muted-foreground">
              Your autonomous gym management assistant.
              {lastScanData?.lastAutoScan && (
                <span className="ml-2 inline-flex items-center gap-1 text-xs text-muted-foreground/70">
                  <Clock className="h-3 w-3" />
                  Last auto-scan: {new Date(lastScanData.lastAutoScan).toLocaleString()}
                </span>
              )}
            </p>
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto">
            <AutopilotSettingsPanel gymId={activeGymId} />
            <button
              onClick={() => generateTasksMutation.mutate({ gymId: activeGymId as number })}
              disabled={generateTasksMutation.isPending}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-card border border-border hover:border-primary/50 text-foreground rounded-xl font-medium transition-all shadow-sm disabled:opacity-50 min-h-[44px] flex-1 sm:flex-initial"
            >
              {generateTasksMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <RefreshCw className="h-5 w-5 text-primary" />}
              <span>Scan & Generate</span>
            </button>
            <button 
              onClick={() => generateBrief.mutate({ gymId: activeGymId as number })}
              disabled={isGeneratingBrief}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-card border border-border hover:border-primary/50 text-foreground rounded-xl font-medium transition-all shadow-sm disabled:opacity-50 min-h-[44px] flex-1 sm:flex-initial"
            >
              {isGeneratingBrief ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <Sparkles className="h-5 w-5 text-primary" />}
              <span>Owner Brief</span>
            </button>
          </div>
        </div>
      </header>

      <div className="bg-gradient-to-r from-primary/10 via-background to-background border border-primary/20 rounded-2xl p-4 md:p-6 relative overflow-hidden shrink-0">
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-lg md:text-xl font-bold text-foreground mb-2">Automated Retention Workflows Active</h2>
          <p className="text-muted-foreground text-xs md:text-sm leading-relaxed">
            The Intelligence Engine is currently monitoring <strong className="text-foreground">{activeMembers} active members</strong>.
            {atRiskMembers > 0 && <> It has flagged <strong className="text-foreground">{atRiskMembers} at-risk member{atRiskMembers !== 1 ? 's' : ''}</strong> for intervention.</>}
            {pendingCount > 0 && <> There {pendingCount === 1 ? 'is' : 'are'} <strong className="text-foreground">{pendingCount} pending task{pendingCount !== 1 ? 's' : ''}</strong> awaiting your review.</>}
            {pendingCount === 0 && <> All AI-generated tasks have been reviewed.</>}
          </p>
        </div>
        <Bot className="absolute -right-4 -bottom-4 h-24 md:h-32 w-24 md:w-32 text-primary/10" />
      </div>

      <div className="flex-1 min-h-[60vh] bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-3 md:p-4 border-b border-border bg-muted/30 shrink-0">
          <div className="flex justify-between items-center mb-3">
            <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
              <button
                onClick={() => { setActiveTab("pending"); setHistoryFilter(null); setHistoryAutoFilter("all"); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activeTab === "pending"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Filter className="h-3 w-3" />
                Pending ({pendingCount})
              </button>
              <button
                onClick={() => { setActiveTab("history"); setActiveFilter(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activeTab === "history"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <History className="h-3 w-3" />
                History ({historyTasks.length})
              </button>
              <button
                onClick={() => { setActiveTab("impact"); setActiveFilter(null); setHistoryFilter(null); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activeTab === "impact"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <TrendingUp className="h-3 w-3" />
                Impact
              </button>
            </div>
          </div>

          {activeTab === "pending" && availableTypes.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
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

          {activeTab === "history" && (
            <div className="space-y-2">
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
                    Auto-Pilot ({historyAutoCount})
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
        
        <div className="flex-1 overflow-y-auto p-3 md:p-4 custom-scrollbar space-y-3 md:space-y-4">
          {tasksLoading ? (
             <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 text-primary animate-spin" /></div>
          ) : tasksError ? (
            <div className="text-center py-16 flex flex-col items-center">
              <X className="h-12 w-12 text-destructive/50 mb-4" />
              <h3 className="text-lg font-semibold text-foreground">Failed to load tasks</h3>
              <p className="text-muted-foreground text-sm mt-1">Please try refreshing the page.</p>
            </div>
          ) : activeTab === "impact" ? (
            <div className="space-y-6 p-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <div className="p-4 rounded-xl border border-border bg-background">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">Tasks Actioned</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{impactData?.totalActioned ?? 0}</p>
                </div>
                <div className="p-4 rounded-xl border border-border bg-background">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <UserCheck className="h-4 w-4 text-emerald-500" />
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">Members Saved</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{impactData?.membersSaved ?? 0}</p>
                </div>
                <div className="p-4 rounded-xl border border-border bg-background">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">Success Rate</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{impactData?.successRate ?? 0}%</p>
                </div>
                <div className="p-4 rounded-xl border border-border bg-background">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <DollarSign className="h-4 w-4 text-emerald-500" />
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">Revenue Impact</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">${((impactData?.totalRevenueRetained ?? 0) + (impactData?.totalRevenueRecovered ?? 0)).toLocaleString()}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-border bg-background">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Revenue Breakdown</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Revenue Retained</span>
                      <span className="text-sm font-medium text-emerald-500">${(impactData?.totalRevenueRetained ?? 0).toLocaleString()}/mo</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Revenue Recovered</span>
                      <span className="text-sm font-medium text-emerald-500">${(impactData?.totalRevenueRecovered ?? 0).toLocaleString()}/mo</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-xl border border-border bg-background">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Outcome Breakdown</h3>
                  <div className="space-y-2">
                    {[
                      { key: "won_back", label: "Won Back", color: "bg-emerald-500" },
                      { key: "reactivated", label: "Reactivated", color: "bg-emerald-400" },
                      { key: "converted", label: "Converted", color: "bg-primary" },
                      { key: "no_change", label: "No Change", color: "bg-muted-foreground" },
                      { key: "pending_observation", label: "Observing", color: "bg-amber-500" },
                    ].map(({ key, label, color }) => {
                      const count = (impactData?.outcomeCounts as any)?.[key] ?? 0;
                      const total = impactData?.totalActioned ?? 0;
                      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                      return (
                        <div key={key} className="flex items-center gap-3">
                          <div className={`h-2 w-2 rounded-full ${color} shrink-0`} />
                          <span className="text-xs text-muted-foreground flex-1">{label}</span>
                          <span className="text-xs font-medium text-foreground">{count}</span>
                          <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {impactData?.timeline && impactData.timeline.length > 0 && (
                <div className="p-4 rounded-xl border border-border bg-background">
                  <h3 className="text-sm font-semibold text-foreground mb-4">Outcomes Over Time</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={impactData.timeline} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip
                          contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                          labelStyle={{ color: "hsl(var(--foreground))" }}
                        />
                        <Legend wrapperStyle={{ fontSize: "11px" }} />
                        <Bar dataKey="won_back" name="Won Back" fill="#10b981" stackId="a" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="reactivated" name="Reactivated" fill="#34d399" stackId="a" />
                        <Bar dataKey="converted" name="Converted" fill="hsl(var(--primary))" stackId="a" />
                        <Bar dataKey="no_change" name="No Change" fill="#6b7280" stackId="a" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {(!impactData || impactData.totalActioned === 0) && (
                <div className="text-center py-12 flex flex-col items-center">
                  <TrendingUp className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold text-foreground">No Impact Data Yet</h3>
                  <p className="text-muted-foreground text-sm mt-1 max-w-md">
                    As you action AI tasks (approve, complete, or send emails), the system will track outcomes and show measurable results here.
                  </p>
                </div>
              )}
            </div>
          ) : activeTab === "pending" ? (
            filteredPendingTasks.length > 0 ? (
              <AnimatePresence mode="popLayout">
                {filteredPendingTasks.map((task: any, i: number) => {
                  const config = getTypeConfig(task.type);
                  const TypeIcon = config.icon;
                  const canEmail = isEmailType(task.type) && hasTarget(task);
                  const isSending = sendingTaskId === task.id;
                  return (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                      transition={{ delay: i * 0.05 }}
                      className="p-4 md:p-5 rounded-xl border border-border bg-background hover:border-primary/40 transition-colors group"
                    >
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${config.color}`}>
                            <TypeIcon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-semibold text-foreground text-sm md:text-base">{task.title}</h4>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Clock className="h-3 w-3" /> {task.createdAt ? new Date(task.createdAt).toLocaleDateString() : 'Recently'}
                              <span className="mx-1">·</span>
                              <span className="capitalize">{config.label}</span>
                            </p>
                          </div>
                        </div>
                        <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider self-start shrink-0 ${
                          task.priority === 'high' ? 'bg-destructive/10 text-destructive' : task.priority === 'low' ? 'bg-muted text-muted-foreground' : 'bg-secondary text-secondary-foreground'
                        }`}>
                          {task.priority} Priority
                        </span>
                      </div>
                      
                      <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">
                        {task.description}
                      </p>

                      {task.personalizationMeta && (() => {
                        try {
                          const meta = JSON.parse(task.personalizationMeta);
                          if (meta.dataPoints && meta.dataPoints.length > 0) {
                            return (
                              <div className="mb-3 md:mb-4 flex flex-wrap items-center gap-1.5">
                                <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-muted-foreground mr-1">
                                  <Info className="h-3 w-3" /> Personalized using
                                </span>
                                {meta.dataPoints.map((dp: string, idx: number) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary border border-primary/20"
                                  >
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
                      })()}

                      {task.aiContent && (
                        <div className="mb-3 md:mb-4 p-3 md:p-4 rounded-lg bg-secondary border border-border text-xs md:text-sm font-mono text-foreground/80 relative whitespace-pre-wrap">
                          <div className="absolute -top-3 left-4 bg-background px-2 text-[10px] text-primary uppercase font-bold flex items-center gap-1">
                            <Sparkles className="h-3 w-3" /> Draft Content
                          </div>
                          {task.aiContent}
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-2">
                        <button
                          onClick={() => handleDismiss(task)}
                          disabled={updateTask.isPending || isSending}
                          className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-destructive transition-colors min-h-[44px] order-4 sm:order-1"
                        >
                          Dismiss
                        </button>
                        <button
                          onClick={() => openEditModal(task)}
                          disabled={isSending}
                          className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-border hover:border-primary/40 rounded-lg transition-colors min-h-[44px] order-3 sm:order-2"
                        >
                          <Edit2 className="h-4 w-4" />
                          Edit
                        </button>
                        {canEmail && (
                          <div className="relative group order-2 sm:order-3">
                            <button
                              onClick={() => emailReady ? handleSendEmail(task) : undefined}
                              disabled={!emailReady || isSending || sendEmail.isPending}
                              className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed ${emailReady ? "text-blue-400 hover:text-blue-300 border border-blue-500/30 hover:border-blue-500/50" : "text-muted-foreground border border-border"}`}
                            >
                              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                              Send Email
                            </button>
                            {!emailReady && (
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-popover border border-border rounded-lg text-xs text-muted-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg z-10">
                                {!platformConfigured ? "Email service not connected" : "Configure sender in Settings"}
                              </div>
                            )}
                          </div>
                        )}
                        <button
                          onClick={() => handleApprove(task)}
                          disabled={updateTask.isPending || isSending}
                          className="flex items-center justify-center gap-2 px-5 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium shadow-md shadow-primary/20 transition-all min-h-[44px] order-1 sm:order-4 disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Mark Complete
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            ) : (
              <div className="text-center py-16 flex flex-col items-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-500/50 mb-4" />
                <h3 className="text-lg font-semibold text-foreground">Inbox Zero</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  {activeFilter ? `No pending ${getTypeConfig(activeFilter).label.toLowerCase()} tasks.` : 'All AI tasks have been handled.'}
                </p>
              </div>
            )
          ) : (
            filteredHistoryTasks.length > 0 ? (
              <div className="space-y-3 md:space-y-4">
                {filteredHistoryTasks.map((task: any) => {
                  const config = getTypeConfig(task.type);
                  const TypeIcon = config.icon;
                  const statusCfg = STATUS_CONFIG[task.status] || { label: task.status, color: "bg-muted text-muted-foreground" };
                  return (
                    <div
                      key={task.id}
                      className="p-4 md:p-5 rounded-xl border border-border bg-background/50 opacity-90"
                    >
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${config.color}`}>
                            <TypeIcon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-semibold text-foreground text-sm md:text-base flex items-center gap-2">
                              {task.title}
                              {task.autoSent && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/25">
                                  <Zap className="h-3 w-3" />
                                  Auto
                                </span>
                              )}
                            </h4>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Clock className="h-3 w-3" /> {task.updatedAt ? new Date(task.updatedAt).toLocaleDateString() : task.createdAt ? new Date(task.createdAt).toLocaleDateString() : 'Unknown'}
                              <span className="mx-1">·</span>
                              <span className="capitalize">{config.label}</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 self-start shrink-0 flex-wrap">
                          <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${statusCfg.color}`}>
                            {task.status === 'sent' && <MailCheck className="h-3 w-3" />}
                            {task.status === 'completed' && <CheckCircle2 className="h-3 w-3" />}
                            {task.status === 'dismissed' && <X className="h-3 w-3" />}
                            {statusCfg.label}
                          </span>
                          {task.outcome && task.outcome !== "none" && OUTCOME_CONFIG[task.outcome] && (() => {
                            const outcomeCfg = OUTCOME_CONFIG[task.outcome];
                            const OutcomeIcon = outcomeCfg.icon;
                            return (
                              <span className={`px-2.5 py-1 rounded border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${outcomeCfg.color}`}>
                                <OutcomeIcon className="h-3 w-3" />
                                {outcomeCfg.label}
                              </span>
                            );
                          })()}
                        </div>
                      </div>

                      <p className="text-xs md:text-sm text-muted-foreground mb-3">
                        {task.description}
                      </p>

                      {task.personalizationMeta && (() => {
                        try {
                          const meta = JSON.parse(task.personalizationMeta);
                          if (meta.dataPoints && meta.dataPoints.length > 0) {
                            return (
                              <div className="mb-3 flex flex-wrap items-center gap-1.5">
                                <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-muted-foreground/70 mr-1">
                                  <Info className="h-3 w-3" /> Personalized using
                                </span>
                                {meta.dataPoints.map((dp: string, idx: number) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-border"
                                  >
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
                      })()}

                      {task.revenueImpact && parseFloat(task.revenueImpact) > 0 && (
                        <div className="flex items-center gap-1.5 mb-3 text-xs text-emerald-500">
                          <DollarSign className="h-3 w-3" />
                          <span className="font-medium">${parseFloat(task.revenueImpact).toFixed(2)}/mo revenue impact</span>
                        </div>
                      )}

                      {task.aiContent && (
                        <div className="p-3 md:p-4 rounded-lg bg-secondary border border-border text-xs md:text-sm font-mono text-foreground/60 relative whitespace-pre-wrap">
                          <div className="absolute -top-3 left-4 bg-background/50 px-2 text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
                            {task.status === 'sent' ? <><MailCheck className="h-3 w-3" /> Sent Content</> : <><FileText className="h-3 w-3" /> Final Content</>}
                          </div>
                          {task.aiContent}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 flex flex-col items-center">
                <History className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold text-foreground">No History Yet</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  {historyFilter ? `No ${STATUS_CONFIG[historyFilter]?.label.toLowerCase() || historyFilter} tasks.` : historyAutoFilter !== "all" ? `No ${historyAutoFilter === "auto" ? "auto-piloted" : "manually approved"} tasks.` : 'Completed and dismissed tasks will appear here.'}
                </p>
              </div>
            )
          )}
        </div>
      </div>

      {!emailReady && activeTab === "pending" && pendingTasks.some((t: any) => isEmailType(t.type) && hasTarget(t)) && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm shrink-0">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
          <p className="text-muted-foreground">
            {!platformConfigured ? (
              <><strong className="text-foreground">Email service not connected.</strong> A Resend or SendGrid integration is needed to enable email sending.</>
            ) : (
              <><strong className="text-foreground">Email sender not configured.</strong> Go to <a href="/settings" className="text-primary underline underline-offset-2 hover:text-primary/80">Settings</a> to set your From Name and From Email so emails appear from your gym.</>
            )}
          </p>
        </div>
      )}

      <Dialog open={!!editTask} onOpenChange={(open) => { if (!open) setEditTask(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Draft Content</DialogTitle>
            <DialogDescription>{editTask?.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {editTask && isEmailType(editTask.type) && (
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
              {editTask && isEmailType(editTask.type) && (
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
            <div className="prose prose-sm prose-invert max-w-none">
              {briefContent.split('\n').map((line, i) => {
                if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-bold text-foreground mt-4 mb-2">{line.replace('## ', '')}</h2>;
                if (line.startsWith('### ')) return <h3 key={i} className="text-base font-semibold text-foreground mt-3 mb-1">{line.replace('### ', '')}</h3>;
                if (line.startsWith('- **')) {
                  const match = line.match(/^- \*\*(.+?)\*\*(.*)$/);
                  if (match) return <p key={i} className="text-sm text-muted-foreground ml-4 my-0.5"><strong className="text-foreground">{match[1]}</strong>{match[2]}</p>;
                }
                if (line.startsWith('- ')) return <p key={i} className="text-sm text-muted-foreground ml-4 my-0.5">{line.replace('- ', '• ')}</p>;
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
