import React, { useEffect, useState } from "react";
import { useGym } from "@/store/GymContext";
import { useGetDashboardStats, useGetMorningBriefing } from "@workspace/api-client-react";
import { 
  Users, TrendingUp, AlertTriangle, CalendarCheck, 
  ArrowUpRight, ArrowDownRight, Loader2, BrainCircuit, Rocket,
  Sun, CreditCard, UserCheck, Calendar, ChevronRight, Sparkles,
  ChevronDown, ChevronUp, UserPlus, Clock, DollarSign, Inbox
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const API_BASE = import.meta.env.VITE_API_URL || "";

function OnboardingBanner({ gymId }: { gymId: number }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    fetch(`${API_BASE}/api/gyms/${gymId}/onboarding`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data) => {
        if (data && data.isComplete === false) setShow(true);
      })
      .catch(() => {});
  }, [gymId]);

  if (!show) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex items-center justify-between"
    >
      <div className="flex items-center gap-3">
        <Rocket className="h-5 w-5 text-primary" />
        <div>
          <p className="font-medium text-foreground text-sm">Setup isn't complete yet</p>
          <p className="text-xs text-muted-foreground">Pick up where you left off and finish configuring your gym.</p>
        </div>
      </div>
      <Link href="/onboarding">
        <Button size="sm" variant="outline" className="border-primary/30 text-primary hover:bg-primary/10">
          Resume Setup
        </Button>
      </Link>
    </motion.div>
  );
}

const priorityConfig = {
  critical: { bg: "bg-destructive/10", border: "border-destructive/20", text: "text-destructive", dot: "bg-destructive" },
  warning: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-500", dot: "bg-amber-500" },
  info: { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-500", dot: "bg-blue-500" },
  positive: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-500", dot: "bg-emerald-500" },
};

const iconMap: Record<string, React.ElementType> = {
  alert: AlertTriangle,
  warning: AlertTriangle,
  billing: CreditCard,
  leads: UserCheck,
  schedule: Calendar,
  positive: Sparkles,
  engagement: Users,
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function MorningBriefing({ gymId }: { gymId: number }) {
  const { data: briefing, isLoading } = useGetMorningBriefing(gymId, {
    query: { enabled: !!gymId }
  });
  const [collapsed, setCollapsed] = useState(false);

  if (isLoading || !briefing) return null;

  const snap = (briefing as any).snapshot;
  const actionItems = (briefing.items || []).filter(
    (item: any) => item.priority === "critical" || item.priority === "warning"
  );
  const positiveItems = (briefing.items || []).filter(
    (item: any) => item.priority === "positive" || item.priority === "info"
  );

  const attentionCards = [
    {
      label: "Critical Members",
      value: snap?.atRiskMembers || 0,
      icon: AlertTriangle,
      color: (snap?.atRiskMembers || 0) > 0 ? "text-destructive bg-destructive/10 border-destructive/20" : "text-muted-foreground bg-muted/20 border-border",
      link: "/intelligence",
    },
    {
      label: "Stale Leads",
      value: snap?.staleLeads || 0,
      icon: Clock,
      color: (snap?.staleLeads || 0) > 0 ? "text-amber-500 bg-amber-500/10 border-amber-500/20" : "text-muted-foreground bg-muted/20 border-border",
      link: "/leads",
    },
    {
      label: "New Leads",
      value: snap?.newLeads || 0,
      icon: UserPlus,
      color: (snap?.newLeads || 0) > 0 ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" : "text-muted-foreground bg-muted/20 border-border",
      link: "/leads",
    },
    {
      label: "Overdue Payments",
      value: snap?.failedPayments || 0,
      icon: CreditCard,
      color: (snap?.failedPayments || 0) > 0 ? "text-red-500 bg-red-500/10 border-red-500/20" : "text-muted-foreground bg-muted/20 border-border",
      link: "/billing",
    },
  ];

  const hasIssues = actionItems.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden"
    >
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full px-4 md:px-6 py-3 md:py-4 flex items-center justify-between hover:bg-muted/10 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sun className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm md:text-base font-semibold text-foreground">{getGreeting()}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Your daily brief — tap to {collapsed ? "expand" : "collapse"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {collapsed && hasIssues && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-destructive/10 text-destructive">
              {actionItems.length} action{actionItems.length !== 1 ? "s" : ""} needed
            </span>
          )}
          {collapsed ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 md:px-6 pb-4 md:pb-5 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                {attentionCards.map(card => (
                  <Link key={card.label} href={card.link}>
                    <div className={`rounded-xl border p-3 transition-colors hover:opacity-80 cursor-pointer ${card.color}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <card.icon className="h-4 w-4" />
                        <span className="text-xl font-bold">{card.value}</span>
                      </div>
                      <p className="text-[11px] font-medium opacity-80">{card.label}</p>
                    </div>
                  </Link>
                ))}
              </div>

              {actionItems.length > 0 && (
                <div className="space-y-1.5">
                  {actionItems.map((item: any, i: number) => {
                    const config = priorityConfig[item.priority as keyof typeof priorityConfig] || priorityConfig.info;
                    const Icon = iconMap[item.icon] || BrainCircuit;
                    return (
                      <div
                        key={`action-${i}`}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/15 group"
                      >
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} />
                        <Icon className={`h-3.5 w-3.5 shrink-0 ${config.text}`} />
                        <span className="text-xs text-foreground flex-1">{item.message}</span>
                        {item.link && item.action && (
                          <Link href={item.link}>
                            <span className="text-[11px] font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-0.5 whitespace-nowrap">
                              {item.action}
                              <ChevronRight className="h-3 w-3" />
                            </span>
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {positiveItems.length > 0 && (
                <div className="space-y-1.5">
                  {positiveItems.map((item: any, i: number) => {
                    const config = priorityConfig[item.priority as keyof typeof priorityConfig] || priorityConfig.info;
                    const Icon = iconMap[item.icon] || BrainCircuit;
                    return (
                      <div
                        key={`positive-${i}`}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg group"
                      >
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} />
                        <Icon className={`h-3.5 w-3.5 shrink-0 ${config.text}`} />
                        <span className="text-xs text-muted-foreground flex-1">{item.message}</span>
                        {item.link && item.action && (
                          <Link href={item.link}>
                            <span className="text-[11px] font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-0.5 whitespace-nowrap opacity-0 group-hover:opacity-100">
                              {item.action}
                              <ChevronRight className="h-3 w-3" />
                            </span>
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function Dashboard() {
  const { activeGymId } = useGym();
  const { data: stats, isLoading } = useGetDashboardStats(activeGymId as number, {
    query: { enabled: !!activeGymId }
  });

  if (!activeGymId) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">Select a gym to view your dashboard.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">Unable to load dashboard data.</p>
      </div>
    );
  }

  const kpis = [
    { title: "Active Members", value: stats.activeMembers, change: stats.newMembersThisMonth - stats.churnedThisMonth, icon: Users, suffix: "net this month" },
    { title: "Monthly Revenue", value: `$${(stats.mrr / 1000).toFixed(1)}k`, change: stats.mrrGrowth ?? undefined, icon: TrendingUp, suffix: stats.mrrGrowth != null ? "% vs last month" : "" },
    { title: "Engagement Rate", value: `${stats.engagementRate.toFixed(1)}%`, change: stats.engagementChange, icon: CalendarCheck, suffix: "pp vs last week" },
    { title: "At Risk Members", value: stats.atRiskMembers, isNegative: true, icon: AlertTriangle, suffix: "need intervention" },
  ];

  return (
    <div className="space-y-6 md:space-y-8 pb-10">
      <OnboardingBanner gymId={activeGymId} />
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Overview</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">Here's what's happening at your gym today.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Link href="/intelligence">
            <div className="flex items-center gap-2 px-3 md:px-4 py-2 bg-primary/10 text-primary rounded-lg font-medium hover:bg-primary/20 transition-colors cursor-pointer border border-primary/20 text-sm">
              <BrainCircuit className="h-4 w-4" />
              <span>RSI: {stats.rsiScore.toFixed(1)} ({stats.rsiBand})</span>
            </div>
          </Link>
        </div>
      </header>

      <MorningBriefing gymId={activeGymId} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-card border border-border p-4 md:p-6 rounded-2xl shadow-sm relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-4 md:p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <kpi.icon className="h-10 md:h-16 w-10 md:w-16" />
            </div>
            <div className="relative z-10">
              <p className="text-xs md:text-sm font-medium text-muted-foreground mb-1 truncate">{kpi.title}</p>
              <h3 className="text-xl md:text-3xl font-display font-bold text-foreground mb-2 md:mb-4">{kpi.value}</h3>
              
              {kpi.change !== undefined && (
                <div className="flex items-center gap-1 md:gap-1.5 text-xs md:text-sm">
                  <span className={`flex items-center font-medium ${
                    kpi.isNegative ? "text-destructive" : (kpi.change >= 0 ? "text-emerald-500" : "text-destructive")
                  }`}>
                    {kpi.change >= 0 ? <ArrowUpRight className="h-3 w-3 md:h-4 md:w-4" /> : <ArrowDownRight className="h-3 w-3 md:h-4 md:w-4" />}
                    {Math.abs(kpi.change)}
                  </span>
                  <span className="text-muted-foreground hidden sm:inline">{kpi.suffix}</span>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-4 md:p-6 shadow-sm">
          <div className="mb-4 md:mb-6">
            <h3 className="text-base md:text-lg font-semibold text-foreground">Revenue Trend</h3>
            <p className="text-xs md:text-sm text-muted-foreground">Monthly MRR and growth over time</p>
          </div>
          <div className="h-[220px] md:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.revenueByMonth} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 11}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 11}} tickFormatter={(val) => val >= 1000 ? `$${(val/1000).toFixed(1)}k` : `$${val}`} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }}
                  itemStyle={{ color: 'hsl(var(--primary))' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 md:p-6 shadow-sm flex flex-col">
          <div className="mb-4 md:mb-6">
            <h3 className="text-base md:text-lg font-semibold text-foreground">Member Status</h3>
            <p className="text-xs md:text-sm text-muted-foreground">Current base distribution</p>
          </div>
          <div className="flex-1 min-h-[200px] md:min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.memberStatusBreakdown} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="status" type="category" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--foreground))', fontSize: 12}} width={70} />
                <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {stats.atRiskMembers > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-destructive/10 to-background border border-destructive/20 rounded-2xl p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div>
            <h3 className="text-base md:text-lg font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
              Action Required: High Risk Members
            </h3>
            <p className="text-muted-foreground mt-1 text-xs md:text-sm">
              You have {stats.atRiskMembers} members flagged by the Intelligence Engine as high risk of churning this month.
            </p>
          </div>
          <Link href="/intelligence">
            <button className="w-full sm:w-auto px-5 py-2.5 bg-destructive/20 text-destructive hover:bg-destructive hover:text-white rounded-lg font-medium transition-colors whitespace-nowrap min-h-[44px]">
              View Risk Radar
            </button>
          </Link>
        </motion.div>
      )}
    </div>
  );
}
