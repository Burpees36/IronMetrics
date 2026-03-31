import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { RefreshCw, CheckCircle2, AlertCircle, Clock, Database } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "";

interface SyncStatus {
  hasApiKey: boolean;
  maskedKey?: string;
  latestSync?: {
    id: number;
    status: string;
    totalRows: number;
    created: number;
    updated: number;
    skipped: number;
    startedAt: string;
    completedAt: string | null;
    metadata?: { progress?: { message?: string } };
  };
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
      .then(() => {
        setTimeout(() => { load(); setSyncing(false); }, 3000);
      })
      .catch(() => setSyncing(false));
  };

  if (!data || !data.hasApiKey) return null;

  const latest = data.latestSync;
  const isHealthy = latest?.status === "completed";
  const isFailed = latest?.status === "failed" || latest?.status === "completed_with_errors";
  const isRunning = latest?.status === "running";

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-xs ${
        isFailed
          ? "bg-red-500/5 border-red-500/20"
          : isRunning || syncing
          ? "bg-blue-500/5 border-blue-500/20"
          : "bg-emerald-500/5 border-emerald-500/20"
      }`}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Database className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="font-medium text-foreground whitespace-nowrap">Wodify Sync</span>

        {isRunning || syncing ? (
          <span className="flex items-center gap-1.5 text-blue-400">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Syncing…
          </span>
        ) : isHealthy && latest ? (
          <span className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            Healthy
          </span>
        ) : isFailed ? (
          <span className="flex items-center gap-1.5 text-red-400">
            <AlertCircle className="h-3 w-3" />
            Last sync had errors
          </span>
        ) : (
          <span className="text-muted-foreground">No syncs yet</span>
        )}

        {latest?.completedAt && (
          <span className="text-muted-foreground hidden sm:inline flex items-center gap-1">
            <Clock className="h-3 w-3 inline" />
            {timeAgo(latest.completedAt)}
          </span>
        )}

        {latest && isHealthy && (
          <span className="text-muted-foreground hidden md:inline">
            · {latest.totalRows} members
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
