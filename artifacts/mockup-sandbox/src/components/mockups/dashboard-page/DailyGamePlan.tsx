import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  AlertTriangle, 
  Clock, 
  TrendingUp, 
  Users, 
  Activity, 
  ArrowRight, 
  Mail, 
  Phone, 
  MessageSquare,
  ChevronRight,
  Check,
  Calendar,
  DollarSign,
  AlertCircle,
  UserPlus,
  RefreshCcw
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

// --- MOCK DATA ---
const mrrData = [
  { month: 'Jan', mrr: 24500 },
  { month: 'Feb', mrr: 25200 },
  { month: 'Mar', mrr: 26100 },
  { month: 'Apr', mrr: 25800 },
  { month: 'May', mrr: 27300 },
  { month: 'Jun', mrr: 28400 },
];

const atRiskMembers = [
  { id: 1, name: 'Sarah Jenkins', tier: 'critical', score: 92, daysSinceVisit: 14, revenue: 199, lastClass: 'CrossFit 6AM' },
  { id: 2, name: 'Mike Ross', tier: 'high', score: 78, daysSinceVisit: 9, revenue: 175, lastClass: 'Weightlifting' },
  { id: 3, name: 'Elena Rodriguez', tier: 'medium', score: 65, daysSinceVisit: 7, revenue: 199, lastClass: 'CrossFit 5PM' },
];

const overduePayments = [
  { id: 1, name: 'David Chen', amount: 199, daysOverdue: 3, status: 'Failed Card', plan: 'Unlimited Monthly' },
  { id: 2, name: 'Amanda Smith', amount: 150, daysOverdue: 1, status: 'Expired Card', plan: '3x/Week Monthly' },
];

const newMembers = [
  { id: 1, name: 'Jason Miller', joined: 'Yesterday', goal: 'Weight Loss', plan: 'Unlimited Monthly' },
  { id: 2, name: 'Rebecca Taylor', joined: '2 days ago', goal: 'Strength', plan: 'Unlimited Monthly' },
  { id: 3, name: 'Chris Wong', joined: '3 days ago', goal: 'General Fitness', plan: '3x/Week Monthly' },
  { id: 4, name: 'Jessica Davis', joined: '3 days ago', goal: 'Competition', plan: 'Unlimited Monthly' },
];

const classesToday = [
  { id: 1, time: '6:00 AM', name: 'CrossFit', coach: 'Alex', attendance: '14/15', status: 'completed' },
  { id: 2, time: '7:00 AM', name: 'CrossFit', coach: 'Alex', attendance: '12/15', status: 'completed' },
  { id: 3, time: '12:00 PM', name: 'CrossFit', coach: 'Sam', attendance: '8/15', status: 'upcoming' },
  { id: 4, time: '4:00 PM', name: 'Weightlifting', coach: 'Jordan', attendance: '10/12', status: 'upcoming' },
  { id: 5, time: '5:30 PM', name: 'CrossFit', coach: 'Sam', attendance: '15/15', status: 'upcoming' },
  { id: 6, time: '6:30 PM', name: 'CrossFit', coach: 'Sam', attendance: '11/15', status: 'upcoming' },
];

const staleLeads = [
  { id: 1, name: 'Tom Hardy', source: 'Website', lastContact: '5 days ago', interest: 'Drop-in' },
  { id: 2, name: 'Lisa Kudrow', source: 'Instagram', lastContact: '6 days ago', interest: 'On-ramp' },
  { id: 3, name: 'Mark Ruffalo', source: 'Referral', lastContact: '7 days ago', interest: 'Unlimited' },
  { id: 4, name: 'Emma Stone', source: 'Website', lastContact: '1 week ago', interest: 'Drop-in' },
  { id: 5, name: 'Ryan Gosling', source: 'Facebook', lastContact: '1 week ago', interest: 'On-ramp' },
];

const TASKS = [
  {
    id: 'at_risk',
    title: 'Review 3 at-risk members',
    description: '$573 in monthly revenue at risk.',
    priority: 'critical',
    time: '10 min',
    icon: AlertTriangle,
  },
  {
    id: 'overdue',
    title: 'Follow up on 2 overdue payments',
    description: '$349 outstanding.',
    priority: 'high',
    time: '5 min',
    icon: DollarSign,
  },
  {
    id: 'new_members',
    title: 'Welcome 4 new members this week',
    description: 'Reach out to ensure a smooth first week.',
    priority: 'medium',
    time: '15 min',
    icon: UserPlus,
  },
  {
    id: 'classes',
    title: 'Review today\'s 6 classes',
    description: 'Check attendance and class utilization.',
    priority: 'routine',
    time: '5 min',
    icon: Calendar,
  },
  {
    id: 'leads',
    title: 'Check 5 stale leads',
    description: 'Follow up before they go cold.',
    priority: 'low',
    time: '10 min',
    icon: Users,
  },
];

export function DailyGamePlan() {
  const [activeTaskId, setActiveTaskId] = useState<string>('at_risk');
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());

  const handleTaskToggle = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompletedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const progressPercentage = (completedTasks.size / TASKS.length) * 100;

  const renderContextPanel = () => {
    switch (activeTaskId) {
      case 'at_risk':
        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-semibold tracking-tight text-slate-900">At-Risk Members</h3>
                <p className="text-slate-500 text-sm mt-1">Review members showing signs of churn. Reach out directly.</p>
              </div>
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Critical Priority</Badge>
            </div>
            
            <div className="grid gap-4">
              {atRiskMembers.map((member) => (
                <Card key={member.id} className="border-slate-200 shadow-sm overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center">
                    <div className="p-4 sm:p-5 flex-1 flex items-start gap-4">
                      <Avatar className="h-10 w-10 border border-slate-100">
                        <AvatarFallback className="bg-slate-100 text-slate-600 font-medium">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-slate-900 leading-none">{member.name}</h4>
                          {member.tier === 'critical' && <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none h-5 px-1.5 text-[10px] uppercase font-bold tracking-wider">Critical</Badge>}
                          {member.tier === 'high' && <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-none h-5 px-1.5 text-[10px] uppercase font-bold tracking-wider">High Risk</Badge>}
                          {member.tier === 'medium' && <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-none h-5 px-1.5 text-[10px] uppercase font-bold tracking-wider">Warning</Badge>}
                        </div>
                        <div className="text-sm text-slate-500 flex items-center gap-3">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {member.daysSinceVisit} days absent</span>
                          <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> ${member.revenue}/mo</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-50 p-4 sm:p-5 border-t sm:border-t-0 sm:border-l border-slate-100 flex items-center justify-end sm:justify-center gap-2 w-full sm:w-auto">
                      <Button size="sm" variant="outline" className="h-8 gap-1.5"><MessageSquare className="w-3.5 h-3.5" /> SMS</Button>
                      <Button size="sm" variant="default" className="h-8 gap-1.5"><Phone className="w-3.5 h-3.5" /> Call</Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-start gap-3">
              <div className="mt-0.5 text-blue-600"><AlertCircle className="w-5 h-5" /></div>
              <div>
                <h5 className="font-medium text-slate-900 text-sm">Suggested Action</h5>
                <p className="text-slate-600 text-sm mt-1">A simple "Hey [Name], haven't seen you in a bit! Everything okay?" text works best for members who have been absent for 7-14 days.</p>
              </div>
            </div>
            
            <div className="flex justify-end pt-4">
              <Button 
                onClick={(e) => {
                  setCompletedTasks(prev => new Set(prev).add('at_risk'));
                  setActiveTaskId('overdue');
                }}
                className="gap-2"
              >
                Mark as Reviewed <Check className="w-4 h-4" />
              </Button>
            </div>
          </div>
        );
      
      case 'overdue':
        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-semibold tracking-tight text-slate-900">Overdue Payments</h3>
                <p className="text-slate-500 text-sm mt-1">Follow up on failed charges to recover revenue.</p>
              </div>
              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">High Priority</Badge>
            </div>
            
            <div className="grid gap-4">
              {overduePayments.map((payment) => (
                <Card key={payment.id} className="border-slate-200 shadow-sm">
                  <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="bg-red-50 text-red-600 rounded-full p-2.5">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-semibold text-slate-900">{payment.name}</h4>
                        <div className="text-sm text-slate-500">
                          {payment.plan} • {payment.status}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:items-end gap-1">
                      <div className="font-bold text-lg text-slate-900">${payment.amount}</div>
                      <div className="text-sm font-medium text-red-600">{payment.daysOverdue} {payment.daysOverdue === 1 ? 'day' : 'days'} overdue</div>
                    </div>
                  </div>
                  <Separator />
                  <div className="bg-slate-50 p-3 px-5 flex items-center justify-end gap-2">
                    <Button size="sm" variant="ghost" className="h-8 text-slate-600">View Profile</Button>
                    <Button size="sm" variant="outline" className="h-8 gap-1.5"><RefreshCcw className="w-3.5 h-3.5" /> Retry Card</Button>
                    <Button size="sm" variant="default" className="h-8 gap-1.5 bg-slate-900"><Mail className="w-3.5 h-3.5" /> Send Update Link</Button>
                  </div>
                </Card>
              ))}
            </div>
            
            <div className="flex justify-end pt-4">
              <Button 
                onClick={(e) => {
                  setCompletedTasks(prev => new Set(prev).add('overdue'));
                  setActiveTaskId('new_members');
                }}
                className="gap-2"
              >
                Mark as Handled <Check className="w-4 h-4" />
              </Button>
            </div>
          </div>
        );

      case 'new_members':
        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-semibold tracking-tight text-slate-900">Welcome New Members</h3>
                <p className="text-slate-500 text-sm mt-1">Reach out to ensure they had a great first experience.</p>
              </div>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Medium Priority</Badge>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {newMembers.map((member) => (
                <Card key={member.id} className="border-slate-200 shadow-sm">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="text-base">{member.name}</CardTitle>
                        <CardDescription className="text-xs">Joined {member.joined}</CardDescription>
                      </div>
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">{member.name.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
                      </Avatar>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-2">
                    <div className="text-sm bg-slate-50 p-2 rounded border border-slate-100 mb-3">
                      <span className="text-slate-500 block text-xs mb-1">Goal</span>
                      <span className="font-medium text-slate-800">{member.goal}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="w-full h-8 text-xs"><MessageSquare className="w-3 h-3 mr-1" /> SMS</Button>
                      <Button size="sm" variant="outline" className="w-full h-8 text-xs"><Mail className="w-3 h-3 mr-1" /> Email</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <div className="flex justify-end pt-4">
              <Button 
                onClick={(e) => {
                  setCompletedTasks(prev => new Set(prev).add('new_members'));
                  setActiveTaskId('classes');
                }}
                className="gap-2"
              >
                Done Welcoming <Check className="w-4 h-4" />
              </Button>
            </div>
          </div>
        );

      case 'classes':
        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-semibold tracking-tight text-slate-900">Today's Classes</h3>
                <p className="text-slate-500 text-sm mt-1">Review attendance and capacity for today.</p>
              </div>
              <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">Routine</Badge>
            </div>
            
            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <div className="divide-y divide-slate-100">
                {classesToday.map((cls) => (
                  <div key={cls.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-20 text-sm font-semibold text-slate-900">{cls.time}</div>
                      <div>
                        <div className="font-medium text-slate-900">{cls.name}</div>
                        <div className="text-xs text-slate-500">Coach: {cls.coach}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-medium text-slate-900">{cls.attendance}</div>
                        <div className="text-xs text-slate-500">Capacity</div>
                      </div>
                      <Badge variant={cls.status === 'completed' ? 'secondary' : 'default'} className={cls.status === 'completed' ? 'bg-slate-100 text-slate-600 hover:bg-slate-100' : 'bg-blue-50 text-blue-700 hover:bg-blue-50'}>
                        {cls.status === 'completed' ? 'Completed' : 'Upcoming'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            
            <div className="flex justify-end pt-4">
              <Button 
                onClick={(e) => {
                  setCompletedTasks(prev => new Set(prev).add('classes'));
                  setActiveTaskId('leads');
                }}
                className="gap-2"
              >
                Classes Reviewed <Check className="w-4 h-4" />
              </Button>
            </div>
          </div>
        );

      case 'leads':
        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-semibold tracking-tight text-slate-900">Stale Leads</h3>
                <p className="text-slate-500 text-sm mt-1">Follow up with leads who haven't responded recently.</p>
              </div>
              <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">Low Priority</Badge>
            </div>
            
            <div className="grid gap-3">
              {staleLeads.map((lead) => (
                <div key={lead.id} className="bg-white border border-slate-200 rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-slate-100 text-slate-600 text-xs">{lead.name.split(' ').map(n=>n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-slate-900 text-sm">{lead.name}</div>
                      <div className="text-xs text-slate-500 flex gap-2">
                        <span>{lead.source}</span>
                        <span>•</span>
                        <span>{lead.interest}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4">
                    <div className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded">
                      Last contact: {lead.lastContact}
                    </div>
                    <Button size="sm" variant="outline" className="h-8 w-8 p-0 shrink-0"><ArrowRight className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-end pt-4">
              <Button 
                onClick={(e) => {
                  setCompletedTasks(prev => new Set(prev).add('leads'));
                  // Loop back to start or show completion
                  if (completedTasks.size === TASKS.length - 1) {
                    setActiveTaskId('done');
                  }
                }}
                className="gap-2"
              >
                Done with Leads <Check className="w-4 h-4" />
              </Button>
            </div>
          </div>
        );
        
      case 'done':
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center animate-in zoom-in-95 duration-500 px-6">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-sm border border-green-200">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Game Plan Complete</h3>
            <p className="text-slate-500 text-lg max-w-md mb-8">You've tackled the most important items for today. Great work leading your gym.</p>
            
            <div className="w-full max-w-lg grid gap-4 grid-cols-2 text-left">
              <Card className="border-slate-200 shadow-sm bg-slate-50/50">
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="font-medium text-slate-500">Current MRR</CardDescription>
                  <CardTitle className="text-2xl text-slate-900">$28.4k</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="h-[60px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={mrrData}>
                        <defs>
                          <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0f172a" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#0f172a" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="mrr" stroke="#0f172a" strokeWidth={2} fillOpacity={1} fill="url(#colorMrr)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-slate-200 shadow-sm bg-slate-50/50">
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="font-medium text-slate-500">Active Members</CardDescription>
                  <CardTitle className="text-2xl text-slate-900">187</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="flex items-center gap-2 mt-2 text-sm">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="text-green-600 font-medium">+4 this week</span>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Button variant="outline" className="mt-8" onClick={() => setActiveTaskId('at_risk')}>
              Review Dashboard Data
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#f8fafc] font-sans text-slate-900 overflow-hidden selection:bg-slate-200">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 text-white p-2 rounded-md">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none tracking-tight">Iron Forge Athletics</h1>
            <p className="text-xs text-slate-500 font-medium tracking-wide uppercase mt-1">Owner Console</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-medium text-slate-900">Good morning, Coach</div>
            <div className="text-xs text-slate-500">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
          </div>
          <Avatar className="border-2 border-slate-100 shadow-sm">
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback>OC</AvatarFallback>
          </Avatar>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 overflow-hidden flex flex-col lg:flex-row relative">
        
        {/* Left Column: Game Plan */}
        <div className="w-full lg:w-[420px] xl:w-[480px] bg-white border-r border-slate-200 flex flex-col shrink-0 z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)] relative">
          <div className="p-6 border-b border-slate-100 bg-white sticky top-0 z-20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold tracking-tight text-slate-900">Today's Game Plan</h2>
              <Badge variant="secondary" className="bg-slate-100 text-slate-700 font-medium">
                {completedTasks.size} / {TASKS.length}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium text-slate-500 mb-1">
                <span>Progress</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2 bg-slate-100" />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
            {TASKS.map((task) => {
              const isCompleted = completedTasks.has(task.id);
              const isActive = activeTaskId === task.id;
              
              let priorityColor = "bg-slate-100 text-slate-600";
              if (task.priority === 'critical') priorityColor = "bg-red-100 text-red-700";
              if (task.priority === 'high') priorityColor = "bg-orange-100 text-orange-700";
              if (task.priority === 'medium') priorityColor = "bg-blue-100 text-blue-700";

              return (
                <div 
                  key={task.id}
                  onClick={() => setActiveTaskId(task.id)}
                  className={`
                    group relative rounded-xl border p-4 cursor-pointer transition-all duration-200
                    ${isActive 
                      ? 'bg-white border-slate-900 shadow-md ring-1 ring-slate-900/5' 
                      : isCompleted
                        ? 'bg-slate-50 border-transparent opacity-60 hover:opacity-100'
                        : 'bg-white border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md'
                    }
                  `}
                >
                  <div className="flex items-start gap-4">
                    <button 
                      onClick={(e) => handleTaskToggle(task.id, e)}
                      className={`
                        mt-0.5 shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
                        ${isCompleted 
                          ? 'bg-slate-900 border-slate-900 text-white' 
                          : 'border-slate-300 text-transparent hover:border-slate-400 group-hover:border-slate-400'
                        }
                      `}
                    >
                      <Check className={`w-3.5 h-3.5 ${isCompleted ? 'opacity-100' : 'opacity-0'}`} strokeWidth={3} />
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className={`font-semibold text-[15px] leading-snug ${isCompleted ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                          {task.title}
                        </h4>
                        <div className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          <Clock className="w-3 h-3" />
                          {task.time}
                        </div>
                      </div>
                      
                      <p className={`text-sm ${isCompleted ? 'text-slate-400' : 'text-slate-500'} mb-3 line-clamp-2`}>
                        {task.description}
                      </p>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className={`border-none ${priorityColor} text-[10px] uppercase font-bold tracking-wider px-1.5 h-5`}>
                          {task.priority}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  {isActive && !isCompleted && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-slate-900 text-white rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity animate-in slide-in-from-left-2">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  )}
                </div>
              );
            })}
            
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-slate-400 mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-slate-500">That's everything for today!</p>
            </div>
          </div>
        </div>

        {/* Right Column: Context Panel */}
        <div className="flex-1 bg-white overflow-y-auto">
          <div className="max-w-4xl mx-auto p-6 md:p-8 lg:p-10">
            {renderContextPanel()}
          </div>
        </div>
      </main>

      {/* Persistent Bottom Summary Bar */}
      <footer className="bg-slate-900 text-slate-100 border-t border-slate-800 px-6 py-3 shrink-0 relative z-20">
        <div className="flex flex-wrap items-center justify-between gap-4 max-w-screen-2xl mx-auto">
          
          <div className="flex items-center divide-x divide-slate-700">
            <div className="pr-6">
              <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-0.5">MRR</div>
              <div className="font-bold text-lg text-white flex items-center gap-2">
                $28.4k <span className="text-[11px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-medium">+4.2%</span>
              </div>
            </div>
            <div className="px-6">
              <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-0.5">Active Members</div>
              <div className="font-bold text-lg text-white flex items-center gap-2">
                187 <span className="text-[11px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-medium">+2</span>
              </div>
            </div>
            <div className="px-6 hidden sm:block">
              <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-0.5">Retention RSI</div>
              <div className="font-bold text-lg text-white flex items-center gap-2">
                78.2 <span className="text-[11px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded font-medium">Strong</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400 hidden md:inline-block">Syncing data automatically</span>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          </div>
          
        </div>
      </footer>
    </div>
  );
}
