import { useState, useEffect, useCallback } from "react";
import { useGym } from "@/store/GymContext";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw, Loader2, Plus, ToggleLeft, ToggleRight, ChevronRight,
  Users, Mail, ClipboardList, Clock, Trash2, Play, Square,
  UserMinus, ArrowLeft, AlertCircle, CheckCircle2, XCircle,
  Zap, Shield, Heart, Sparkles, Settings2, Activity
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "";

interface TriggerConfig {
  type: string;
  days?: number;
  threshold?: number;
  joinDays?: number;
  inactiveDays?: number;
}

interface SequenceStep {
  id?: number;
  stepOrder: number;
  actionType: string;
  delayDays: number;
  config: Record<string, any>;
}

interface Sequence {
  id: number;
  gymId: number;
  name: string;
  description: string | null;
  type: string;
  isEnabled: boolean;
  triggerConfig: TriggerConfig;
  cooldownDays: number;
  activeEnrollments: number;
  createdAt: string;
  steps?: SequenceStep[];
}

interface Enrollment {
  id: number;
  memberId: number;
  sequenceId: number;
  status: string;
  currentStepIndex: number;
  nextActionAt: string | null;
  enrolledAt: string;
  completedAt: string | null;
  exitReason: string | null;
  memberFirstName: string;
  memberLastName: string;
  memberEmail: string;
  memberRiskTier: string | null;
}

interface SequenceEvent {
  id: number;
  enrollmentId: number;
  memberId: number;
  sequenceId: number;
  eventType: string;
  stepIndex: number | null;
  details: string | null;
  createdAt: string;
  memberFirstName: string;
  memberLastName: string;
}

const TRIGGER_LABELS: Record<string, string> = {
  no_attendance: "No attendance",
  risk_score: "Risk score threshold",
  new_member_decline: "New member declining",
};

const TYPE_ICONS: Record<string, typeof Zap> = {
  miss_you: Heart,
  check_in: Shield,
  win_back: Zap,
  new_member: Sparkles,
  custom: Settings2,
};

const TYPE_COLORS: Record<string, string> = {
  miss_you: "text-pink-500 bg-pink-500/15",
  check_in: "text-blue-500 bg-blue-500/15",
  win_back: "text-amber-500 bg-amber-500/15",
  new_member: "text-emerald-500 bg-emerald-500/15",
  custom: "text-violet-500 bg-violet-500/15",
};

function apiFetch(url: string, opts?: RequestInit) {
  return fetch(`${API_BASE}${url}`, { credentials: "include", ...opts });
}

export function Retention() {
  const { activeGymId } = useGym();
  const { toast } = useToast();
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [events, setEvents] = useState<SequenceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSequence, setSelectedSequence] = useState<Sequence | null>(null);
  const [activeTab, setActiveTab] = useState<"sequences" | "enrollments" | "activity">("sequences");

  const loadData = useCallback(async () => {
    if (!activeGymId) return;
    try {
      const [seqRes, enrollRes, eventsRes] = await Promise.all([
        apiFetch(`/api/gyms/${activeGymId}/retention/sequences`),
        apiFetch(`/api/gyms/${activeGymId}/retention/enrollments`),
        apiFetch(`/api/gyms/${activeGymId}/retention/events?limit=30`),
      ]);
      if (seqRes.ok) setSequences(await seqRes.json());
      if (enrollRes.ok) setEnrollments(await enrollRes.json());
      if (eventsRes.ok) setEvents(await eventsRes.json());
    } catch {
    } finally {
      setLoading(false);
    }
  }, [activeGymId]);

  useEffect(() => { loadData(); }, [loadData]);

  const seedDefaults = async () => {
    if (!activeGymId) return;
    try {
      const res = await apiFetch(`/api/gyms/${activeGymId}/retention/sequences/seed-defaults`, { method: "POST" });
      if (res.ok) {
        toast({ title: "Default sequences created" });
        loadData();
      } else {
        const data = await res.json();
        toast({ title: "Error", description: data.error });
      }
    } catch {
      toast({ title: "Error", description: "Failed to seed defaults" });
    }
  };

  const toggleSequence = async (seq: Sequence) => {
    if (!activeGymId) return;
    try {
      await apiFetch(`/api/gyms/${activeGymId}/retention/sequences/${seq.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled: !seq.isEnabled }),
      });
      setSequences(prev => prev.map(s => s.id === seq.id ? { ...s, isEnabled: !s.isEnabled } : s));
      toast({ title: seq.isEnabled ? "Sequence paused" : "Sequence activated" });
    } catch {
      toast({ title: "Error", description: "Failed to update" });
    }
  };

  const loadSequenceDetail = async (seq: Sequence) => {
    if (!activeGymId) return;
    try {
      const res = await apiFetch(`/api/gyms/${activeGymId}/retention/sequences/${seq.id}`);
      const detail = await res.json();
      setSelectedSequence(detail);
    } catch {
      toast({ title: "Error", description: "Failed to load sequence" });
    }
  };

  const exitEnrollment = async (enrollmentId: number) => {
    if (!activeGymId) return;
    try {
      await apiFetch(`/api/gyms/${activeGymId}/retention/enrollments/${enrollmentId}/exit`, { method: "POST" });
      toast({ title: "Member removed from sequence" });
      loadData();
    } catch {
      toast({ title: "Error", description: "Failed to exit enrollment" });
    }
  };

  const deleteSequence = async (seqId: number) => {
    if (!activeGymId) return;
    try {
      await apiFetch(`/api/gyms/${activeGymId}/retention/sequences/${seqId}`, { method: "DELETE" });
      toast({ title: "Sequence deleted" });
      setSelectedSequence(null);
      loadData();
    } catch {
      toast({ title: "Error", description: "Failed to delete" });
    }
  };

  if (!activeGymId) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">Select a gym to view retention sequences.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (selectedSequence) {
    return <SequenceDetail sequence={selectedSequence} onBack={() => { setSelectedSequence(null); loadData(); }} gymId={activeGymId} />;
  }

  const totalActiveEnrollments = sequences.reduce((sum, s) => sum + s.activeEnrollments, 0);

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-violet-500/15 rounded-xl flex items-center justify-center">
            <RefreshCw className="h-5 w-5 text-violet-500" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Retention Automations</h1>
            <p className="text-xs text-muted-foreground">Automated sequences to keep members engaged</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => loadData()} className="p-2 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-3 shrink-0">
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{sequences.length}</p>
          <p className="text-xs text-muted-foreground">Sequences</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{sequences.filter(s => s.isEnabled).length}</p>
          <p className="text-xs text-muted-foreground">Active</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-foreground">{totalActiveEnrollments}</p>
          <p className="text-xs text-muted-foreground">Enrolled Members</p>
        </div>
      </div>

      <div className="flex gap-1 bg-muted/20 p-1 rounded-lg shrink-0">
        {[
          { key: "sequences" as const, label: "Sequences", icon: Settings2 },
          { key: "enrollments" as const, label: `Enrolled (${enrollments.length})`, icon: Users },
          { key: "activity" as const, label: "Activity", icon: Activity },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
              activeTab === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === "sequences" && (
            <motion.div key="sequences" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              {sequences.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-8 text-center">
                  <RefreshCw className="h-10 w-10 text-muted-foreground/50 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Sequences Yet</h3>
                  <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                    Set up automated retention sequences to proactively engage at-risk members.
                  </p>
                  <button
                    onClick={seedDefaults}
                    className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                  >
                    Create Default Sequences
                  </button>
                </div>
              ) : (
                sequences.map(seq => {
                  const Icon = TYPE_ICONS[seq.type] || Settings2;
                  const colorClass = TYPE_COLORS[seq.type] || TYPE_COLORS.custom;
                  const trigger = seq.triggerConfig as TriggerConfig;
                  const triggerLabel = getTriggerSummary(trigger);

                  return (
                    <div
                      key={seq.id}
                      className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors cursor-pointer"
                      onClick={() => loadSequenceDetail(seq)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${colorClass}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-foreground">{seq.name}</h3>
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              seq.isEnabled ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-muted/30 text-muted-foreground"
                            }`}>
                              {seq.isEnabled ? "Active" : "Paused"}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {triggerLabel} &middot; {seq.activeEnrollments} enrolled &middot; {seq.cooldownDays}d cooldown
                          </p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleSequence(seq); }}
                          className={`p-1.5 rounded-lg transition-colors ${
                            seq.isEnabled ? "text-emerald-500 hover:bg-emerald-500/10" : "text-muted-foreground hover:bg-muted/30"
                          }`}
                        >
                          {seq.isEnabled ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                        </button>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                      {seq.description && (
                        <p className="text-xs text-muted-foreground mt-2 pl-13">{seq.description}</p>
                      )}
                    </div>
                  );
                })
              )}
            </motion.div>
          )}

          {activeTab === "enrollments" && (
            <motion.div key="enrollments" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
              {enrollments.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-8 text-center">
                  <Users className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No members currently enrolled in any sequence.</p>
                </div>
              ) : (
                enrollments.map(enrollment => {
                  const seq = sequences.find(s => s.id === enrollment.sequenceId);
                  return (
                    <div key={enrollment.id} className="bg-card border border-border rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {enrollment.memberFirstName} {enrollment.memberLastName}
                          </p>
                          <p className="text-xs text-muted-foreground">{enrollment.memberEmail}</p>
                        </div>
                        <button
                          onClick={() => exitEnrollment(enrollment.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Remove from sequence"
                        >
                          <UserMinus className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <RefreshCw className="h-3 w-3" />
                          {seq?.name || `Sequence #${enrollment.sequenceId}`}
                        </span>
                        <span className="flex items-center gap-1">
                          <ClipboardList className="h-3 w-3" />
                          Step {enrollment.currentStepIndex + 1}
                        </span>
                        {enrollment.nextActionAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Next: {new Date(enrollment.nextActionAt).toLocaleDateString()}
                          </span>
                        )}
                        {enrollment.memberRiskTier && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            enrollment.memberRiskTier === "critical" ? "bg-red-500/15 text-red-500" :
                            enrollment.memberRiskTier === "high" ? "bg-amber-500/15 text-amber-500" :
                            "bg-blue-500/15 text-blue-500"
                          }`}>{enrollment.memberRiskTier}</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </motion.div>
          )}

          {activeTab === "activity" && (
            <motion.div key="activity" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
              {events.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-8 text-center">
                  <Activity className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No retention activity yet.</p>
                </div>
              ) : (
                events.map(event => (
                  <div key={event.id} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3">
                    <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${getEventStyle(event.eventType)}`}>
                      {getEventIcon(event.eventType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground">
                        <span className="font-medium">{event.memberFirstName} {event.memberLastName}</span>
                        {" "}&mdash; {event.details || event.eventType}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(event.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function getTriggerSummary(trigger: TriggerConfig): string {
  if (!trigger || !trigger.type) return "No trigger";
  switch (trigger.type) {
    case "no_attendance": return `No attendance for ${trigger.days || 10} days`;
    case "risk_score": return `Risk score >= ${trigger.threshold || 50}`;
    case "new_member_decline": return `New member (<${trigger.joinDays || 90}d) inactive ${trigger.inactiveDays || 7}d`;
    default: return trigger.type;
  }
}

function getEventStyle(type: string): string {
  if (type.includes("email_sent")) return "bg-blue-500/15 text-blue-500";
  if (type.includes("task")) return "bg-amber-500/15 text-amber-500";
  if (type.includes("enrolled")) return "bg-emerald-500/15 text-emerald-500";
  if (type.includes("exit") || type.includes("completed")) return "bg-muted/30 text-muted-foreground";
  if (type.includes("error") || type.includes("failed")) return "bg-red-500/15 text-red-500";
  return "bg-violet-500/15 text-violet-500";
}

function getEventIcon(type: string) {
  if (type.includes("email")) return <Mail className="h-3.5 w-3.5" />;
  if (type.includes("task")) return <ClipboardList className="h-3.5 w-3.5" />;
  if (type.includes("enrolled")) return <Play className="h-3.5 w-3.5" />;
  if (type.includes("exit") || type.includes("completed")) return <Square className="h-3.5 w-3.5" />;
  if (type.includes("error")) return <AlertCircle className="h-3.5 w-3.5" />;
  return <Activity className="h-3.5 w-3.5" />;
}

function SequenceDetail({ sequence, onBack, gymId }: { sequence: Sequence; onBack: () => void; gymId: number }) {
  const { toast } = useToast();
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(sequence.name);
  const [description, setDescription] = useState(sequence.description || "");
  const [triggerConfig, setTriggerConfig] = useState<TriggerConfig>(sequence.triggerConfig as TriggerConfig);
  const [cooldownDays, setCooldownDays] = useState(sequence.cooldownDays);
  const [steps, setSteps] = useState<SequenceStep[]>(sequence.steps || []);

  const Icon = TYPE_ICONS[sequence.type] || Settings2;
  const colorClass = TYPE_COLORS[sequence.type] || TYPE_COLORS.custom;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiFetch(`/api/gyms/${gymId}/retention/sequences/${sequence.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, triggerConfig, cooldownDays, steps }),
      });
      if (res.ok) {
        toast({ title: "Sequence updated" });
        setEditMode(false);
      } else {
        toast({ title: "Error", description: "Failed to save" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to save" });
    } finally {
      setSaving(false);
    }
  };

  const updateStepConfig = (index: number, key: string, value: any) => {
    setSteps(prev => prev.map((s, i) => i === index ? { ...s, config: { ...s.config, [key]: value } } : s));
  };

  return (
    <div className="h-full flex flex-col gap-4 overflow-y-auto">
      <div className="flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        </button>
        <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${colorClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-foreground">{sequence.name}</h2>
          <p className="text-xs text-muted-foreground">{sequence.description}</p>
        </div>
        <button
          onClick={() => setEditMode(!editMode)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            editMode ? "bg-primary/15 text-primary" : "bg-muted/30 text-muted-foreground hover:text-foreground"
          }`}
        >
          {editMode ? "Cancel" : "Edit"}
        </button>
      </div>

      {editMode ? (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-medium text-foreground">General</h3>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Description</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Cooldown (days)</label>
              <input type="number" value={cooldownDays} onChange={(e) => setCooldownDays(Number(e.target.value))}
                className="w-24 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-medium text-foreground">Trigger</h3>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Trigger Type</label>
              <select value={triggerConfig.type} onChange={(e) => setTriggerConfig({ ...triggerConfig, type: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="no_attendance">No attendance for X days</option>
                <option value="risk_score">Risk score threshold</option>
                <option value="new_member_decline">New member declining</option>
              </select>
            </div>
            {triggerConfig.type === "no_attendance" && (
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Days without attendance</label>
                <input type="number" value={triggerConfig.days || 10} onChange={(e) => setTriggerConfig({ ...triggerConfig, days: Number(e.target.value) })}
                  className="w-24 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
            )}
            {triggerConfig.type === "risk_score" && (
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Score threshold</label>
                <input type="number" value={triggerConfig.threshold || 50} onChange={(e) => setTriggerConfig({ ...triggerConfig, threshold: Number(e.target.value) })}
                  className="w-24 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
            )}
            {triggerConfig.type === "new_member_decline" && (
              <div className="flex gap-4">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Within first X days</label>
                  <input type="number" value={triggerConfig.joinDays || 90} onChange={(e) => setTriggerConfig({ ...triggerConfig, joinDays: Number(e.target.value) })}
                    className="w-24 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Inactive for Y days</label>
                  <input type="number" value={triggerConfig.inactiveDays || 7} onChange={(e) => setTriggerConfig({ ...triggerConfig, inactiveDays: Number(e.target.value) })}
                    className="w-24 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-medium text-foreground">Steps ({steps.length})</h3>
            {steps.map((step, i) => (
              <div key={i} className="border border-border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    {step.actionType === "email" ? <Mail className="h-3.5 w-3.5 text-blue-500" /> : <ClipboardList className="h-3.5 w-3.5 text-amber-500" />}
                    Step {i + 1}: {step.actionType === "email" ? "Send Email" : "Create Task"}
                  </span>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] text-muted-foreground">Delay:</label>
                    <input type="number" value={step.delayDays} onChange={(e) => setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, delayDays: Number(e.target.value) } : s))}
                      className="w-14 px-2 py-1 bg-background border border-border rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-primary" />
                    <span className="text-[10px] text-muted-foreground">days</span>
                  </div>
                </div>
                {step.actionType === "email" && (
                  <>
                    <input value={step.config.subject || ""} onChange={(e) => updateStepConfig(i, "subject", e.target.value)}
                      placeholder="Subject" className="w-full px-2 py-1.5 bg-background border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
                    <textarea value={step.config.body || ""} onChange={(e) => updateStepConfig(i, "body", e.target.value)}
                      rows={4} placeholder="Email body (use {{first_name}}, {{gym_name}})" className="w-full px-2 py-1.5 bg-background border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
                  </>
                )}
                {step.actionType === "task" && (
                  <>
                    <input value={step.config.title || ""} onChange={(e) => updateStepConfig(i, "title", e.target.value)}
                      placeholder="Task title" className="w-full px-2 py-1.5 bg-background border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
                    <textarea value={step.config.description || ""} onChange={(e) => updateStepConfig(i, "description", e.target.value)}
                      rows={2} placeholder="Task description" className="w-full px-2 py-1.5 bg-background border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
                  </>
                )}
              </div>
            ))}
            <p className="text-[10px] text-muted-foreground">
              Available template variables: {"{{first_name}}"}, {"{{last_name}}"}, {"{{gym_name}}"}, {"{{member_email}}"}
            </p>
          </div>

          <button onClick={handleSave} disabled={saving}
            className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Changes
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-medium text-foreground mb-2">Trigger</h3>
            <p className="text-sm text-muted-foreground">{getTriggerSummary(triggerConfig)}</p>
            <p className="text-xs text-muted-foreground mt-1">Cooldown: {cooldownDays} days between re-enrollments</p>
          </div>

          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-medium text-foreground mb-3">Steps ({steps.length})</h3>
            <div className="space-y-3">
              {steps.map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${
                      step.actionType === "email" ? "bg-blue-500/15 text-blue-500" : "bg-amber-500/15 text-amber-500"
                    }`}>
                      {step.actionType === "email" ? <Mail className="h-3.5 w-3.5" /> : <ClipboardList className="h-3.5 w-3.5" />}
                    </div>
                    {i < steps.length - 1 && <div className="w-px h-8 bg-border mt-1" />}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground">
                      {step.actionType === "email" ? "Send Email" : "Create Task"}
                      {step.delayDays > 0 && <span className="text-muted-foreground font-normal"> (after {step.delayDays}d)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-md">
                      {step.config.subject || step.config.title || ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-foreground">Status</h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                sequence.isEnabled ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-muted/30 text-muted-foreground"
              }`}>
                {sequence.isEnabled ? "Active" : "Paused"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {sequence.activeEnrollments} members currently enrolled
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
