import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, AlertCircle, Loader2, Key, RefreshCw, Unlink, Users,
  ArrowRight, Zap, ExternalLink, RotateCcw, ShieldAlert
} from "lucide-react";
import { useGym } from "@/store/GymContext";
import { authFetch } from "@/lib/authFetch";
import { useToast } from "@/hooks/use-toast";
import { useWodifySyncPolling } from "@/hooks/useWodifySyncPolling";
import type { SyncProgress } from "@/hooks/useWodifySyncPolling";

type CardState = "loading" | "disconnected" | "entering-key" | "validating" | "validated" | "syncing" | "sync-complete" | "connected" | "error";

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

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function progressPercent(p: SyncProgress | null): number {
  if (!p) return 0;
  switch (p.phase) {
    case "fetching-clients": return 15;
    case "fetching-memberships": return 35;
    case "processing": return 55;
    case "writing": {
      if (p.totalToProcess && p.processed) {
        const pct = (p.processed / p.totalToProcess) * 40;
        return Math.min(55 + pct, 95);
      }
      return 65;
    }
    case "complete": return 100;
    case "failed": return 0;
    default: return 0;
  }
}

function SyncProgressBar({ progress, elapsed }: { progress: SyncProgress | null; elapsed: number }) {
  const pct = progressPercent(progress);
  const message = progress?.message || "Starting sync...";
  const showTimeout = elapsed > 120 && pct < 95;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Loader2 className="h-5 w-5 text-primary animate-spin shrink-0" />
        <p className="text-sm font-medium text-foreground flex-1">{message}</p>
      </div>
      <div className="w-full bg-muted/30 rounded-full h-2 overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{formatElapsed(elapsed)} elapsed</span>
        {progress?.processed && progress?.totalToProcess ? (
          <span>{progress.processed} / {progress.totalToProcess} members</span>
        ) : null}
      </div>
      {showTimeout && (
        <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
          <ShieldAlert className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-400">
            Sync is taking longer than expected. You can wait or close and check back later — it will continue in the background.
          </p>
        </div>
      )}
    </div>
  );
}

export function WodifyConnectionCard() {
  const { activeGymId } = useGym();
  const { toast } = useToast();

  const [state, setState] = useState<CardState>("loading");
  const [apiKey, setApiKey] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [clientCount, setClientCount] = useState(0);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [showResyncConfirm, setShowResyncConfirm] = useState(false);

  const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

  const {
    syncStatus,
    progress,
    isSyncing,
    isComplete,
    isFailed,
    completedResult,
    startSync,
    refreshStatus,
    elapsedSeconds,
  } = useWodifySyncPolling({
    gymId: activeGymId,
    apiBase,
    enabled: state !== "loading",
  });

  useEffect(() => {
    if (!activeGymId) return;
    authFetch(`${apiBase}/api/gyms/${activeGymId}/integrations/wodify/sync-status`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) { setState("disconnected"); return; }
        if (data.latestSync?.status === "running") {
          setState("syncing");
        } else if (data.hasApiKey) {
          setState("connected");
        } else {
          setState("disconnected");
        }
      })
      .catch(() => setState("disconnected"));
  }, [activeGymId, apiBase]);

  useEffect(() => {
    if (isSyncing && state !== "syncing") setState("syncing");
  }, [isSyncing]);

  useEffect(() => {
    if (isComplete && completedResult) {
      setState("sync-complete");
    } else if (isFailed) {
      setState("error");
      setErrorMsg("Sync failed. Please try again.");
    }
  }, [isComplete, isFailed, completedResult]);

  const handleValidate = async () => {
    if (!apiKey.trim() || !activeGymId) return;
    setState("validating");
    setErrorMsg("");
    try {
      const resp = await authFetch(`${apiBase}/api/gyms/${activeGymId}/integrations/wodify/validate-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Validation failed");
      if (!data.valid) {
        setState("error");
        setErrorMsg("Invalid API key. Please check your key and try again.");
        return;
      }
      setClientCount(data.clientCount || 0);
      setState("validated");
    } catch (err: any) {
      setState("error");
      setErrorMsg(err.message || "Failed to validate API key");
    }
  };

  const handleSync = async () => {
    if (!activeGymId) return;
    setState("syncing");
    setErrorMsg("");
    try {
      await startSync();
    } catch (err: any) {
      setState("error");
      setErrorMsg(err.message || "Sync failed");
    }
  };

  const handleResync = () => {
    setShowResyncConfirm(true);
  };

  const confirmResync = async () => {
    setShowResyncConfirm(false);
    await handleSync();
  };

  const handleDisconnect = async () => {
    if (!activeGymId) return;
    try {
      const resp = await authFetch(`${apiBase}/api/gyms/${activeGymId}/integrations/wodify/disconnect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!resp.ok) throw new Error("Failed to disconnect");
      toast({ title: "Wodify disconnected" });
      setShowDisconnectConfirm(false);
      setApiKey("");
      setState("disconnected");
    } catch {
      toast({ title: "Failed to disconnect", variant: "destructive" });
    }
  };

  const handleRetry = () => {
    setErrorMsg("");
    if (syncStatus?.hasApiKey) {
      handleSync();
    } else {
      setState("entering-key");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden"
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="font-semibold text-foreground">Wodify</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              {state === "connected" ? "Live API sync for members & memberships" : "Connect your Wodify account to sync member data"}
            </p>
          </div>
          {state === "loading" ? (
            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
          ) : state === "connected" || state === "sync-complete" ? (
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Connected
            </Badge>
          ) : state === "syncing" ? (
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Syncing
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20">
              <Zap className="h-3 w-3 mr-1" /> API Sync
            </Badge>
          )}
        </div>

        <AnimatePresence mode="wait">
          {state === "loading" && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-4 flex justify-center">
              <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
            </motion.div>
          )}

          {state === "disconnected" && (
            <motion.div key="disconnected" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <button
                onClick={() => setState("entering-key")}
                className="w-full px-4 py-2 text-sm font-medium rounded-xl border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
              >
                Connect
              </button>
            </motion.div>
          )}

          {(state === "entering-key") && (
            <motion.div key="entering" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Wodify API Key</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleValidate()}
                      placeholder="Paste your API key"
                      className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
                      autoFocus
                    />
                  </div>
                  <button
                    onClick={handleValidate}
                    disabled={!apiKey.trim()}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    Connect <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <button
                onClick={() => { setState("disconnected"); setApiKey(""); setErrorMsg(""); }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          )}

          {state === "error" && (
            <motion.div key="error" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
              <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2.5">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div className="text-xs flex-1">
                  <p className="text-destructive font-medium">{errorMsg}</p>
                  {!syncStatus?.hasApiKey && (
                    <a href="https://help.wodify.com/docs/api-access" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground flex items-center gap-1 mt-1">
                      Where to find your API key <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleRetry}
                  className="flex-1 px-4 py-2 text-sm font-medium rounded-xl border border-primary/30 text-primary hover:bg-primary/10 transition-colors flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> {syncStatus?.hasApiKey ? "Retry Sync" : "Try Again"}
                </button>
                <button
                  onClick={() => { setState(syncStatus?.hasApiKey ? "connected" : "disconnected"); setErrorMsg(""); }}
                  className="px-4 py-2 text-sm font-medium rounded-xl border border-border text-muted-foreground hover:bg-secondary transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          )}

          {state === "validating" && (
            <motion.div key="validating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-6 flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-sm font-medium text-foreground">Connecting to Wodify...</p>
              <p className="text-xs text-muted-foreground">Verifying your API key</p>
            </motion.div>
          )}

          {state === "validated" && (
            <motion.div key="validated" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3">
                <div className="h-10 w-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-emerald-400">Connected to Wodify</p>
                  <p className="text-xs text-muted-foreground">Found {clientCount} clients on first page</p>
                </div>
              </div>
              <button
                onClick={handleSync}
                className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Sync Members Now
              </button>
            </motion.div>
          )}

          {state === "syncing" && (
            <motion.div key="syncing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-4">
              <SyncProgressBar progress={progress} elapsed={elapsedSeconds} />
            </motion.div>
          )}

          {state === "sync-complete" && completedResult && (
            <motion.div key="complete" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <p className="text-sm font-semibold text-emerald-400">Sync Complete</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center">
                    <p className="text-lg font-bold text-foreground">{completedResult.totalClients}</p>
                    <p className="text-[10px] text-muted-foreground">Total Members</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-foreground">${completedResult.totalMrr.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">Monthly Revenue</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-2 pt-2 border-t border-emerald-500/10">
                  <div className="text-center">
                    <p className="text-sm font-semibold text-foreground">{completedResult.created}</p>
                    <p className="text-[10px] text-muted-foreground">New</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-foreground">{completedResult.updated}</p>
                    <p className="text-[10px] text-muted-foreground">Updated</p>
                  </div>
                </div>
                {completedResult.errored > 0 && (
                  <p className="text-xs text-amber-400 mt-2">{completedResult.errored} records had errors</p>
                )}
              </div>
              <button
                onClick={() => { setState("connected"); refreshStatus(); }}
                className="w-full px-4 py-2 text-sm font-medium rounded-xl border border-border text-muted-foreground hover:bg-secondary transition-colors"
              >
                Done
              </button>
            </motion.div>
          )}

          {state === "connected" && (
            <motion.div key="connected" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              {syncStatus?.latestSync && (
                <div className="bg-muted/20 rounded-xl px-3 py-2.5 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium text-foreground">{syncStatus.latestSync.metadata?.totalClients ?? syncStatus.latestSync.totalRows} members</span>
                    </div>
                    {(syncStatus.latestSync.metadata?.totalMrr ?? 0) > 0 && (
                      <span className="font-medium text-emerald-500">${(syncStatus.latestSync.metadata!.totalMrr as number).toLocaleString()}/mo</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground flex-wrap">
                    <span>Last sync: {timeAgo(syncStatus.latestSync.completedAt || syncStatus.latestSync.startedAt)}</span>
                    <span>·</span>
                    <span>{syncStatus.latestSync.created} new, {syncStatus.latestSync.metadata?.updated ?? 0} updated</span>
                    {syncStatus.latestSync.triggeredBy && (
                      <>
                        <span>·</span>
                        <span className={syncStatus.latestSync.triggeredBy === "auto" ? "text-blue-400" : ""}>
                          {syncStatus.latestSync.triggeredBy === "auto" ? "Auto sync" : "Manual sync"}
                        </span>
                      </>
                    )}
                  </div>
                  {syncStatus.maskedKey && (
                    <div className="flex items-center gap-1 text-muted-foreground/70">
                      <Key className="h-3 w-3" /> API key: {syncStatus.maskedKey}
                    </div>
                  )}
                </div>
              )}

              {syncStatus?.recentSyncs && syncStatus.recentSyncs.length > 1 && (
                <div className="border border-border/50 rounded-xl overflow-hidden">
                  <div className="px-3 py-1.5 bg-muted/30 border-b border-border/50">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Sync History</span>
                  </div>
                  <div className="divide-y divide-border/30">
                    {syncStatus.recentSyncs.slice(0, 5).map((run) => (
                      <div key={run.id} className="px-3 py-1.5 flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                            run.status === "completed" ? "bg-emerald-400" :
                            run.status === "running" ? "bg-blue-400 animate-pulse" :
                            "bg-red-400"
                          }`} />
                          <span className="text-muted-foreground">
                            {timeAgo(run.completedAt || run.startedAt)}
                          </span>
                        </div>
                        <span className={`font-medium ${
                          run.triggeredBy === "auto" ? "text-blue-400" : "text-muted-foreground"
                        }`}>
                          {run.triggeredBy === "auto" ? "Auto" : "Manual"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {showResyncConfirm ? (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 space-y-2">
                  <p className="text-xs text-foreground font-medium">Re-sync all members from Wodify?</p>
                  <p className="text-[11px] text-muted-foreground">New members will be added, existing members will be updated with the latest data from Wodify.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={confirmResync}
                      className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      Yes, Re-sync
                    </button>
                    <button
                      onClick={() => setShowResyncConfirm(false)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-muted-foreground hover:bg-secondary transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              ) : showDisconnectConfirm ? (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 space-y-2">
                  <p className="text-xs text-foreground font-medium">Disconnect Wodify?</p>
                  <p className="text-[11px] text-muted-foreground">Your synced member data will be kept, but you'll need to re-enter your API key to reconnect.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDisconnect}
                      className="flex-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                    >
                      Disconnect
                    </button>
                    <button
                      onClick={() => setShowDisconnectConfirm(false)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-muted-foreground hover:bg-secondary transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleResync}
                    className="flex-1 px-4 py-2 text-sm font-medium rounded-xl border border-primary/30 text-primary hover:bg-primary/10 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Re-sync
                  </button>
                  <button
                    onClick={() => setShowDisconnectConfirm(true)}
                    className="px-4 py-2 text-sm font-medium rounded-xl border border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-colors flex items-center gap-1.5"
                  >
                    <Unlink className="h-3.5 w-3.5" /> Disconnect
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
