import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { RefreshCw, CheckCircle2, AlertCircle, Clock, Database, AlertTriangle } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "";

interface SyncRun {
  id: number;
  status: string;
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  startedAt: string;
  completedAt: string | null;
  triggeredBy: string | null;
  metadata?: { progress?: { message?: string } };
}

interface SyncStatus {
  hasApiKey: boolean;
  maskedKey?: string;
  latestSync?: SyncRun;
  recentSyncs?: SyncRun[];
}

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

function hoursAgo(dateStr: string): number {
  return (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60);
}

export function SyncHealthBanner({ gymId }: { gymId: number }) {
  const [data, setData] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(() => {
    fetch(`${API_BASE}/api/gyms/${gymId}/integrations/wodify/sync-status`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setData(d); })
      .catch(() => {});
  }, [gymId]);

  useEffect(() => { load(); }, [load]);

  const triggerSync = () => {
    setSyncing(true);
    fetch(`${API_BASE}/api/gyms/${gymId}/integrations/wodify/sync`, {
      method: "POST",
      credentials: "include",
    })
      .then((r) => {
        if (r.status === 409) {
          load();
          setSyncing(false);
          return;
        }
        setTimeout(() => { load(); setSyncing(false); }, 3000);
      })
      .catch(() => setSyncing(false));
  };

  if (!data || !data.hasApiKey) return null;

  const latest = data.latestSync;
  const isRunning = latest?.status === "running";
  const isFailed = latest?.status === "failed" || latest?.status === "completed_with_errors";

  const lastCompletedSync = data.recentSyncs?.find(
    (s) => s.status === "completed" || s.status === "completed_with_errors"
  );

  const freshnessDate = lastCompletedSync?.completedAt || lastCompletedSync?.startedAt;
  const hours = freshnessDate ? hoursAgo(freshnessDate) : Infinity;
  const isStale = hours > 8;
  const isWarning = isFailed || isStale;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-xs ${
        isWarning
          ? "bg-amber-500/5 border-amber-500/20"
          : isRunning || syncing
          ? "bg-blue-500/5 border-blue-500/20"
          : "bg-emerald-500/5 border-emerald-500/20"
      }`}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
        <Database className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="font-medium text-foreground whitespace-nowrap">Wodify Sync</span>

        {isRunning || syncing ? (
          <span className="flex items-center gap-1.5 text-blue-400">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Syncing…
          </span>
        ) : isFailed ? (
          <span className="flex items-center gap-1.5 text-red-400">
            <AlertCircle className="h-3 w-3" />
            Last sync had errors
          </span>
        ) : isStale ? (
          <span className="flex items-center gap-1.5 text-amber-400">
            <AlertTriangle className="h-3 w-3" />
            Data may be stale
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            Healthy
          </span>
        )}

        {freshnessDate && (
          <span className={`hidden sm:inline flex items-center gap-1 ${isWarning ? "text-amber-400" : "text-muted-foreground"}`}>
            <Clock className="h-3 w-3 inline" />
            Last synced {timeAgo(freshnessDate)}
          </span>
        )}

        {!freshnessDate && !isRunning && (
          <span className="text-muted-foreground hidden sm:inline">No syncs yet</span>
        )}

        {lastCompletedSync && !isWarning && (
          <span className="text-muted-foreground hidden md:inline">
            · {lastCompletedSync.totalRows} members
          </span>
        )}
      </div>

      <button
        onClick={triggerSync}
        disabled={syncing || isRunning}
        className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-card border border-border text-xs font-medium text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
      >
        <RefreshCw className={`h-3 w-3 ${syncing || isRunning ? "animate-spin" : ""}`} />
        Re-sync
      </button>
    </motion.div>
  );
}
