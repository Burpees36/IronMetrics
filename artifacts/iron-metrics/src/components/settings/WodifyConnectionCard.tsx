import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, AlertCircle, Loader2, Key, RefreshCw, Unlink, Users,
  DollarSign, ArrowRight, Zap, ExternalLink
} from "lucide-react";
import { useGym } from "@/store/GymContext";
import { useToast } from "@/hooks/use-toast";

interface SyncStatus {
  hasApiKey: boolean;
  latestSync: {
    id: number;
    status: string;
    totalRows: number;
    created: number;
    updated?: number;
    skipped: number;
    errored: number;
    startedAt: string;
    completedAt: string | null;
    metadata?: { totalClients?: number; totalMemberships?: number; updated?: number };
  } | null;
}

interface SyncResult {
  syncRunId: number;
  status: string;
  totalClients: number;
  totalMemberships: number;
  created: number;
  updated: number;
  skipped: number;
  errored: number;
}

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

export function WodifyConnectionCard() {
  const { activeGymId } = useGym();
  const { toast } = useToast();

  const [state, setState] = useState<CardState>("loading");
  const [apiKey, setApiKey] = useState("");
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [clientCount, setClientCount] = useState(0);

  const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

  const fetchStatus = useCallback(async () => {
    if (!activeGymId) return;
    try {
      const resp = await fetch(`${apiBase}/api/gyms/${activeGymId}/integrations/wodify/sync-status`, {
        credentials: "include",
      });
      if (!resp.ok) return;
      const data: SyncStatus = await resp.json();
      setSyncStatus(data);
      setState(data.hasApiKey ? "connected" : "disconnected");
    } catch {
      setState("disconnected");
    }
  }, [activeGymId, apiBase]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handleValidate = async () => {
    if (!apiKey.trim() || !activeGymId) return;
    setState("validating");
    setErrorMsg("");
    try {
      const resp = await fetch(`${apiBase}/api/gyms/${activeGymId}/integrations/wodify/validate-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
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
    try {
      const resp = await fetch(`${apiBase}/api/gyms/${activeGymId}/integrations/wodify/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Sync failed");
      setSyncResult(data);
      setState("sync-complete");
      await fetchStatus();
    } catch (err: any) {
      setState("error");
      setErrorMsg(err.message || "Sync failed");
    }
  };

  const handleDisconnect = async () => {
    if (!activeGymId) return;
    try {
      const resp = await fetch(`${apiBase}/api/gyms/${activeGymId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ wodifyApiKey: null }),
      });
      if (!resp.ok) throw new Error("Failed to disconnect");
      toast({ title: "Wodify disconnected" });
      setSyncStatus(null);
      setSyncResult(null);
      setApiKey("");
      setState("disconnected");
    } catch {
      toast({ title: "Failed to disconnect", variant: "destructive" });
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
          ) : state === "connected" ? (
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Connected
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

          {(state === "entering-key" || state === "error") && (
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

              {errorMsg && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2.5">
                  <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="text-destructive font-medium">{errorMsg}</p>
                    <a href="https://help.wodify.com/docs/api-access" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground flex items-center gap-1 mt-1">
                      Where to find your API key <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </motion.div>
              )}

              <button
                onClick={() => { setState("disconnected"); setApiKey(""); setErrorMsg(""); }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
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
            <motion.div key="syncing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-6 flex flex-col items-center gap-3">
              <div className="relative">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
              </div>
              <p className="text-sm font-medium text-foreground">Syncing your data...</p>
              <div className="text-xs text-muted-foreground space-y-1 text-center">
                <p>Fetching members and memberships from Wodify</p>
                <p>This may take a minute for large gyms</p>
              </div>
            </motion.div>
          )}

          {state === "sync-complete" && syncResult && (
            <motion.div key="complete" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <p className="text-sm font-semibold text-emerald-400">Sync Complete</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <p className="text-lg font-bold text-foreground">{syncResult.created}</p>
                    <p className="text-[10px] text-muted-foreground">New Members</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-foreground">{syncResult.updated}</p>
                    <p className="text-[10px] text-muted-foreground">Updated</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-foreground">{syncResult.totalClients}</p>
                    <p className="text-[10px] text-muted-foreground">Total Clients</p>
                  </div>
                </div>
                {syncResult.errored > 0 && (
                  <p className="text-xs text-amber-400 mt-2">{syncResult.errored} records had errors</p>
                )}
              </div>
              <button
                onClick={() => { setState("connected"); fetchStatus(); }}
                className="w-full px-4 py-2 text-sm font-medium rounded-xl border border-border text-muted-foreground hover:bg-secondary transition-colors"
              >
                Done
              </button>
            </motion.div>
          )}

          {state === "connected" && (
            <motion.div key="connected" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              {syncStatus?.latestSync && (
                <div className="bg-muted/20 rounded-xl px-3 py-2.5 flex items-center gap-3 text-xs">
                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Last sync:</span>
                      <span className="font-medium text-foreground">{timeAgo(syncStatus.latestSync.completedAt || syncStatus.latestSync.startedAt)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {syncStatus.latestSync.created} created</span>
                      {(syncStatus.latestSync.metadata?.updated ?? 0) > 0 && (
                        <span>{syncStatus.latestSync.metadata!.updated} updated</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleSync}
                  className="flex-1 px-4 py-2 text-sm font-medium rounded-xl border border-primary/30 text-primary hover:bg-primary/10 transition-colors flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Re-sync
                </button>
                <button
                  onClick={handleDisconnect}
                  className="px-4 py-2 text-sm font-medium rounded-xl border border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-colors flex items-center gap-1.5"
                >
                  <Unlink className="h-3.5 w-3.5" /> Disconnect
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
