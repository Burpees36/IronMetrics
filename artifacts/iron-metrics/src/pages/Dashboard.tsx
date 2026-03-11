import React from "react";
import { useGym } from "@/store/GymContext";
import { useGetDashboardStats } from "@workspace/api-client-react";
import { 
  Users, TrendingUp, AlertTriangle, CalendarCheck, 
  ArrowUpRight, ArrowDownRight, Loader2, BrainCircuit
} from "lucide-react";
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Link } from "wouter";

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
    { title: "Monthly Revenue", value: `$${(stats.mrr / 1000).toFixed(1)}k`, change: stats.mrrGrowth, icon: TrendingUp, suffix: "% vs last month" },
    { title: "Avg Weekly Attendance", value: stats.avgAttendancePerWeek.toFixed(1), change: stats.attendanceGrowth, icon: CalendarCheck, suffix: "% vs last week" },
    { title: "At Risk Members", value: stats.atRiskMembers, isNegative: true, icon: AlertTriangle, suffix: "need intervention" },
  ];

  return (
    <div className="space-y-6 md:space-y-8 pb-10">
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
                <YAxis axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 11}} tickFormatter={(val) => `$${val/1000}k`} />
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
