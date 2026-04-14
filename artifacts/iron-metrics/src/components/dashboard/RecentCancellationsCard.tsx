import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { UserMinus, ChevronDown, Mail, Phone, AlertCircle } from "lucide-react";
import { Link } from "wouter";

import { authFetch } from "@/lib/authFetch";

const API_BASE = import.meta.env.VITE_API_URL || "";

interface CancellationEntry {
  subscriptionId: number;
  memberId: number;
  memberName: string;
  planName: string;
  amount: number;
  cancelledAt: string | null;
  cancelReason: string | null;
  email: string | null;
  phone: string | null;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function daysAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function CancellationRow({ entry }: { entry: CancellationEntry }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-border/50 last:border-b-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-muted/30 transition-colors text-left"
      >
        <div className="h-7 w-7 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
          <UserMinus className="h-3.5 w-3.5 text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-foreground truncate">{entry.memberName}</span>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">{daysAgo(entry.cancelledAt)}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-muted-foreground">{entry.planName}</span>
            <span className="text-[10px] text-red-400">-${entry.amount.toFixed(0)}/mo</span>
            {entry.cancelReason && (
              <span className="text-[10px] text-muted-foreground/70 truncate max-w-[120px]">· {entry.cancelReason}</span>
            )}
          </div>
        </div>
        <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform shrink-0 ${expanded ? "rotate-180" : ""}`} />
      </button>
      {expanded && (
        <div className="px-4 pb-2.5 pl-[52px] space-y-1">
          <p className="text-[10px] text-muted-foreground">
            Cancelled: {formatDate(entry.cancelledAt)}
          </p>
          {entry.cancelReason && (
            <p className="text-[10px] text-muted-foreground">
              Reason: <span className="text-foreground">{entry.cancelReason}</span>
            </p>
          )}
          {entry.email && (
            <div className="flex items-center gap-1.5">
              <Mail className="h-3 w-3 text-muted-foreground" />
              <a href={`mailto:${entry.email}`} className="text-[10px] text-primary hover:underline truncate">{entry.email}</a>
            </div>
          )}
          {entry.phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="h-3 w-3 text-muted-foreground" />
              <a href={`tel:${entry.phone}`} className="text-[10px] text-primary hover:underline">{entry.phone}</a>
            </div>
          )}
          <Link href={`/members/${entry.memberId}`}>
            <span className="text-[10px] text-primary hover:underline cursor-pointer">View profile →</span>
          </Link>
        </div>
      )}
    </div>
  );
}

export function RecentCancellationsCard({ gymId }: { gymId: number }) {
  const [data, setData] = useState<{ cancellations: CancellationEntry[]; count: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadData = () => {
    setLoading(true);
    setError(false);
    authFetch(`${API_BASE}/api/gyms/${gymId}/dashboard/recent-cancellations`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => setData(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [gymId]);

  if (loading) return null;
  if (error) {
    return (
      <div className="bg-card border border-border rounded-2xl shadow-sm p-4 flex items-center gap-3">
        <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-xs text-muted-foreground">Couldn't load cancellation data</span>
        <button onClick={loadData} className="text-[10px] text-primary hover:underline ml-auto">Retry</button>
      </div>
    );
  }
  if (!data || data.count === 0) return null;

  const lostRevenue = data.cancellations.reduce((sum, c) => sum + c.amount, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden"
    >
      <div className="px-4 py-3 flex items-center justify-between border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-red-500/10 flex items-center justify-center">
            <UserMinus className="h-4 w-4 text-red-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              Recent Cancellations
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/15 text-red-400 border border-red-500/20">
                {data.count}
              </span>
            </h3>
            <p className="text-[10px] text-muted-foreground">Last 30 days</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-red-400">-${lostRevenue.toFixed(0)}</p>
          <p className="text-[10px] text-muted-foreground">lost MRR</p>
        </div>
      </div>

      <div className="max-h-[250px] overflow-y-auto">
        {data.cancellations.map((entry) => (
          <CancellationRow key={entry.subscriptionId} entry={entry} />
        ))}
      </div>

      <div className="px-4 py-2 border-t border-border/50 bg-muted/10 flex items-center justify-between">
        <Link href="/billing">
          <span className="text-[10px] text-primary hover:underline cursor-pointer font-medium">View all in billing →</span>
        </Link>
        <Link href="/intelligence">
          <span className="text-[10px] text-primary hover:underline cursor-pointer font-medium">Retention insights →</span>
        </Link>
      </div>
    </motion.div>
  );
}
