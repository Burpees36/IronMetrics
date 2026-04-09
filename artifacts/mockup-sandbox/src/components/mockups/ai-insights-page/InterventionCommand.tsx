import React, { useState } from "react";
import { 
  AlertTriangle, 
  ArrowRight, 
  BarChart3, 
  CheckCircle2, 
  ChevronDown, 
  ChevronRight, 
  Clock, 
  DollarSign, 
  ShieldAlert, 
  Sparkles, 
  TrendingUp, 
  Users, 
  Zap,
  Activity,
  Target
} from "lucide-react";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Progress } from "../../ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../../ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "../../ui/avatar";

// --- Mock Data ---

const METRICS = {
  rsiScore: 84,
  atRiskMembers: 12,
  pendingTasks: 24,
  revenueImpact: 4250,
};

type Intervention = {
  id: string;
  title: string;
  category: "retention" | "billing" | "onboarding" | "leads" | "campaign";
  description: string;
  impactLevel: "high" | "medium" | "low";
  urgency: "critical" | "high" | "normal";
  score: number;
  expectedRevenue: number;
  affectedMembers: number;
  actionSteps: string[];
};

const INTERVENTIONS: Intervention[] = [
  {
    id: "int-1",
    title: "High-Risk Churn Cluster Detected",
    category: "retention",
    description: "7 members in the 6am class have shown declining attendance patterns over the last 3 weeks. Historical data suggests 80% probability of churn within 14 days without intervention.",
    impactLevel: "high",
    urgency: "critical",
    score: 92,
    expectedRevenue: 1250,
    affectedMembers: 7,
    actionSteps: [
      "Send personalized 'Missed You' SMS via AI Automation",
      "Alert Coach Sarah to check-in during next class",
      "Offer complimentary 1-on-1 goal review session"
    ]
  },
  {
    id: "int-2",
    title: "Failed Payment Recovery",
    category: "billing",
    description: "Multiple failed payments detected for active members. Immediate outreach required to prevent service interruption and revenue loss.",
    impactLevel: "high",
    urgency: "high",
    score: 88,
    expectedRevenue: 840,
    affectedMembers: 4,
    actionSteps: [
      "Trigger billing recovery email sequence",
      "Pause access for payments overdue > 7 days",
      "Generate task for front desk follow-up"
    ]
  },
  {
    id: "int-3",
    title: "Onboarding Drop-off Alert",
    category: "onboarding",
    description: "New members from last month's promo are missing their 3rd week check-ins. Crucial window for habit formation.",
    impactLevel: "medium",
    urgency: "high",
    score: 75,
    expectedRevenue: 600,
    affectedMembers: 5,
    actionSteps: [
      "Send 21-day milestone celebration message",
      "Recommend beginner-friendly specialty class",
      "Assign buddy coach for next visit"
    ]
  },
  {
    id: "int-4",
    title: "Lead Conversion Opportunity",
    category: "leads",
    description: "15 warm leads from Facebook campaign have not been contacted in 48 hours. Conversion probability dropping rapidly.",
    impactLevel: "high",
    urgency: "normal",
    score: 82,
    expectedRevenue: 2200,
    affectedMembers: 15,
    actionSteps: [
      "Launch aggressive SMS follow-up sequence",
      "Offer limited-time trial discount",
      "Route high-intent leads to Head Coach"
    ]
  },
  {
    id: "int-5",
    title: "Reactivation Campaign Ready",
    category: "campaign",
    description: "AI identified 40 former members who cancelled > 6 months ago but showed high engagement during their tenure. Prime candidates for win-back.",
    impactLevel: "medium",
    urgency: "normal",
    score: 68,
    expectedRevenue: 1500,
    affectedMembers: 40,
    actionSteps: [
      "Approve 'Welcome Back' email draft",
      "Enable targeted Facebook retargeting audience",
      "Set up tracking tags for campaign"
    ]
  }
];

const RISK_RADAR = [
  { id: "m1", name: "Marcus Johnson", score: 94, daysSinceVisit: 18, signals: ["Declining attendance", "Missed goal review"], initials: "MJ" },
  { id: "m2", name: "Sarah Chen", score: 88, daysSinceVisit: 14, signals: ["Failed payment", "Unopened emails"], initials: "SC" },
  { id: "m3", name: "David Miller", score: 82, daysSinceVisit: 12, signals: ["Late cancellations", "Injury reported"], initials: "DM" },
  { id: "m4", name: "Elena Rodriguez", score: 79, daysSinceVisit: 10, signals: ["Schedule change", "Low engagement"], initials: "ER" },
  { id: "m5", name: "James Wilson", score: 75, daysSinceVisit: 9, signals: ["Missed 3 consecutive classes"], initials: "JW" }
];

// --- Components ---

function UrgencyBadge({ urgency }: { urgency: string }) {
  if (urgency === "critical") {
    return <Badge variant="destructive" className="bg-red-600/20 text-red-500 border-red-600/30 uppercase tracking-wider text-xs">Critical</Badge>;
  }
  if (urgency === "high") {
    return <Badge variant="outline" className="bg-orange-500/20 text-orange-500 border-orange-500/30 uppercase tracking-wider text-xs">High</Badge>;
  }
  return <Badge variant="outline" className="bg-amber-500/20 text-amber-500 border-amber-500/30 uppercase tracking-wider text-xs">Normal</Badge>;
}

function CategoryIcon({ category }: { category: string }) {
  switch (category) {
    case "retention": return <ShieldAlert className="h-5 w-5 text-red-400" />;
    case "billing": return <DollarSign className="h-5 w-5 text-emerald-400" />;
    case "onboarding": return <CheckCircle2 className="h-5 w-5 text-blue-400" />;
    case "leads": return <Target className="h-5 w-5 text-purple-400" />;
    case "campaign": return <Zap className="h-5 w-5 text-amber-400" />;
    default: return <Activity className="h-5 w-5 text-zinc-400" />;
  }
}

export function InterventionCommand() {
  const [expandedId, setExpandedId] = useState<string | null>(INTERVENTIONS[0].id);
  const [radarOpen, setRadarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-amber-500/30">
      
      {/* Top Navigation / Header bar */}
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-amber-500 flex items-center justify-center">
              <Zap className="h-5 w-5 text-zinc-950" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight leading-none text-zinc-100">Intervention Command</h1>
              <p className="text-xs text-zinc-500 font-medium">ForgeOS Intelligence</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">RSI Score</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-amber-500 leading-none">{METRICS.rsiScore}</span>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </div>
            </div>
            <div className="h-8 w-px bg-zinc-800" />
            <div className="flex flex-col items-end">
              <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">At Risk</span>
              <span className="text-xl font-bold text-red-500 leading-none">{METRICS.atRiskMembers}</span>
            </div>
            <div className="h-8 w-px bg-zinc-800" />
            <div className="flex flex-col items-end">
              <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Protected Rev</span>
              <span className="text-xl font-bold text-emerald-500 leading-none">${METRICS.revenueImpact}</span>
            </div>
            <div className="h-8 w-px bg-zinc-800" />
            <div className="flex flex-col items-end">
              <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">AI Tasks</span>
              <span className="text-xl font-bold text-blue-500 leading-none">{METRICS.pendingTasks}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12 space-y-8">
        
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-zinc-100 mb-2">Active Interventions</h2>
            <p className="text-zinc-400">AI-generated action items requiring your approval.</p>
          </div>
          <Button variant="outline" className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10 hover:text-amber-400">
            <Sparkles className="mr-2 h-4 w-4" />
            Run Manual Scan
          </Button>
        </div>

        {/* Interventions Stack */}
        <div className="space-y-4">
          {INTERVENTIONS.map((intervention) => (
            <Card 
              key={intervention.id} 
              className={`bg-zinc-900/50 border-zinc-800 overflow-hidden transition-all duration-200 ${expandedId === intervention.id ? 'ring-1 ring-amber-500/50 shadow-[0_0_30px_-10px_rgba(245,158,11,0.2)]' : 'hover:border-zinc-700'}`}
            >
              <div 
                className="p-6 cursor-pointer flex items-start gap-6"
                onClick={() => setExpandedId(expandedId === intervention.id ? null : intervention.id)}
              >
                <div className="flex-shrink-0 mt-1">
                  <div className="w-12 h-12 rounded-full bg-zinc-800/80 flex items-center justify-center border border-zinc-700/50">
                    <CategoryIcon category={intervention.category} />
                  </div>
                </div>
                
                <div className="flex-grow space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold text-zinc-100">{intervention.title}</h3>
                      <UrgencyBadge urgency={intervention.urgency} />
                    </div>
                    <div className="flex items-center gap-4 text-sm font-medium">
                      <div className="flex items-center gap-1.5 text-zinc-400">
                        <Users className="h-4 w-4" />
                        <span>{intervention.affectedMembers} members</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <DollarSign className="h-4 w-4" />
                        <span>${intervention.expectedRevenue}</span>
                      </div>
                      {expandedId === intervention.id ? (
                        <ChevronDown className="h-5 w-5 text-zinc-500 ml-2" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-zinc-500 ml-2" />
                      )}
                    </div>
                  </div>
                  
                  <p className="text-zinc-400 text-sm leading-relaxed max-w-2xl">
                    {intervention.description}
                  </p>
                  
                  <div className="flex items-center gap-3 pt-2">
                    <span className="text-xs uppercase tracking-wider font-semibold text-zinc-500">AI Confidence</span>
                    <div className="w-48 h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-amber-500 rounded-full" 
                        style={{ width: `${intervention.score}%` }} 
                      />
                    </div>
                    <span className="text-xs font-bold text-amber-500">{intervention.score}%</span>
                  </div>
                </div>
              </div>

              <Collapsible open={expandedId === intervention.id}>
                <CollapsibleContent>
                  <div className="px-6 pb-6 pt-2 ml-18 border-t border-zinc-800/50 mt-2">
                    <h4 className="text-sm uppercase tracking-wider font-bold text-zinc-500 mb-4 flex items-center gap-2">
                      <Zap className="h-4 w-4" /> Recommended Action Steps
                    </h4>
                    
                    <div className="space-y-3 mb-6">
                      {intervention.actionSteps.map((step, idx) => (
                        <div key={idx} className="flex items-start gap-3 bg-zinc-950/50 p-4 rounded-lg border border-zinc-800/50">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center text-xs font-bold border border-amber-500/30">
                            {idx + 1}
                          </div>
                          <span className="text-zinc-300 text-sm">{step}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Button className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold">
                        Approve & Execute Steps
                      </Button>
                      <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                        Edit Action Plan
                      </Button>
                      <Button variant="ghost" className="text-zinc-500 hover:text-zinc-300 ml-auto">
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>

        {/* Risk Radar Section */}
        <div className="pt-8">
          <Collapsible open={radarOpen} onOpenChange={setRadarOpen}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-red-500" />
                  Risk Radar
                </h3>
                <p className="text-sm text-zinc-500">Individual members flagged for high churn risk.</p>
              </div>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="border-zinc-800">
                  {radarOpen ? 'Hide Radar' : 'View All Members'}
                </Button>
              </CollapsibleTrigger>
            </div>
            
            <CollapsibleContent>
              <Card className="bg-zinc-900/50 border-zinc-800">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead className="text-zinc-500">Member</TableHead>
                      <TableHead className="text-zinc-500 text-right">Risk Score</TableHead>
                      <TableHead className="text-zinc-500">Last Visit</TableHead>
                      <TableHead className="text-zinc-500">Risk Signals</TableHead>
                      <TableHead className="text-zinc-500 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {RISK_RADAR.map((member) => (
                      <TableRow key={member.id} className="border-zinc-800/50 hover:bg-zinc-800/30">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 border border-zinc-700">
                              <AvatarFallback className="bg-zinc-800 text-zinc-300 text-xs">{member.initials}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-zinc-200">{member.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`font-bold ${member.score > 90 ? 'text-red-500' : 'text-orange-500'}`}>
                            {member.score}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-zinc-400 text-sm">
                            <Clock className="h-4 w-4" />
                            {member.daysSinceVisit} days ago
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2 flex-wrap">
                            {member.signals.map((signal, i) => (
                              <span key={i} className="px-2 py-1 rounded bg-zinc-800 text-zinc-300 text-xs">
                                {signal}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="text-amber-500 hover:text-amber-400 hover:bg-amber-500/10">
                            View Profile
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        </div>

      </main>
    </div>
  );
}

export default InterventionCommand;
