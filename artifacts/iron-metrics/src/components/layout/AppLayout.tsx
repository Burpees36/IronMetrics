import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { 
  Dumbbell, LayoutDashboard, BrainCircuit, Users, CalendarDays, 
  Target, CreditCard, Activity, Bot, LogOut, Loader2, Menu, X, BookOpen,
  ShoppingBag, MessagesSquare, FileText, BarChart3, Settings, Sun, Moon
} from "lucide-react";
import { useGym } from "@/store/GymContext";
import { useTheme } from "@/store/ThemeContext";
import { useGetGym } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Intelligence", href: "/intelligence", icon: BrainCircuit },
  { name: "Members", href: "/members", icon: Users },
  { name: "Schedule", href: "/schedule", icon: CalendarDays },
  { name: "Leads", href: "/leads", icon: Target },
  { name: "Billing", href: "/billing", icon: CreditCard },
  { name: "Workouts", href: "/workouts", icon: Activity },
  { name: "AI Operator", href: "/ai-operator", icon: Bot },
  { name: "Resources", href: "/resources", icon: BookOpen },
  { name: "Settings", href: "/settings", icon: Settings },
];

const BOTTOM_NAV_ITEMS = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Intel", href: "/intelligence", icon: BrainCircuit },
  { name: "Members", href: "/members", icon: Users },
  { name: "Schedule", href: "/schedule", icon: CalendarDays },
  { name: "AI", href: "/ai-operator", icon: Bot },
];

function ThemeToggleButton({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors ${className}`}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

function SidebarContent({ location, gym, gymLoading, user, logout, onNavigate }: {
  location: string;
  gym: any;
  gymLoading: boolean;
  user: any;
  logout: () => void;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex flex-col h-full justify-between">
      <div>
        <div className="px-4 py-4">
          <div className="mb-6 px-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Active Gym</p>
            {gymLoading ? (
              <div className="h-6 w-32 bg-muted animate-pulse rounded" />
            ) : (
              <div className="flex items-center justify-between group cursor-pointer">
                <span className="text-sm font-medium truncate">{gym?.name || "Select Gym"}</span>
                <Link href="/select-gym" onClick={onNavigate} className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">Change</Link>
              </div>
            )}
          </div>

          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = location.startsWith(item.href);
              return (
                <Link key={item.name} href={item.href} className="block" onClick={onNavigate}>
                  <div className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                    ${isActive 
                      ? "bg-primary/10 text-primary font-medium" 
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"}
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

      <div className="p-4 border-t border-border/50 space-y-2">
        <div className="flex items-center justify-between px-3">
          <span className="text-xs text-muted-foreground">Theme</span>
          <ThemeToggleButton />
        </div>
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-secondary border border-border">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
            {user?.firstName?.[0] || user?.email?.[0] || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{user?.firstName || user?.email}</p>
            <p className="text-xs text-muted-foreground truncate">Admin</p>
          </div>
          <button onClick={() => logout()} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { activeGymId } = useGym();
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  const { data: gym, isLoading: gymLoading } = useGetGym(activeGymId as number, {
    query: { enabled: !!activeGymId }
  });

  if (!activeGymId) return <>{children}</>;

  if (isMobile) {
    return (
      <div className="flex flex-col h-screen w-full bg-background overflow-hidden">
        <header className="h-14 flex items-center justify-between px-4 border-b border-border bg-sidebar shrink-0 z-30">
          <button
            onClick={() => setDrawerOpen(true)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-foreground"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          <Link href="/dashboard" className="flex items-center gap-2 text-primary">
            <Dumbbell className="h-5 w-5" />
            <span className="font-display font-bold text-lg tracking-tight text-foreground">
              IRON<span className="text-primary">METRICS</span>
            </span>
          </Link>
          <div className="min-w-[44px]" />
        </header>

        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent side="left" className="w-[280px] p-0 bg-sidebar">
            <SheetHeader className="h-14 flex items-center px-6 border-b border-border/50 flex-row">
              <Link href="/dashboard" className="flex items-center gap-3 text-primary hover:opacity-80 transition-opacity">
                <Dumbbell className="h-6 w-6" />
                <SheetTitle className="font-display font-bold text-xl tracking-tight text-foreground">
                  IRON<span className="text-primary">METRICS</span>
                </SheetTitle>
              </Link>
            </SheetHeader>
            <SidebarContent
              location={location}
              gym={gym}
              gymLoading={gymLoading}
              user={user}
              logout={logout}
              onNavigate={() => setDrawerOpen(false)}
            />
          </SheetContent>
        </Sheet>

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
          
          <div className="flex-1 overflow-y-auto p-4 pb-20 z-10 custom-scrollbar">
            <motion.div
              key={location}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="max-w-7xl mx-auto"
            >
              {children}
            </motion.div>
          </div>
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-30 bg-sidebar/95 backdrop-blur-md border-t border-border">
          <div className="flex items-center justify-around h-16">
            {BOTTOM_NAV_ITEMS.map((item) => {
              const isActive = location.startsWith(item.href);
              return (
                <Link key={item.name} href={item.href}>
                  <div className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] px-2 py-1 ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}>
                    <item.icon className={`h-5 w-5 ${isActive ? "text-primary" : ""}`} />
                    <span className="text-[10px] mt-0.5 font-medium">{item.name}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <aside className="w-64 border-r border-border bg-sidebar flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-border/50 shrink-0">
          <Link href="/dashboard" className="flex items-center gap-3 text-primary hover:opacity-80 transition-opacity">
            <Dumbbell className="h-6 w-6" />
            <span className="font-display font-bold text-xl tracking-tight text-foreground">
              IRON<span className="text-primary">METRICS</span>
            </span>
          </Link>
        </div>
        <SidebarContent
          location={location}
          gym={gym}
          gymLoading={gymLoading}
          user={user}
          logout={logout}
        />
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
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
