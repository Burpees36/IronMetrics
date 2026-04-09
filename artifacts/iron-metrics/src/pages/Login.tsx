import React from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { ForgeOSLogo } from "@/components/brand/ForgeOSLogo";

export function Login() {
  const { login, isLoading } = useAuth();

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative bg-background overflow-hidden p-4">
      <div className="absolute inset-0 z-0">
        <img 
          src={`${import.meta.env.BASE_URL}images/auth-bg.png`} 
          alt="Abstract Luxury Fitness" 
          className="w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/95 to-background" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md p-6 sm:p-10 glass-panel rounded-3xl text-center"
      >
        <div className="flex justify-center mb-6 sm:mb-8">
          <ForgeOSLogo size="xl" variant="icon" />
        </div>
        
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground tracking-tight mb-2">
          FORGE<span className="text-orange-500">OS</span>
        </h1>
        <p className="text-muted-foreground mb-8 sm:mb-10 text-base sm:text-lg">
          The operating system for modern fitness businesses.
        </p>

        <button
          onClick={() => login()}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-semibold text-base sm:text-lg bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed min-h-[52px]"
        >
          {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : "Access Platform"}
        </button>
      </motion.div>
    </div>
  );
}
