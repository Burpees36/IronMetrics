import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { 
  Dumbbell, LayoutDashboard, BrainCircuit, Users, CalendarDays, 
  Target, CreditCard, ShoppingBag, Activity, MessagesSquare, 
  FileText, BarChart3, Bot, Settings, LogOut, Loader2
} from "lucide-react";
import { useGym } from "@/store/GymContext";
import { useGetGym } from "@workspace/api-client-react";
import { motion } from "framer-motion";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Intelligence", href: "/intelligence", icon: BrainCircuit },
  { name: "Members", href: "/members", icon: Users },
  { name: "Schedule", href: "/schedule", icon: CalendarDays },
  { name: "Leads", href: "/leads", icon: Target },
  { name: "Billing", href: "/billing", icon: CreditCard },
  { name: "Workouts", href: "/workouts", icon: Activity },
  { name: "AI Operator", href: "/ai-operator", icon: Bot },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { activeGymId } = useGym();
  
  const { data: gym, isLoading: gymLoading } = useGetGym(activeGymId as number, {
    query: { enabled: !!activeGymId }
  });

  if (!activeGymId) return <>{children}</>;

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-sidebar flex flex-col justify-between shrink-0">
        <div>
          <div className="h-16 flex items-center px-6 border-b border-border/50">
            <Link href="/dashboard" className="flex items-center gap-3 text-primary hover:opacity-80 transition-opacity">
              <Dumbbell className="h-6 w-6" />
              <span className="font-display font-bold text-xl tracking-tight text-foreground">
                IRON<span className="text-primary">METRICS</span>
              </span>
            </Link>
          </div>
          
          <div className="px-4 py-4">
            <div className="mb-6 px-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Active Gym</p>
              {gymLoading ? (
                <div className="h-6 w-32 bg-muted animate-pulse rounded" />
              ) : (
                <div className="flex items-center justify-between group cursor-pointer">
                  <span className="text-sm font-medium truncate">{gym?.name || "Select Gym"}</span>
                  <Link href="/select-gym" className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">Change</Link>
                </div>
              )}
            </div>

            <nav className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const isActive = location.startsWith(item.href);
                return (
                  <Link key={item.name} href={item.href} className="block">
                    <div className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                      ${isActive 
                        ? "bg-primary/10 text-primary font-medium" 
                        : "text-muted-foreground hover:bg-white/5 hover:text-foreground"}
                    `}>
                      <item.icon className={`h-5 w-5 ${isActive ? "text-primary" : ""}`} />
                      <span className="text-sm">{item.name}</span>
                      {isActive && (
                        <motion.div 
                          layoutId="sidebar-active" 
                          className="absolute left-0 w-1 h-8 bg-primary rounded-r-full" 
                        />
                      )}
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="p-4 border-t border-border/50">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
              {user?.firstName?.[0] || user?.email?.[0] || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user?.firstName || user?.email}</p>
              <p className="text-xs text-muted-foreground truncate">Admin</p>
            </div>
            <button onClick={() => logout()} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        {/* Subtle background glow */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="flex-1 overflow-y-auto p-6 md:p-8 z-10 custom-scrollbar">
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="max-w-7xl mx-auto h-full"
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
