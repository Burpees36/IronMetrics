import React, { useEffect } from "react";
import { useListGyms, useCreateGym } from "@workspace/api-client-react";
import { useGym } from "@/store/GymContext";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Building2, Plus, Loader2, ArrowRight } from "lucide-react";
import { useAuth } from "@workspace/replit-auth-web";

export function GymSelect() {
  const [, setLocation] = useLocation();
  const { setActiveGymId } = useGym();
  const { logout } = useAuth();
  const { data: gyms, isLoading } = useListGyms();
  const createGym = useCreateGym();

  const handleSelect = (id: number) => {
    setActiveGymId(id);
    setLocation("/dashboard");
  };

  const handleCreateDemo = () => {
    createGym.mutate({
      data: {
        name: "Iron Forge Athletics",
        timezone: "America/Los_Angeles",
        city: "Seattle",
        state: "WA"
      }
    }, {
      onSuccess: (data) => {
        setActiveGymId(data.id);
        setLocation("/onboarding");
      }
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative bg-background p-4 md:p-6">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/10 rounded-full blur-[150px] pointer-events-none" />
      
      <div className="relative z-10 w-full max-w-4xl">
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-3 md:mb-4">Select Workspace</h1>
          <p className="text-muted-foreground text-base md:text-lg">Choose a gym to manage or create a new one.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {gyms?.map((gym, i) => (
            <motion.button
              key={gym.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => handleSelect(gym.id)}
              className="bg-card border border-border rounded-2xl p-5 md:p-6 cursor-pointer hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 group active:scale-[0.98] text-left w-full focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              aria-label={`Select ${gym.name}`}
            >
              <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 transition-transform">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-foreground mb-1 md:mb-2">{gym.name}</h3>
              <p className="text-sm text-muted-foreground mb-4 md:mb-6">{gym.city ? `${gym.city}, ${gym.state}` : "No location set"}</p>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{gym.activeCount} active members</span>
                <ArrowRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 duration-300" />
              </div>
            </motion.button>
          ))}

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: (gyms?.length || 0) * 0.1 }}
            onClick={handleCreateDemo}
            className="bg-background border-2 border-dashed border-border rounded-2xl p-5 md:p-6 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 min-h-[180px] md:min-h-[200px] active:scale-[0.98] w-full focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            aria-label="Create Demo Gym"
          >
            {createGym.isPending ? (
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            ) : (
              <>
                <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Plus className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Create Demo Gym</h3>
                <p className="text-sm text-muted-foreground mt-2 text-center">Instantly provision a workspace with sample data.</p>
              </>
            )}
          </motion.button>
        </div>
        
        <div className="mt-8 md:mt-12 text-center">
           <button onClick={() => logout()} className="text-muted-foreground hover:text-foreground text-sm min-h-[44px] px-4">Sign out</button>
        </div>
      </div>
    </div>
  );
}
