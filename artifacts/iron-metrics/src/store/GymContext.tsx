import React, { createContext, useContext, useState, useEffect } from "react";

interface GymContextType {
  activeGymId: number | null;
  setActiveGymId: (id: number | null) => void;
}

const GymContext = createContext<GymContextType | undefined>(undefined);

export function GymProvider({ children }: { children: React.ReactNode }) {
  const [activeGymId, setActiveGymId] = useState<number | null>(() => {
    const saved = localStorage.getItem("iron_metrics_active_gym");
    return saved ? parseInt(saved, 10) : null;
  });

  useEffect(() => {
    if (activeGymId) {
      localStorage.setItem("iron_metrics_active_gym", activeGymId.toString());
    } else {
      localStorage.removeItem("iron_metrics_active_gym");
    }
  }, [activeGymId]);

  return (
    <GymContext.Provider value={{ activeGymId, setActiveGymId }}>
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
