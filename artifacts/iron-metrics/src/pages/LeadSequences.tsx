import { useState, useEffect, useCallback, useRef } from "react";
import { useGym } from "@/store/GymContext";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw, Loader2, Plus, ToggleLeft, ToggleRight, ChevronRight,
  Users, Mail, MessageSquare, Clock, Trash2, Play, Square,
  ArrowLeft, AlertCircle, CheckCircle2, XCircle, Zap, Target,
  Settings2, Activity, HelpCircle, X, BarChart3, Send, Timer,
  UserPlus, TrendingUp, ChevronDown, ChevronUp, Eye, EyeOff
} from "lucide-react";
import { STAGE_CONFIG } from "@/components/leads/lead-utils";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { useGetGym } from "@workspace/api-client-react";

import { authFetch } from "@/lib/authFetch";

const API_BASE = import.meta.env.VITE_API_URL || "";

interface SequenceStep {
  id?: number;
  stepOrder: number;
  channel: string;
  delayMinutes: number;
  subject: string | null;
  messageContent: string;
}

interface Sequence {
  id: number;
  gymId: number;
  name: string;
  description: string | null;
  type: string;
  isEnabled: boolean;
  triggerStage: string;
  activeEnrollments: number;
  totalSent: number;
  totalCompleted: number;
  totalConverted: number;
  createdAt: string;
  steps?: SequenceStep[];
}

interface Enrollment {
  id: number;
  leadId: number;
  sequenceId: number;
  status: string;
  currentStepIndex: number;
  nextActionAt: string | null;
  enrolledAt: string;
  completedAt: string | null;
  exitReason: string | null;
  leadFirstName: string;
  leadLastName: string;
  leadEmail: string;
  leadStage: string;
}

interface PerformanceMetric {
  sequenceId: number;
  sequenceName: string;
  sequenceType: string;
  isEnabled: boolean;
  triggerStage: string;
  totalEnrolled: number;
  activeEnrollments: number;
  completedEnrollments: number;
  convertedLeads: number;
  totalMessagesSent: number;
  completionRate: number;
  conversionRate: number;
}

const TYPE_ICONS: Record<string, typeof Zap> = {
  new_lead_welcome: UserPlus,
  post_intro_followup: Send,
  stale_reengagement: RefreshCw,
  custom: Settings2,
};

const TYPE_COLORS: Record<string, string> = {
  new_lead_welcome: "text-emerald-500 bg-emerald-500/15",
  post_intro_followup: "text-blue-500 bg-blue-500/15",
  stale_reengagement: "text-amber-500 bg-amber-500/15",
  custom: "text-violet-500 bg-violet-500/15",
};

function apiFetch(url: string, opts?: RequestInit) {
  return authFetch(`${API_BASE}${url}`, opts);
}

function formatDelay(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / 1440)}d`;
}

function formatDelayLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  if (minutes < 1440) {
    const h = Math.round(minutes / 60);
    return `${h} hour${h !== 1 ? "s" : ""}`;
  }
  const d = Math.round(minutes / 1440);
  return `${d} day${d !== 1 ? "s" : ""}`;
}

function TabHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 bg-muted/20 rounded-lg px-3 py-2.5 mb-3">
      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <p className="text-xs text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}

type TabKey = "sequences" | "performance";

export function LeadSequences() {
  const { activeGymId } = useGym();
  const { toast } = useToast();

  const [tab, setTab] = useState<TabKey>("sequences");
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSequence, setSelectedSequence] = useState<Sequence | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingSequence, setEditingSequence] = useState<Sequence | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetric[]>([]);
  const [performanceLoading, setPerformanceLoading] = useState(false);

  const loadSequences = useCallback(async () => {
    if (!activeGymId) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/api/gyms/${activeGymId}/lead-sequences`);
      if (res.ok) {
        const data = await res.json();
        setSequences(data);
      }
    } catch (err: any) {
      console.error("Failed to load sequences:", err.message);
    } finally {
      setLoading(false);
    }
  }, [activeGymId]);

  const loadPerformance = useCallback(async () => {
    if (!activeGymId) return;
    setPerformanceLoading(true);
    try {
      const res = await apiFetch(`/api/gyms/${activeGymId}/lead-sequences/performance`);
      if (res.ok) {
        setPerformanceMetrics(await res.json());
      }
    } catch (err: any) {
      console.error("Failed to load performance:", err.message);
    } finally {
      setPerformanceLoading(false);
    }
  }, [activeGymId]);

  useEffect(() => { loadSequences(); }, [loadSequences]);
  useEffect(() => { if (tab === "performance") loadPerformance(); }, [tab, loadPerformance]);

  const seedDefaults = async () => {
    if (!activeGymId) return;
    try {
      const res = await apiFetch(`/api/gyms/${activeGymId}/lead-sequences/seed-defaults`, { method: "POST" });
      if (res.ok) {
        toast({ title: "Default sequences created" });
        loadSequences();
      } else if (res.status === 400) {
        toast({ title: "Already loaded", description: "All default sequences have already been created." });
      } else if (res.status === 403) {
        toast({ title: "Permission denied", description: "Only gym owners and admins can load default sequences.", variant: "destructive" });
      } else {
        toast({ title: "Something went wrong", description: "Could not create default sequences. Please try again.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Connection error", description: "Could not reach the server. Please check your connection.", variant: "destructive" });
    }
  };

  const toggleEnabled = async (seq: Sequence) => {
    if (!activeGymId) return;
    try {
      const res = await apiFetch(`/api/gyms/${activeGymId}/lead-sequences/${seq.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled: !seq.isEnabled }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Request failed" }));
        toast({ title: "Error", description: data.error, variant: "destructive" });
        return;
      }
      toast({ title: seq.isEnabled ? "Sequence paused" : "Sequence activated" });
      loadSequences();
    } catch {
      toast({ title: "Error", description: "Failed to update sequence", variant: "destructive" });
    }
  };

  const selectSequence = async (seq: Sequence) => {
    if (!activeGymId) return;
    try {
      const res = await apiFetch(`/api/gyms/${activeGymId}/lead-sequences/${seq.id}`);
      if (res.ok) {
        const detail = await res.json();
        setSelectedSequence(detail);
      }
      const enrollRes = await apiFetch(`/api/gyms/${activeGymId}/lead-sequences/${seq.id}/enrollments`);
      if (enrollRes.ok) {
        setEnrollments(await enrollRes.json());
      }
    } catch (err: any) {
      console.error("Load detail error:", err.message);
    }
  };

  const deleteSequence = async (seq: Sequence) => {
    if (!activeGymId) return;
    try {
      const res = await apiFetch(`/api/gyms/${activeGymId}/lead-sequences/${seq.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Request failed" }));
        toast({ title: "Error", description: data.error, variant: "destructive" });
        return;
      }
      toast({ title: "Sequence deleted" });
      setSelectedSequence(null);
      loadSequences();
    } catch {
      toast({ title: "Error", description: "Failed to delete sequence", variant: "destructive" });
    }
  };

  const exitEnrollment = async (enrollmentId: number) => {
    if (!activeGymId) return;
    try {
      const res = await apiFetch(`/api/gyms/${activeGymId}/lead-sequences/enrollments/${enrollmentId}/exit`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Request failed" }));
        toast({ title: "Error", description: data.error, variant: "destructive" });
        return;
      }
      toast({ title: "Lead removed from sequence" });
      if (selectedSequence) selectSequence(selectedSequence);
    } catch {
      toast({ title: "Error", description: "Failed to remove lead", variant: "destructive" });
    }
  };

  if (!activeGymId) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">Select a gym to manage lead sequences.</p>
      </div>
    );
  }

  if (showBuilder || editingSequence) {
    return (
      <SequenceBuilder
        gymId={activeGymId}
        sequence={editingSequence}
        onClose={() => { setShowBuilder(false); setEditingSequence(null); }}
        onSaved={() => { setShowBuilder(false); setEditingSequence(null); loadSequences(); }}
      />
    );
  }

  if (selectedSequence) {
    return (
      <SequenceDetail
        sequence={selectedSequence}
        enrollments={enrollments}
        onBack={() => setSelectedSequence(null)}
        onEdit={() => setEditingSequence(selectedSequence)}
        onDelete={() => deleteSequence(selectedSequence)}
        onToggle={() => toggleEnabled(selectedSequence)}
        onExitEnrollment={exitEnrollment}
      />
    );
  }

  return (
    <div className="h-full flex flex-col gap-4 overflow-y-auto">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-primary/15 rounded-xl flex items-center justify-center">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Lead Sequences</h1>
            <p className="text-xs text-muted-foreground">Automated nurture flows for your sales pipeline.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={seedDefaults}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-sm font-medium text-muted-foreground hover:text-primary hover:border-primary/30 transition-all"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Load Defaults</span>
          </button>
          <button
            onClick={() => setShowBuilder(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium text-sm transition-colors shadow-lg shadow-primary/20"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Sequence</span>
          </button>
        </div>
      </header>

      <div className="flex gap-1 bg-muted/30 rounded-lg p-1 w-fit">
        {([
          { key: "sequences" as TabKey, label: "Sequences", icon: Zap },
          { key: "performance" as TabKey, label: "Performance", icon: BarChart3 },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              tab === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === "sequences" && (
        <>
          <TabHint>
            Lead sequences automatically send messages when a lead enters a pipeline stage.
            Sequences pause when you manually contact a lead or move them to a new stage.
          </TabHint>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
          ) : sequences.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Zap className="h-8 w-8 text-primary/50" />
              </div>
              <h3 className="text-lg font-semibold">No lead sequences yet</h3>
              <p className="text-sm text-muted-foreground text-center max-w-xs">
                Create automated nurture sequences or load the defaults to get started.
              </p>
              <div className="flex gap-2 mt-2">
                <button onClick={seedDefaults} className="px-4 py-2 bg-muted/50 hover:bg-muted rounded-lg text-sm font-medium transition-colors">
                  Load Defaults
                </button>
                <button onClick={() => setShowBuilder(true)} className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors">
                  Create New
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-3">
              {sequences.map((seq) => {
                const Icon = TYPE_ICONS[seq.type] || Settings2;
                const colorClass = TYPE_COLORS[seq.type] || TYPE_COLORS.custom;
                const stageConf = STAGE_CONFIG[seq.triggerStage];

                return (
                  <motion.div
                    key={seq.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all cursor-pointer"
                    onClick={() => selectSequence(seq)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm text-foreground truncate">{seq.name}</h3>
                            {seq.isEnabled ? (
                              <span className="px-1.5 py-0.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-medium rounded-full">Active</span>
                            ) : (
                              <span className="px-1.5 py-0.5 bg-muted text-muted-foreground text-[10px] font-medium rounded-full">Paused</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{seq.description}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Target className="h-3 w-3" />
                              Trigger: <span className={`font-medium ${stageConf?.color || ""}`}>{stageConf?.label || seq.triggerStage}</span>
                            </span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {seq.activeEnrollments} active
                            </span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Send className="h-3 w-3" />
                              {seq.totalSent} sent
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleEnabled(seq); }}
                          className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                          title={seq.isEnabled ? "Pause sequence" : "Activate sequence"}
                        >
                          {seq.isEnabled ? (
                            <ToggleRight className="h-5 w-5 text-emerald-500" />
                          ) : (
                            <ToggleLeft className="h-5 w-5 text-muted-foreground" />
                          )}
                        </button>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === "performance" && (
        <>
          <TabHint>
            Track how your lead sequences are performing with conversion and completion metrics.
          </TabHint>

          {performanceLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
          ) : performanceMetrics.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No performance data yet. Create and activate sequences to start tracking.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {performanceMetrics.map((m) => (
                <div key={m.sequenceId} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm text-foreground">{m.sequenceName}</h3>
                      {m.isEnabled ? (
                        <span className="px-1.5 py-0.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-medium rounded-full">Active</span>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-muted text-muted-foreground text-[10px] font-medium rounded-full">Paused</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Trigger: {STAGE_CONFIG[m.triggerStage]?.label || m.triggerStage}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <MetricCard label="Enrolled" value={m.totalEnrolled} icon={Users} />
                    <MetricCard label="Active" value={m.activeEnrollments} icon={Play} color="text-blue-500" />
                    <MetricCard label="Messages Sent" value={m.totalMessagesSent} icon={Send} color="text-violet-500" />
                    <MetricCard
                      label="Completion Rate"
                      value={`${m.completionRate}%`}
                      icon={CheckCircle2}
                      color="text-emerald-500"
                    />
                    <MetricCard
                      label="Conversion Rate"
                      value={`${m.conversionRate}%`}
                      icon={TrendingUp}
                      color="text-primary"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color?: string }) {
  return (
    <div className="bg-muted/20 rounded-lg p-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`h-3 w-3 ${color || "text-muted-foreground"}`} />
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <span className={`text-lg font-bold ${color || "text-foreground"}`}>{value}</span>
    </div>
  );
}

const MESSAGE_COLLAPSE_THRESHOLD = 6;

function StepDetailCard({ step, index, isLast }: { step: SequenceStep; index: number; isLast: boolean }) {
  const [expanded, setExpanded] = useState(true);
  const lines = step.messageContent.split("\n");
  const isLongMessage = lines.length > MESSAGE_COLLAPSE_THRESHOLD || step.messageContent.length > 400;
  const isEmail = step.channel === "email";
  const channelColor = step.channel === "sms" ? "bg-green-500/15 text-green-600" : "bg-blue-500/15 text-blue-600";

  return (
    <div className="relative">
      <div className="flex gap-4">
        <div className="flex flex-col items-center shrink-0">
          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${channelColor}`}>
            {index + 1}
          </div>
          {!isLast && <div className="w-px flex-1 bg-border mt-1" />}
        </div>

        <div className="flex-1 min-w-0 pb-4">
          <div className="bg-muted/20 border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-md text-xs font-medium uppercase ${channelColor}`}>
                  {step.channel}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Timer className="h-3.5 w-3.5" />
                  {index === 0 ? `After ${formatDelayLabel(step.delayMinutes)}` : `+${formatDelayLabel(step.delayMinutes)}`}
                </span>
              </div>
              {isLongMessage && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  {expanded ? "Collapse" : "Expand"}
                </button>
              )}
            </div>

            {isEmail && step.subject && (
              <div className="mb-2 pb-2 border-b border-border/50">
                <span className="text-xs text-muted-foreground">Subject: </span>
                <span className="text-sm font-medium text-foreground">{step.subject}</span>
              </div>
            )}

            <div className={`text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed ${
              !expanded ? "line-clamp-6" : ""
            }`}>
              {step.messageContent}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SequenceDetail({
  sequence, enrollments, onBack, onEdit, onDelete, onToggle, onExitEnrollment
}: {
  sequence: Sequence;
  enrollments: Enrollment[];
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onExitEnrollment: (id: number) => void;
}) {
  const Icon = TYPE_ICONS[sequence.type] || Settings2;
  const colorClass = TYPE_COLORS[sequence.type] || TYPE_COLORS.custom;
  const steps = sequence.steps || [];
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div className="h-full flex flex-col gap-4 overflow-y-auto">
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this sequence?</AlertDialogTitle>
            <AlertDialogDescription>
              Enrolled leads will be removed from this sequence. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-muted/50 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${colorClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-foreground truncate">{sequence.name}</h2>
          <p className="text-xs text-muted-foreground">{sequence.description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={onToggle} className="p-2 rounded-lg hover:bg-muted/50 transition-colors" title={sequence.isEnabled ? "Pause" : "Activate"}>
            {sequence.isEnabled ? <ToggleRight className="h-5 w-5 text-emerald-500" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
          </button>
          <button onClick={onEdit} className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted/50 transition-colors">
            Edit
          </button>
          <button onClick={() => setShowDeleteConfirm(true)} className="p-2 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>Trigger: <strong className="text-foreground">{STAGE_CONFIG[sequence.triggerStage]?.label || sequence.triggerStage}</strong></span>
        <span>•</span>
        <span>{steps.length} step{steps.length !== 1 ? "s" : ""}</span>
        <span>•</span>
        <span>{sequence.isEnabled ? "Active" : "Paused"}</span>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Sequence Steps</h3>
        <div className="space-y-3">
          {steps.map((step, i) => (
            <StepDetailCard key={i} step={step} index={i} isLast={i === steps.length - 1} />
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">
          Enrolled Leads ({enrollments.length})
        </h3>
        {enrollments.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No leads enrolled in this sequence yet.</p>
        ) : (
          <div className="space-y-2">
            {enrollments.map((e) => {
              const stageConf = STAGE_CONFIG[e.leadStage];
              return (
                <div key={e.id} className="flex items-center justify-between bg-muted/20 rounded-lg p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {e.leadFirstName[0]}{e.leadLastName[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{e.leadFirstName} {e.leadLastName}</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>Step {e.currentStepIndex + 1}</span>
                        <span>•</span>
                        <span className={`${stageConf?.color || ""}`}>{stageConf?.label || e.leadStage}</span>
                        <span>•</span>
                        <StatusBadge status={e.status} />
                        {e.nextActionAt && e.status === "active" && (
                          <>
                            <span>•</span>
                            <span>Next: {new Date(e.nextActionAt).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  {(e.status === "active" || e.status === "paused") && (
                    <button
                      onClick={() => onExitEnrollment(e.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors shrink-0"
                      title="Remove from sequence"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const conf: Record<string, { color: string; label: string }> = {
    active: { color: "text-emerald-600 bg-emerald-500/15", label: "Active" },
    paused: { color: "text-amber-600 bg-amber-500/15", label: "Paused" },
    completed: { color: "text-blue-600 bg-blue-500/15", label: "Completed" },
    exited: { color: "text-muted-foreground bg-muted", label: "Exited" },
  };
  const c = conf[status] || conf.exited;
  return <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${c.color}`}>{c.label}</span>;
}

const DELAY_PRESETS = [
  { label: "5 min", value: 5 },
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "1 hour", value: 60 },
  { label: "4 hours", value: 240 },
  { label: "1 day", value: 1440 },
  { label: "2 days", value: 2880 },
  { label: "3 days", value: 4320 },
  { label: "5 days", value: 7200 },
  { label: "7 days", value: 10080 },
  { label: "14 days", value: 20160 },
];

const TRIGGER_STAGES = [
  { value: "new", label: "New Lead" },
  { value: "contacted", label: "Contacted" },
  { value: "scheduled", label: "Scheduled / Trial" },
];

function SequenceBuilder({
  gymId, sequence, onClose, onSaved
}: {
  gymId: number;
  sequence: Sequence | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState(sequence?.name || "");
  const [description, setDescription] = useState(sequence?.description || "");
  const [triggerStage, setTriggerStage] = useState(sequence?.triggerStage || "new");
  const [steps, setSteps] = useState<SequenceStep[]>(
    sequence?.steps || [
      { stepOrder: 1, channel: "email", delayMinutes: 5, subject: "", messageContent: "" },
    ]
  );
  const [saving, setSaving] = useState(false);
  const textareaRefs = useRef<Record<number, HTMLTextAreaElement | null>>({});
  const [previewStepIndex, setPreviewStepIndex] = useState<number | null>(null);
  const { data: gym } = useGetGym(gymId, { query: { enabled: !!gymId } });

  const VARIABLE_CHIPS = [
    { label: "first_name", value: "{{first_name}}" },
    { label: "last_name", value: "{{last_name}}" },
    { label: "gym_name", value: "{{gym_name}}" },
  ];

  const addStep = () => {
    setSteps([
      ...steps,
      {
        stepOrder: steps.length + 1,
        channel: "email",
        delayMinutes: 1440,
        subject: "",
        messageContent: "",
      },
    ]);
  };

  const removeStep = (index: number) => {
    setPreviewStepIndex(null);
    const newSteps = steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, stepOrder: i + 1 }));
    setSteps(newSteps);
  };

  const moveStep = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= steps.length) return;
    setPreviewStepIndex((prev) => {
      if (prev === index) return targetIndex;
      if (prev === targetIndex) return index;
      return prev;
    });
    const newSteps = [...steps];
    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
    setSteps(newSteps.map((s, i) => ({ ...s, stepOrder: i + 1 })));
  };

  const updateStep = (index: number, field: string, value: any) => {
    if (field === "channel" && value !== "email" && previewStepIndex === index) {
      setPreviewStepIndex(null);
    }
    const newSteps = [...steps];
    (newSteps[index] as any)[field] = value;
    setSteps(newSteps);
  };

  const insertVariable = (stepIndex: number, variable: string) => {
    const textarea = textareaRefs.current[stepIndex];
    if (!textarea) {
      updateStep(stepIndex, "messageContent", steps[stepIndex].messageContent + variable);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const content = steps[stepIndex].messageContent;
    const newContent = content.substring(0, start) + variable + content.substring(end);
    updateStep(stepIndex, "messageContent", newContent);
    requestAnimationFrame(() => {
      textarea.focus();
      const cursorPos = start + variable.length;
      textarea.setSelectionRange(cursorPos, cursorPos);
    });
  };

  const renderPreview = (content: string) => {
    return content
      .replace(/\{\{first_name\}\}/g, "Sarah")
      .replace(/\{\{last_name\}\}/g, "Johnson")
      .replace(/\{\{gym_name\}\}/g, gym?.name || "Your Gym");
  };

  const save = async () => {
    if (!name.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    if (steps.length === 0) {
      toast({ title: "Add at least one step", variant: "destructive" });
      return;
    }
    for (const step of steps) {
      if (!step.messageContent.trim()) {
        toast({ title: `Step ${step.stepOrder} needs a message`, variant: "destructive" });
        return;
      }
    }

    setSaving(true);
    try {
      const body = { name, description, triggerStage, type: sequence?.type || "custom", steps };
      const url = sequence
        ? `/api/gyms/${gymId}/lead-sequences/${sequence.id}`
        : `/api/gyms/${gymId}/lead-sequences`;
      const method = sequence ? "PUT" : "POST";

      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast({ title: sequence ? "Sequence updated" : "Sequence created" });
        onSaved();
      } else {
        const data = await res.json();
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to save sequence", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-4 overflow-y-auto">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted/50 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h2 className="text-lg font-bold text-foreground">
            {sequence ? "Edit Sequence" : "New Sequence"}
          </h2>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      <div className="grid gap-4 max-w-2xl">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Sequence Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., New Lead Welcome"
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description..."
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Trigger Stage</label>
          <select
            value={triggerStage}
            onChange={(e) => setTriggerStage(e.target.value)}
            className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            {TRIGGER_STAGES.map((ts) => (
              <option key={ts.value} value={ts.value}>{ts.label}</option>
            ))}
          </select>
          <p className="text-[10px] text-muted-foreground mt-1">Leads will auto-enroll when they enter this stage.</p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Steps ({steps.length})</h3>
          <button onClick={addStep} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted/50 transition-colors">
            <Plus className="h-3 w-3" />
            Add Step
          </button>
        </div>

        <div className="space-y-4 max-w-2xl">
          {steps.map((step, i) => (
            <div key={i} className="bg-muted/20 border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <span className={`h-7 w-7 rounded-full text-xs font-bold flex items-center justify-center ${
                    step.channel === "sms" ? "bg-green-500/15 text-green-600" : "bg-blue-500/15 text-blue-600"
                  }`}>
                    {i + 1}
                  </span>
                  <span className="text-sm font-semibold text-foreground">Step {i + 1}</span>
                </div>
                <div className="flex items-center gap-1">
                  {i > 0 && (
                    <button
                      onClick={() => moveStep(i, "up")}
                      className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                      title="Move step up"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                  )}
                  {i < steps.length - 1 && (
                    <button
                      onClick={() => moveStep(i, "down")}
                      className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                      title="Move step down"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  )}
                  {steps.length > 1 && (
                    <button onClick={() => removeStep(i)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Channel</label>
                  <select
                    value={step.channel}
                    onChange={(e) => updateStep(i, "channel", e.target.value)}
                    className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Delay</label>
                  <select
                    value={step.delayMinutes}
                    onChange={(e) => updateStep(i, "delayMinutes", Number(e.target.value))}
                    className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    {DELAY_PRESETS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {step.channel === "email" && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Subject Line</label>
                    <button
                      onClick={() => setPreviewStepIndex(previewStepIndex === i ? null : i)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                        previewStepIndex === i
                          ? "bg-primary/15 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                    >
                      {previewStepIndex === i ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      {previewStepIndex === i ? "Edit" : "Preview"}
                    </button>
                  </div>
                  {previewStepIndex === i ? (
                    <div className="w-full bg-card border border-primary/20 rounded-lg px-3 py-2 text-sm text-foreground">
                      {renderPreview(step.subject || "(No subject)")}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={step.subject || ""}
                      onChange={(e) => updateStep(i, "subject", e.target.value)}
                      placeholder="Email subject..."
                      className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  )}
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Message Content</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {VARIABLE_CHIPS.map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => insertVariable(i, chip.value)}
                      disabled={previewStepIndex === i}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-medium hover:bg-primary/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Plus className="h-2.5 w-2.5" />
                      {chip.value}
                    </button>
                  ))}
                </div>
                {previewStepIndex === i && step.channel === "email" ? (
                  <div className="w-full bg-card border border-primary/20 rounded-lg px-3 py-2.5 text-sm text-foreground leading-relaxed min-h-[120px] whitespace-pre-wrap">
                    <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-border">
                      <Eye className="h-3 w-3 text-primary" />
                      <span className="text-[10px] font-medium text-primary uppercase tracking-wider">Preview</span>
                    </div>
                    {renderPreview(step.messageContent || "(No message content)")}
                  </div>
                ) : (
                  <textarea
                    ref={(el) => { textareaRefs.current[i] = el; }}
                    value={step.messageContent}
                    onChange={(e) => updateStep(i, "messageContent", e.target.value)}
                    placeholder="Write your message... Use the variable chips above to insert placeholders."
                    rows={step.channel === "email" ? 10 : 5}
                    className="w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-foreground leading-relaxed focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-y min-h-[120px]"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
