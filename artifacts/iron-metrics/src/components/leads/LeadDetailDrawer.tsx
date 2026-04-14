import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useListLeadActivities, useCreateLeadActivity, useUpdateLead, useSendLeadSms, getListLeadActivitiesQueryKey, getListLeadsQueryKey, useListAppointmentTypes, useListStaff, useCreateAppointment, getListAppointmentsQueryKey } from "@workspace/api-client-react";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Phone, Mail, Calendar, Clock, AlertTriangle, ArrowRight,
  UserCheck, MessageSquare, CalendarClock, PlusCircle, Edit3,
  History, ChevronRight, Send, Zap, Timer
} from "lucide-react";
import { STAGE_CONFIG, PIPELINE_STAGES, SOURCE_OPTIONS, computeStale, timeInStage, formatRelativeDate, isFollowUpOverdue } from "./lead-utils";

import { authFetch } from "@/lib/authFetch";

const API_BASE = import.meta.env.VITE_API_URL || "";

function apiFetchLocal(url: string, opts?: RequestInit) {
  return authFetch(`${API_BASE}${url}`, opts);
}

interface SequenceEnrollmentStatus {
  id: number;
  sequenceId: number;
  status: string;
  currentStepIndex: number;
  nextActionAt: string | null;
  enrolledAt: string;
  completedAt: string | null;
  exitReason: string | null;
  sequenceName: string;
  sequenceType: string;
}

interface LeadDetailDrawerProps {
  lead: any;
  gymId: number;
  open: boolean;
  onClose: () => void;
  onMoveStage: (lead: any, stage: string) => void;
  onConvert: (lead: any) => void;
  onInvalidate: () => void;
}

function ActivityIcon({ type }: { type: string }) {
  const iconMap: Record<string, any> = {
    created: PlusCircle,
    stage_changed: ArrowRight,
    note_updated: Edit3,
    contact_logged: Phone,
    follow_up_scheduled: CalendarClock,
    converted: UserCheck,
    note_added: MessageSquare,
  };
  const Icon = iconMap[type] || History;
  return <Icon className="h-3.5 w-3.5" />;
}

function ActivityTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    created: "Lead Created",
    stage_changed: "Stage Changed",
    note_updated: "Note Updated",
    contact_logged: "Contact Logged",
    follow_up_scheduled: "Follow-up Updated",
    converted: "Converted",
    note_added: "Note Added",
  };
  return labels[type] || type;
}

export function LeadDetailDrawer({ lead, gymId, open, onClose, onMoveStage, onConvert, onInvalidate }: LeadDetailDrawerProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState(lead?.notes || "");
  const [followUpDate, setFollowUpDate] = useState(lead?.nextFollowUpDate || "");
  const [followUpNote, setFollowUpNote] = useState(lead?.followUpNote || "");
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [contactNote, setContactNote] = useState("");
  const [showContactLog, setShowContactLog] = useState(false);
  const [smsOpen, setSmsOpen] = useState(false);
  const [smsMessage, setSmsMessage] = useState("");
  const [nsiOpen, setNsiOpen] = useState(false);
  const [nsiTypeId, setNsiTypeId] = useState("");
  const [nsiCoachId, setNsiCoachId] = useState("");
  const [nsiDate, setNsiDate] = useState("");
  const [nsiTime, setNsiTime] = useState("10:00");

  const { data: activities } = useListLeadActivities(gymId, lead?.id, {
    query: { enabled: !!lead?.id }
  });
  const { data: appointmentTypes } = useListAppointmentTypes(gymId, {
    query: { enabled: !!gymId && nsiOpen }
  });
  const { data: staff } = useListStaff(gymId, {
    query: { enabled: !!gymId && nsiOpen }
  });

  const [sequenceEnrollments, setSequenceEnrollments] = useState<SequenceEnrollmentStatus[]>([]);

  useEffect(() => {
    if (!lead?.id || !gymId || !open) return;
    apiFetchLocal(`/api/gyms/${gymId}/lead-sequences/lead/${lead.id}/status`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.enrollments) setSequenceEnrollments(data.enrollments);
      })
      .catch(() => {});
  }, [lead?.id, gymId, open]);

  const updateLeadMutation = useUpdateLead();
  const createActivityMutation = useCreateLeadActivity();
  const sendSmsMutation = useSendLeadSms();
  const createAppointmentMutation = useCreateAppointment();

  const isStale = lead ? computeStale(lead) : false;
  const overdue = lead ? isFollowUpOverdue(lead) : false;
  const stageConfig = lead ? STAGE_CONFIG[lead.stage] : null;

  const handleSaveNotes = () => {
    if (!lead) return;
    updateLeadMutation.mutate(
      { gymId, leadId: lead.id, data: { notes } },
      {
        onSuccess: () => {
          toast({ title: "Notes saved" });
          setEditingNotes(false);
          onInvalidate();
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to save notes." });
        },
      }
    );
  };

  const handleScheduleFollowUp = () => {
    if (!lead) return;
    updateLeadMutation.mutate(
      { gymId, leadId: lead.id, data: { nextFollowUpDate: followUpDate || null, followUpNote: followUpNote || null } },
      {
        onSuccess: () => {
          toast({ title: followUpDate ? "Follow-up scheduled" : "Follow-up cleared" });
          setShowFollowUp(false);
          onInvalidate();
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to update follow-up." });
        },
      }
    );
  };

  const handleLogContact = () => {
    if (!lead) return;
    createActivityMutation.mutate(
      { gymId, leadId: lead.id, data: { type: "contact_logged", description: contactNote || "Contact attempt logged" } },
      {
        onSuccess: () => {
          toast({ title: "Contact logged" });
          setContactNote("");
          setShowContactLog(false);
          queryClient.invalidateQueries({ queryKey: getListLeadActivitiesQueryKey(gymId, lead.id) });
          onInvalidate();
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to log contact." });
        },
      }
    );
  };

  const handleSendSms = () => {
    if (!lead || !smsMessage.trim()) return;
    sendSmsMutation.mutate(
      { gymId, leadId: lead.id, data: { message: smsMessage.trim() } },
      {
        onSuccess: (data) => {
          toast({ title: "Text Sent", description: `Text sent to ${(data as any).recipientName} (${(data as any).recipientPhone}).` });
          setSmsOpen(false);
          setSmsMessage("");
          queryClient.invalidateQueries({ queryKey: getListLeadActivitiesQueryKey(gymId, lead.id) });
        },
        onError: (err: unknown) => {
          const error = err as { response?: { data?: { error?: string } } };
          toast({ title: "Failed to Send", description: error?.response?.data?.error || "Could not send text.", variant: "destructive" });
        },
      }
    );
  };

  const handleBookNsi = () => {
    if (!lead || !nsiTypeId || !nsiDate || !nsiTime) return;
    const startTime = `${nsiDate}T${nsiTime}:00`;
    const selectedType = (appointmentTypes as any[])?.find((t: any) => String(t.id) === nsiTypeId);
    const duration = selectedType?.durationMinutes || 30;
    const endDate = new Date(startTime);
    endDate.setMinutes(endDate.getMinutes() + duration);
    const endTime = endDate.toISOString().slice(0, 19);

    createAppointmentMutation.mutate(
      {
        gymId,
        data: {
          appointmentTypeId: parseInt(nsiTypeId),
          coachId: nsiCoachId && nsiCoachId !== "none" ? parseInt(nsiCoachId) : undefined,
          leadId: lead.id,
          startTime,
          endTime,
          notes: `NSI for ${lead.firstName} ${lead.lastName}`,
        } as any,
      },
      {
        onSuccess: () => {
          toast({ title: "Appointment booked", description: "No Sweat Intro scheduled successfully." });
          setNsiOpen(false);
          setNsiTypeId("");
          setNsiCoachId("");
          setNsiDate("");
          setNsiTime("10:00");
          queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey(gymId) });
          queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey(gymId) });
          onInvalidate();
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to book appointment." });
        },
      }
    );
  };

  if (!lead) return null;

  return (
    <>
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md bg-background dark:bg-[hsl(220,20%,8%)] border-border p-0 overflow-y-auto">
        <div className="p-6 border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <div>
              <SheetTitle className="text-xl font-bold text-foreground">
                {lead.firstName} {lead.lastName}
              </SheetTitle>
              <div className="flex items-center gap-2 mt-1.5">
                {stageConfig && (
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${stageConfig.bgClass} ${stageConfig.color} border ${stageConfig.borderClass}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${stageConfig.dotClass}`} />
                    {stageConfig.label}
                  </span>
                )}
                {isStale && (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    <AlertTriangle className="h-3 w-3" />
                    Stale
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact</h3>
            <div className="space-y-2">
              {lead.email && (
                <a href={`mailto:${lead.email}`} className="flex items-center gap-2.5 text-sm text-foreground hover:text-primary transition-colors">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {lead.email}
                </a>
              )}
              {lead.phone && (
                <a href={`tel:${lead.phone}`} className="flex items-center gap-2.5 text-sm text-foreground hover:text-primary transition-colors">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {lead.phone}
                </a>
              )}
              {lead.source && (
                <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <Send className="h-4 w-4" />
                  <span className="capitalize">{lead.source.replace("_", " ")}</span>
                </div>
              )}
              <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Added {new Date(lead.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </div>
              <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {timeInStage(lead)} in {stageConfig?.label}
              </div>
            </div>
          </div>

          {lead.nextFollowUpDate && (
            <div className={`rounded-lg border p-3 ${overdue ? "border-red-500/30 bg-red-500/5" : "border-blue-500/30 bg-blue-500/5"}`}>
              <div className="flex items-center gap-2 text-sm">
                <CalendarClock className={`h-4 w-4 ${overdue ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400"}`} />
                <span className={overdue ? "text-red-600 dark:text-red-400 font-medium" : "text-blue-600 dark:text-blue-400 font-medium"}>
                  Follow-up {formatRelativeDate(lead.nextFollowUpDate)}
                  {overdue && " — overdue"}
                </span>
              </div>
              {lead.followUpNote && (
                <p className="text-xs text-muted-foreground mt-1.5 pl-6">{lead.followUpNote}</p>
              )}
            </div>
          )}

          {sequenceEnrollments.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Zap className="h-3 w-3" />
                Active Sequences
              </h3>
              {sequenceEnrollments.map((e) => (
                <div
                  key={e.id}
                  className={`rounded-lg border p-3 ${
                    e.status === "active" ? "border-violet-500/30 bg-violet-500/5" :
                    e.status === "paused" ? "border-amber-500/30 bg-amber-500/5" :
                    e.status === "completed" ? "border-emerald-500/30 bg-emerald-500/5" :
                    "border-border bg-muted/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <Zap className={`h-3.5 w-3.5 ${
                        e.status === "active" ? "text-violet-500" :
                        e.status === "paused" ? "text-amber-500" :
                        e.status === "completed" ? "text-emerald-500" :
                        "text-muted-foreground"
                      }`} />
                      <span className="font-medium text-foreground text-xs">{e.sequenceName}</span>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      e.status === "active" ? "bg-violet-500/15 text-violet-600" :
                      e.status === "paused" ? "bg-amber-500/15 text-amber-600" :
                      e.status === "completed" ? "bg-emerald-500/15 text-emerald-600" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {e.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                    <span>Step {e.currentStepIndex + 1}</span>
                    {e.nextActionAt && e.status === "active" && (
                      <span className="flex items-center gap-1">
                        <Timer className="h-2.5 w-2.5" />
                        Next: {new Date(e.nextActionAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowContactLog(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:border-primary/30 transition-colors"
              >
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                Log Contact
              </button>
              <button
                onClick={() => { setShowFollowUp(true); setFollowUpDate(lead.nextFollowUpDate || ""); setFollowUpNote(lead.followUpNote || ""); }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:border-primary/30 transition-colors"
              >
                <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                Schedule Follow-up
              </button>
              {lead.phone && (
                <button
                  onClick={() => { setSmsOpen(true); setSmsMessage(""); }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Send Text
                </button>
              )}
              {lead.stage !== "converted" && lead.stage !== "lost" && (
                <>
                  <button
                    onClick={() => setNsiOpen(true)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-primary/20 bg-primary/5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors col-span-2"
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    Book No Sweat Intro
                  </button>
                  <button
                    onClick={() => onConvert(lead)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    Convert
                  </button>
                  <button
                    onClick={() => onMoveStage(lead, "lost")}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-500/20 bg-red-500/5 text-xs font-medium text-red-600/70 dark:text-red-400/70 hover:bg-red-500/10 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                    Mark Lost
                  </button>
                </>
              )}
            </div>
          </div>

          {lead.stage !== "converted" && lead.stage !== "lost" && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Move Stage</h3>
              <div className="flex flex-wrap gap-1.5">
                {PIPELINE_STAGES.filter(s => s !== lead.stage && s !== "converted" && s !== "lost" && !(s === "scheduled" && lead.stage === "trial")).map(stage => (
                  <button
                    key={stage}
                    onClick={() => onMoveStage(lead, stage)}
                    className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors hover:opacity-80 ${STAGE_CONFIG[stage].bgClass} ${STAGE_CONFIG[stage].color} ${STAGE_CONFIG[stage].borderClass}`}
                  >
                    <ChevronRight className="h-3 w-3" />
                    {STAGE_CONFIG[stage].label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence>
            {showContactLog && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="space-y-2 p-3 rounded-lg border border-border bg-card">
                  <h4 className="text-xs font-semibold text-muted-foreground">Log Contact Attempt</h4>
                  <Input
                    value={contactNote}
                    onChange={(e) => setContactNote(e.target.value)}
                    placeholder="What happened? (optional)"
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setShowContactLog(false)} className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                    <button onClick={handleLogContact} disabled={createActivityMutation.isPending} className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                      {createActivityMutation.isPending ? "Saving..." : "Log Contact"}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showFollowUp && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="space-y-2 p-3 rounded-lg border border-border bg-card">
                  <h4 className="text-xs font-semibold text-muted-foreground">Schedule Follow-up</h4>
                  <Input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="text-sm"
                  />
                  <Input
                    value={followUpNote}
                    onChange={(e) => setFollowUpNote(e.target.value)}
                    placeholder="Note (optional)"
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setShowFollowUp(false)} className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                    {followUpDate && (
                      <button onClick={() => { setFollowUpDate(""); handleScheduleFollowUp(); }} disabled={updateLeadMutation.isPending} className="px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300 transition-colors disabled:opacity-50">Clear</button>
                    )}
                    <button onClick={handleScheduleFollowUp} disabled={updateLeadMutation.isPending} className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                      {updateLeadMutation.isPending ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {smsOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="space-y-2 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                    <h4 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Send Text to {lead.firstName}</h4>
                  </div>
                  <Textarea
                    value={smsMessage}
                    onChange={(e) => setSmsMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="text-sm min-h-[80px]"
                    maxLength={1600}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">{smsMessage.length}/1600</span>
                    <div className="flex gap-2">
                      <button onClick={() => setSmsOpen(false)} className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                      <button
                        onClick={handleSendSms}
                        disabled={!smsMessage.trim() || sendSmsMutation.isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-md font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                      >
                        <Send className="h-3 w-3" />
                        {sendSmsMutation.isPending ? "Sending..." : "Send"}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</h3>
              {!editingNotes && (
                <button onClick={() => { setEditingNotes(true); setNotes(lead.notes || ""); }} className="text-xs text-primary hover:text-primary/80 transition-colors">
                  {lead.notes ? "Edit" : "Add"}
                </button>
              )}
            </div>
            {editingNotes ? (
              <div className="space-y-2">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary resize-none"
                  placeholder="Add notes about this lead..."
                />
                <div className="flex gap-2">
                  <button onClick={() => setEditingNotes(false)} className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                  <button onClick={handleSaveNotes} disabled={updateLeadMutation.isPending} className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">Save</button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {lead.notes || "No notes yet."}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Activity</h3>
            {!activities || activities.length === 0 ? (
              <p className="text-xs text-muted-foreground/60">No activity recorded yet.</p>
            ) : (
              <div className="space-y-0">
                {activities.map((activity: any, i: number) => (
                  <div key={activity.id} className="flex gap-3 relative">
                    {i < activities.length - 1 && (
                      <div className="absolute left-[9px] top-6 bottom-0 w-px bg-border" />
                    )}
                    <div className="h-[18px] w-[18px] rounded-full bg-card border border-border flex items-center justify-center shrink-0 mt-0.5 z-10">
                      <ActivityIcon type={activity.type} />
                    </div>
                    <div className="pb-4 min-w-0 flex-1">
                      <div className="text-xs font-medium text-foreground">{ActivityTypeLabel(activity.type)}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 break-words">{activity.description}</div>
                      <div className="text-[10px] text-muted-foreground/60 mt-0.5">
                        {new Date(activity.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        {" "}
                        {new Date(activity.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>

    <Dialog open={nsiOpen} onOpenChange={setNsiOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Book No Sweat Intro</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="text-sm text-muted-foreground">
            Schedule a No Sweat Intro for <span className="font-medium text-foreground">{lead.firstName} {lead.lastName}</span>
          </div>
          <div className="space-y-2">
            <Label>Appointment Type</Label>
            <Select value={nsiTypeId} onValueChange={setNsiTypeId}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {(appointmentTypes as any[])?.map((t: any) => (
                  <SelectItem key={t.id} value={String(t.id)}>{t.name} ({t.durationMinutes} min)</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Coach (optional)</Label>
            <Select value={nsiCoachId} onValueChange={setNsiCoachId}>
              <SelectTrigger><SelectValue placeholder="Any coach" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Any coach</SelectItem>
                {(staff as any[])?.map((s: any) => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.displayName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={nsiDate} onChange={(e) => setNsiDate(e.target.value)} min={new Date().toISOString().split("T")[0]} />
            </div>
            <div className="space-y-2">
              <Label>Time</Label>
              <Input type="time" value={nsiTime} onChange={(e) => setNsiTime(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <button onClick={() => setNsiOpen(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
          <button
            onClick={handleBookNsi}
            disabled={!nsiTypeId || !nsiDate || !nsiTime || createAppointmentMutation.isPending}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {createAppointmentMutation.isPending ? "Booking..." : "Book Appointment"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
