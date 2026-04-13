import React, { useEffect, useState } from "react";
import { useUser } from "@clerk/react";
import { useGym } from "@/store/GymContext";
import { useGetDashboardStats, useGetMorningBriefing } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import {
  Users, TrendingUp, AlertTriangle, ArrowUpRight, ArrowDownRight,
  Loader2, BrainCircuit, Rocket, Sun, CreditCard, UserCheck,
  ChevronRight, Sparkles, ChevronDown, UserPlus, Clock, ShieldCheck,
  Zap, CheckCircle2, Mail, MessageSquare, ArrowRight, BarChart3,
  Wallet, PiggyBank
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SyncHealthBanner } from "@/components/dashboard/SyncHealthBanner";
import { CelebrationsBanner } from "@/components/dashboard/CelebrationsBanner";
import { AtRiskMembersCard } from "@/components/dashboard/AtRiskMembersCard";
import { RetentionActivityCard } from "@/components/dashboard/RetentionActivityCard";
import { PageError } from "@/components/ui/page-error";
import { cn } from "@/lib/utils";

import { authFetch } from "@/lib/authFetch";

const API_BASE = import.meta.env.VITE_API_URL || "";
const BASE_URL = import.meta.env.BASE_URL || "/";
const BENCHMARK_API = `${BASE_URL}api`.replace(/\/+/g, "/");

function OnboardingBanner({ gymId }: { gymId: number }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    authFetch(`${API_BASE}/api/gyms/${gymId}/onboarding`)
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
          <p className="text-xs text-muted-foreground">Pick up where you left off and finish configuring your business.</p>
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

function ConnectWodifyBanner({ gymId }: { gymId: number }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    authFetch(`${API_BASE}/api/gyms/${gymId}/integrations/wodify/sync-status`)
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data) => {
        if (data && !data.hasApiKey) {
          authFetch(`${API_BASE}/api/gyms/${gymId}/members?limit=1`)
            .then((r) => r.ok ? r.json() : null)
            .then((members) => {
              const count = Array.isArray(members) ? members.length : members?.total ?? 0;
              if (count === 0) setShow(true);
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, [gymId]);

  if (!show) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center justify-between"
    >
      <div className="flex items-center gap-3">
        <Zap className="h-5 w-5 text-emerald-400" />
        <div>
          <p className="font-medium text-foreground text-sm">Connect Wodify to get started</p>
          <p className="text-xs text-muted-foreground">Sync your members and revenue data automatically from Wodify.</p>
        </div>
      </div>
      <Link href="/settings/integrations">
        <Button size="sm" variant="outline" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
          Connect Now
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
  community: Users,
  marketing: MessageSquare,
  growth: Rocket,
  revenue: TrendingUp,
  coaching: BrainCircuit,
  schedule: Clock,
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
      impact = snapshot.revenueAtRisk ? `$${Math.round(snapshot.revenueAtRisk).toLocaleString()} at risk` : "At risk";
    } else if (item.icon === "billing") {
      impact = snapshot.failedPayments ? `${snapshot.failedPayments} overdue` : "Billing";
    } else if (item.icon === "leads" || item.icon === "clock") {
      impact = snapshot.staleLeads ? `${snapshot.staleLeads} stale` : snapshot.newLeads ? `${snapshot.newLeads} new` : "Leads";
    } else if (item.priority === "positive") {
      impact = "Good news";
    } else {
      impact = item.priority;
    }

    return {
      id: `action-${idx}`,
      category,
      title: item.action || item.message.slice(0, 60),
      description: item.message,
      impact,
      icon: Icon,
      actionLabel: item.action || "View details",
      actionLink: item.link || null,
    };
  });
}

function BenchmarkHighlightsCard({ gymId }: { gymId: number }) {
  const { data } = useQuery({
    queryKey: ["benchmarks", gymId],
    queryFn: async () => {
      const res = await authFetch(`${BENCHMARK_API}/gyms/${gymId}/intelligence/benchmarks`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!gymId,
    staleTime: 60000,
  });

  if (!data || data.insufficientData) return null;

  const highlights = (data.comparisons || [])
    .filter((c: any) => c.percentileRank !== null)
    .sort((a: any, b: any) => b.percentileRank - a.percentileRank)
    .slice(0, 3);

  if (highlights.length === 0) return null;

  return (
    <Card className="shadow-sm">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          How You Compare
        </h3>
        <Link href="/intelligence">
          <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground">View All</Button>
        </Link>
      </div>
      <div className="p-4 space-y-3">
        {highlights.map((h: any) => {
          const badgeColor = h.percentileRank >= 75 ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" :
            h.percentileRank >= 50 ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20" :
            h.percentileRank >= 25 ? "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/20" :
            "bg-destructive/15 text-destructive border-destructive/20";

          return (
            <div key={h.metric} className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground truncate">{h.label}</span>
                <Badge variant="outline" className={cn("text-[11px] font-medium whitespace-nowrap", badgeColor)}>
                  {h.percentileLabel || (h.percentileRank != null ? `${h.percentileRank}th percentile` : "N/A")}
                </Badge>
              </div>
              {h.insight?.conversational && (
                <p className="text-[10px] text-muted-foreground leading-relaxed">{h.insight.conversational}</p>
              )}
              {h.insight?.ctaLabel && h.insight?.ctaRoute && h.percentileRank != null && h.percentileRank < 50 && (
                <Link href={h.insight.ctaRoute}>
                  <span className="text-[10px] font-medium text-primary hover:text-primary/80 flex items-center gap-1 cursor-pointer">
                    {h.insight.ctaLabel} <ArrowRight className="w-3 h-3" />
                  </span>
                </Link>
              )}
            </div>
          );
        })}
        <p className="text-[10px] text-muted-foreground pt-1">
          vs. {data.sampleCount} similar-sized businesses
        </p>
      </div>
    </Card>
  );
}

function FinancialSummaryCard({ gymId }: { gymId: number }) {
  const BASE_URL = import.meta.env.BASE_URL || "/";
  const FINANCE_API = `${BASE_URL}api`.replace(/\/+/g, "/");
  const { data } = useQuery({
    queryKey: ["finances-dashboard-summary", gymId],
    queryFn: async () => {
      const res = await authFetch(`${FINANCE_API}/gyms/${gymId}/finances/summary`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!gymId,
    staleTime: 60000,
  });

  if (!data || (data.revenue === 0 && data.totalExpenses === 0)) return null;

  const profitColor = data.netProfit >= 0
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-destructive";

  return (
    <Card className="shadow-sm">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" />
          Financial Snapshot
        </h3>
        <Link href="/finances">
          <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground">Details</Button>
        </Link>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Expenses</span>
          <span className="text-sm font-medium text-foreground">${data.totalExpenses.toLocaleString()}/mo</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Payroll ({data.payrollPercent}%)</span>
          <span className="text-sm font-medium text-foreground">${data.payrollAmount.toLocaleString()}/mo</span>
        </div>
        <div className="h-px bg-border" />
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Net Profit</span>
          <span className={cn("text-sm font-semibold", profitColor)}>
            ${Math.abs(data.netProfit).toLocaleString()}/mo
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <PiggyBank className="w-3.5 h-3.5 text-primary" />
            <span className="text-sm font-medium text-primary">Owner Take-Home</span>
          </div>
          <span className="text-sm font-bold text-primary">${data.ownerTakeHome.toLocaleString()}/mo</span>
        </div>
      </div>
    </Card>
  );
}

export function Dashboard() {
  const { user } = useUser();
  const { activeGymId } = useGym();
  const { data: stats, isLoading: statsLoading, isError: statsError, refetch: refetchStats } = useGetDashboardStats(activeGymId as number, {
    query: { enabled: !!activeGymId }
  });
  const { data: briefing, isLoading: briefingLoading, refetch: refetchBriefing } = useGetMorningBriefing(activeGymId as number, {
    query: { enabled: !!activeGymId }
  });

  if (!activeGymId) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">Select a business to view your dashboard.</p>
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

  if (statsError || !stats) {
    return (
      <PageError
        title="Unable to load dashboard"
        message="We couldn't load your dashboard data. Check your connection and try again."
        onRetry={() => { refetchStats(); refetchBriefing(); }}
      />
    );
  }

  const snapshot = briefing?.snapshot;
  const briefingItems = briefing?.items || [];
  const briefingSummary = briefing?.summary || null;
  const growthNudges = briefing?.growthNudges || [];
  const celebrations = briefing?.celebrations || [];
  const actionItems = buildActionItems(briefingItems, snapshot || {});

  const criticalItems = actionItems.filter(i => i.category === "critical");
  const warningItems = actionItems.filter(i => i.category === "warning");
  const positiveItems = actionItems.filter(i => i.category === "positive");

  const criticalCount = criticalItems.length + warningItems.length;
  const mrrFormatted = stats.mrr >= 1000 ? `$${(stats.mrr / 1000).toFixed(1)}k` : `$${Math.round(stats.mrr)}`;
  const mrrChange = stats.mrrGrowth != null ? `${stats.mrrGrowth >= 0 ? "+" : ""}${stats.mrrGrowth.toFixed(1)}%` : null;

  return (
    <div className="space-y-6 pb-10">
      <OnboardingBanner gymId={activeGymId} />
      <ConnectWodifyBanner gymId={activeGymId} />
      <SyncHealthBanner gymId={activeGymId} />

      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Owner Console</p>
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
            {getGreeting()}, {user?.firstName || "Boss"}.
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
            {briefingSummary ? (
              <span>{briefingSummary}</span>
            ) : criticalCount > 0 ? (
              <>
                <strong className="text-destructive font-semibold">{criticalCount} {criticalCount === 1 ? "thing" : "things"}</strong> need your attention today.
              </>
            ) : (
              <span>Everything is looking smooth today.</span>
            )}
            {mrrChange && !briefingSummary && (
              <>
                {" "}Revenue is {stats.mrrGrowth >= 0 ? "up" : "down"}{" "}
                <strong className={cn("font-semibold", stats.mrrGrowth >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
                  {mrrChange}
                </strong>{" "}this month.
              </>
            )}
          </p>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <div className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
              stats.mrrGrowth == null
                ? "bg-muted text-muted-foreground border-border"
                : stats.mrrGrowth >= 0
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-destructive/10 text-destructive border-destructive/20"
            )}>
              <TrendingUp className="w-3 h-3" />
              <span className="font-semibold">{mrrFormatted}</span>
              {mrrChange && (
                <>
                  {stats.mrrGrowth >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  <span>{mrrChange}</span>
                </>
              )}
            </div>

            <div className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
              (stats.newMembersThisMonth - stats.churnedThisMonth) >= 0
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : "bg-destructive/10 text-destructive border-destructive/20"
            )}>
              <Users className="w-3 h-3" />
              <span className="font-semibold">{stats.activeMembers}</span>
              <span>active</span>
              <span className="font-semibold">
                {(stats.newMembersThisMonth - stats.churnedThisMonth) >= 0 ? "+" : ""}
                {stats.newMembersThisMonth - stats.churnedThisMonth}
              </span>
            </div>

            {stats.rsiScore != null && (
            <div className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
              stats.rsiScore >= 70
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : stats.rsiScore >= 40
                  ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20"
                  : "bg-destructive/10 text-destructive border-destructive/20"
            )}>
              <BrainCircuit className="w-3 h-3" />
              <span className="font-semibold">{stats.rsiScore.toFixed(1)}</span>
              <span>{stats.rsiBand}</span>
            </div>
            )}
          </div>
          {(() => {
            const urgentItems = [...criticalItems, ...warningItems].filter(i => i.actionLink).slice(0, 2);
            if (urgentItems.length === 0) return null;
            return (
              <div className="flex flex-wrap gap-2 mt-2" data-testid="header-quick-actions">
                {urgentItems.map((item) => (
                  <Link key={item.id} href={item.actionLink!}>
                    <Button
                      size="sm"
                      variant={item.category === "critical" ? "destructive" : "outline"}
                      className={cn(
                        "text-xs font-semibold gap-1.5",
                        item.category === "warning" && "border-amber-500/50 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-400 dark:border-amber-400/50 dark:bg-amber-400/10 dark:hover:bg-amber-400/20"
                      )}
                    >
                      <item.icon className="w-3.5 h-3.5" />
                      {item.actionLabel}
                      {item.impact && <span className="opacity-70">· {item.impact}</span>}
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  </Link>
                ))}
              </div>
            );
          })()}
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

      <CelebrationsBanner celebrations={celebrations} />

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

          {actionItems.length === 0 && growthNudges.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-6 h-6 rounded bg-primary/10 text-primary">
                  <Rocket className="w-4 h-4" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">Growth Playbook</h2>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[11px] font-medium">
                  No fires — time to build
                </Badge>
              </div>
              <div className="space-y-3">
                {growthNudges.map((nudge) => {
                  const NudgeIcon = iconMap[nudge.icon] || Rocket;
                  return (
                    <Card key={nudge.id} className="shadow-sm overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5">
                            <NudgeIcon className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-sm font-semibold text-foreground">{nudge.title}</h3>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed mb-3">{nudge.message}</p>
                            <div className="flex items-center justify-between">
                              <Link href={nudge.actionLink}>
                                <Button size="sm" variant="outline" className="h-7 text-xs border-primary/30 text-primary hover:bg-primary/10">
                                  {nudge.actionLabel}
                                  <ArrowRight className="w-3 h-3 ml-1.5" />
                                </Button>
                              </Link>
                              {nudge.source && (
                                <span className="text-[10px] text-muted-foreground/60 italic truncate max-w-[180px]">
                                  via {nudge.source}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          {actionItems.length === 0 && growthNudges.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-500" />
              <p className="text-lg font-medium text-foreground">Nothing flagged</p>
              <p className="text-sm">No action items today. Metrics are clean — use the time to build.</p>
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
                  <p className="text-xl font-bold text-foreground">{stats.rsiScore != null ? stats.rsiScore.toFixed(1) : "—"}</p>
                  <div className="text-right">
                    {stats.rsiScore == null ? (
                      <span className="text-xs text-muted-foreground">No data yet</span>
                    ) : stats.rsiTrendInsufficient ? (
                      <Link href="/intelligence">
                        <span className="text-xs text-primary font-medium hover:underline cursor-pointer">{stats.rsiBand}</span>
                      </Link>
                    ) : stats.rsiTrend30d != null ? (
                      <Link href="/intelligence">
                        <span className={cn(
                          "text-xs font-medium hover:underline cursor-pointer flex items-center gap-0.5",
                          stats.rsiTrend30d >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                        )}>
                          {stats.rsiTrend30d >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {stats.rsiTrend30d >= 0 ? '+' : ''}{stats.rsiTrend30d} (30d)
                        </span>
                      </Link>
                    ) : (
                      <Link href="/intelligence">
                        <span className="text-xs text-primary font-medium hover:underline cursor-pointer">{stats.rsiBand}</span>
                      </Link>
                    )}
                  </div>
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
            {stats.revenueTrendSparse ? (
              <div className="h-[140px] w-full flex flex-col items-center justify-center px-4 text-center">
                <TrendingUp className="w-6 h-6 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Revenue trend will populate as data accumulates
                </p>
                {stats.revenueByMonth?.length > 0 && (
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    {stats.revenueByMonth.length} data {stats.revenueByMonth.length === 1 ? "point" : "points"} so far
                  </p>
                )}
              </div>
            ) : (
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
            )}
          </Card>

          <BenchmarkHighlightsCard gymId={activeGymId} />
          <FinancialSummaryCard gymId={activeGymId} />

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
                <span className="text-sm font-medium text-foreground">{stats.engagementRate.toFixed(1)}%</span>
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
                <span className="text-sm font-medium text-foreground">{stats.atRiskMembers}</span>
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
