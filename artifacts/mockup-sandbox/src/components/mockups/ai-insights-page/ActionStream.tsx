import React, { useState } from "react";
import { 
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  Info,
  Sparkles,
  TrendingUp,
  Users,
  Settings,
  X,
  Activity,
  UserX,
  CreditCard,
  MessageSquare
} from "lucide-react";

// --- MOCK DATA ---

type Urgency = "immediate" | "this-week" | "this-month";
type ActionType = "intervention" | "risk-alert";

interface BaseFeedItem {
  id: string;
  type: ActionType;
  urgency: Urgency;
  score: number;
  timestamp: string;
}

interface Intervention extends BaseFeedItem {
  type: "intervention";
  category: "retention" | "billing" | "onboarding" | "leads" | "campaign";
  title: string;
  description: string;
  expectedRevenue?: number;
  affectedMembers?: number;
  actionSteps: string[];
}

interface RiskAlert extends BaseFeedItem {
  type: "risk-alert";
  member: {
    name: string;
    avatar?: string;
    initials: string;
    membership: string;
  };
  riskScore: number;
  daysSinceLastVisit: number;
  signals: string[];
}

type FeedItem = Intervention | RiskAlert;

const MOCK_HEALTH = {
  rsiScore: 82,
  atRiskMembers: 14,
  pendingTasks: 7,
  revenueImpact: 4250,
  trend: "+2.4%"
};

const MOCK_FEED: FeedItem[] = [
  {
    id: "int-1",
    type: "intervention",
    urgency: "immediate",
    category: "retention",
    score: 95,
    timestamp: "2 hours ago",
    title: "Launch 'Win-Back' sequence for 12 inactive members",
    description: "12 members on Unlimited plans have not attended in 14+ days. Their RSI scores have dropped below 60. Historical data shows a 45% churn probability if no contact is made within 3 days.",
    expectedRevenue: 2400,
    affectedMembers: 12,
    actionSteps: [
      "Draft personalized check-in SMS",
      "Apply 1-week pause to billing if requested",
      "Schedule 15-min goal review calls"
    ]
  },
  {
    id: "risk-1",
    type: "risk-alert",
    urgency: "immediate",
    score: 92,
    timestamp: "3 hours ago",
    member: {
      name: "Marcus Johnson",
      initials: "MJ",
      membership: "Unlimited Monthly"
    },
    riskScore: 92,
    daysSinceLastVisit: 21,
    signals: [
      "Missed 3 consecutive regular classes",
      "Ignored 2 automated check-in emails",
      "Card expiring in 15 days"
    ]
  },
  {
    id: "int-2",
    type: "intervention",
    urgency: "this-week",
    category: "billing",
    score: 88,
    timestamp: "5 hours ago",
    title: "Resolve 5 pending failed payments",
    description: "Multiple primary payment methods failed this morning. Sending an updated payment link via SMS resolves 70% of these within 24 hours.",
    expectedRevenue: 950,
    affectedMembers: 5,
    actionSteps: [
      "Send secure payment update link",
      "Pause class registration until resolved",
      "Queue follow-up call for tomorrow"
    ]
  },
  {
    id: "int-3",
    type: "intervention",
    urgency: "this-week",
    category: "leads",
    score: 84,
    timestamp: "1 day ago",
    title: "Follow up with 8 stale introductory offers",
    description: "8 leads completed their intro class last week but haven't signed up for a membership. Offering a 48-hour 10% discount converts roughly 20% of this segment.",
    expectedRevenue: 1200,
    affectedMembers: 8,
    actionSteps: [
      "Send 'Next Steps' email with discount code",
      "Assign follow-up tasks to coaching staff"
    ]
  },
  {
    id: "risk-2",
    type: "risk-alert",
    urgency: "this-month",
    score: 75,
    timestamp: "1 day ago",
    member: {
      name: "Sarah Chen",
      initials: "SC",
      membership: "3x/Week"
    },
    riskScore: 75,
    daysSinceLastVisit: 12,
    signals: [
      "Downgraded membership last month",
      "Attendance dropping week-over-week"
    ]
  },
  {
    id: "int-4",
    type: "intervention",
    urgency: "this-month",
    category: "onboarding",
    score: 65,
    timestamp: "2 days ago",
    title: "Review 30-day check-ins for new cohort",
    description: "You have 15 members reaching their 30-day mark this week. A milestone review helps establish long-term habits.",
    affectedMembers: 15,
    actionSteps: [
      "Send 30-day celebration email",
      "Prompt for Google Review if attendance is >10",
      "Offer 1-on-1 technique session"
    ]
  }
];

// --- COMPONENTS ---

const getUrgencyColor = (urgency: Urgency) => {
  switch (urgency) {
    case "immediate": return "bg-red-500";
    case "this-week": return "bg-amber-500";
    case "this-month": return "bg-blue-500";
  }
};

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "retention": return <Activity className="w-4 h-4" />;
    case "billing": return <CreditCard className="w-4 h-4" />;
    case "onboarding": return <UserX className="w-4 h-4" />;
    case "leads": return <Users className="w-4 h-4" />;
    case "campaign": return <MessageSquare className="w-4 h-4" />;
    default: return <Info className="w-4 h-4" />;
  }
};

const InterventionCard = ({ item, onDismiss }: { item: Intervention, onDismiss: (id: string) => void }) => {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden relative group">
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${getUrgencyColor(item.urgency)}`} />
      <div className="p-6 pl-8">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6">
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3 text-sm text-zinc-400">
              <span className="flex items-center gap-1.5 text-zinc-300 font-medium">
                {getCategoryIcon(item.category)}
                <span className="capitalize">{item.category}</span>
              </span>
              <div className="w-px h-4 bg-zinc-800" />
              <span className="flex items-center gap-1">
                <Brain className="w-3.5 h-3.5 text-indigo-400" /> Score {item.score}
              </span>
              <div className="w-px h-4 bg-zinc-800" />
              <span>{item.timestamp}</span>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-zinc-100 mb-2">{item.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{item.description}</p>
            </div>

            <div className="flex flex-wrap gap-6 pt-2">
              {item.expectedRevenue && (
                <div className="flex flex-col">
                  <span className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Impact</span>
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5" />
                    {item.expectedRevenue.toLocaleString()}
                  </span>
                </div>
              )}
              {item.affectedMembers && (
                <div className="flex flex-col">
                  <span className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Members</span>
                  <span className="text-zinc-300 font-medium flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {item.affectedMembers}
                  </span>
                </div>
              )}
            </div>

            <div className="bg-zinc-950/50 rounded-lg p-4 mt-4 border border-zinc-800/50">
              <h4 className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Recommended Steps</h4>
              <ul className="space-y-2">
                {item.actionSteps.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-sm text-zinc-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500/70 mt-0.5 shrink-0" />
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <div className="flex md:flex-col items-center md:items-end gap-3 shrink-0 w-full md:w-auto">
            <button className="w-full md:w-auto inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 bg-white text-zinc-950 hover:bg-zinc-200 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
              <Sparkles className="w-4 h-4 mr-2" />
              Take Action
            </button>
            <button 
              onClick={() => onDismiss(item.id)} 
              className="w-full md:w-auto inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const RiskAlertCard = ({ item, onDismiss }: { item: RiskAlert, onDismiss: (id: string) => void }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl overflow-hidden relative">
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${getUrgencyColor(item.urgency)}`} />
      <div className="p-6 pl-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300 font-medium border border-zinc-700">
              {item.member.initials}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-lg font-semibold text-zinc-100">{item.member.name}</h3>
                <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bg-red-500/10 text-red-400 border-red-500/20">
                  Risk Score: {item.riskScore}
                </div>
              </div>
              <div className="text-sm text-zinc-400 flex items-center gap-3">
                <span>{item.member.membership}</span>
                <div className="w-px h-3 bg-zinc-700" />
                <span className="flex items-center gap-1.5 text-amber-400/80">
                  <Clock className="w-3.5 h-3.5" />
                  {item.daysSinceLastVisit} days since last visit
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-zinc-700 bg-transparent hover:bg-zinc-800 h-9 px-3 text-zinc-300">
              Message
            </button>
            <button 
              onClick={() => setExpanded(!expanded)}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-zinc-800 h-9 w-9 text-zinc-400 hover:text-zinc-100"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <button 
              onClick={() => onDismiss(item.id)} 
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-zinc-800 h-9 w-9 text-zinc-500 hover:text-zinc-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-6 pt-6 border-t border-zinc-800 animate-in fade-in slide-in-from-top-2 duration-200">
            <h4 className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Risk Signals</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {item.signals.map((signal, idx) => (
                <div key={idx} className="flex items-center gap-2.5 bg-zinc-950 p-3 rounded-md border border-zinc-800/50">
                  <AlertTriangle className="w-4 h-4 text-amber-500/70 shrink-0" />
                  <span className="text-sm text-zinc-300">{signal}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 flex justify-end">
              <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-zinc-400 underline-offset-4 hover:underline hover:text-zinc-100 h-auto p-0">
                View Full Member Profile <ArrowRight className="w-4 h-4 ml-1.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function ActionStream() {
  const [feed, setFeed] = useState<FeedItem[]>(MOCK_FEED);

  const handleDismiss = (id: string) => {
    setFeed(feed.filter(item => item.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 selection:bg-zinc-800 font-sans flex flex-col relative pb-24">
      {/* Header / Health Bar */}
      <div className="sticky top-0 z-10 bg-[#09090b]/80 backdrop-blur-xl border-b border-zinc-800/60 pt-6 pb-4 px-6 md:px-10 lg:px-12">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white mb-1">AI Insights</h1>
              <p className="text-zinc-400 text-sm">Prioritized action feed</p>
            </div>
            
            <div className="w-px h-10 bg-zinc-800 hidden md:block" />
            
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center justify-center w-12 h-12 rounded-full border-[3px] border-emerald-500/20 bg-emerald-500/10">
                <span className="text-emerald-400 font-bold text-lg leading-none">{MOCK_HEALTH.rsiScore}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">RSI Score</span>
                <span className="text-sm text-emerald-400 font-medium flex items-center">
                  <TrendingUp className="w-3 h-3 mr-1" /> {MOCK_HEALTH.trend}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div className="bg-zinc-900 border border-zinc-800 rounded-full px-4 py-1.5 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-zinc-300"><strong className="text-white">{MOCK_HEALTH.atRiskMembers}</strong> At-Risk</span>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-full px-4 py-1.5 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span className="text-zinc-300"><strong className="text-white">{MOCK_HEALTH.pendingTasks}</strong> Tasks</span>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-full px-4 py-1.5 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span className="text-zinc-300"><strong className="text-white">${MOCK_HEALTH.revenueImpact.toLocaleString()}</strong> Impact</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Feed */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-6 md:px-10 lg:px-12 py-8">
        
        {feed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Inbox Zero</h2>
            <p className="text-zinc-400">All prioritized actions have been completed.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {feed.map((item) => (
              <div key={item.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both" style={{ animationDelay: `${feed.indexOf(item) * 50}ms` }}>
                {item.type === "intervention" ? (
                  <InterventionCard item={item as Intervention} onDismiss={handleDismiss} />
                ) : (
                  <RiskAlertCard item={item as RiskAlert} onDismiss={handleDismiss} />
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-8 right-8 z-50">
        <button 
          className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.5)] border border-zinc-700/50 bg-zinc-900 text-white hover:bg-zinc-800 hover:scale-105 transition-all duration-200 h-14 px-6 group"
        >
          <Settings className="w-5 h-5 mr-2.5 text-zinc-400 group-hover:text-white transition-colors" />
          <span className="font-semibold">AI Automation</span>
        </button>
      </div>

    </div>
  );
}
