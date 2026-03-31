import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Activity, ChevronRight, Mail, ClipboardList, UserCheck, Loader2, Zap } from "lucide-react";
import { Link } from "wouter";

const API_BASE = import.meta.env.VITE_API_URL || "";

interface RetentionEvent {
  id: number;
  eventType: string;
  sequenceName?: string;
  memberName?: string;
  createdAt: string;
}

interface EnrollmentSummary {
  active: number;
  completed: number;
}

const eventIcons: Record<string, React.ElementType> = {
  email_sent: Mail,
  task_created: ClipboardList,
  enrolled: UserCheck,
  step_advanced: Zap,
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
    case "task_created": return "Task created";
    case "enrolled": return "Member enrolled";
    case "step_advanced": return "Step advanced";
    case "completed": return "Sequence completed";
    case "exited": return "Exited sequence";
    default: return type.replace(/_/g, " ");
  }
}

export function RetentionActivityCard({ gymId }: { gymId: number }) {
  const [events, setEvents] = useState<RetentionEvent[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentSummary>({ active: 0, completed: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventsRes, enrollRes] = await Promise.all([
          fetch(`${API_BASE}/api/gyms/${gymId}/retention/events?limit=6`, { credentials: "include" }),
          fetch(`${API_BASE}/api/gyms/${gymId}/retention/enrollments?status=active`, { credentials: "include" }),
        ]);

        if (eventsRes.ok) {
          const evData = await eventsRes.json();
          setEvents(Array.isArray(evData) ? evData.slice(0, 6) : []);
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
            {enrollments.active > 0 && (
              <p className="text-[10px] text-muted-foreground">{enrollments.active} active enrollment{enrollments.active !== 1 ? "s" : ""}</p>
            )}
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
            <p className="text-xs font-medium text-foreground">No activity yet</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Retention sequences will log events here</p>
            <Link href="/retention">
              <span className="text-[10px] text-primary hover:underline mt-2 inline-block">Set up sequences →</span>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {events.map((evt) => {
              const Icon = eventIcons[evt.eventType] || Activity;
              return (
                <div key={evt.id} className="px-4 py-2.5 flex items-start gap-3">
                  <div className="mt-0.5 p-1 rounded bg-muted/30 shrink-0">
                    <Icon className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground">
                      <span className="font-medium">{eventLabel(evt.eventType)}</span>
                      {evt.memberName && <span className="text-muted-foreground"> · {evt.memberName}</span>}
                    </p>
                    {evt.sequenceName && (
                      <p className="text-[10px] text-muted-foreground truncate">{evt.sequenceName}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">{timeAgo(evt.createdAt)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
