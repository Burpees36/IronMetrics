import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, XCircle, Clock, RefreshCw, ChevronDown, ChevronUp,
  FileSpreadsheet, AlertTriangle, Loader2
} from "lucide-react";
import { useGym } from "@/store/GymContext";
import { authFetch } from "@/lib/authFetch";

interface SyncRun {
  id: number;
  source: string;
  status: string;
  fileName: string | null;
  totalRows: number;
  created: number;
  skipped: number;
  errored: number;
  errorDetails: { rowIndex: number; error: string }[] | null;
  startedAt: string;
  completedAt: string | null;
  triggeredBy: string | null;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
    case "completed_with_errors":
      return <AlertTriangle className="h-4 w-4 text-amber-400" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-red-400" />;
    case "running":
      return <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "completed": return "Completed";
    case "completed_with_errors": return "Completed with errors";
    case "failed": return "Failed";
    case "running": return "Importing…";
    default: return status;
  }
}

function sourceLabel(source: string): string {
  return source === "wodify" ? "Wodify" : "CSV";
}

export function SyncStatusBanner({ onImport, memberCount }: { onImport: () => void; memberCount: number }) {
  const { activeGymId } = useGym();
  const [runs, setRuns] = useState<SyncRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  React.useEffect(() => {
    if (!activeGymId) return;
    let cancelled = false;
    async function load() {
      try {
        const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");
        const resp = await authFetch(`${apiBase}/api/gyms/${activeGymId}/sync-runs?limit=10`);
        if (!resp.ok) throw new Error("Failed to fetch");
        const data = await resp.json();
        if (!cancelled) setRuns(data.runs || []);
      } catch {
        if (!cancelled) setRuns([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [activeGymId]);

  if (loading) return null;

  const latest = runs[0];

  if (!latest && memberCount > 0) return null;

  if (!latest) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-2xl"
      >
        <div className="bg-card/60 border border-dashed border-border rounded-2xl p-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-3">
            <FileSpreadsheet className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-1">Import your member data</h3>
          <p className="text-xs text-muted-foreground mb-4 max-w-sm mx-auto">
            Get started by importing your members from a CSV file or Wodify export.
          </p>
          <button
            onClick={onImport}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Import Members
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl overflow-hidden"
    >
      <div className="w-full px-4 py-3 flex items-center gap-3">
        <StatusIcon status={latest.status} />
        <div
          className="flex-1 text-left min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => runs.length > 1 && setExpanded(!expanded)}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground truncate">
              Last import: {statusLabel(latest.status)}
            </span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">
              {latest.created} imported
              {latest.skipped > 0 && <>, {latest.skipped} skipped</>}
              {latest.errored > 0 && <>, <span className="text-red-400">{latest.errored} errors</span></>}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] text-muted-foreground">
              {sourceLabel(latest.source)} · {latest.fileName || "Upload"} · {timeAgo(latest.startedAt)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onImport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-medium hover:bg-primary/20 transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            New Import
          </button>
          {runs.length > 1 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 hover:bg-muted/30 rounded-lg transition-colors"
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {expanded && runs.length > 1 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border">
              <div className="px-4 py-2 bg-muted/20">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Import History</span>
              </div>
              <div className="divide-y divide-border">
                {runs.slice(1).map((run) => (
                  <div key={run.id} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                    <StatusIcon status={run.status} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-foreground">
                          {sourceLabel(run.source)}
                        </span>
                        {run.fileName && (
                          <span className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                            {run.fileName}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground tabular-nums">
                      <span className="text-emerald-400/80">{run.created} new</span>
                      {run.skipped > 0 && <span>{run.skipped} skip</span>}
                      {run.errored > 0 && <span className="text-red-400/80">{run.errored} err</span>}
                      <span className="w-16 text-right">{timeAgo(run.startedAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
