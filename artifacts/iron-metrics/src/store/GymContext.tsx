import React, { createContext, useContext, useState, useEffect } from "react";

interface GymContextType {
  activeGymId: number | null;
  setActiveGymId: (id: number | null) => void;
  isGymLoading: boolean;
}

const GymContext = createContext<GymContextType | undefined>(undefined);

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
  const [activeGymId, setActiveGymId] = useState<number | null>(() => {
    const saved = localStorage.getItem("iron_metrics_active_gym");
    return saved ? parseInt(saved, 10) : null;
  });

  const preview = isPreviewMode();
  const [isGymLoading, setIsGymLoading] = useState(
    preview && activeGymId === null,
  );

  useEffect(() => {
    if (activeGymId) {
      localStorage.setItem("iron_metrics_active_gym", activeGymId.toString());
    } else {
      localStorage.removeItem("iron_metrics_active_gym");
    }
  }, [activeGymId]);

  useEffect(() => {
    if (activeGymId || !preview) {
      setIsGymLoading(false);
      return;
    }

    setIsGymLoading(true);
    const headers: Record<string, string> = { "X-Preview": "1" };
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
  }, [activeGymId, preview]);

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
