import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@clerk/react";

interface GymContextType {
  activeGymId: number | null;
  setActiveGymId: (id: number | null) => void;
  isGymLoading: boolean;
  onboardingComplete: boolean | null;
  isOnboardingLoading: boolean;
  onboardingFetchFailed: boolean;
  refreshOnboarding: () => void;
}

const GymContext = createContext<GymContextType | undefined>(undefined);

const STORAGE_KEY = "iron_metrics_active_gym";
const USER_KEY = "iron_metrics_user_id";

function isPreviewMode(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("preview") === "1") return true;
    return document.cookie.split(";").some((c) => c.trim() === "__dev_preview=1");
  } catch {
    return false;
  }
}

export function GymProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const [activeGymId, setActiveGymIdRaw] = useState<number | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseInt(saved, 10) : null;
  });

  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [isOnboardingLoading, setIsOnboardingLoading] = useState(false);
  const [onboardingFetchFailed, setOnboardingFetchFailed] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const preview = isPreviewMode();
  const shouldAutoFetch = preview || (isLoaded && isSignedIn);
  const [isGymLoading, setIsGymLoading] = useState(
    shouldAutoFetch && activeGymId === null,
  );

  const fetchOnboardingStatus = useCallback((gymId: number) => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setIsOnboardingLoading(true);
    setOnboardingFetchFailed(false);
    const headers: Record<string, string> = isPreviewMode() ? { "X-Preview": "1" } : {};
    fetch(`/api/gyms/${gymId}/onboarding`, { credentials: "include", headers, signal: controller.signal })
      .then((r) => {
        if (controller.signal.aborted) return null;
        if (!r.ok) {
          setOnboardingComplete(null);
          setOnboardingFetchFailed(true);
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        if (data) {
          setOnboardingComplete(data.isComplete === true);
        }
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (!controller.signal.aborted) {
          setOnboardingComplete(null);
          setOnboardingFetchFailed(true);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsOnboardingLoading(false);
        }
      });
  }, []);

  const refreshOnboarding = useCallback(() => {
    if (activeGymId) {
      fetchOnboardingStatus(activeGymId);
    }
  }, [activeGymId, fetchOnboardingStatus]);

  const setActiveGymId = useCallback((id: number | null) => {
    setActiveGymIdRaw(id);
    setOnboardingComplete(null);
    setOnboardingFetchFailed(false);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    const storedUser = localStorage.getItem(USER_KEY);
    if (userId) {
      if (storedUser && storedUser !== userId) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.setItem(USER_KEY, userId);
        setActiveGymId(null);
      } else if (!storedUser) {
        localStorage.setItem(USER_KEY, userId);
      }
    }
  }, [isLoaded, userId, setActiveGymId]);

  useEffect(() => {
    if (activeGymId) {
      localStorage.setItem(STORAGE_KEY, activeGymId.toString());
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [activeGymId]);

  useEffect(() => {
    if (activeGymId && shouldAutoFetch) {
      fetchOnboardingStatus(activeGymId);
    }
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [activeGymId, shouldAutoFetch, fetchOnboardingStatus]);

  useEffect(() => {
    if (activeGymId || !shouldAutoFetch) {
      setIsGymLoading(false);
      return;
    }

    setIsGymLoading(true);
    const headers: Record<string, string> = preview ? { "X-Preview": "1" } : {};
    fetch("/api/gyms", { credentials: "include", headers })
      .then((res) => (res.ok ? res.json() : []))
      .then((gyms: { id: number }[]) => {
        if (gyms.length > 0) {
          setActiveGymId(gyms[0].id);
        }
        setIsGymLoading(false);
      })
      .catch(() => {
        setIsGymLoading(false);
      });
  }, [activeGymId, shouldAutoFetch, preview, setActiveGymId]);

  return (
    <GymContext.Provider value={{
      activeGymId,
      setActiveGymId,
      isGymLoading,
      onboardingComplete,
      isOnboardingLoading,
      onboardingFetchFailed,
      refreshOnboarding,
    }}>
      {children}
    </GymContext.Provider>
  );
}

export function useGym() {
  const context = useContext(GymContext);
  if (context === undefined) {
    throw new Error("useGym must be used within a GymProvider");
  }
  return context;
}
