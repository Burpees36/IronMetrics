import React, { useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Clock,
  Mail,
  MessageSquare,
  Play,
  Settings,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import "./_group.css";

// --- Components (inline for mockup) ---

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`bg-card text-card-foreground rounded-xl border shadow-sm ${className || ""}`}>
      {children}
    </div>
  );
}

function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: "default" | "secondary" | "outline" | "destructive" | "success" | "warning";
  className?: string;
}) {
  const variants = {
    default: "bg-primary text-primary-foreground hover:bg-primary/80",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/80",
    success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20",
    warning: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20",
  };
  return (
    <div
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variants[variant]} ${className || ""}`}
    >
      {children}
    </div>
  );
}

function Switch({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (c: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={`peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-primary" : "bg-input"
      }`}
    >
      <span
        className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function Button({
  children,
  variant = "default",
  size = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: "default" | "outline" | "ghost" | "secondary" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}) {
  const variants = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    link: "text-primary underline-offset-4 hover:underline",
  };
  const sizes = {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-md px-3",
    lg: "h-11 rounded-md px-8",
    icon: "h-10 w-10",
  };
  return (
    <button
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className || ""}`}
    >
      {children}
    </button>
  );
}

function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={`relative h-2 w-full overflow-hidden rounded-full bg-secondary ${className || ""}`}>
      <div
        className="h-full w-full flex-1 bg-primary transition-all"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </div>
  );
}

// --- Data ---

const AUTO_LANES = [
  {
    id: "outreach",
    title: "Retention Outreach",
    description: "Engages members whose attendance drops below their baseline.",
    icon: Users,
    defaultActive: true,
    impact: "12 Saved",
    impactValue: "$1,850/mo",
    successRate: 78,
    recentActivity: [
      {
        id: "act-1",
        member: "Sarah Jenkins",
        action: "Sent 'Checking In' email",
        time: "10m ago",
        trigger: "Attendance dropped 40%",
        status: "success",
      },
      {
        id: "act-2",
        member: "Mike Ross",
        action: "Sent 'Missed you at 6AM' SMS",
        time: "1h ago",
        trigger: "Missed 3 regular classes",
        status: "success",
      },
      {
        id: "act-3",
        member: "David Chen",
        action: "Flagged for manual review",
        time: "2h ago",
        trigger: "Injury suspected (from notes)",
        status: "warning",
      },
    ],
  },
  {
    id: "billing",
    title: "Billing Recovery",
    description: "Follows up on failed payments and past-due invoices.",
    icon: ShieldAlert,
    defaultActive: true,
    impact: "$550 Recovered",
    impactValue: "This week",
    successRate: 92,
    recentActivity: [
      {
        id: "act-4",
        member: "Emma Thompson",
        action: "Sent payment update link",
        time: "1h ago",
        trigger: "Card expired",
        status: "success",
      },
      {
        id: "act-5",
        member: "James Wilson",
        action: "Retried card (Succeeded)",
        time: "4h ago",
        trigger: "Insufficient funds (Day 3)",
        status: "success",
      },
    ],
  },
  {
    id: "leads",
    title: "Lead Nurture",
    description: "Follows up with stale leads and trial drop-offs.",
    icon: Zap,
    defaultActive: false,
    impact: "0 Conversions",
    impactValue: "Autopilot Off",
    successRate: 0,
    recentActivity: [
      {
        id: "act-6",
        member: "Alex Rivera",
        action: "Drafted follow-up email",
        time: "1d ago",
        trigger: "Trial ended 7 days ago",
        status: "pending",
      },
    ],
  },
];

const MANUAL_TASKS = [
  {
    id: "task-1",
    lane: "outreach",
    type: "Critical Drop-off",
    member: "David Chen",
    reason: "Attendance hit 0 for 3 weeks. Prior notes mention shoulder pain.",
    confidence: "Low (Needs context)",
    draftSnippet: "Hey David, noticed you haven't been in lately. How's the shoulder holding up?",
  },
  {
    id: "task-2",
    lane: "outreach",
    type: "High Risk",
    member: "Jessica Lee",
    reason: "Skipped her usual 5:30PM class 4 times. High flight risk.",
    confidence: "Medium (Requires personal touch)",
    draftSnippet: "Jessica! The 5:30 crew is missing you. Everything okay?",
  },
  {
    id: "task-3",
    lane: "leads",
    type: "Stale Lead",
    member: "Alex Rivera",
    reason: "Finished 3-day trial last week. No response to automated welcome.",
    confidence: "Medium",
    draftSnippet: "Alex, hope you recovered from Monday's WOD. Ready to make it official?",
  },
];

export function AutopilotDashboard() {
  const [activeLanes, setActiveLanes] = useState<Record<string, boolean>>({
    outreach: true,
    billing: true,
    leads: false,
  });

  const toggleLane = (id: string) => {
    setActiveLanes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="min-h-screen bg-background font-sans text-foreground flex flex-col selection:bg-primary/20">
      {/* Top Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center justify-between px-6 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold font-display tracking-tight leading-none">
                Autopilot
              </h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                System Active &bull; Last run 2m ago
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="hidden sm:flex">
              <Activity className="h-4 w-4 mr-2" />
              System Logs
            </Button>
            <Button size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Configure Rules
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-8">
        {/* Global Impact Summary */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-5 flex flex-col justify-between bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Revenue Saved (30d)</p>
                  <p className="text-3xl font-display font-bold text-foreground">$2,400</p>
                </div>
                <div className="p-2 bg-primary/20 rounded-full text-primary">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm font-medium text-primary">
                <ArrowRight className="h-4 w-4 mr-1 -rotate-45" />
                +14% vs last month
              </div>
            </Card>
            
            <Card className="p-5 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Automated Actions</p>
                  <p className="text-3xl font-display font-bold text-foreground">142</p>
                </div>
                <div className="p-2 bg-secondary rounded-full text-muted-foreground">
                  <Activity className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm text-muted-foreground">
                <span className="text-foreground font-medium mr-1">45 hours</span>
                manual work saved
              </div>
            </Card>

            <Card className="p-5 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Intervention Success</p>
                  <p className="text-3xl font-display font-bold text-foreground">73%</p>
                </div>
                <div className="p-2 bg-secondary rounded-full text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <Progress value={73} className="h-1.5" />
              </div>
            </Card>
          </div>
        </section>

        {/* Autopilot Lanes */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-semibold">Automation Lanes</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {AUTO_LANES.map((lane) => {
              const isActive = activeLanes[lane.id];
              const Icon = lane.icon;
              return (
                <Card key={lane.id} className={`flex flex-col overflow-hidden transition-all duration-200 ${isActive ? 'border-primary/30 shadow-md ring-1 ring-primary/10' : 'opacity-80 grayscale-[0.2]'}`}>
                  {/* Lane Header */}
                  <div className="p-5 border-b bg-muted/30">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isActive ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-base">{lane.title}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{isActive ? 'Monitoring active' : 'Paused'}</p>
                        </div>
                      </div>
                      <Switch checked={isActive} onCheckedChange={() => toggleLane(lane.id)} />
                    </div>
                    
                    <p className="text-sm text-muted-foreground min-h-[40px]">
                      {lane.description}
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-2 bg-background rounded-md p-3 border shadow-sm">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Impact</p>
                        <p className={`text-sm font-semibold ${isActive ? 'text-primary' : ''}`}>{lane.impact}</p>
                        <p className="text-[10px] text-muted-foreground">{lane.impactValue}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Success</p>
                        <p className="text-sm font-semibold">{lane.successRate}%</p>
                        <Progress value={lane.successRate} className="mt-1.5 h-1" />
                      </div>
                    </div>
                  </div>

                  {/* Lane Feed */}
                  <div className="p-0 flex-1 flex flex-col bg-background/50">
                    <div className="px-4 py-3 border-b bg-background flex justify-between items-center sticky top-0">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent Activity</span>
                      <Button variant="ghost" size="sm" className="h-6 text-xs px-2 -mr-2">View All</Button>
                    </div>
                    
                    <div className="divide-y overflow-y-auto max-h-[300px] flex-1">
                      {lane.recentActivity.map((act) => (
                        <div key={act.id} className="p-4 hover:bg-muted/50 transition-colors text-sm group relative">
                          {act.status === "warning" && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 rounded-r-full" />
                          )}
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium">{act.member}</span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {act.time}
                            </span>
                          </div>
                          <p className="text-muted-foreground mb-2">{act.action}</p>
                          <div className="flex items-center gap-1.5 text-xs bg-secondary/50 rounded p-1.5">
                            <Zap className="h-3 w-3 text-primary" />
                            <span className="truncate">{act.trigger}</span>
                          </div>
                        </div>
                      ))}
                      {!isActive && (
                        <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center h-full">
                          <Play className="h-8 w-8 mb-2 opacity-20" />
                          <p className="text-sm">Turn on Autopilot to<br/>automate these tasks.</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Lane Footer */}
                  <div className="p-3 border-t bg-muted/20">
                    <Button variant="ghost" className="w-full text-xs h-8 justify-between">
                      Configure Thresholds <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Manual Review Queue */}
        <section className="pt-6 border-t border-border/50">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-display font-semibold flex items-center gap-2">
                Requires Review
                <Badge variant="secondary" className="font-sans ml-2">3 Pending</Badge>
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Tasks that fell outside autopilot confidence thresholds or require personal knowledge.
              </p>
            </div>
            <Button variant="outline">Review All in Queue</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {MANUAL_TASKS.map((task) => (
              <Card key={task.id} className="flex flex-col hover:border-primary/50 transition-colors group">
                <div className="p-4 border-b">
                  <div className="flex justify-between items-start mb-3">
                    <Badge variant={task.type.includes('Critical') ? 'destructive' : 'warning'}>
                      {task.type}
                    </Badge>
                    <span className="text-xs font-medium text-muted-foreground capitalize flex items-center gap-1">
                      {task.lane === 'outreach' ? <Users className="h-3 w-3"/> : <Zap className="h-3 w-3" />}
                      {task.lane}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg">{task.member}</h3>
                  <div className="mt-2 text-sm flex gap-2 text-muted-foreground">
                    <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <span>{task.reason}</span>
                  </div>
                </div>
                
                <div className="p-4 bg-muted/30 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <Sparkles className="h-3 w-3 text-primary" />
                      AI Draft
                    </div>
                    <div className="bg-background border rounded-lg p-3 text-sm italic text-foreground/80 relative">
                      "{task.draftSnippet}"
                      <div className="absolute -left-1.5 top-4 w-3 h-3 bg-background border-l border-t rotate-[-45deg]"></div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mt-5">
                    <Button variant="outline" className="w-full text-xs h-9">
                      <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                      Edit
                    </Button>
                    <Button className="w-full text-xs h-9">
                      <Mail className="h-3.5 w-3.5 mr-1.5" />
                      Send Now
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}
