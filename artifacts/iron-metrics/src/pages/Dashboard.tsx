import React, { useEffect, useState } from "react";
import { useGym } from "@/store/GymContext";
import { useGetDashboardStats, useGetMorningBriefing } from "@workspace/api-client-react";
import {
  Users, TrendingUp, AlertTriangle, ArrowUpRight, ArrowDownRight,
  Loader2, BrainCircuit, Rocket, Sun, CreditCard, UserCheck,
  ChevronRight, Sparkles, ChevronDown, UserPlus, Clock, ShieldCheck,
  Zap, CheckCircle2, Mail, MessageSquare, ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SyncHealthBanner } from "@/components/dashboard/SyncHealthBanner";
import { AtRiskMembersCard } from "@/components/dashboard/AtRiskMembersCard";
import { RetentionActivityCard } from "@/components/dashboard/RetentionActivityCard";
import { cn } from "@/lib/utils";

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

const iconMap: Record<string, React.ElementType> = {
  alert: AlertTriangle,
  warning: AlertTriangle,
  billing: CreditCard,
  leads: UserPlus,
  positive: Sparkles,
  engagement: Users,
  retention: ShieldCheck,
  clock: Clock,
  usercheck: UserCheck,
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

interface ActionItem {
  id: string;
  category: "critical" | "warning" | "positive";
  title: string;
  description: string;
  impact: string;
  icon: React.ElementType;
  actionLabel: string;
  actionLink: string | null;
}

function ActionCard({ item }: { item: ActionItem }) {
  const [expanded, setExpanded] = useState(false);

  const colors = {
    critical: "bg-destructive/10 border-destructive/20 text-destructive",
    warning: "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
    positive: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  };

  const Icon = item.icon;

  return (
    <div className={cn(
      "border rounded-xl transition-all duration-200 overflow-hidden",
      "bg-card hover:bg-accent/50",
      expanded ? "border-border shadow-sm" : "border-border/70",
      item.category === "critical" && !expanded && "border-destructive/30"
    )}>
      <div
        className="p-4 cursor-pointer flex items-start gap-4"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={cn("p-2 rounded-lg mt-1", colors[item.category])}>
          <Icon className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-4 mb-1">
            <h4 className="font-semibold text-foreground truncate">{item.title}</h4>
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap bg-muted px-2 py-1 rounded-md">
              {item.impact}
            </span>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2 pr-8">
            {item.description}
          </p>
        </div>

        <div className="pt-2 text-muted-foreground/60">
          {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-2 border-t border-border/50 ml-14">
              <div className="flex items-center justify-end gap-3">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  Dismiss
                </Button>
                {item.actionLink ? (
                  <Link href={item.actionLink}>
                    <Button
                      size="sm"
                      className={cn(
                        "font-medium",
                        item.category === "critical" ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" :
                        item.category === "warning" ? "bg-amber-600 hover:bg-amber-700 text-white" :
                        "bg-primary text-primary-foreground hover:bg-primary/90"
                      )}
                    >
                      {item.actionLabel}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                ) : (
                  <Button
                    size="sm"
                    className={cn(
                      "font-medium",
                      item.category === "critical" ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" :
                      item.category === "warning" ? "bg-amber-600 hover:bg-amber-700 text-white" :
                      "bg-primary text-primary-foreground hover:bg-primary/90"
                    )}
                  >
                    {item.actionLabel}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function buildActionItems(
  briefingItems: Array<{ priority: string; message: string; icon: string; action?: string | null; link?: string | null }>,
  snapshot: {
    atRiskMembers?: number;
    atRiskCritical?: number;
    failedPayments?: number;
    staleLeads?: number;
    newLeads?: number;
    revenueAtRisk?: number;
  }
): ActionItem[] {
  return briefingItems.map((item, idx) => {
    const Icon = iconMap[item.icon] || BrainCircuit;
    let category: ActionItem["category"] = "positive";
    if (item.priority === "critical") category = "critical";
    else if (item.priority === "warning") category = "warning";

    let impact = "";
    if (item.priority === "critical" && item.icon === "alert") {
      impact = snapshot.revenueAtRisk ? `$${(snapshot.revenueAtRisk / 100).toFixed(0)} at risk` : "At risk";
    } else if (item.icon === "billing") {
      impact = snapshot.failedPayments ? `${snapshot.failedPayments} overdue` : "Billing";
    } else if (item.icon === "leads" || item.icon === "clock") {
      impact = snapshot.staleLeads ? `${snapshot.staleLeads} stale` : "Leads";
    } else if (item.priority === "positive") {
      impact = "Good news";
    } else {
      impact = item.priority;
    }

    return {
      id: `action-${idx}`,
      category,
      title: item.action || item.message.slice(0, 50),
      description: item.message,
      impact,
      icon: Icon,
      actionLabel: item.action || "View",
      actionLink: item.link || null,
    };
  });
}

export function Dashboard() {
  const { activeGymId } = useGym();
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats(activeGymId as number, {
    query: { enabled: !!activeGymId }
  });
  const { data: briefing, isLoading: briefingLoading } = useGetMorningBriefing(activeGymId as number, {
    query: { enabled: !!activeGymId }
  });

  if (!activeGymId) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">Select a gym to view your dashboard.</p>
      </div>
    );
  }

  const isLoading = statsLoading || briefingLoading;

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

  const snapshot = briefing?.snapshot;
  const briefingItems = briefing?.items || [];
  const actionItems = buildActionItems(briefingItems, snapshot || {});

  const criticalItems = actionItems.filter(i => i.category === "critical");
  const warningItems = actionItems.filter(i => i.category === "warning");
  const positiveItems = actionItems.filter(i => i.category === "positive");

  const criticalCount = criticalItems.length + warningItems.length;
  const mrrFormatted = `$${(stats.mrr / 1000).toFixed(1)}k`;
  const mrrChange = stats.mrrGrowth != null ? `${stats.mrrGrowth >= 0 ? "+" : ""}${stats.mrrGrowth.toFixed(1)}%` : null;

  return (
    <div className="space-y-6 pb-10">
      <OnboardingBanner gymId={activeGymId} />
      <SyncHealthBanner gymId={activeGymId} />

      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Owner Console</p>
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
            {getGreeting()}, Boss.
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
            {criticalCount > 0 ? (
              <>
                <strong className="text-destructive font-semibold">{criticalCount} {criticalCount === 1 ? "thing" : "things"}</strong> need your attention today.
              </>
            ) : (
              <span>Everything is looking smooth today.</span>
            )}
            {mrrChange && (
              <>
                {" "}Revenue is {stats.mrrGrowth >= 0 ? "up" : "down"}{" "}
                <strong className={cn("font-semibold", stats.mrrGrowth >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
                  {mrrChange}
                </strong>{" "}this month.
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-4 pb-1">
          <div className="text-right hidden md:block">
            <p className="text-sm font-medium text-foreground">Billing snapshot</p>
            <p className="text-xs text-muted-foreground">
              {mrrFormatted} MRR &middot; {stats.failedPayments} {stats.failedPayments === 1 ? "payment" : "payments"} overdue
            </p>
          </div>
          <Link href="/billing">
            <Button size="sm" variant="outline" className="border-border">
              <CreditCard className="w-4 h-4 mr-1.5" />
              Go to Billing
            </Button>
          </Link>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">

          {criticalItems.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-6 h-6 rounded bg-destructive/10 text-destructive">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">Handle Now</h2>
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 font-mono">
                  {criticalItems.length} critical
                </Badge>
              </div>
              <div className="space-y-3">
                {criticalItems.map(item => <ActionCard key={item.id} item={item} />)}
              </div>
            </section>
          )}

          {warningItems.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-6 h-6 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Zap className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">Follow Up Today</h2>
              </div>
              <div className="space-y-3">
                {warningItems.map(item => <ActionCard key={item.id} item={item} />)}
              </div>
            </section>
          )}

          {positiveItems.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-6 h-6 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">Good News</h2>
              </div>
              <div className="space-y-3">
                {positiveItems.map(item => <ActionCard key={item.id} item={item} />)}
              </div>
            </section>
          )}

          {actionItems.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-500" />
              <p className="text-lg font-medium text-foreground">All clear!</p>
              <p className="text-sm">No action items for today. Your gym is running smoothly.</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AtRiskMembersCard gymId={activeGymId} />
            <RetentionActivityCard gymId={activeGymId} />
          </div>
        </div>

        <div className="lg:col-span-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Card className="col-span-2 shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Monthly Recurring Rev</p>
                  <p className="text-2xl font-bold text-foreground">{mrrFormatted}</p>
                </div>
                <div className="text-right">
                  {mrrChange && (
                    <Badge variant="outline" className={cn(
                      stats.mrrGrowth >= 0
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : "bg-destructive/10 text-destructive border-destructive/20"
                    )}>
                      {stats.mrrGrowth >= 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                      {mrrChange}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                  <Users className="w-4 h-4" /> Active
                </p>
                <div className="flex items-end justify-between mt-2">
                  <p className="text-xl font-bold text-foreground">{stats.activeMembers}</p>
                  <span className={cn("text-xs font-medium", (stats.newMembersThisMonth - stats.churnedThisMonth) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
                    {(stats.newMembersThisMonth - stats.churnedThisMonth) >= 0 ? "+" : ""}{stats.newMembersThisMonth - stats.churnedThisMonth}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                  <BrainCircuit className="w-4 h-4" /> RSI Score
                </p>
                <div className="flex items-end justify-between mt-2">
                  <p className="text-xl font-bold text-foreground">{stats.rsiScore.toFixed(1)}</p>
                  <Link href="/intelligence">
                    <span className="text-xs text-primary font-medium hover:underline cursor-pointer">{stats.rsiBand}</span>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-2 shadow-sm">
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-sm font-medium text-muted-foreground">Retention Rate</p>
                  <span className="text-sm font-bold text-foreground">{(stats.retentionRate ?? 100).toFixed(1)}%</span>
                </div>
                <Progress value={stats.retentionRate ?? 100} className="h-2" />
              </CardContent>
            </Card>
          </div>

          <Card className="overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <h3 className="text-sm font-semibold text-foreground">Revenue Trend</h3>
              <Link href="/billing">
                <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground">Details</Button>
              </Link>
            </div>
            <div className="h-[140px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.revenueByMonth} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      color: 'hsl(var(--foreground))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    itemStyle={{ color: 'hsl(var(--primary))' }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="shadow-sm">
            <div className="p-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Quick Stats</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                    <TrendingUp className="w-3 h-3 text-muted-foreground" />
                  </div>
                  <span className="text-sm text-muted-foreground">Engagement Rate</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{stats.engagementRate.toFixed(1)}%</span>
                  <span className={cn("text-xs", stats.engagementChange >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
                    {stats.engagementChange >= 0 ? "+" : ""}{stats.engagementChange.toFixed(1)}pp
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                    <CreditCard className="w-3 h-3 text-muted-foreground" />
                  </div>
                  <span className="text-sm text-muted-foreground">Collection Rate</span>
                </div>
                <span className="text-sm font-medium text-foreground">{stats.collectionRate.toFixed(1)}%</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                    <AlertTriangle className="w-3 h-3 text-muted-foreground" />
                  </div>
                  <span className="text-sm text-muted-foreground">At-Risk Members</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{stats.atRiskMembers}</span>
                  {stats.atRiskCritical > 0 && (
                    <span className="text-xs text-destructive">{stats.atRiskCritical} critical</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                    <UserPlus className="w-3 h-3 text-muted-foreground" />
                  </div>
                  <span className="text-sm text-muted-foreground">Open Leads</span>
                </div>
                <Link href="/leads">
                  <span className="text-sm font-medium text-primary hover:underline cursor-pointer">{stats.openLeads}</span>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
