import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, ChevronRight, ChevronDown, Mail, ClipboardList, UserCheck, Loader2, Zap, AlertTriangle, ExternalLink } from "lucide-react";
import { Link } from "wouter";

import { authFetch } from "@/lib/authFetch";

const API_BASE = import.meta.env.VITE_API_URL || "";

interface ApiRetentionEvent {
  id: number;
  eventType: string;
  sequenceName?: string;
  memberFirstName?: string;
  memberLastName?: string;
  memberId?: number;
  sequenceId?: number;
  enrollmentId?: number;
  stepIndex?: number | null;
  details?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

interface RetentionEvent extends Omit<ApiRetentionEvent, "memberFirstName" | "memberLastName"> {
  memberName?: string;
}

interface EnrollmentSummary {
  active: number;
  completed: number;
}

const eventIcons: Record<string, React.ElementType> = {
  email_sent: Mail,
  email_failed: AlertTriangle,
  email_skipped: AlertTriangle,
  task_created: ClipboardList,
  enrolled: UserCheck,
  step_advanced: Zap,
  step_error: AlertTriangle,
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function eventLabel(type: string): string {
  switch (type) {
    case "email_sent": return "Email sent";
    case "email_failed": return "Email failed";
    case "email_skipped": return "Email skipped";
    case "task_created": return "Task created";
    case "enrolled": return "Member enrolled";
    case "step_advanced": return "Step advanced";
    case "completed": return "Sequence completed";
    case "exited": return "Exited sequence";
    case "step_error": return "Step error";
    default: return type.replace(/_/g, " ");
  }
}

function isFailureEvent(type: string): boolean {
  return type === "email_failed" || type === "email_skipped" || type === "step_error";
}

export function RetentionActivityCard({ gymId }: { gymId: number }) {
  const [events, setEvents] = useState<RetentionEvent[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentSummary>({ active: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventsRes, enrollRes] = await Promise.all([
          authFetch(`${API_BASE}/api/gyms/${gymId}/retention/events?limit=6`),
          authFetch(`${API_BASE}/api/gyms/${gymId}/retention/enrollments?status=active`),
        ]);

        if (eventsRes.ok) {
          const evData = await eventsRes.json();
          const raw: ApiRetentionEvent[] = Array.isArray(evData) ? evData.slice(0, 6) : [];
          setEvents(raw.map((e) => ({
            id: e.id,
            eventType: e.eventType,
            sequenceName: e.sequenceName,
            memberId: e.memberId,
            sequenceId: e.sequenceId,
            enrollmentId: e.enrollmentId,
            stepIndex: e.stepIndex,
            details: e.details,
            metadata: e.metadata,
            createdAt: e.createdAt,
            memberName: [e.memberFirstName, e.memberLastName].filter(Boolean).join(" ") || undefined,
          })));
        }

        if (enrollRes.ok) {
          const enData = await enrollRes.json();
          const list = Array.isArray(enData) ? enData : [];
          setEnrollments({
            active: list.length,
            completed: list.filter((e: any) => e.status === "completed").length,
          });
        }
      } catch {
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [gymId]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl shadow-sm flex flex-col"
    >
      <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Activity className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Retention Activity</h3>
            <p className="text-[10px] text-muted-foreground">
              {enrollments.active > 0
                ? `${enrollments.active} active sequence${enrollments.active !== 1 ? "s" : ""} running`
                : "Automated outreach & follow-ups"}
            </p>
          </div>
        </div>
        <Link href="/retention">
          <span className="text-[11px] font-medium text-primary hover:text-primary/80 flex items-center gap-0.5">
            Sequences
            <ChevronRight className="h-3 w-3" />
          </span>
        </Link>
      </div>

      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center mb-2">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <p className="text-xs font-medium text-foreground">No retention activity yet</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[200px]">
              Create a retention sequence to automatically engage at-risk members
            </p>
            <Link href="/retention">
              <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors">
                Set up sequences
                <ChevronRight className="h-3 w-3" />
              </span>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {events.map((evt) => {
              const isFail = isFailureEvent(evt.eventType);
              const Icon = eventIcons[evt.eventType] || Activity;
              const isExpanded = expandedId === evt.id;

              return (
                <div key={evt.id}>
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : evt.id)}
                    className={`w-full px-4 py-2.5 flex items-start gap-3 text-left transition-colors duration-150 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-inset
                      ${isFail ? "bg-red-500/5 hover:bg-red-500/10" : "hover:bg-muted/30"}
                      ${isExpanded ? (isFail ? "bg-red-500/10" : "bg-muted/30") : ""}
                    `}
                  >
                    <div className={`mt-0.5 p-1 rounded shrink-0 ${isFail ? "bg-red-500/15" : "bg-muted/30"}`}>
                      <Icon className={`h-3 w-3 ${isFail ? "text-red-500" : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground">
                        <span className={`font-medium ${isFail ? "text-red-600 dark:text-red-400" : ""}`}>
                          {eventLabel(evt.eventType)}
                        </span>
                        {evt.memberName && evt.memberId ? (
                          <span className="text-muted-foreground"> · </span>
                        ) : evt.memberName ? (
                          <span className="text-muted-foreground"> · {evt.memberName}</span>
                        ) : null}
                        {evt.memberName && evt.memberId && (
                          <Link href={`/members/${evt.memberId}`}>
                            <span className="text-primary hover:text-primary/80 hover:underline transition-colors" onClick={(e) => e.stopPropagation()}>
                              {evt.memberName}
                            </span>
                          </Link>
                        )}
                      </p>
                      {evt.sequenceName && (
                        <Link href="/retention">
                          <p className="text-[10px] text-primary/70 hover:text-primary hover:underline truncate transition-colors" onClick={(e) => e.stopPropagation()}>
                            {evt.sequenceName}
                          </p>
                        </Link>
                      )}
                      {isFail && evt.details && (
                        <p className="text-[10px] text-red-500 mt-0.5 truncate">{evt.details}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">{timeAgo(evt.createdAt)}</span>
                      <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
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
                        <div className="px-4 pb-3 pt-1 ml-7 space-y-1.5 border-l-2 border-border/50">
                          {evt.memberName && evt.memberId && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-muted-foreground w-14 shrink-0">Member</span>
                              <Link href={`/members/${evt.memberId}`}>
                                <span className="text-[11px] font-medium text-primary hover:text-primary/80 hover:underline inline-flex items-center gap-0.5 transition-colors">
                                  {evt.memberName}
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </span>
                              </Link>
                            </div>
                          )}
                          {evt.sequenceName && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-muted-foreground w-14 shrink-0">Sequence</span>
                              <Link href="/retention">
                                <span className="text-[11px] font-medium text-primary hover:text-primary/80 hover:underline inline-flex items-center gap-0.5 transition-colors">
                                  {evt.sequenceName}
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </span>
                              </Link>
                            </div>
                          )}
                          {evt.stepIndex != null && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-muted-foreground w-14 shrink-0">Step</span>
                              <span className="text-[11px] text-foreground">#{evt.stepIndex + 1}</span>
                            </div>
                          )}
                          {evt.details && (
                            <div className="flex items-start gap-1.5">
                              <span className="text-[10px] text-muted-foreground w-14 shrink-0">Details</span>
                              <span className={`text-[11px] ${isFail ? "text-red-500" : "text-foreground"}`}>
                                {evt.details}
                              </span>
                            </div>
                          )}
                          {evt.metadata && Object.keys(evt.metadata).length > 0 && (
                            <div className="flex items-start gap-1.5">
                              <span className="text-[10px] text-muted-foreground w-14 shrink-0">Info</span>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {Object.entries(evt.metadata).map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`).join(", ")}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground w-14 shrink-0">Time</span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(evt.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
