import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { useAuth } from "@clerk/react";

interface GymContextType {
  activeGymId: number | null;
  setActiveGymId: (id: number | null) => void;
  isGymLoading: boolean;
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
  const prevUserId = useRef<string | null | undefined>(undefined);
  const [activeGymId, setActiveGymId] = useState<number | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseInt(saved, 10) : null;
  });

  const preview = isPreviewMode();
  const shouldAutoFetch = preview || (isLoaded && isSignedIn);
  const [isGymLoading, setIsGymLoading] = useState(
    shouldAutoFetch && activeGymId === null,
  );

  useEffect(() => {
    if (!isLoaded) return;
    const previousId = prevUserId.current;
    prevUserId.current = userId ?? null;
    if (previousId === undefined) {
      const storedUser = localStorage.getItem(USER_KEY);
      if (userId && storedUser && storedUser !== userId) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.setItem(USER_KEY, userId);
        setActiveGymId(null);
        return;
      }
      if (userId) {
        localStorage.setItem(USER_KEY, userId);
      }
      return;
    }
    if (previousId !== (userId ?? null)) {
      localStorage.removeItem(STORAGE_KEY);
      if (userId) {
        localStorage.setItem(USER_KEY, userId);
      } else {
        localStorage.removeItem(USER_KEY);
      }
      setActiveGymId(null);
    }
  }, [isLoaded, userId]);

  useEffect(() => {
    if (activeGymId) {
      localStorage.setItem(STORAGE_KEY, activeGymId.toString());
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [activeGymId]);

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
  }, [activeGymId, shouldAutoFetch, preview]);

  return (
    <GymContext.Provider value={{ activeGymId, setActiveGymId, isGymLoading }}>
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
