import React, { useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BellRing,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  HeartPulse,
  Info,
  Mail,
  MessageSquare,
  Phone,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
  Wallet
} from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Mock Data
const kpis = {
  activeMembers: { value: 187, change: "+4", trend: "up" },
  mrr: { value: "$28,450", change: "+$1,200", trend: "up" },
  engagementRate: { value: "72.3%", change: "+2.1%", trend: "up" },
  retentionRate: { value: "94.1%", change: "-0.4%", trend: "down" },
  rsiScore: { value: 78.2, band: "Strong" }
};

const mrrTrend = [
  { month: "Jan", value: 24500 },
  { month: "Feb", value: 25200 },
  { month: "Mar", value: 25800 },
  { month: "Apr", value: 26100 },
  { month: "May", value: 27500 },
  { month: "Jun", value: 28450 },
];

const healthTiers = {
  thriving: { count: 142, color: "bg-emerald-500", border: "border-emerald-500", text: "text-emerald-500", bgLight: "bg-emerald-50", textLight: "text-emerald-700", label: "Thriving" },
  healthy: { count: 28, color: "bg-blue-500", border: "border-blue-500", text: "text-blue-500", bgLight: "bg-blue-50", textLight: "text-blue-700", label: "Healthy" },
  atRisk: { count: 12, color: "bg-amber-500", border: "border-amber-500", text: "text-amber-500", bgLight: "bg-amber-50", textLight: "text-amber-700", label: "At Risk" },
  critical: { count: 5, color: "bg-red-500", border: "border-red-500", text: "text-red-500", bgLight: "bg-red-50", textLight: "text-red-700", label: "Critical" },
};

const membersByTier = {
  thriving: [
    { id: 1, name: "Sarah Jenkins", daysSinceVisit: 1, riskScore: 5, mrr: 155, status: "Attended 5x this week" },
    { id: 2, name: "Michael Chang", daysSinceVisit: 2, riskScore: 8, mrr: 155, status: "Hit new PR yesterday" },
  ],
  healthy: [
    { id: 3, name: "Jessica Alba", daysSinceVisit: 4, riskScore: 25, mrr: 155, status: "Consistent attendance" },
    { id: 4, name: "David Kim", daysSinceVisit: 5, riskScore: 30, mrr: 155, status: "Missed usual Monday class" },
  ],
  atRisk: [
    { id: 5, name: "Tom Bradley", daysSinceVisit: 12, riskScore: 65, mrr: 155, status: "Declining attendance pattern" },
    { id: 6, name: "Amanda Foster", daysSinceVisit: 14, riskScore: 72, mrr: 195, status: "Skipped billing update" },
    { id: 7, name: "Marcus Johnson", daysSinceVisit: 10, riskScore: 68, mrr: 155, status: "Low engagement last 30d" },
  ],
  critical: [
    { id: 8, name: "Lisa Wong", daysSinceVisit: 28, riskScore: 92, mrr: 155, status: "Payment failed 3 days ago" },
    { id: 9, name: "James Smith", daysSinceVisit: 35, riskScore: 95, mrr: 195, status: "No visits this month" },
    { id: 10, name: "Elena Rodriguez", daysSinceVisit: 24, riskScore: 88, mrr: 155, status: "Requested hold info" },
    { id: 11, name: "Robert Chen", daysSinceVisit: 31, riskScore: 94, mrr: 155, status: "Unresponsive to check-ins" },
    { id: 12, name: "Sophia Martinez", daysSinceVisit: 26, riskScore: 90, mrr: 155, status: "Declining attendance" },
  ]
};

const retentionActivity = [
  { id: 1, time: "10:30 AM", action: "Automated check-in email sent", target: "Tom Bradley", type: "email" },
  { id: 2, time: "09:15 AM", action: "Milestone SMS sent (100th class)", target: "Sarah Jenkins", type: "sms" },
  { id: 3, time: "Yesterday", action: "Task created: Call about failed payment", target: "Lisa Wong", type: "task" },
];

const morningBriefing = [
  { id: 1, priority: "critical", message: "3 payments failed overnight ($465 at risk)", icon: CreditCard, action: "Review" },
  { id: 2, priority: "warning", message: "Tom Bradley has missed 12 days straight", icon: UserPlus, action: "Message" },
  { id: 3, priority: "positive", message: "Sarah Jenkins hit 100 classes! Send a high-five.", icon: Activity, action: "Send" },
  { id: 4, priority: "info", message: "4 new leads in the pipeline", icon: BellRing, action: "View Leads" }
];

export function MemberHealthMatrix() {
  const [selectedTier, setSelectedTier] = useState<keyof typeof healthTiers>("critical");

  const totalMembers = Object.values(healthTiers).reduce((sum, tier) => sum + tier.count, 0);

  return (
    <div className="min-h-[100dvh] bg-slate-50 p-4 md:p-8 font-sans">
      <div className="mx-auto max-w-[1400px] space-y-6">
        
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Iron Forge Athletics</h1>
            <p className="text-sm md:text-base text-slate-500 mt-1 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Member Health Matrix &bull; Tuesday, Oct 24
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-500" />
              <span>6 classes today</span>
            </div>
            <Separator orientation="vertical" className="hidden md:block h-4" />
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="font-medium">Next: 12:00 PM CrossFit</span>
            </div>
          </div>
        </div>

        {/* Vitals Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white shadow-sm border-slate-200 overflow-hidden relative group hover:border-emerald-300 transition-colors">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
            <CardHeader className="pb-2 pt-5 pl-6">
              <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2 uppercase tracking-wider">
                <HeartPulse className="h-4 w-4 text-emerald-500" />
                Retention Rate
              </CardTitle>
            </CardHeader>
            <CardContent className="pl-6 pb-5">
              <div className="flex items-baseline gap-3">
                <div className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">{kpis.retentionRate.value}</div>
                <div className="flex items-center text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-md">
                  <TrendingDown className="mr-1 h-3 w-3" />
                  {kpis.retentionRate.change}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-slate-200 overflow-hidden relative group hover:border-blue-300 transition-colors">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" />
            <CardHeader className="pb-2 pt-5 pl-6">
              <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2 uppercase tracking-wider">
                <Activity className="h-4 w-4 text-blue-500" />
                RSI Score
              </CardTitle>
            </CardHeader>
            <CardContent className="pl-6 pb-5">
              <div className="flex items-baseline gap-3">
                <div className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">{kpis.rsiScore.value}</div>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-semibold px-2">
                  {kpis.rsiScore.band}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-slate-200 overflow-hidden relative group hover:border-slate-400 transition-colors">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-800" />
            <CardHeader className="pb-2 pt-5 pl-6">
              <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2 uppercase tracking-wider">
                <Users className="h-4 w-4 text-slate-700" />
                Active Members
              </CardTitle>
            </CardHeader>
            <CardContent className="pl-6 pb-5">
              <div className="flex items-baseline gap-3">
                <div className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">{kpis.activeMembers.value}</div>
                <div className="flex items-center text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                  <TrendingUp className="mr-1 h-3 w-3" />
                  {kpis.activeMembers.change}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm border-slate-200 overflow-hidden relative group hover:border-indigo-300 transition-colors">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500" />
            <CardHeader className="pb-2 pt-5 pl-6">
              <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2 uppercase tracking-wider">
                <Activity className="h-4 w-4 text-indigo-500" />
                Engagement Rate
              </CardTitle>
            </CardHeader>
            <CardContent className="pl-6 pb-5">
              <div className="flex items-baseline gap-3">
                <div className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">{kpis.engagementRate.value}</div>
                <div className="flex items-center text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                  <TrendingUp className="mr-1 h-3 w-3" />
                  {kpis.engagementRate.change}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Briefing & Matrix */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Morning Briefing */}
            <Card className="bg-white shadow-sm border-slate-200 border-l-4 border-l-slate-800">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BellRing className="h-5 w-5" />
                    Morning Briefing
                  </CardTitle>
                  <CardDescription>Items needing your attention today</CardDescription>
                </div>
                <Button variant="outline" size="sm">Dismiss All</Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {morningBriefing.map((item) => (
                    <div 
                      key={item.id} 
                      className={`flex items-start justify-between p-3 rounded-lg border ${
                        item.priority === 'critical' ? 'bg-red-50/50 border-red-100' :
                        item.priority === 'warning' ? 'bg-amber-50/50 border-amber-100' :
                        item.priority === 'positive' ? 'bg-emerald-50/50 border-emerald-100' :
                        'bg-blue-50/50 border-blue-100'
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className={`mt-0.5 p-1.5 rounded-full ${
                          item.priority === 'critical' ? 'bg-red-100 text-red-600' :
                          item.priority === 'warning' ? 'bg-amber-100 text-amber-600' :
                          item.priority === 'positive' ? 'bg-emerald-100 text-emerald-600' :
                          'bg-blue-100 text-blue-600'
                        }`}>
                          <item.icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className={`text-sm font-medium ${
                            item.priority === 'critical' ? 'text-red-900' :
                            item.priority === 'warning' ? 'text-amber-900' :
                            item.priority === 'positive' ? 'text-emerald-900' :
                            'text-blue-900'
                          }`}>
                            {item.message}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="h-8 px-2 text-xs font-semibold whitespace-nowrap ml-2">
                        {item.action}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Health Matrix */}
            <Card className="bg-white shadow-sm border-slate-200">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-end">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <HeartPulse className="h-5 w-5 text-slate-400" />
                      Population Health Matrix
                    </CardTitle>
                    <CardDescription className="mt-1">Visual breakdown of member engagement and retention risk</CardDescription>
                  </div>
                  <div className="text-right hidden sm:block">
                    <div className="text-sm font-medium text-slate-900">{totalMembers}</div>
                    <div className="text-xs text-slate-500">Total Monitored</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Segmented Bar */}
                <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div className="flex h-8 w-full overflow-hidden rounded-md border border-slate-200 shadow-inner">
                    {(Object.keys(healthTiers) as Array<keyof typeof healthTiers>).map((key) => {
                      const tier = healthTiers[key];
                      const width = `${(tier.count / totalMembers) * 100}%`;
                      return (
                        <TooltipProvider key={key}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                style={{ width }}
                                className={`cursor-pointer transition-all hover:brightness-110 ${tier.color} ${selectedTier === key ? "ring-2 ring-slate-900 ring-inset opacity-100" : "opacity-85"}`}
                                onClick={() => setSelectedTier(key)}
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="font-semibold">{tier.label}</div>
                              <div className="text-xs text-slate-500">{tier.count} members ({(tier.count / totalMembers * 100).toFixed(1)}%)</div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap justify-between mt-4 text-sm px-1">
                    {(Object.keys(healthTiers) as Array<keyof typeof healthTiers>).map((key) => (
                      <button 
                        key={key} 
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${
                          selectedTier === key ? healthTiers[key].bgLight : 'hover:bg-slate-100'
                        }`}
                        onClick={() => setSelectedTier(key)}
                      >
                        <div className={`h-3 w-3 rounded-full shadow-sm ${healthTiers[key].color}`} />
                        <span className={`font-medium ${selectedTier === key ? healthTiers[key].textLight : 'text-slate-600'}`}>
                          {healthTiers[key].label}
                        </span>
                        <span className={`text-xs ${selectedTier === key ? healthTiers[key].textLight : 'text-slate-400'}`}>
                          {healthTiers[key].count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Detail View for Selected Tier */}
                <div className={`rounded-xl border shadow-sm transition-colors overflow-hidden ${healthTiers[selectedTier].border} bg-white`}>
                  <div className={`px-5 py-4 border-b flex items-center justify-between ${healthTiers[selectedTier].bgLight} ${healthTiers[selectedTier].border}`}>
                    <h3 className={`text-lg font-bold flex items-center gap-2 ${healthTiers[selectedTier].textLight}`}>
                      <div className={`h-2.5 w-2.5 rounded-full ${healthTiers[selectedTier].color}`} />
                      {healthTiers[selectedTier].label} Patients
                    </h3>
                    <div className="flex items-center gap-3">
                      {selectedTier === "critical" && (
                        <Badge variant="destructive" className="bg-red-600 hover:bg-red-700 font-semibold shadow-sm">
                          Immediate Action Required
                        </Badge>
                      )}
                      <Button variant="outline" size="sm" className="h-8 bg-white/50 backdrop-blur-sm border-white/40">
                        Export List
                      </Button>
                    </div>
                  </div>
                  
                  <ScrollArea className="h-[350px]">
                    <div className="divide-y divide-slate-100">
                      {membersByTier[selectedTier]?.map((member) => (
                        <div key={member.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-slate-50 transition-colors group gap-4">
                          <div className="flex items-center gap-4">
                            <div className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ${
                              selectedTier === 'critical' ? 'bg-red-100 text-red-700 border border-red-200' : 
                              selectedTier === 'atRisk' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 
                              selectedTier === 'healthy' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 
                              'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            }`}>
                              {member.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">{member.name}</div>
                              <div className="text-sm text-slate-600 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span className={`inline-flex items-center font-medium ${member.daysSinceVisit > 14 ? 'text-amber-600' : ''}`}>
                                  {member.daysSinceVisit} days since visit
                                </span>
                                <span className="text-slate-300 hidden sm:inline">&bull;</span>
                                <span className="text-slate-500">{member.status}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className="text-right mr-2 hidden md:block">
                              <div className="text-sm font-semibold text-slate-900">${member.mrr}/mo</div>
                              <div className="text-xs text-slate-500">Revenue at Risk</div>
                            </div>
                            <Separator orientation="vertical" className="h-8 hidden md:block" />
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="outline" size="icon" className="h-9 w-9 text-slate-500 hover:text-slate-900 hover:bg-slate-100">
                                    <MessageSquare className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Send SMS</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="outline" size="icon" className="h-9 w-9 text-slate-500 hover:text-slate-900 hover:bg-slate-100">
                                    <Mail className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Send Email</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <Button variant="default" size="sm" className="h-9 text-xs">
                              Profile
                            </Button>
                          </div>
                        </div>
                      ))}
                      {(!membersByTier[selectedTier] || membersByTier[selectedTier].length === 0) && (
                        <div className="text-center py-12">
                          <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
                          <div className="font-medium text-slate-900">All clear</div>
                          <div className="text-sm text-slate-500">No members currently in this tier.</div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Context & Actions */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-white shadow-sm border-slate-200">
                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                  <div className="text-2xl font-bold text-slate-900">4</div>
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">New Leads</div>
                </CardContent>
              </Card>
              <Card className="bg-white shadow-sm border-slate-200">
                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                  <div className="text-2xl font-bold text-slate-900">12</div>
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">Stale Leads</div>
                </CardContent>
              </Card>
              <Card className="bg-white shadow-sm border-slate-200 col-span-2">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <div className="text-lg font-bold text-red-600">3</div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-0.5">Overdue Payments</div>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 border-red-200 text-red-700 hover:bg-red-50">Resolve</Button>
                </CardContent>
              </Card>
            </div>

            {/* Financial Context */}
            <Card className="bg-white shadow-sm border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-slate-500" />
                  Financial Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <div className="flex items-end justify-between mb-1">
                    <div className="text-sm text-slate-500">Monthly Recurring Revenue</div>
                    <div className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">{kpis.mrr.change}</div>
                  </div>
                  <div className="text-3xl font-bold text-slate-900 tracking-tight">{kpis.mrr.value}</div>
                  <div className="h-[80px] mt-4 -mx-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={mrrTrend}>
                        <defs>
                          <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#10b981" 
                          strokeWidth={2}
                          fillOpacity={1} 
                          fill="url(#mrrGradient)" 
                        />
                        <RechartsTooltip 
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          formatter={(value) => [`$${value}`, 'MRR']}
                          labelStyle={{ color: '#64748b' }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Revenue at Risk</div>
                  <div className="flex items-center justify-between">
                    <div className="text-xl font-bold text-slate-900">$2,635</div>
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 font-semibold">
                      17 members
                    </Badge>
                  </div>
                  <Progress value={(17/187)*100} className="h-1.5 mt-3" indicatorClassName="bg-red-500" />
                </div>
              </CardContent>
            </Card>

            {/* Retention Activity Log */}
            <Card className="bg-white shadow-sm border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-slate-500" />
                    System Activity
                  </div>
                  <Button variant="link" size="sm" className="text-xs h-7 px-2 text-slate-500 hover:text-slate-900">
                    View All
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {retentionActivity.map((activity) => (
                    <div key={activity.id} className="flex gap-3 group">
                      <div className="mt-0.5">
                        <div className={`p-1.5 rounded-full ${
                          activity.type === 'email' ? 'bg-blue-50 text-blue-500 group-hover:bg-blue-100 group-hover:text-blue-600' :
                          activity.type === 'sms' ? 'bg-emerald-50 text-emerald-500 group-hover:bg-emerald-100 group-hover:text-emerald-600' :
                          'bg-slate-100 text-slate-400 group-hover:bg-slate-200 group-hover:text-slate-600'
                        } transition-colors`}>
                          {activity.type === 'email' && <Mail className="h-3.5 w-3.5" />}
                          {activity.type === 'sms' && <MessageSquare className="h-3.5 w-3.5" />}
                          {activity.type === 'task' && <CheckCircle2 className="h-3.5 w-3.5" />}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900 leading-snug">{activity.action}</div>
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                          <span className="font-medium text-slate-600">{activity.target}</span>
                          <span className="text-slate-300">&bull;</span>
                          <span>{activity.time}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

          </div>
        </div>

      </div>
    </div>
  );
}
