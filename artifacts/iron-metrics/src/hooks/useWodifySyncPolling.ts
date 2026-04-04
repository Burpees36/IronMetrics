import { useState, useEffect, useRef, useCallback } from "react";

export interface SyncProgress {
  phase: "fetching-clients" | "fetching-memberships" | "processing" | "writing" | "complete" | "failed";
  currentPage?: number;
  totalItemsFetched?: number;
  processed?: number;
  totalToProcess?: number;
  created?: number;
  updated?: number;
  message: string;
}

export interface SyncStatusData {
  hasApiKey: boolean;
  maskedKey: string | null;
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
    triggeredBy: string | null;
    metadata?: {
      totalClients?: number;
      totalMemberships?: number;
      updated?: number;
      totalMrr?: number;
      progress?: SyncProgress;
    };
  } | null;
  recentSyncs: Array<{
    id: number;
    status: string;
    startedAt: string;
    completedAt: string | null;
    triggeredBy: string | null;
  }>;
}

export interface SyncResult {
  syncRunId: number;
  status: string;
  totalClients: number;
  totalMemberships: number;
  created: number;
  updated: number;
  skipped: number;
  errored: number;
  totalMrr: number;
}

interface UseWodifySyncPollingOptions {
  gymId: number | null;
  apiBase: string;
  enabled?: boolean;
}

interface UseWodifySyncPollingReturn {
  syncStatus: SyncStatusData | null;
  progress: SyncProgress | null;
  isSyncing: boolean;
  isComplete: boolean;
  isFailed: boolean;
  completedResult: SyncResult | null;
  startSync: () => Promise<{ syncRunId: number } | null>;
  refreshStatus: () => Promise<void>;
  elapsedSeconds: number;
}

export function useWodifySyncPolling({
  gymId,
  apiBase,
  enabled = true,
}: UseWodifySyncPollingOptions): UseWodifySyncPollingReturn {
  const [syncStatus, setSyncStatus] = useState<SyncStatusData | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [completedResult, setCompletedResult] = useState<SyncResult | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const pollFailuresRef = useRef(0);
  const MAX_POLL_FAILURES = 5;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchStatus = useCallback(async (): Promise<SyncStatusData | null> => {
    if (!gymId) return null;
    try {
      const resp = await fetch(`${apiBase}/api/gyms/${gymId}/integrations/wodify/sync-status`, {
        credentials: "include",
      });
      if (!resp.ok) return null;
      const data: SyncStatusData = await resp.json();
      if (mountedRef.current) setSyncStatus(data);
      return data;
    } catch {
      return null;
    }
  }, [gymId, apiBase]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (elapsedRef.current) {
      clearInterval(elapsedRef.current);
      elapsedRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    if (pollingRef.current) return;
    setElapsedSeconds(0);

    elapsedRef.current = setInterval(() => {
      if (mountedRef.current) {
        setElapsedSeconds((prev) => prev + 1);
      }
    }, 1000);

    pollFailuresRef.current = 0;
    pollingRef.current = setInterval(async () => {
      const data = await fetchStatus();
      if (!mountedRef.current) return;

      if (!data) {
        pollFailuresRef.current++;
        if (pollFailuresRef.current >= MAX_POLL_FAILURES) {
          stopPolling();
          setIsSyncing(false);
          setCompletedResult({
            syncRunId: 0,
            status: "failed",
            totalClients: 0,
            totalMemberships: 0,
            created: 0,
            updated: 0,
            skipped: 0,
            errored: 0,
            totalMrr: 0,
          });
        }
        return;
      }

      pollFailuresRef.current = 0;
      const latest = data.latestSync;
      if (latest && latest.status !== "running") {
        stopPolling();
        if (mountedRef.current) {
          setIsSyncing(false);
          const meta = latest.metadata;
          setCompletedResult({
            syncRunId: latest.id,
            status: latest.status,
            totalClients: meta?.totalClients ?? latest.totalRows ?? 0,
            totalMemberships: meta?.totalMemberships ?? 0,
            created: latest.created ?? 0,
            updated: meta?.updated ?? 0,
            skipped: latest.skipped ?? 0,
            errored: latest.errored ?? 0,
            totalMrr: meta?.totalMrr ?? 0,
          });
        }
      }
    }, 2000);
  }, [fetchStatus, stopPolling]);

  useEffect(() => {
    return stopPolling;
  }, [stopPolling]);

  useEffect(() => {
    if (!enabled || !gymId) {
      stopPolling();
      return;
    }
    fetchStatus().then((data) => {
      if (data?.latestSync?.status === "running" && mountedRef.current) {
        setIsSyncing(true);
        startPolling();
      }
    });
  }, [gymId, enabled, fetchStatus, startPolling, stopPolling]);

  const startSync = useCallback(async (): Promise<{ syncRunId: number } | null> => {
    if (!gymId) return null;
    setIsSyncing(true);
    setCompletedResult(null);
    try {
      const resp = await fetch(`${apiBase}/api/gyms/${gymId}/integrations/wodify/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await resp.json();
      if (resp.status === 409 && data.syncRunId) {
        startPolling();
        return { syncRunId: data.syncRunId };
      }
      if (!resp.ok) throw new Error(data.error || "Sync failed");
      startPolling();
      return { syncRunId: data.syncRunId };
    } catch (err) {
      setIsSyncing(false);
      throw err;
    }
  }, [gymId, apiBase, startPolling]);

  const progress = syncStatus?.latestSync?.status === "running"
    ? (syncStatus.latestSync.metadata?.progress as SyncProgress) ?? null
    : null;

  const isComplete = !!completedResult && completedResult.status !== "failed";
  const isFailed = !!completedResult && completedResult.status === "failed";

  return {
    syncStatus,
    progress,
    isSyncing,
    isComplete,
    isFailed,
    completedResult,
    startSync,
    refreshStatus: (async () => { await fetchStatus(); }) as () => Promise<void>,
    elapsedSeconds,
  };
}
