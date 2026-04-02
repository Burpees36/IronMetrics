import React, { useState } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BellRing,
  Calendar,
  ChevronRight,
  CircleAlert,
  CircleDollarSign,
  Clock,
  CreditCard,
  Mail,
  MoreHorizontal,
  Plus,
  RefreshCcw,
  Search,
  Settings,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

// --- MOCK DATA ---

const MRR_TREND = [
  { month: "Sep", mrr: 24200 },
  { month: "Oct", mrr: 25100 },
  { month: "Nov", mrr: 25800 },
  { month: "Dec", mrr: 26500 },
  { month: "Jan", mrr: 27200 },
  { month: "Feb", mrr: 28400 },
];

const REVENUE_BY_PLAN = [
  { name: "Unlimited", value: 14200, color: "#0f172a" },
  { name: "3x/Week", value: 8500, color: "#334155" },
  { name: "Foundations", value: 3200, color: "#64748b" },
  { name: "Punch Card", value: 2500, color: "#94a3b8" },
];

const AT_RISK_MEMBERS = [
  {
    id: 1,
    name: "Sarah Jenkins",
    riskTier: "critical",
    riskScore: 92,
    daysSinceLastVisit: 14,
    revenueAtRisk: 195,
    plan: "Unlimited",
  },
  {
    id: 2,
    name: "Marcus Thorne",
    riskTier: "critical",
    riskScore: 88,
    daysSinceLastVisit: 11,
    revenueAtRisk: 165,
    plan: "3x/Week",
  },
  {
    id: 3,
    name: "Elena Rodriguez",
    riskTier: "high",
    riskScore: 75,
    daysSinceLastVisit: 8,
    revenueAtRisk: 195,
    plan: "Unlimited",
  },
  {
    id: 4,
    name: "David Kim",
    riskTier: "high",
    riskScore: 71,
    daysSinceLastVisit: 9,
    revenueAtRisk: 135,
    plan: "Foundations",
  },
  {
    id: 5,
    name: "Jessica Chen",
    riskTier: "medium",
    riskScore: 55,
    daysSinceLastVisit: 6,
    revenueAtRisk: 165,
    plan: "3x/Week",
  },
];

const OVERDUE_PAYMENTS = [
  { id: 1, name: "Tom Wilson", amount: 195, daysOverdue: 4, status: "retrying" },
  { id: 2, name: "Anita Patel", amount: 165, daysOverdue: 12, status: "failed" },
  { id: 3, name: "Greg House", amount: 45, daysOverdue: 2, status: "retrying" },
];

// --- UTILS ---

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
};

const formatPercent = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
};

export function FinancialCockpit() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 font-sans selection:bg-slate-200">
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
        <div className="flex items-center gap-4">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-950 text-white">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight">Iron Forge Athletics</h1>
            <div className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">Financial Cockpit</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-2 rounded-md bg-slate-100 px-3 py-1.5 text-xs text-slate-600 sm:flex">
            <Clock className="h-3 w-3" />
            <span>Updated 2 mins ago</span>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500">
            <Search className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500">
            <BellRing className="h-4 w-4" />
          </Button>
          <div className="h-8 w-8 overflow-hidden rounded-full bg-slate-200 border border-slate-200">
            <img src="/__mockup/images/gym-placeholder.png" alt="User" className="h-full w-full object-cover" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-6">
        {/* TOP: FINANCIAL SUMMARY HERO */}
        <div className="mb-6 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-slate-200">
            {/* Primary MRR - Takes 2 cols on lg */}
            <div className="p-6 lg:col-span-2 bg-slate-950 text-white">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-slate-400">Monthly Recurring Revenue</h2>
                <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 border-none px-2 py-0 text-xs">
                  <ArrowUpRight className="mr-1 h-3 w-3" />
                  +4.8% m/m
                </Badge>
              </div>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-5xl font-light tracking-tighter tabular-nums font-mono">$28,400</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono tabular-nums text-slate-300">$340.8k</span> ARR Run Rate
                </div>
                <Separator orientation="vertical" className="h-3 bg-slate-800" />
                <div className="flex items-center gap-1.5">
                  <span className="font-mono tabular-nums text-emerald-400">+$1,300</span> Net New
                </div>
              </div>
            </div>

            {/* Secondary Metrics */}
            <div className="p-6 flex flex-col justify-center">
              <div className="text-xs font-medium text-slate-500 mb-1">Avg Revenue Per Member</div>
              <div className="text-2xl font-light tabular-nums font-mono mb-1">$151.87</div>
              <div className="text-xs text-emerald-600 flex items-center">
                <ArrowUpRight className="mr-0.5 h-3 w-3" /> +$2.14 vs last mo
              </div>
            </div>

            <div className="p-6 flex flex-col justify-center">
              <div className="text-xs font-medium text-slate-500 mb-1">Collected This Month</div>
              <div className="text-2xl font-light tabular-nums font-mono mb-1">$22,150</div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mb-2 mt-2">
                <div className="bg-slate-900 h-1.5 rounded-full" style={{ width: "78%" }}></div>
              </div>
              <div className="text-xs text-slate-500">78% of expected</div>
            </div>

            <div className="p-6 flex flex-col justify-center relative overflow-hidden bg-rose-50/30">
              <div className="text-xs font-medium text-slate-500 mb-1">Failed Payments</div>
              <div className="text-2xl font-light tabular-nums font-mono text-rose-600 mb-1">$840</div>
              <div className="text-xs text-rose-600 flex items-center">
                <CircleAlert className="mr-1 h-3 w-3" /> 6 members requiring action
              </div>
            </div>
          </div>
        </div>

        {/* MAIN TWO-COLUMN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT COLUMN: Revenue Breakdown (wider) */}
          <div className="lg:col-span-2 space-y-6">
            {/* MRR Chart */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-slate-800">MRR Trajectory</CardTitle>
                  <select className="text-xs bg-transparent border-none text-slate-500 focus:ring-0 outline-none cursor-pointer">
                    <option>Last 6 Months</option>
                    <option>Last 12 Months</option>
                    <option>Year to Date</option>
                  </select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={MRR_TREND} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0f172a" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="month" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12, fill: '#64748b' }} 
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12, fill: '#64748b' }} 
                        tickFormatter={(val) => `$${val/1000}k`}
                        domain={['dataMin - 1000', 'auto']}
                      />
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number) => [formatCurrency(value), 'MRR']}
                        labelStyle={{ color: '#64748b', marginBottom: '4px' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="mrr" 
                        stroke="#0f172a" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorMrr)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Revenue by Plan */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-800">Revenue by Plan</CardTitle>
                </CardHeader>
                <CardContent className="pb-6">
                  <div className="flex h-[180px] items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={REVENUE_BY_PLAN}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                          stroke="none"
                        >
                          {REVENUE_BY_PLAN.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip 
                          formatter={(value: number) => formatCurrency(value)}
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', padding: '8px 12px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3 mt-2">
                    {REVENUE_BY_PLAN.map((plan, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: plan.color }}></div>
                          <span className="text-slate-600">{plan.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono tabular-nums font-medium">{formatCurrency(plan.value)}</span>
                          <span className="text-slate-400 text-xs w-8 text-right">
                            {Math.round((plan.value / 28400) * 100)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Net Member Flow */}
              <Card className="border-slate-200 shadow-sm flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-800">Member Flow (MTD)</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between pb-6">
                  <div className="flex justify-between items-end mb-6">
                    <div>
                      <div className="text-3xl font-light font-mono tabular-nums">+9</div>
                      <div className="text-xs text-emerald-600 font-medium">Net Members</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-light font-mono tabular-nums text-emerald-600">+$1,450</div>
                      <div className="text-xs text-slate-500">Net Revenue Change</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-slate-600">New Joins (14)</span>
                        <span className="font-mono tabular-nums text-emerald-600">+$2,250</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: "100%" }}></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-slate-600">Upgrades (3)</span>
                        <span className="font-mono tabular-nums text-emerald-600">+$135</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div className="bg-emerald-400 h-1.5 rounded-full" style={{ width: "15%" }}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-slate-600">Downgrades (2)</span>
                        <span className="font-mono tabular-nums text-rose-500">-$90</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div className="bg-rose-400 h-1.5 rounded-full" style={{ width: "10%" }}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-slate-600">Cancellations (5)</span>
                        <span className="font-mono tabular-nums text-rose-600">-$845</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div className="bg-rose-500 h-1.5 rounded-full" style={{ width: "40%" }}></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* RIGHT COLUMN: Health Signals (narrower) */}
          <div className="space-y-6">
            
            {/* Revenue at Risk (At Risk Members) */}
            <Card className="border-rose-100 shadow-sm bg-white overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
              <CardHeader className="pb-3 pt-5 pl-5">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-rose-500" />
                      Revenue at Risk
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">High churn probability members</CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-mono tabular-nums font-medium text-rose-600">$850</div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Total exposure</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pl-5 pb-2">
                <div className="space-y-0 divide-y divide-slate-100">
                  {AT_RISK_MEMBERS.map((member) => (
                    <div key={member.id} className="py-3 flex items-center justify-between group hover:bg-slate-50 -mx-2 px-2 rounded transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-8 w-8 border border-slate-200">
                            <AvatarFallback className="text-xs bg-slate-100 text-slate-600">
                              {member.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          {member.riskTier === 'critical' && (
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 border border-white"></span>
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-900 group-hover:text-slate-950">{member.name}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {member.daysSinceLastVisit} days absent
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-mono tabular-nums font-medium text-slate-700">{formatCurrency(member.revenueAtRisk)}</div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider">{member.plan}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50 border-t border-slate-100 py-3 pl-5">
                <Button variant="ghost" className="w-full text-xs text-slate-600 hover:text-slate-900 h-8 justify-between">
                  View all 12 at-risk members
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </CardFooter>
            </Card>

            {/* Overdue Payments */}
            <Card className="border-amber-100 shadow-sm bg-white overflow-hidden relative">
               <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>
              <CardHeader className="pb-3 pt-5 pl-5">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-amber-500" />
                      Action Required
                    </CardTitle>
                  </div>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    3 Overdue
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pl-5 pb-4">
                <div className="space-y-3">
                  {OVERDUE_PAYMENTS.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-slate-900">{payment.name}</div>
                        <div className="text-xs text-amber-600 font-medium">
                          {payment.daysOverdue} days overdue • {payment.status}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono tabular-nums font-medium text-slate-700">{formatCurrency(payment.amount)}</span>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-slate-900 border border-slate-200 hover:bg-slate-100 rounded-md">
                          <Mail className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Engagement Health (RSI) */}
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-semibold text-slate-800">Engagement Health</div>
                  <div className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                    Strong
                  </div>
                </div>
                
                <div className="flex items-end gap-3 mb-6">
                  <div className="text-4xl font-light font-mono tabular-nums tracking-tighter">78.2</div>
                  <div className="text-xs text-slate-500 mb-1 pb-1">Retention Strength Index</div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-600">Attendance Rate</span>
                      <span className="font-mono font-medium">72.3%</span>
                    </div>
                    <Progress value={72.3} className="h-1.5 bg-slate-100" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-600">Booking Rate</span>
                      <span className="font-mono font-medium">85.1%</span>
                    </div>
                    <Progress value={85.1} className="h-1.5 bg-slate-100" />
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>

        {/* BOTTOM STRIP: Today's Operations */}
        <div className="mt-6 border-t border-slate-200 pt-6">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Today's Pulse</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-white shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs text-slate-500">Active Members</div>
                <div className="text-lg font-mono font-medium">187</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-white shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs text-slate-500">Classes Today</div>
                <div className="text-lg font-mono font-medium">6 <span className="text-xs text-slate-400 ml-1 font-sans font-normal">Next: 6:00 AM</span></div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-white shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs text-slate-500">New Leads</div>
                <div className="text-lg font-mono font-medium">4 <span className="text-xs text-slate-400 ml-1 font-sans font-normal">1 stale</span></div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-white shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-purple-50 text-purple-600">
                <RefreshCcw className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs text-slate-500">Auto-Retention</div>
                <div className="text-lg font-mono font-medium">12 <span className="text-xs text-slate-400 ml-1 font-sans font-normal">msgs sent</span></div>
              </div>
            </div>

          </div>
        </div>

      </main>
    </div>
  );
}
