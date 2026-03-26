import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, ChevronDown, Phone, Mail, CreditCard, AlertCircle, Clock, DollarSign } from "lucide-react";
import { Link } from "wouter";

const API_BASE = import.meta.env.VITE_API_URL || "";

interface PayrollEntry {
  id: number;
  memberId: number;
  memberName: string;
  planName: string;
  status: string;
  amount: number;
  failedPayments: number;
  currentPeriodEnd: string | null;
  billingInterval: string | null;
  email: string | null;
  phone: string | null;
  category: "overdue" | "upcoming";
}

function StatusPill({ entry }: { entry: PayrollEntry }) {
  if (entry.category === "overdue") {
    return (
      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/15 text-red-400 border border-red-500/20">
        Late
      </span>
    );
  }
  if (entry.currentPeriodEnd) {
    const daysUntil = Math.ceil(
      (new Date(entry.currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntil <= 3) {
      return (
        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/20">
          Due Soon
        </span>
      );
    }
  }
  return (
    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
      Active
    </span>
  );
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function PayrollRow({ entry }: { entry: PayrollEntry }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`border-b border-border/50 last:border-b-0 ${entry.category === "overdue" ? "bg-red-500/[0.03]" : ""}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center gap-2 hover:bg-muted/30 transition-colors text-left group"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-foreground truncate">{entry.memberName}</span>
            <StatusPill entry={entry} />
          </div>
          <span className="text-[10px] text-muted-foreground">{entry.planName}</span>
        </div>
        <span className="text-xs font-semibold text-foreground whitespace-nowrap">${entry.amount.toFixed(0)}</span>
        <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
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
            <div className="px-3 pb-2.5 pt-0.5 grid grid-cols-2 gap-x-3 gap-y-1.5">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="text-[10px] text-muted-foreground">Due: {formatDate(entry.currentPeriodEnd)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <DollarSign className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="text-[10px] text-muted-foreground">${entry.amount.toFixed(2)}/{(entry.billingInterval || "mo").slice(0, 3)}</span>
              </div>
              {entry.email && (
                <div className="flex items-center gap-1.5 col-span-2">
                  <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                  <a href={`mailto:${entry.email}`} className="text-[10px] text-primary hover:underline truncate">{entry.email}</a>
                </div>
              )}
              {entry.phone && (
                <div className="flex items-center gap-1.5 col-span-2">
                  <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                  <a href={`tel:${entry.phone}`} className="text-[10px] text-primary hover:underline">{entry.phone}</a>
                </div>
              )}
              {entry.failedPayments > 0 && (
                <div className="flex items-center gap-1.5 col-span-2">
                  <AlertCircle className="h-3 w-3 text-red-400 shrink-0" />
                  <span className="text-[10px] text-red-400">{entry.failedPayments} failed attempt{entry.failedPayments !== 1 ? "s" : ""}</span>
                </div>
              )}
              <div className="col-span-2 pt-1">
                <Link href={`/members/${entry.memberId}`}>
                  <span className="text-[10px] text-primary hover:underline cursor-pointer">View member profile →</span>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function BillingPayrollCard({ gymId }: { gymId: number }) {
  const [data, setData] = useState<{ overdue: PayrollEntry[]; upcoming: PayrollEntry[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadData = () => {
    setLoading(true);
    setError(false);
    fetch(`${API_BASE}/api/gyms/${gymId}/dashboard/billing-payroll`, { credentials: "include" })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => setData(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [gymId]);

  const totalItems = (data?.overdue.length ?? 0) + (data?.upcoming.length ?? 0);

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm flex flex-col relative overflow-hidden h-full">
      <div className="px-4 pt-4 pb-2 flex items-start justify-between">
        <div>
          <h3 className="text-base md:text-lg font-semibold text-foreground flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            Billing Payroll
          </h3>
          <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">Payment status & upcoming dues</p>
        </div>
        <motion.div
          className="relative -mt-1 -mr-1"
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="h-9 w-9 bg-primary/15 rounded-lg flex items-center justify-center border border-primary/25 shadow-[0_0_12px_rgba(251,191,36,0.2)]">
            <Bot className="h-5 w-5 text-primary" />
          </div>
        </motion.div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0" style={{ maxHeight: "320px" }}>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <AlertCircle className="h-5 w-5 text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground">Couldn't load billing data</p>
            <button onClick={loadData} className="text-[10px] text-primary hover:underline mt-1">Retry</button>
          </div>
        ) : !data || totalItems === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <div className="h-10 w-10 bg-emerald-500/10 rounded-full flex items-center justify-center mb-2">
              <CreditCard className="h-5 w-5 text-emerald-400" />
            </div>
            <p className="text-xs font-medium text-foreground">All clear!</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">No overdue or upcoming payments</p>
          </div>
        ) : (
          <>
            {data.overdue.length > 0 && (
              <div>
                <div className="px-3 py-1.5 bg-red-500/5 border-y border-red-500/10">
                  <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">
                    Late / Failed ({data.overdue.length})
                  </span>
                </div>
                {data.overdue.map((entry) => (
                  <PayrollRow key={`o-${entry.id}`} entry={entry} />
                ))}
              </div>
            )}
            {data.upcoming.length > 0 && (
              <div>
                <div className="px-3 py-1.5 bg-muted/20 border-y border-border/50">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Upcoming ({data.upcoming.length})
                  </span>
                </div>
                {data.upcoming.map((entry) => (
                  <PayrollRow key={`u-${entry.id}`} entry={entry} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="px-3 py-2 border-t border-border/50 bg-muted/10">
        <Link href="/billing">
          <span className="text-[10px] text-primary hover:underline cursor-pointer font-medium">View full billing →</span>
        </Link>
      </div>
    </div>
  );
}
