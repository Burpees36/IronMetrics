import React, { useState } from 'react';
import { 
  AlertTriangle, 
  ArrowRight, 
  ArrowUpRight, 
  ArrowDownRight,
  CheckCircle2, 
  ChevronDown,
  ChevronRight,
  Clock, 
  CreditCard,
  Mail,
  MessageSquare,
  TrendingUp,
  UserX,
  Users,
  Zap
} from 'lucide-react';
import { 
  Area, 
  AreaChart, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip, 
  XAxis, 
  YAxis 
} from 'recharts';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

// --- MOCK DATA ---

const MRR_DATA = [
  { month: 'Jan', value: 24500 },
  { month: 'Feb', value: 25200 },
  { month: 'Mar', value: 25800 },
  { month: 'Apr', value: 26100 },
  { month: 'May', value: 27400 },
  { month: 'Jun', value: 28400 },
];

const KPIS = {
  activeMembers: { value: 187, change: '+4', trend: 'up' },
  mrr: { value: '$28.4k', change: '+$1.2k', trend: 'up' },
  engagement: { value: '72.3%', change: '-2.1%', trend: 'down' },
  retention: { value: '94.1%', change: '+0.5%', trend: 'up' },
  rsi: { value: 78.2, band: 'Strong' }
};

const ACTION_QUEUE = [
  {
    id: 'a1',
    category: 'critical',
    title: 'High-Value Member At Risk',
    description: 'Sarah Jenkins (Tier 1) hasn\'t attended a class in 14 days. RSI dropped to Critical.',
    impact: '$249/mo at risk',
    icon: UserX,
    actionLabel: 'Message Sarah',
    details: 'Sarah typically attends 4x/week. Last attendance was May 2nd. She opened the last 2 newsletters but didn\'t click. No active injuries on file.'
  },
  {
    id: 'a2',
    category: 'critical',
    title: 'Failed Payment (Overdue > 7 days)',
    description: 'Mike Robertson\'s card declined on May 1st for $189 monthly membership.',
    impact: '$189 cashflow',
    icon: CreditCard,
    actionLabel: 'Send Final Notice',
    details: 'Automated retries failed on May 3rd and May 5th. Error: Insufficient Funds. Member is scheduled for 5:30 PM class today.'
  },
  {
    id: 'a3',
    category: 'warning',
    title: '3 Stale Leads Require Follow-up',
    description: 'Leads from the "Summer Prep" campaign have gone >48 hours without a touchpoint.',
    impact: 'Potential $450/mo',
    icon: Clock,
    actionLabel: 'Review Leads',
    details: 'Names: Dave C., Amanda L., Marcus T. All expressed interest in Personal Training intro.'
  },
  {
    id: 'a4',
    category: 'warning',
    title: 'Engagement Drop Warning',
    description: '6am class attendance is down 15% WoW. Usually averages 18 members, currently 15.',
    impact: 'Class Health',
    icon: TrendingUp,
    actionLabel: 'View Class Report',
    details: 'Check if recent programming shift to more technical lifts is causing drop-off, or if it\'s seasonal.'
  },
  {
    id: 'a5',
    category: 'positive',
    title: 'Retention Milestone Approaching',
    description: '4 members hit their 1-year anniversary this week.',
    impact: 'Community Building',
    icon: CheckCircle2,
    actionLabel: 'Send Congrats',
    details: 'Members: Tom W., Lisa P., Greg S., Anna K. System has prepared draft emails.'
  }
];

const ACTIVITY_FEED = [
  { id: 1, type: 'email', text: 'Automated win-back sent to 4 churned members', time: '10 mins ago' },
  { id: 2, type: 'task', text: 'Coach Alex completed 2 check-in calls', time: '1 hour ago' },
  { id: 3, type: 'system', text: 'RSI scores recalculated for 187 members', time: '3 hours ago' },
  { id: 4, type: 'lead', text: 'New lead "James H." entered sequence', time: '5 hours ago' }
];

// --- COMPONENTS ---

const ActionCard = ({ item }: { item: typeof ACTION_QUEUE[0] }) => {
  const [expanded, setExpanded] = useState(false);

  const colors = {
    critical: 'bg-red-50 border-red-200 text-red-600',
    warning: 'bg-amber-50 border-amber-200 text-amber-600',
    positive: 'bg-emerald-50 border-emerald-200 text-emerald-600',
  };

  const Icon = item.icon;

  return (
    <div className={cn(
      "border rounded-xl transition-all duration-200 overflow-hidden",
      "bg-white hover:bg-slate-50",
      expanded ? "border-slate-300 shadow-sm" : "border-slate-200",
      item.category === 'critical' && !expanded && "border-red-200"
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
            <h4 className="font-semibold text-slate-900 truncate">{item.title}</h4>
            <span className="text-xs font-medium text-slate-500 whitespace-nowrap bg-slate-100 px-2 py-1 rounded-md">
              {item.impact}
            </span>
          </div>
          <p className="text-sm text-slate-500 line-clamp-2 pr-8 relative">
            {item.description}
          </p>
        </div>

        <div className="pt-2 text-slate-400">
          {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-100 ml-14">
          <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600 mb-4 border border-slate-200">
            {item.details}
          </div>
          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-700">
              Dismiss
            </Button>
            <Button 
              size="sm" 
              className={cn(
                "font-medium",
                item.category === 'critical' ? "bg-red-600 hover:bg-red-700 text-white" : 
                item.category === 'warning' ? "bg-amber-600 hover:bg-amber-700 text-white" :
                "bg-slate-900 text-white hover:bg-slate-800"
              )}
            >
              {item.actionLabel}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export function ActionFirstCommand() {
  const criticalItems = ACTION_QUEUE.filter(i => i.category === 'critical');
  const warningItems = ACTION_QUEUE.filter(i => i.category === 'warning');
  const positiveItems = ACTION_QUEUE.filter(i => i.category === 'positive');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-slate-200">
      {/* Top Hero - The Briefing */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-6 lg:py-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">Iron Forge Athletics // Console</p>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 mb-2">
              Good morning, Boss.
            </h1>
            <p className="text-lg text-slate-500 max-w-2xl leading-relaxed">
              <strong className="text-red-600 font-semibold">{criticalItems.length} things</strong> need your attention today. 
              Revenue is up <strong className="text-emerald-600 font-semibold">4.2%</strong> this month.
            </p>
          </div>
          
          <div className="flex items-center gap-4 pb-1">
            <div className="text-right hidden md:block">
              <p className="text-sm font-medium text-slate-700">Billing snapshot</p>
              <p className="text-xs text-slate-400">$2,340 collected this week &middot; 3 invoices pending</p>
            </div>
            <Button size="sm" variant="outline" className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900">
              <CreditCard className="w-4 h-4 mr-1.5" />
              Go to Billing
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* PRIMARY AREA: Action Queue (Left/Main Column) */}
        <div className="lg:col-span-8 space-y-8">
          
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-6 h-6 rounded bg-red-100 text-red-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Handle Now</h2>
              <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 font-mono">
                {criticalItems.length} critical
              </Badge>
            </div>
            <div className="space-y-3">
              {criticalItems.map(item => <ActionCard key={item.id} item={item} />)}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-6 h-6 rounded bg-amber-100 text-amber-600">
                <Zap className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Follow Up Today</h2>
            </div>
            <div className="space-y-3">
              {warningItems.map(item => <ActionCard key={item.id} item={item} />)}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-6 h-6 rounded bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Good News</h2>
            </div>
            <div className="space-y-3">
              {positiveItems.map(item => <ActionCard key={item.id} item={item} />)}
            </div>
          </section>

        </div>

        {/* SECONDARY AREA: Context & Data (Right Column) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Compact KPI Strip */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-white border-slate-200 col-span-2 shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Monthly Recurring Rev</p>
                  <p className="text-2xl font-bold text-slate-900">{KPIS.mrr.value}</p>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">
                    <ArrowUpRight className="w-3 h-3 mr-1" /> {KPIS.mrr.change}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-slate-500 mb-1 flex items-center gap-2">
                  <Users className="w-4 h-4" /> Active
                </p>
                <div className="flex items-end justify-between mt-2">
                  <p className="text-xl font-bold text-slate-900">{KPIS.activeMembers.value}</p>
                  <span className="text-xs text-emerald-600 font-medium">{KPIS.activeMembers.change}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-slate-500 mb-1 flex items-center gap-2">
                  <Zap className="w-4 h-4" /> RSI Score
                </p>
                <div className="flex items-end justify-between mt-2">
                  <p className="text-xl font-bold text-slate-900">{KPIS.rsi.value}</p>
                  <span className="text-xs text-emerald-600 font-medium">{KPIS.rsi.band}</span>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white border-slate-200 col-span-2 shadow-sm">
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-sm font-medium text-slate-500">Retention Rate</p>
                  <span className="text-sm font-bold text-slate-900">{KPIS.retention.value}</span>
                </div>
                <Progress value={94.1} className="h-2 bg-slate-100" indicatorClassName="bg-emerald-500" />
              </CardContent>
            </Card>
          </div>

          {/* MRR Trend Chart */}
          <Card className="bg-white border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-slate-700">Revenue Trend (6mo)</h3>
              <Button variant="ghost" size="sm" className="h-6 text-xs text-slate-400">Details</Button>
            </div>
            <div className="h-[140px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={MRR_DATA} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#1e293b', borderRadius: '8px', fontSize: '12px' }}
                    itemStyle={{ color: '#10b981' }}
                    formatter={(value: number) => [`$${value.toLocaleString()}`, 'MRR']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorValue)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Retention Activity Feed */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700">System Activity</h3>
            </div>
            <div className="p-4 space-y-4">
              {ACTIVITY_FEED.map((activity, idx) => (
                <div key={activity.id} className="flex gap-3 relative">
                  {idx !== ACTIVITY_FEED.length - 1 && (
                    <div className="absolute top-6 left-[11px] bottom-[-16px] w-[2px] bg-slate-100" />
                  )}
                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 z-10 border border-slate-200">
                    {activity.type === 'email' && <Mail className="w-3 h-3 text-slate-400" />}
                    {activity.type === 'task' && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                    {activity.type === 'system' && <Zap className="w-3 h-3 text-amber-500" />}
                    {activity.type === 'lead' && <MessageSquare className="w-3 h-3 text-blue-500" />}
                  </div>
                  <div className="pt-0.5">
                    <p className="text-sm text-slate-600">{activity.text}</p>
                    <p className="text-xs text-slate-400 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
              <Button variant="ghost" className="w-full text-xs text-slate-400 hover:text-slate-600 mt-2 h-8">
                View All Logs
              </Button>
            </div>
          </Card>

        </div>
      </main>
    </div>
  );
}
