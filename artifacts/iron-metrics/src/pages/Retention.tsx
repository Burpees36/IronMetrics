import { useState, useEffect, useCallback, useRef } from "react";
import { useGym } from "@/store/GymContext";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw, Loader2, Plus, ToggleLeft, ToggleRight, ChevronRight,
  Users, Mail, ClipboardList, Clock, Trash2, Play, Square,
  UserMinus, ArrowLeft, AlertCircle, CheckCircle2, XCircle,
  Zap, Shield, Heart, Sparkles, Settings2, Activity,
  HelpCircle, X, Info, PauseCircle, UserPlus,
  ChevronDown, ChevronUp, ArrowUp, ArrowDown, Eye, EyeOff,
  ExternalLink, AlertTriangle
} from "lucide-react";
import { Link } from "wouter";
import { EnrollMemberDialog } from "@/components/EnrollMemberDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useGetGym } from "@workspace/api-client-react";
import { PageError } from "@/components/ui/page-error";

import { authFetch } from "@/lib/authFetch";

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
  metadata?: Record<string, any> | null;
  createdAt: string;
  memberFirstName: string;
  memberLastName: string;
  sequenceName?: string;
}

const TYPE_ICONS: Record<string, typeof Zap> = {
  miss_you: Heart,
  check_in: Shield,
  win_back: Zap,
  new_member: Sparkles,
  onboarding_journey: Users,
  custom: Settings2,
};

const TYPE_COLORS: Record<string, string> = {
  miss_you: "text-pink-500 bg-pink-500/15",
  check_in: "text-blue-500 bg-blue-500/15",
  win_back: "text-amber-500 bg-amber-500/15",
  new_member: "text-emerald-500 bg-emerald-500/15",
  onboarding_journey: "text-teal-500 bg-teal-500/15",
  custom: "text-violet-500 bg-violet-500/15",
};

function apiFetch(url: string, opts?: RequestInit) {
  return authFetch(`${API_BASE}${url}`, opts);
}

function TabHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 bg-muted/20 rounded-lg px-3 py-2.5 mb-3">
      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <p className="text-xs text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}

function HowItWorksGuide({ onSeedDefaults, onDismiss, hasSequences }: {
  onSeedDefaults: () => void;
  onDismiss: () => void;
  hasSequences: boolean;
}) {
  const [showFaq, setShowFaq] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="bg-gradient-to-br from-violet-500/10 via-card to-primary/5 border border-violet-500/20 rounded-2xl p-5 relative overflow-hidden"
    >
      <button onClick={onDismiss} className="absolute top-3 right-3 p-1 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors z-10">
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="flex items-center gap-2 mb-3">
        <div className="h-7 w-7 bg-violet-500/15 rounded-lg flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-violet-500" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">How Retention Automations Work</h3>
      </div>

      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
        Retention sequences automatically reach out to members who are at risk of leaving — before they churn. The system monitors attendance and engagement, and when a member matches a trigger, it sends them a series of personalized emails and creates follow-up tasks for your staff.
      </p>

      <div className="grid gap-4 mb-5">
        <div className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="h-7 w-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold shrink-0">1</div>
            <div className="w-px flex-1 bg-border mt-1" />
          </div>
          <div className="pb-3">
            <p className="text-sm font-medium text-foreground">Set up your sequences</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {hasSequences
                ? "You already have sequences created. Each one targets a different situation — members who stopped showing up, those at risk, new members who are losing momentum, or a structured onboarding journey. Feel free to change them to best suit your brand and needs."
                : "Start with our 5 proven templates (\"Miss You\", \"Check-In\", \"Win Back\", \"New Member Support\", \"Onboarding Journey\") or create your own from scratch. Each one targets a different situation."}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="h-7 w-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold shrink-0">2</div>
            <div className="w-px flex-1 bg-border mt-1" />
          </div>
          <div className="pb-3">
            <p className="text-sm font-medium text-foreground">Members are enrolled automatically</p>
            <p className="text-xs text-muted-foreground mt-0.5">Every 2 hours, the system checks all your members against each sequence's trigger conditions. When someone matches (e.g., hasn't attended in 10 days), they're enrolled and the sequence begins. If they come back within 3 days, they're automatically removed.</p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="h-7 w-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold shrink-0">3</div>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Personalized outreach happens on your behalf</p>
            <p className="text-xs text-muted-foreground mt-0.5">Emails are sent from your gym's configured email address (set in Settings) and personalized with each member's name. The {"{{first_name}}"} placeholders you see in templates are replaced automatically — members see their real name, not the placeholder.</p>
          </div>
        </div>
      </div>

      <button
        onClick={() => setShowFaq(!showFaq)}
        className="flex items-center gap-2 w-full text-left text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mb-3"
      >
        <Info className="h-3.5 w-3.5" />
        <span>{showFaq ? "Hide" : "Common"} questions</span>
        <ChevronRight className={`h-3 w-3 transition-transform ${showFaq ? "rotate-90" : ""}`} />
      </button>

      <AnimatePresence>
        {showFaq && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 mb-5 pl-5 border-l-2 border-border">
              <FaqItem
                q="Are sequences turned on by default?"
                a="No. New sequences start paused. You'll see a toggle next to each one — flip it to 'Active' when you're ready. This gives you time to customize the emails and triggers first."
              />
              <FaqItem
                q="What if a member is on vacation or I need to skip someone?"
                a="Go to the Enrolled tab and click the remove icon next to their name. They'll be taken out of the sequence immediately. The cooldown period prevents them from being re-enrolled too quickly."
              />
              <FaqItem
                q="What email address do these come from?"
                a="Emails are sent from whatever sender address you've configured in Settings > Email & Notifications. If you haven't set one up yet, email steps will be skipped (no emails go out) until you do."
              />
              <FaqItem
                q="Can I create my own custom sequences?"
                a="Yes! Click 'Create Sequence' and you can define your own trigger conditions, email content, and task steps. You're not limited to the built-in templates."
              />
              <FaqItem
                q="What's the cooldown?"
                a="After a member completes or exits a sequence, there's a waiting period (e.g., 30 days) before they can be auto-enrolled in the same sequence again. This prevents spamming someone who just went through it."
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!hasSequences && (
        <button
          onClick={onSeedDefaults}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
        >
          <Sparkles className="h-4 w-4" />
          Create Default Sequences
        </button>
      )}
    </motion.div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-foreground">{q}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{a}</p>
    </div>
  );
}

export function Retention() {
  const { activeGymId } = useGym();
  const { toast } = useToast();
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [events, setEvents] = useState<SequenceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedSequence, setSelectedSequence] = useState<Sequence | null>(null);
  const [activeTab, setActiveTab] = useState<"sequences" | "enrollments" | "activity">("sequences");
  const [showGuide, setShowGuide] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [expandedEventId, setExpandedEventId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    if (!activeGymId) return;
    setLoadError(false);
    try {
      const [seqRes, enrollRes, eventsRes] = await Promise.all([
        apiFetch(`/api/gyms/${activeGymId}/retention/sequences`),
        apiFetch(`/api/gyms/${activeGymId}/retention/enrollments`),
        apiFetch(`/api/gyms/${activeGymId}/retention/events?limit=30`),
      ]);
      if (!seqRes.ok) {
        setLoadError(true);
      } else {
        setSequences(await seqRes.json());
      }
      if (enrollRes.ok) setEnrollments(await enrollRes.json());
      if (eventsRes.ok) setEvents(await eventsRes.json());
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [activeGymId]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (events.length > 10) setShowGuide(false);
  }, [events]);

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
      if (res.ok) {
        const detail = await res.json();
        setSelectedSequence(detail);
      }
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

  if (loadError && sequences.length === 0) {
    return (
      <PageError
        title="Unable to load retention data"
        message="We couldn't load your retention sequences. Check your connection and try again."
        onRetry={() => { setLoading(true); loadData(); }}
      />
    );
  }

  if (selectedSequence) {
    return <SequenceDetail sequence={selectedSequence} onBack={() => { setSelectedSequence(null); loadData(); }} gymId={activeGymId} />;
  }

  if (showCreateForm) {
    return <CreateSequenceForm gymId={activeGymId} onBack={() => { setShowCreateForm(false); loadData(); }} />;
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
            <p className="text-xs text-muted-foreground">Proactively engage members before they churn</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!showGuide && (
            <button
              onClick={() => setShowGuide(true)}
              className="p-2 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground transition-colors"
              title="How it works"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
          )}
          <button onClick={() => loadData()} className="p-2 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw className="h-4 w-4" />
          </button>
          {sequences.length > 0 && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium text-sm transition-colors shadow-lg shadow-primary/20"
            >
              <Plus className="h-4 w-4" />
              Create Sequence
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto space-y-4">
        <AnimatePresence>
          {showGuide && (
            <HowItWorksGuide
              onSeedDefaults={seedDefaults}
              onDismiss={() => setShowGuide(false)}
              hasSequences={sequences.length > 0}
            />
          )}
        </AnimatePresence>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{sequences.length}</p>
            <p className="text-xs text-muted-foreground">Sequences</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className={`text-2xl font-bold ${sequences.filter(s => s.isEnabled).length > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
              {sequences.filter(s => s.isEnabled).length}
            </p>
            <p className="text-xs text-muted-foreground">Active</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className={`text-2xl font-bold ${totalActiveEnrollments > 0 ? "text-blue-600 dark:text-blue-400" : "text-foreground"}`}>
              {totalActiveEnrollments}
            </p>
            <p className="text-xs text-muted-foreground">Enrolled</p>
          </div>
        </div>

        <div className="flex gap-1 bg-muted/20 p-1 rounded-lg">
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

        <AnimatePresence mode="wait">
          {activeTab === "sequences" && (
            <motion.div key="sequences" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <TabHint>
                Each sequence watches for a specific trigger condition and runs a series of steps (emails, staff tasks) when a member matches. Sequences start <span className="font-medium text-foreground">paused</span> — use the toggle to activate them when you're ready.
              </TabHint>
              {sequences.length === 0 ? (
                !showGuide && (
                  <div className="bg-card border border-border rounded-xl p-8 text-center">
                    <RefreshCw className="h-10 w-10 text-muted-foreground/50 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Sequences Yet</h3>
                    <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                      Get started with our 5 proven templates, or create your own custom sequence.
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      <button
                        onClick={seedDefaults}
                        className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                      >
                        Create Defaults
                      </button>
                      <button
                        onClick={() => setShowCreateForm(true)}
                        className="px-4 py-2.5 bg-card border border-border rounded-lg font-medium text-sm text-foreground hover:bg-muted/50 transition-colors"
                      >
                        Build Custom
                      </button>
                    </div>
                  </div>
                )
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
                          title={seq.isEnabled ? "Pause sequence" : "Activate sequence"}
                        >
                          {seq.isEnabled ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                        </button>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                      {seq.description && (
                        <p className="text-xs text-muted-foreground mt-2 ml-13">{seq.description}</p>
                      )}
                    </div>
                  );
                })
              )}
            </motion.div>
          )}

          {activeTab === "enrollments" && (
            <motion.div key="enrollments" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
              <div className="flex items-center justify-between">
                <TabHint>
                  Members shown here are actively receiving a retention sequence. If someone is on vacation or shouldn't be contacted right now, click the <UserMinus className="inline h-3 w-3" /> icon to remove them. The cooldown period will prevent them from being re-enrolled too quickly.
                </TabHint>
              </div>
              {sequences.length > 0 && (
                <button
                  onClick={() => setShowEnrollDialog(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium text-xs transition-colors shadow-lg shadow-primary/20"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Enroll Member
                </button>
              )}
              {enrollments.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-8 text-center">
                  <Users className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-sm font-medium text-foreground mb-1">No members enrolled</p>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    When you activate a sequence and members match its trigger conditions, they'll appear here automatically.
                  </p>
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
                          className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Remove from sequence — stops all future emails in this sequence"
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Remove</span>
                        </button>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
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
              <TabHint>
                A log of everything that's happened — enrollments, emails sent, tasks created, and members who re-engaged. This is your audit trail for all automated retention actions.
              </TabHint>
              {events.length === 0 ? (
                <div className="bg-card border border-border rounded-xl p-8 text-center">
                  <Activity className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-sm font-medium text-foreground mb-1">No activity yet</p>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    Once sequences are active and members are enrolled, all actions will be logged here.
                  </p>
                </div>
              ) : (
                events.map(event => {
                  const isFail = isFailureEventType(event.eventType);
                  const isExpanded = expandedEventId === event.id;
                  const seqName = event.sequenceName || sequences.find(s => s.id === event.sequenceId)?.name;

                  return (
                    <div key={event.id} className={`bg-card border rounded-xl overflow-hidden transition-colors duration-150 ${isFail ? "border-red-500/30" : "border-border"}`}>
                      <button
                        type="button"
                        onClick={() => setExpandedEventId(isExpanded ? null : event.id)}
                        className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors duration-150 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-inset
                          ${isFail ? "hover:bg-red-500/5" : "hover:bg-muted/30"}
                          ${isExpanded ? (isFail ? "bg-red-500/5" : "bg-muted/20") : ""}
                        `}
                      >
                        <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${getEventStyle(event.eventType)}`}>
                          {getEventIcon(event.eventType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground">
                            <Link href={`/members/${event.memberId}`}>
                              <span className="font-medium text-primary hover:text-primary/80 hover:underline transition-colors" onClick={(e) => e.stopPropagation()}>
                                {event.memberFirstName} {event.memberLastName}
                              </span>
                            </Link>
                            {" "}&mdash;{" "}
                            <span className={isFail ? "text-red-600 dark:text-red-400 font-medium" : ""}>
                              {event.details || event.eventType.replace(/_/g, " ")}
                            </span>
                          </p>
                          {seqName && (
                            <Link href="/retention">
                              <p className="text-[10px] text-primary/70 hover:text-primary hover:underline mt-0.5 truncate transition-colors" onClick={(e) => e.stopPropagation()}>
                                {seqName}
                              </p>
                            </Link>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {new Date(event.createdAt).toLocaleString()}
                          </span>
                          <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                        </div>
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
                            <div className="px-4 pb-3 pt-1 ml-10 space-y-2 border-t border-border/50">
                              <div className="flex items-center gap-2 pt-2">
                                <span className="text-[10px] text-muted-foreground w-16 shrink-0">Member</span>
                                <Link href={`/members/${event.memberId}`}>
                                  <span className="text-[11px] font-medium text-primary hover:text-primary/80 hover:underline inline-flex items-center gap-0.5 transition-colors">
                                    {event.memberFirstName} {event.memberLastName}
                                    <ExternalLink className="h-2.5 w-2.5" />
                                  </span>
                                </Link>
                              </div>
                              {seqName && (
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-muted-foreground w-16 shrink-0">Sequence</span>
                                  <Link href="/retention">
                                    <span className="text-[11px] font-medium text-primary hover:text-primary/80 hover:underline inline-flex items-center gap-0.5 transition-colors">
                                      {seqName}
                                      <ExternalLink className="h-2.5 w-2.5" />
                                    </span>
                                  </Link>
                                </div>
                              )}
                              {event.stepIndex != null && (
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-muted-foreground w-16 shrink-0">Step</span>
                                  <span className="text-[11px] text-foreground">#{event.stepIndex + 1}</span>
                                </div>
                              )}
                              {event.details && (
                                <div className="flex items-start gap-2">
                                  <span className="text-[10px] text-muted-foreground w-16 shrink-0">Details</span>
                                  <span className={`text-[11px] ${isFail ? "text-red-500" : "text-foreground"}`}>
                                    {event.details}
                                  </span>
                                </div>
                              )}
                              {event.metadata && typeof event.metadata === "object" && Object.keys(event.metadata).length > 0 && (
                                <div className="flex items-start gap-2">
                                  <span className="text-[10px] text-muted-foreground w-16 shrink-0">Metadata</span>
                                  <span className="text-[10px] text-muted-foreground font-mono">
                                    {Object.entries(event.metadata).map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`).join(", ")}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-muted-foreground w-16 shrink-0">Time</span>
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(event.createdAt).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <EnrollMemberDialog
        open={showEnrollDialog}
        onClose={() => setShowEnrollDialog(false)}
        gymId={activeGymId}
        sequences={sequences}
        onEnrolled={() => {
          loadData();
        }}
      />
    </div>
  );
}

function getTriggerSummary(trigger: TriggerConfig): string {
  if (!trigger || !trigger.type) return "No trigger";
  switch (trigger.type) {
    case "no_attendance": return `No attendance for ${trigger.days || 10} days`;
    case "risk_score": return `Risk score >= ${trigger.threshold || 50}`;
    case "new_member_decline": return `New member (<${trigger.joinDays || 90}d) inactive ${trigger.inactiveDays || 7}d`;
    case "new_member_join": return `New member joined within ${trigger.joinDays || 3} days`;
    default: return trigger.type;
  }
}

function getEventStyle(type: string): string {
  if (type.includes("email_sent")) return "bg-blue-500/15 text-blue-500";
  if (type.includes("email_failed") || type.includes("email_skipped")) return "bg-red-500/15 text-red-500";
  if (type.includes("task")) return "bg-amber-500/15 text-amber-500";
  if (type.includes("enrolled")) return "bg-emerald-500/15 text-emerald-500";
  if (type.includes("exit") || type.includes("completed")) return "bg-muted/30 text-muted-foreground";
  if (type.includes("error") || type.includes("failed")) return "bg-red-500/15 text-red-500";
  return "bg-violet-500/15 text-violet-500";
}

function getEventIcon(type: string) {
  if (type.includes("failed") || type.includes("skipped") || type.includes("error")) return <AlertTriangle className="h-3.5 w-3.5" />;
  if (type.includes("email")) return <Mail className="h-3.5 w-3.5" />;
  if (type.includes("task")) return <ClipboardList className="h-3.5 w-3.5" />;
  if (type.includes("enrolled")) return <Play className="h-3.5 w-3.5" />;
  if (type.includes("exit") || type.includes("completed")) return <Square className="h-3.5 w-3.5" />;
  return <Activity className="h-3.5 w-3.5" />;
}

function isFailureEventType(type: string): boolean {
  return type === "email_failed" || type === "email_skipped" || type === "step_error";
}

const TEMPLATE_VARIABLES = [
  { label: "first_name", value: "{{first_name}}" },
  { label: "last_name", value: "{{last_name}}" },
  { label: "gym_name", value: "{{gym_name}}" },
  { label: "member_email", value: "{{member_email}}" },
];

function getSampleData(gymName?: string): Record<string, string> {
  return {
    "{{first_name}}": "Sarah",
    "{{last_name}}": "Johnson",
    "{{gym_name}}": gymName || "Your Gym",
    "{{member_email}}": "sarah@example.com",
  };
}

function insertAtCursor(ref: React.RefObject<HTMLTextAreaElement | null>, value: string, currentValue: string, onChange: (val: string) => void) {
  const el = ref.current;
  if (!el) {
    onChange(currentValue + value);
    return;
  }
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const newValue = currentValue.substring(0, start) + value + currentValue.substring(end);
  onChange(newValue);
  requestAnimationFrame(() => {
    el.focus();
    el.selectionStart = el.selectionEnd = start + value.length;
  });
}

function VariableChips({ textareaRef, currentValue, onChange }: {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  currentValue: string;
  onChange: (val: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {TEMPLATE_VARIABLES.map((v) => (
        <button
          key={v.label}
          type="button"
          onClick={() => insertAtCursor(textareaRef, v.value, currentValue, onChange)}
          className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-mono hover:bg-primary/20 transition-colors"
        >
          {v.value}
        </button>
      ))}
    </div>
  );
}

function renderPreview(text: string, gymName?: string): string {
  let result = text;
  for (const [key, val] of Object.entries(getSampleData(gymName))) {
    result = result.split(key).join(val);
  }
  return result;
}

function EmailPreview({ subject, body, gymName }: { subject: string; body: string; gymName?: string }) {
  return (
    <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Preview with sample data</span>
      </div>
      {subject && (
        <div className="pb-2 border-b border-border/50">
          <span className="text-xs text-muted-foreground">Subject: </span>
          <span className="text-sm font-medium text-foreground">{renderPreview(subject, gymName)}</span>
        </div>
      )}
      <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
        {renderPreview(body, gymName) || <span className="text-muted-foreground italic">No body content</span>}
      </div>
    </div>
  );
}

function CreateSequenceForm({ gymId, onBack }: { gymId: number; onBack: () => void }) {
  const { toast } = useToast();
  const { data: gym } = useGetGym(gymId, { query: { enabled: !!gymId } });
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState("no_attendance");
  const [triggerDays, setTriggerDays] = useState(10);
  const [triggerThreshold, setTriggerThreshold] = useState(50);
  const [triggerJoinDays, setTriggerJoinDays] = useState(90);
  const [triggerInactiveDays, setTriggerInactiveDays] = useState(7);
  const [cooldownDays, setCooldownDays] = useState(30);
  const [steps, setSteps] = useState<{ actionType: string; delayDays: number; config: Record<string, any> }[]>([
    { actionType: "email", delayDays: 0, config: { subject: "", body: "" } },
  ]);

  const bodyRefs = useRef<Record<number, HTMLTextAreaElement | null>>({});
  const descRefs = useRef<Record<number, HTMLTextAreaElement | null>>({});
  const [previewStepIndex, setPreviewStepIndex] = useState<number | null>(null);

  const addStep = (type: string) => {
    setSteps(prev => [...prev, {
      actionType: type,
      delayDays: prev.length === 0 ? 0 : 3,
      config: type === "email" ? { subject: "", body: "" } : { title: "", description: "" },
    }]);
  };

  const removeStep = (index: number) => {
    setSteps(prev => prev.filter((_, i) => i !== index));
    if (previewStepIndex === index) setPreviewStepIndex(null);
    else if (previewStepIndex !== null && previewStepIndex > index) setPreviewStepIndex(previewStepIndex - 1);
  };

  const swapSteps = (a: number, b: number) => {
    setSteps(prev => {
      const next = [...prev];
      [next[a], next[b]] = [next[b], next[a]];
      return next;
    });
    if (previewStepIndex === a) setPreviewStepIndex(b);
    else if (previewStepIndex === b) setPreviewStepIndex(a);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({ title: "Name is required" });
      return;
    }
    if (steps.length === 0) {
      toast({ title: "Add at least one step" });
      return;
    }
    setSaving(true);
    const triggerConfig: TriggerConfig = { type: triggerType };
    if (triggerType === "no_attendance") triggerConfig.days = triggerDays;
    if (triggerType === "risk_score") triggerConfig.threshold = triggerThreshold;
    if (triggerType === "new_member_decline") {
      triggerConfig.joinDays = triggerJoinDays;
      triggerConfig.inactiveDays = triggerInactiveDays;
    }

    try {
      const res = await apiFetch(`/api/gyms/${gymId}/retention/sequences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, description, type: "custom", isEnabled: false,
          triggerConfig, cooldownDays,
          steps: steps.map((s, i) => ({ ...s, stepOrder: i })),
        }),
      });
      if (res.ok) {
        toast({ title: "Sequence created" });
        onBack();
      } else {
        const data = await res.json();
        toast({ title: "Error", description: data.error || "Failed to create" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to create sequence" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-4 overflow-y-auto">
      <div className="flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        </button>
        <div className="h-9 w-9 bg-violet-500/15 rounded-xl flex items-center justify-center">
          <Plus className="h-5 w-5 text-violet-500" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Create Custom Sequence</h2>
          <p className="text-xs text-muted-foreground">Build your own retention automation from scratch</p>
        </div>
      </div>

      <TabHint>
        Define when this sequence triggers, what emails or tasks to run, and how long to wait between steps. The sequence will start <span className="font-medium text-foreground">paused</span> — you can activate it after reviewing.
      </TabHint>

      <div className="space-y-4">
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-medium text-foreground">Basics</h3>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Sequence Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Weekend Warriors Re-engage"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this sequence do?"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div>
            <h3 className="text-sm font-medium text-foreground">Trigger</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">When should members be enrolled in this sequence?</p>
          </div>
          <select value={triggerType} onChange={(e) => setTriggerType(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary">
            <option value="no_attendance">No attendance for X days</option>
            <option value="risk_score">Risk score exceeds threshold</option>
            <option value="new_member_decline">New member activity declining</option>
          </select>
          {triggerType === "no_attendance" && (
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Days without a check-in</label>
              <input type="number" value={triggerDays} onChange={(e) => setTriggerDays(Number(e.target.value))}
                className="w-24 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          )}
          {triggerType === "risk_score" && (
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Risk score threshold (0-100)</label>
              <input type="number" value={triggerThreshold} onChange={(e) => setTriggerThreshold(Number(e.target.value))}
                className="w-24 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          )}
          {triggerType === "new_member_decline" && (
            <div className="flex gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Joined within last X days</label>
                <input type="number" value={triggerJoinDays} onChange={(e) => setTriggerJoinDays(Number(e.target.value))}
                  className="w-24 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Inactive for Y days</label>
                <input type="number" value={triggerInactiveDays} onChange={(e) => setTriggerInactiveDays(Number(e.target.value))}
                  className="w-24 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Cooldown (days between re-enrollments)</label>
            <input type="number" value={cooldownDays} onChange={(e) => setCooldownDays(Number(e.target.value))}
              className="w-24 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
            <p className="text-[10px] text-muted-foreground mt-1">How long to wait before a member can be enrolled in this sequence again</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div>
            <h3 className="text-sm font-medium text-foreground">Steps</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Build the sequence of actions. Use the variable chips below each field to insert placeholders.
            </p>
          </div>
          {steps.map((step, i) => (
            <div key={i} className="border border-border rounded-lg p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  {step.actionType === "email" ? <Mail className="h-3.5 w-3.5 text-blue-500" /> : <ClipboardList className="h-3.5 w-3.5 text-amber-500" />}
                  Step {i + 1}: {step.actionType === "email" ? "Send Email" : "Create Staff Task"}
                </span>
                <div className="flex items-center gap-2">
                  {i > 0 && (
                    <button type="button" onClick={() => swapSteps(i, i - 1)} className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors" title="Move up">
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {i < steps.length - 1 && (
                    <button type="button" onClick={() => swapSteps(i, i + 1)} className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors" title="Move down">
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <label className="text-xs text-muted-foreground">Delay:</label>
                  <input type="number" value={step.delayDays}
                    onChange={(e) => setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, delayDays: Number(e.target.value) } : s))}
                    className="w-14 px-2 py-1 bg-background border border-border rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-primary" />
                  <span className="text-xs text-muted-foreground">days</span>
                  <button onClick={() => removeStep(i)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {step.actionType === "email" ? (
                <>
                  <input value={step.config.subject || ""} onChange={(e) => {
                    const newSteps = [...steps]; newSteps[i] = { ...step, config: { ...step.config, subject: e.target.value } }; setSteps(newSteps);
                  }} placeholder="Email subject line" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                  <textarea
                    ref={(el) => { bodyRefs.current[i] = el; }}
                    value={step.config.body || ""} onChange={(e) => {
                      const newSteps = [...steps]; newSteps[i] = { ...step, config: { ...step.config, body: e.target.value } }; setSteps(newSteps);
                    }} rows={8} placeholder="Hey {{first_name}}, we've missed seeing you at {{gym_name}}..."
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary resize-y min-h-[160px]" />
                  <VariableChips
                    textareaRef={{ current: bodyRefs.current[i] ?? null }}
                    currentValue={step.config.body || ""}
                    onChange={(val) => { const newSteps = [...steps]; newSteps[i] = { ...step, config: { ...step.config, body: val } }; setSteps(newSteps); }}
                  />
                  <button
                    type="button"
                    onClick={() => setPreviewStepIndex(previewStepIndex === i ? null : i)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {previewStepIndex === i ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {previewStepIndex === i ? "Hide Preview" : "Preview"}
                  </button>
                  {previewStepIndex === i && (
                    <EmailPreview subject={step.config.subject || ""} body={step.config.body || ""} gymName={gym?.name} />
                  )}
                </>
              ) : (
                <>
                  <input value={step.config.title || ""} onChange={(e) => {
                    const newSteps = [...steps]; newSteps[i] = { ...step, config: { ...step.config, title: e.target.value } }; setSteps(newSteps);
                  }} placeholder="Task title for your staff" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                  <textarea
                    ref={(el) => { descRefs.current[i] = el; }}
                    value={step.config.description || ""} onChange={(e) => {
                      const newSteps = [...steps]; newSteps[i] = { ...step, config: { ...step.config, description: e.target.value } }; setSteps(newSteps);
                    }} rows={5} placeholder="What should the staff do?" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary resize-y min-h-[100px]" />
                  <VariableChips
                    textareaRef={{ current: descRefs.current[i] ?? null }}
                    currentValue={step.config.description || ""}
                    onChange={(val) => { const newSteps = [...steps]; newSteps[i] = { ...step, config: { ...step.config, description: val } }; setSteps(newSteps); }}
                  />
                </>
              )}
            </div>
          ))}
          <div className="flex gap-2">
            <button onClick={() => addStep("email")}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors">
              <Mail className="h-3.5 w-3.5" /> Add Email Step
            </button>
            <button onClick={() => addStep("task")}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors">
              <ClipboardList className="h-3.5 w-3.5" /> Add Task Step
            </button>
          </div>
        </div>

        <button onClick={handleCreate} disabled={saving}
          className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Create Sequence (Paused)
        </button>
      </div>
    </div>
  );
}

function SequenceDetail({ sequence, onBack, gymId }: { sequence: Sequence; onBack: () => void; gymId: number }) {
  const { toast } = useToast();
  const { data: gym } = useGetGym(gymId, { query: { enabled: !!gymId } });
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [name, setName] = useState(sequence.name);
  const [description, setDescription] = useState(sequence.description || "");
  const [triggerConfig, setTriggerConfig] = useState<TriggerConfig>(sequence.triggerConfig as TriggerConfig);
  const [cooldownDays, setCooldownDays] = useState(sequence.cooldownDays);
  const [steps, setSteps] = useState<SequenceStep[]>(sequence.steps || []);
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const editBodyRefs = useRef<Record<number, HTMLTextAreaElement | null>>({});
  const editDescRefs = useRef<Record<number, HTMLTextAreaElement | null>>({});
  const [editPreviewIndex, setEditPreviewIndex] = useState<number | null>(null);

  const Icon = TYPE_ICONS[sequence.type] || Settings2;
  const colorClass = TYPE_COLORS[sequence.type] || TYPE_COLORS.custom;

  const swapEditSteps = (a: number, b: number) => {
    setSteps(prev => {
      const next = [...prev];
      [next[a], next[b]] = [next[b], next[a]];
      return next.map((s, idx) => ({ ...s, stepOrder: idx }));
    });
    if (editPreviewIndex === a) setEditPreviewIndex(b);
    else if (editPreviewIndex === b) setEditPreviewIndex(a);
  };

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

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiFetch(`/api/gyms/${gymId}/retention/sequences/${sequence.id}`, { method: "DELETE" });
      toast({ title: "Sequence deleted" });
      onBack();
    } catch {
      toast({ title: "Error", description: "Failed to delete" });
      setDeleting(false);
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
        <div className="flex items-center gap-2">
          {!editMode && (
            <>
              <button
                onClick={() => setShowEnrollDialog(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                title="Manually enroll a member into this sequence"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Enroll
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleting}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Delete sequence"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
          <button
            onClick={() => setEditMode(!editMode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              editMode ? "bg-primary/15 text-primary" : "bg-muted/30 text-muted-foreground hover:text-foreground"
            }`}
          >
            {editMode ? "Cancel" : "Edit"}
          </button>
        </div>
      </div>

      {editMode ? (
        <div className="space-y-4">
          <TabHint>
            Edit your sequence settings below. Use the variable chips below each field to insert placeholders — they'll be replaced with real values when sent.
          </TabHint>

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
              <p className="text-[10px] text-muted-foreground mt-1">How long to wait before a member can be re-enrolled after completing this sequence</p>
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
                <label className="block text-xs text-muted-foreground mb-1">Score threshold (0-100)</label>
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
            <div>
              <h3 className="text-sm font-medium text-foreground">Steps ({steps.length})</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Use the variable chips below each field to insert placeholders.</p>
            </div>
            {steps.map((step, i) => (
              <div key={i} className="border border-border rounded-lg p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    {step.actionType === "email" ? <Mail className="h-3.5 w-3.5 text-blue-500" /> : <ClipboardList className="h-3.5 w-3.5 text-amber-500" />}
                    Step {i + 1}: {step.actionType === "email" ? "Send Email" : "Create Task"}
                  </span>
                  <div className="flex items-center gap-2">
                    {i > 0 && (
                      <button type="button" onClick={() => swapEditSteps(i, i - 1)} className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors" title="Move up">
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {i < steps.length - 1 && (
                      <button type="button" onClick={() => swapEditSteps(i, i + 1)} className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors" title="Move down">
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <label className="text-xs text-muted-foreground">Delay:</label>
                    <input type="number" value={step.delayDays} onChange={(e) => setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, delayDays: Number(e.target.value) } : s))}
                      className="w-14 px-2 py-1 bg-background border border-border rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-primary" />
                    <span className="text-xs text-muted-foreground">days</span>
                  </div>
                </div>
                {step.actionType === "email" && (
                  <>
                    <input value={step.config.subject || ""} onChange={(e) => updateStepConfig(i, "subject", e.target.value)}
                      placeholder="Subject" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                    <textarea
                      ref={(el) => { editBodyRefs.current[i] = el; }}
                      value={step.config.body || ""} onChange={(e) => updateStepConfig(i, "body", e.target.value)}
                      rows={8} placeholder="Hey {{first_name}}, we've missed seeing you at {{gym_name}}..."
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary resize-y min-h-[160px]" />
                    <VariableChips
                      textareaRef={{ current: editBodyRefs.current[i] ?? null }}
                      currentValue={step.config.body || ""}
                      onChange={(val) => updateStepConfig(i, "body", val)}
                    />
                    <button
                      type="button"
                      onClick={() => setEditPreviewIndex(editPreviewIndex === i ? null : i)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {editPreviewIndex === i ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      {editPreviewIndex === i ? "Hide Preview" : "Preview"}
                    </button>
                    {editPreviewIndex === i && (
                      <EmailPreview subject={step.config.subject || ""} body={step.config.body || ""} gymName={gym?.name} />
                    )}
                  </>
                )}
                {step.actionType === "task" && (
                  <>
                    <input value={step.config.title || ""} onChange={(e) => updateStepConfig(i, "title", e.target.value)}
                      placeholder="Task title" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
                    <textarea
                      ref={(el) => { editDescRefs.current[i] = el; }}
                      value={step.config.description || ""} onChange={(e) => updateStepConfig(i, "description", e.target.value)}
                      rows={5} placeholder="Task description" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary resize-y min-h-[100px]" />
                    <VariableChips
                      textareaRef={{ current: editDescRefs.current[i] ?? null }}
                      currentValue={step.config.description || ""}
                      onChange={(val) => updateStepConfig(i, "description", val)}
                    />
                  </>
                )}
              </div>
            ))}
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
            <div className="space-y-0">
              {steps.map((step, i) => (
                <RetentionStepDetailCard key={i} step={step} index={i} isLast={i === steps.length - 1} gymName={gym?.name} />
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
            {!sequence.isEnabled && (
              <p className="text-[10px] text-muted-foreground mt-1">
                This sequence is paused. Go back and use the toggle to activate it when you're ready.
              </p>
            )}
          </div>
        </div>
      )}

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this sequence?</AlertDialogTitle>
            <AlertDialogDescription>
              Members currently enrolled will be removed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EnrollMemberDialog
        open={showEnrollDialog}
        onClose={() => setShowEnrollDialog(false)}
        gymId={gymId}
        sequenceId={sequence.id}
        sequenceName={sequence.name}
        onEnrolled={() => {
          toast({ title: "Member enrolled successfully" });
          onBack();
        }}
      />
    </div>
  );
}

function RetentionStepDetailCard({ step, index, isLast, gymName }: { step: SequenceStep; index: number; isLast: boolean; gymName?: string }) {
  const [expanded, setExpanded] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const isEmail = step.actionType === "email";
  const body = isEmail ? (step.config.body || "") : (step.config.description || "");
  const subject = isEmail ? (step.config.subject || "") : (step.config.title || "");
  const isLongMessage = body.split("\n").length > 6 || body.length > 400;
  const colorClass = isEmail ? "bg-blue-500/15 text-blue-600" : "bg-amber-500/15 text-amber-600";

  return (
    <div className="relative">
      <div className="flex gap-4">
        <div className="flex flex-col items-center shrink-0">
          <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${colorClass}`}>
            {index + 1}
          </div>
          {!isLast && <div className="w-px flex-1 bg-border mt-1" />}
        </div>

        <div className="flex-1 min-w-0 pb-4">
          <div className="bg-muted/20 border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-md text-xs font-medium uppercase ${colorClass}`}>
                  {isEmail ? "email" : "task"}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {index === 0 ? (step.delayDays > 0 ? `After ${step.delayDays} days` : "Immediately") : `+${step.delayDays} days`}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {isEmail && (
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  >
                    {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {showPreview ? "Hide Preview" : "Preview"}
                  </button>
                )}
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
            </div>

            {subject && (
              <div className="mb-2 pb-2 border-b border-border/50">
                <span className="text-xs text-muted-foreground">{isEmail ? "Subject: " : "Title: "}</span>
                <span className="text-sm font-medium text-foreground">{subject}</span>
              </div>
            )}

            {showPreview && isEmail ? (
              <EmailPreview subject={subject} body={body} gymName={gymName} />
            ) : (
              <div className={`text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed ${
                !expanded ? "line-clamp-6" : ""
              }`}>
                {body || <span className="italic">No content</span>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
