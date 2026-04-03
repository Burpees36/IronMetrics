import React, { useState } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  CheckCircle2, 
  ArrowRight, 
  TrendingUp, 
  Users, 
  CreditCard, 
  MessageSquare,
  Activity,
  Zap,
  ShieldAlert
} from "lucide-react";

// Mock Data
const MOCK_INTERVENTIONS = [
  {
    id: "int-1",
    category: "billing",
    title: "Recover 4 High-Value Failed Payments",
    description: "Four members with LTV > $2k had payments fail in the last 48 hours. Smart Actions can send a personalized recovery link.",
    impactLevel: "high",
    urgency: "immediate",
    score: 94,
    expectedRevenue: "$840",
    affectedMembers: 4,
    actionSteps: ["Send personalized recovery SMS", "Queue follow-up email if unresolved in 24h"],
    icon: CreditCard,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20"
  },
  {
    id: "int-2",
    category: "retention",
    title: "Re-engage 12 Slipping Members",
    description: "Members who haven't attended in 14+ days but typically come 3x/week. AI suggests sending a 'We miss you' check-in.",
    impactLevel: "high",
    urgency: "high",
    score: 88,
    expectedRevenue: "$2,100",
    affectedMembers: 12,
    actionSteps: ["Generate draft SMS messages", "Assign coaches to call high-risk individuals"],
    icon: Users,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20"
  },
  {
    id: "int-3",
    category: "leads",
    title: "Follow up with 8 Stale Leads",
    description: "Leads who completed trials but haven't converted in 7 days. Offer a limited-time joining bonus.",
    impactLevel: "medium",
    urgency: "medium",
    score: 76,
    expectedRevenue: "$1,200",
    affectedMembers: 8,
    actionSteps: ["Send automated email sequence", "Apply tag 'Needs Follow Up'"],
    icon: TrendingUp,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20"
  },
  {
    id: "int-4",
    category: "onboarding",
    title: "Check in with 5 New Members",
    description: "New members completing their first week. Send a quick survey to ensure they are settling in well.",
    impactLevel: "medium",
    urgency: "low",
    score: 65,
    expectedRevenue: "LTV Boost",
    affectedMembers: 5,
    actionSteps: ["Send 1-week survey via email"],
    icon: MessageSquare,
    color: "text-teal-500",
    bgColor: "bg-teal-500/10",
    borderColor: "border-teal-500/20"
  },
  {
    id: "int-5",
    category: "campaign",
    title: "Launch Summer Prep Campaign",
    description: "Historical data shows a 20% bump in signups in May. AI suggests starting a referral campaign now.",
    impactLevel: "high",
    urgency: "low",
    score: 60,
    expectedRevenue: "$3,500+",
    affectedMembers: "All Active",
    actionSteps: ["Generate campaign copy", "Create landing page draft"],
    icon: Zap,
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/10",
    borderColor: "border-indigo-500/20"
  }
];

const RISK_RADAR = [
  { name: "Sarah Jenkins", riskScore: 92, daysSinceVisit: 21, signals: ["Declining attendance", "Missed goal benchmark"] },
  { name: "Mike Chen", riskScore: 85, daysSinceVisit: 14, signals: ["Failed payment", "No app logins"] },
  { name: "Emma Woods", riskScore: 78, daysSinceVisit: 18, signals: ["Declining attendance"] },
  { name: "David Miller", riskScore: 71, daysSinceVisit: 12, signals: ["Injury reported"] },
];

export default function StrategicOps() {
  const [completedActions, setCompletedActions] = useState<Set<string>>(new Set());

  const handleAction = (id: string) => {
    setCompletedActions(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const interventions = MOCK_INTERVENTIONS.filter(i => !completedActions.has(i.id));

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-slate-50 font-sans p-6 md:p-8 lg:p-10">
      
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Strategic Ops Board</h1>
        <p className="text-slate-400 mt-2 text-lg">AI-driven insights and immediate action items for gym health.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-200 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" />
              Recommended Actions
            </h2>
            <Badge variant="outline" className="bg-slate-900 border-slate-800 text-slate-300">
              {interventions.length} Items Pending
            </Badge>
          </div>

          <div className="flex flex-col gap-4">
            {interventions.length === 0 ? (
              <Card className="bg-slate-900/50 border-slate-800 p-12 text-center flex flex-col items-center justify-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-4" />
                <h3 className="text-xl font-medium text-slate-200 mb-2">All Caught Up</h3>
                <p className="text-slate-400">Your gym is operating smoothly. No immediate actions required.</p>
              </Card>
            ) : (
              interventions.map((intervention) => {
                const Icon = intervention.icon;
                return (
                  <Card key={intervention.id} className={`bg-slate-900 border-slate-800 overflow-hidden relative transition-all duration-300 hover:border-slate-700`}>
                    {intervention.urgency === 'immediate' && (
                      <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                    )}
                    <CardContent className="p-0">
                      <div className="flex flex-col md:flex-row">
                        <div className={`p-6 flex flex-col items-center justify-center md:w-32 border-b md:border-b-0 md:border-r border-slate-800 ${intervention.bgColor}`}>
                          <Icon className={`w-8 h-8 mb-2 ${intervention.color}`} />
                          <span className="text-2xl font-bold text-slate-100">{intervention.score}</span>
                          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">AI Score</span>
                        </div>
                        
                        <div className="p-6 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="text-lg font-semibold text-slate-100">{intervention.title}</h3>
                              {intervention.urgency === 'immediate' && (
                                <Badge className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border-none">Immediate</Badge>
                              )}
                            </div>
                            <p className="text-slate-400 text-sm mb-4 leading-relaxed">
                              {intervention.description}
                            </p>
                          </div>
                          
                          <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
                            <div className="flex items-center gap-6">
                              <div className="flex flex-col">
                                <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Impact</span>
                                <span className="text-sm font-medium text-emerald-400">{intervention.expectedRevenue}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Audience</span>
                                <span className="text-sm font-medium text-slate-300">{intervention.affectedMembers} Members</span>
                              </div>
                            </div>
                            
                            <Button 
                              onClick={() => handleAction(intervention.id)}
                              className="bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-200 border border-slate-700 hover:border-emerald-500 transition-colors"
                            >
                              Execute Smart Action
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6">
          
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-5 flex flex-col items-center justify-center text-center h-full">
                <span className="text-sm text-slate-400 font-medium uppercase tracking-wider mb-2">Revenue Protected</span>
                <span className="text-3xl font-bold text-emerald-400">$4,250</span>
                <span className="text-xs text-slate-500 mt-2">Past 30 days</span>
              </CardContent>
            </Card>
            
            <Card className="bg-slate-900 border-slate-800 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity"></div>
              <CardContent className="p-5 flex flex-col items-center justify-center text-center h-full relative z-10">
                <span className="text-sm text-slate-400 font-medium uppercase tracking-wider mb-2">AI Tasks Queued</span>
                <span className="text-3xl font-bold text-slate-100">14</span>
                <span className="text-xs text-slate-500 mt-2">Processing in background</span>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-slate-900 border-slate-800 shadow-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold text-slate-200">Retention Stability Index</CardTitle>
              <CardDescription className="text-slate-400">Gym health based on attendance and billing</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 pb-6">
              <div className="flex flex-col items-center justify-center">
                <div className="relative w-48 h-48 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle 
                      cx="50" cy="50" r="45" 
                      fill="none" stroke="currentColor" 
                      className="text-slate-800" strokeWidth="10" 
                    />
                    <circle 
                      cx="50" cy="50" r="45" 
                      fill="none" stroke="currentColor" 
                      className="text-emerald-500" strokeWidth="10" 
                      strokeDasharray="282.7" strokeDashoffset="56.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-5xl font-bold text-slate-100">82</span>
                    <span className="text-sm font-medium text-emerald-400 mt-1">Healthy</span>
                  </div>
                </div>
                <div className="w-full mt-6 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Trend</span>
                    <span className="text-emerald-400 font-medium">+2.4 pts</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Industry Avg</span>
                    <span className="text-slate-300">76</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 flex-1">
            <CardHeader className="pb-3 border-b border-slate-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-500" />
                  Risk Radar
                </CardTitle>
                <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-none">
                  {RISK_RADAR.length} Critical
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[320px]">
                <div className="flex flex-col">
                  {RISK_RADAR.map((member, i) => (
                    <div key={i} className="p-4 border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium text-slate-200">{member.name}</h4>
                          <p className="text-xs text-slate-500">{member.daysSinceVisit} days since last visit</p>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className={`text-sm font-bold ${member.riskScore > 90 ? 'text-red-400' : 'text-amber-400'}`}>
                            {member.riskScore} Risk
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {member.signals.map((signal, j) => (
                          <span key={j} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400">
                            {signal}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="p-4 border-t border-slate-800">
                <Button variant="ghost" className="w-full text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-sm">
                  View Full Risk Report
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}