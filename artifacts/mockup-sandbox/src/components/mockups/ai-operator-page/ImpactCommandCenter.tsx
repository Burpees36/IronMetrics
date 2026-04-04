import React, { useState } from "react";
import "./_group.css";
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  Bot,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  History,
  Mail,
  Play,
  Settings,
  Sparkles,
  TrendingUp,
  User,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

// --- Sub-components ---

const MetricCard = ({
  title,
  value,
  trend,
  icon: Icon,
  description,
}: {
  title: string;
  value: string;
  trend?: string;
  icon: React.ElementType;
  description?: string;
}) => (
  <Card className="bg-white/50 backdrop-blur-sm border-border/50 shadow-sm hover:shadow-md transition-all duration-200">
    <CardContent className="p-6">
      <div className="flex items-center justify-between space-y-0 pb-2">
        <h3 className="tracking-tight text-sm font-medium text-muted-foreground">
          {title}
        </h3>
        <div className="p-2 bg-primary/10 rounded-full">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
      <div className="flex flex-col gap-1 mt-2">
        <div className="text-3xl font-display font-bold text-foreground">
          {value}
        </div>
        {trend && (
          <p className="text-xs font-medium text-primary flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {trend}
          </p>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </div>
    </CardContent>
  </Card>
);

const AutopilotToggle = ({
  title,
  description,
  active,
  onToggle,
  icon: Icon,
  stats,
}: {
  title: string;
  description: string;
  active: boolean;
  onToggle: (v: boolean) => void;
  icon: React.ElementType;
  stats: string;
}) => (
  <div className="flex items-center justify-between p-4 rounded-xl border border-border/40 bg-white/30 hover:bg-white/60 transition-colors">
    <div className="flex items-start gap-4">
      <div className={`p-2.5 rounded-lg ${active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-sm text-foreground">{title}</h4>
          {active && (
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] h-5 px-1.5">
              Active
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        <p className="text-xs font-medium text-foreground mt-2">{stats}</p>
      </div>
    </div>
    <Switch checked={active} onCheckedChange={onToggle} className="data-[state=checked]:bg-primary" />
  </div>
);

const CompactTaskRow = ({ task }: { task: any }) => {
  return (
    <div className="group flex items-center justify-between py-3 px-4 hover:bg-muted/30 transition-colors border-b border-border/40 last:border-0">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="flex-shrink-0">
          {task.type === "outreach" && <div className="w-8 h-8 rounded-full bg-blue-100/50 flex items-center justify-center text-blue-600"><Users className="h-4 w-4" /></div>}
          {task.type === "billing" && <div className="w-8 h-8 rounded-full bg-red-100/50 flex items-center justify-center text-red-600"><CreditCard className="h-4 w-4" /></div>}
          {task.type === "lead" && <div className="w-8 h-8 rounded-full bg-amber-100/50 flex items-center justify-center text-amber-600"><User className="h-4 w-4" /></div>}
        </div>
        
        <div className="flex flex-col min-w-0 flex-1 gap-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground truncate">{task.member}</span>
            {task.priority === "critical" && <Badge variant="destructive" className="text-[9px] h-4 px-1 rounded-sm uppercase tracking-wider">Critical</Badge>}
            {task.priority === "high" && <Badge variant="outline" className="text-[9px] h-4 px-1 rounded-sm uppercase tracking-wider border-orange-500/30 text-orange-600 bg-orange-500/10">High Risk</Badge>}
            {task.auto && <Badge variant="outline" className="text-[9px] h-4 px-1 rounded-sm uppercase tracking-wider border-primary/30 text-primary bg-primary/10">Auto</Badge>}
          </div>
          <p className="text-xs text-muted-foreground truncate">{task.description}</p>
        </div>

        {task.dataPoints && task.dataPoints.length > 0 && (
          <div className="hidden md:flex items-center gap-1 flex-shrink-0 mr-4">
            <Sparkles className="h-3 w-3 text-primary/60" />
            <span className="text-[10px] text-muted-foreground">Uses: {task.dataPoints.join(", ")}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="sm" className="h-8 text-xs font-medium">Review</Button>
        <Button size="sm" className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5">
          <Mail className="h-3 w-3" />
          Send
        </Button>
      </div>
    </div>
  );
};

const HistoryTaskRow = ({ task }: { task: any }) => {
  return (
    <div className="flex items-center justify-between py-3 px-4 hover:bg-muted/30 transition-colors border-b border-border/40 last:border-0">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="flex-shrink-0">
          <Avatar className="h-8 w-8 border border-border">
            <AvatarFallback className="bg-muted text-xs">{task.member.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
        </div>
        
        <div className="flex flex-col min-w-0 flex-1 gap-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground truncate">{task.member}</span>
            <span className="text-xs text-muted-foreground">• {task.time}</span>
          </div>
          <p className="text-xs text-muted-foreground truncate">{task.action}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {task.outcome === "saved" && (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1.5">
            <CheckCircle2 className="h-3 w-3" /> Member Saved
          </Badge>
        )}
        {task.outcome === "recovered" && (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1.5">
            <ArrowUpRight className="h-3 w-3" /> $199 Recovered
          </Badge>
        )}
        {task.outcome === "pending" && (
          <Badge variant="outline" className="text-muted-foreground border-border gap-1.5">
            <Clock className="h-3 w-3" /> Awaiting Reply
          </Badge>
        )}
      </div>
    </div>
  );
};

// --- Mock Data ---

const pendingTasks = [
  { id: 1, type: "outreach", member: "Sarah Jenkins", priority: "critical", description: "Missed 12 classes in a row. Sent 1 email previously.", dataPoints: ["Tenure (3 yrs)", "Favorite Coach (Mike)"] },
  { id: 2, type: "billing", member: "David Chen", priority: "critical", description: "Card declined for $199 Unlimited plan. 3 days past due.", dataPoints: [] },
  { id: 3, type: "outreach", member: "Marcus Rivera", priority: "high", description: "Attendance down 60% this month vs last month.", dataPoints: ["Recent PR (Deadlift)"] },
  { id: 4, type: "outreach", member: "Emma Thompson", priority: "high", description: "Cancelled next 3 bookings. Uncharacteristic behavior.", dataPoints: ["Attendance trend"] },
  { id: 5, type: "lead", member: "James Wilson", priority: "normal", description: "Completed intro class 4 days ago, hasn't purchased membership.", dataPoints: ["Intro class date"] },
];

const historyTasks = [
  { id: 10, member: "Alex Foster", time: "2 hours ago", action: "Sent 'We miss you' check-in (Auto)", outcome: "saved" },
  { id: 11, member: "Jessica Taylor", time: "5 hours ago", action: "Sent billing failure notice (Auto)", outcome: "recovered" },
  { id: 12, member: "Ryan Patel", time: "1 day ago", action: "Sent personal check-in regarding injury", outcome: "pending" },
  { id: 13, member: "Morgan Smith", time: "1 day ago", action: "Followed up on lead inquiry (Auto)", outcome: "pending" },
];

// --- Main Component ---

export function ImpactCommandCenter() {
  const [autoOutreach, setAutoOutreach] = useState(true);
  const [autoBilling, setAutoBilling] = useState(true);
  const [autoLeads, setAutoLeads] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-primary/20">
      {/* Top Navigation / Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center shadow-sm">
              <Bot className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display font-semibold text-lg leading-none tracking-tight">AI Operator</h1>
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mt-1">Impact Command Center</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-4 mr-4 text-sm text-muted-foreground border-r border-border pr-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                214 Active
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                68 At-Risk
              </div>
            </div>
            <Button variant="outline" size="sm" className="h-9 gap-2 text-sm font-medium">
              <BarChart3 className="h-4 w-4" />
              Owner Brief
            </Button>
            <Button size="sm" className="h-9 gap-2 bg-foreground text-background hover:bg-foreground/90 font-medium">
              <Zap className="h-4 w-4" />
              Scan & Generate
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Row 1: Impact Metrics */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold tracking-tight">This Month's Impact</h2>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Updated 12 mins ago</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="Revenue Retained"
              value="$2,400"
              trend="+15% vs last month"
              icon={Activity}
              description="From saved members & recovered billing"
            />
            <MetricCard
              title="Members Saved"
              value="12"
              trend="8 from Auto-pilot"
              icon={Users}
              description="High-risk members returning to class"
            />
            <MetricCard
              title="Action Success Rate"
              value="73%"
              trend="Top tier performance"
              icon={CheckCircle2}
              description="Emails resulting in positive outcome"
            />
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Autopilot & Systems */}
          <div className="space-y-8">
            <section>
              <h2 className="font-display text-lg font-semibold tracking-tight mb-4">Auto-Pilot Systems</h2>
              <div className="space-y-3">
                <AutopilotToggle
                  title="Retention Outreach"
                  description="Auto-emails high-risk members."
                  active={autoOutreach}
                  onToggle={setAutoOutreach}
                  icon={Mail}
                  stats="8 members saved this month"
                />
                <AutopilotToggle
                  title="Billing Recovery"
                  description="Follows up on failed payments."
                  active={autoBilling}
                  onToggle={setAutoBilling}
                  icon={CreditCard}
                  stats="$1,200 recovered this month"
                />
                <AutopilotToggle
                  title="Lead Nurture"
                  description="Follows up with stale leads."
                  active={autoLeads}
                  onToggle={setAutoLeads}
                  icon={User}
                  stats="Requires configuration"
                />
              </div>
            </section>

            <Card className="border-border/60 shadow-sm bg-primary/5 border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Smart Personalization
                </CardTitle>
                <CardDescription className="text-xs">
                  AI uses member data to write highly contextual emails.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {["Favorite Class", "Coach Name", "Attendance Trend", "Recent PRs", "Tenure"].map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[10px] bg-white/60 hover:bg-white text-muted-foreground border-border/50">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Task Queue */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="pending" className="w-full h-full">
              <Card className="border-border/60 shadow-sm overflow-hidden flex flex-col h-full">
                <div className="border-b border-border/40 bg-white/50 backdrop-blur-sm px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="font-display text-lg font-semibold tracking-tight">Action Queue</h2>
                    <p className="text-sm text-muted-foreground mt-1">5 tasks require your review</p>
                  </div>
                  <div className="w-full sm:w-auto">
                    <TabsList className="grid w-full grid-cols-2 sm:w-[200px] h-9">
                      <TabsTrigger value="pending" className="text-xs">Pending (5)</TabsTrigger>
                      <TabsTrigger value="history" className="text-xs">History</TabsTrigger>
                    </TabsList>
                  </div>
                </div>

                <div className="flex-1 bg-white">
                  <TabsContent value="pending" className="m-0 h-full p-0">
                    <div className="divide-y divide-border/40">
                      {pendingTasks.map((task) => (
                        <CompactTaskRow key={task.id} task={task} />
                      ))}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="history" className="m-0 h-full p-0">
                    <div className="divide-y divide-border/40">
                      {historyTasks.map((task) => (
                        <HistoryTaskRow key={task.id} task={task} />
                      ))}
                    </div>
                  </TabsContent>
                </div>
              </Card>
            </Tabs>
          </div>

        </div>
      </main>
    </div>
  );
}
