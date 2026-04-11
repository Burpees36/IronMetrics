import React, { useState } from 'react';
import './_group.css';
import { 
  AlertCircle, 
  ArrowRight, 
  Bot, 
  Calendar, 
  Check, 
  CheckCircle2, 
  ChevronRight, 
  Clock, 
  CreditCard, 
  Dumbbell, 
  History, 
  Inbox, 
  LayoutDashboard, 
  Mail, 
  MessageSquare, 
  MoreHorizontal, 
  MoreVertical, 
  Play, 
  Search, 
  Settings, 
  ShieldAlert, 
  Sparkles, 
  Timer, 
  TrendingDown, 
  TrendingUp, 
  User, 
  UserMinus, 
  UserPlus, 
  Users, 
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

// Mock Data
const PENDING_TASKS = [
  {
    id: 't1',
    type: 'outreach',
    priority: 'critical',
    member: {
      name: 'Sarah Johnson',
      avatar: 'SJ',
      tenure: '2.5 years',
      lastAttendance: '14 days ago',
      favoriteClass: '6:00 AM WOD',
      riskScore: 85,
    },
    title: 'Win back high-value member',
    description: 'Sarah has missed her regular 6AM class for two weeks. High churn risk.',
    draft: "Hi Sarah,\n\nI noticed you haven't been at the [6:00 AM WOD] for the past couple of weeks. As one of our long-time members ([2.5 years]), you're a huge part of that morning crew and we miss your energy!\n\nEverything okay? If you need to adjust your schedule or put things on hold, just let me know. Otherwise, hope to see you back on the whiteboard soon.\n\nBest,\nCoach Dave",
    dataPoints: ['6:00 AM WOD', '2.5 years'],
    status: 'pending'
  },
  {
    id: 't2',
    type: 'billing',
    priority: 'high',
    member: {
      name: 'Michael Chen',
      avatar: 'MC',
      tenure: '8 months',
      lastAttendance: 'Yesterday',
      favoriteClass: '5:30 PM WOD',
      riskScore: 20,
    },
    title: 'Payment failed for Pro Membership',
    description: 'Card ending in 4242 declined. Member is still attending classes.',
    draft: "Hi Michael,\n\nGreat work in yesterday's [5:30 PM WOD]!\n\nJust a quick heads up that your recent payment for your [Pro Membership] failed to process on your card ending in [4242]. \n\nCould you take a minute to update your payment details here? [Link]\n\nLet me know if you need any help with it.\n\nBest,\nCoach Dave",
    dataPoints: ["yesterday's", '5:30 PM WOD', 'Pro Membership', '4242'],
    status: 'pending'
  },
  {
    id: 't3',
    type: 'outreach',
    priority: 'high',
    member: {
      name: 'Emma Davis',
      avatar: 'ED',
      tenure: '4 months',
      lastAttendance: '10 days ago',
      favoriteClass: 'Saturday Team WOD',
      riskScore: 65,
    },
    title: 'Post-injury check in',
    description: 'Emma scaled back due to shoulder tweak. Has not returned.',
    draft: "Hi Emma,\n\nJust checking in on how your shoulder is feeling since you mentioned it a couple of weeks ago.\n\nWe have some great mobility work programmed for this [Saturday Team WOD] that might be perfect for easing back in. \n\nLet me know how you're feeling, happy to provide modifications if you want to come in.\n\nBest,\nCoach Dave",
    dataPoints: ['Saturday Team WOD'],
    status: 'pending'
  },
  {
    id: 't4',
    type: 'lead',
    priority: 'medium',
    member: {
      name: 'James Wilson',
      avatar: 'JW',
      tenure: 'Lead',
      lastAttendance: 'Never',
      favoriteClass: 'Fundamentals',
      riskScore: 0,
    },
    title: 'Follow up on Intro Class no-show',
    description: 'Registered for Fundamentals but did not show up.',
    draft: "Hi James,\n\nSorry we missed you for the [Fundamentals] class on Tuesday!\n\nLife happens. I'd love to get you rescheduled to come check out the gym. We have another intro session coming up this [Thursday at 6PM].\n\nDoes that work for you to drop by?\n\nBest,\nCoach Dave",
    dataPoints: ['Fundamentals', 'Thursday at 6PM'],
    status: 'pending'
  },
  {
    id: 't5',
    type: 'outreach',
    priority: 'medium',
    member: {
      name: 'David Kim',
      avatar: 'DK',
      tenure: '1.2 years',
      lastAttendance: '7 days ago',
      favoriteClass: '12:00 PM WOD',
      riskScore: 40,
    },
    title: 'Drop in attendance frequency',
    description: 'Averaging 2x/week down from 4x/week last month.',
    draft: "Hi David,\n\nNoticed you've only been able to make it in about [2 times a week] lately compared to your usual [4 times].\n\nHope work isn't keeping you away from the [Noon] crew too much! Let me know if there's anything we can do to help keep the momentum going.\n\nBest,\nCoach Dave",
    dataPoints: ['2 times a week', '4 times', 'Noon'],
    status: 'pending'
  }
];

const HISTORY_TASKS = [
  {
    id: 'h1',
    type: 'outreach',
    priority: 'high',
    member: { name: 'Lisa Wang', avatar: 'LW' },
    title: '3-week absence check-in',
    status: 'completed',
    outcome: 'Member returned',
    date: 'Yesterday'
  },
  {
    id: 'h2',
    type: 'billing',
    priority: 'critical',
    member: { name: 'Tom Hardy', avatar: 'TH' },
    title: 'Account past due 15 days',
    status: 'completed',
    outcome: 'Subscription reactivated',
    date: '2 days ago'
  },
  {
    id: 'h3',
    type: 'lead',
    priority: 'medium',
    member: { name: 'Alex Foster', avatar: 'AF' },
    title: 'Website inquiry follow-up',
    status: 'completed',
    outcome: 'Lead converted',
    date: '3 days ago'
  }
];

export function MissionControl() {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('pending');
  
  const selectedTask = PENDING_TASKS.find(t => t.id === selectedTaskId);
  const isOverview = !selectedTaskId && activeTab === 'pending';

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'outreach': return <MessageSquare className="w-4 h-4" />;
      case 'billing': return <CreditCard className="w-4 h-4" />;
      case 'lead': return <UserPlus className="w-4 h-4" />;
      default: return <Bot className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'critical': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'high': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'medium': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      default: return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
    }
  };

  const renderDraftContent = (text: string, dataPoints: string[]) => {
    let highlightedText = text;
    dataPoints.forEach(point => {
      // Very basic replace for mockup purposes
      highlightedText = highlightedText.replace(`[${point}]`, `<span class="bg-primary/20 text-primary-foreground/90 font-medium px-1 rounded mx-0.5 border border-primary/30 shadow-sm">${point}</span>`);
    });
    return <div dangerouslySetInnerHTML={{ __html: highlightedText }} />;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans text-slate-900 dark:text-slate-100 overflow-hidden">
      {/* Global Header */}
      <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-4 lg:px-6 shrink-0 z-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 font-display font-bold text-lg">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center text-primary-foreground">
              <Sparkles className="w-4 h-4" />
            </div>
            ForgeOS
          </div>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
            <Bot className="w-4 h-4 text-primary" />
            AI Operator
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center text-sm font-medium bg-slate-100 dark:bg-slate-800 rounded-full px-3 py-1.5 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-1.5 mr-3 border-r border-slate-300 dark:border-slate-600 pr-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              214 Active
            </div>
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-500">
              <AlertCircle className="w-3.5 h-3.5" />
              68 At Risk
            </div>
          </div>
          <Button variant="outline" size="sm" className="hidden sm:flex gap-2">
            <LayoutDashboard className="w-4 h-4" />
            Owner Brief
          </Button>
          <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
            <Play className="w-4 h-4 fill-current" />
            Scan & Generate
          </Button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Master List (Left Panel) */}
        <div className="w-full md:w-80 lg:w-96 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input placeholder="Search tasks..." className="pl-9 bg-slate-50 dark:bg-slate-900" />
            </div>
          </div>
          
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 shrink-0 flex items-center justify-between">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="pending" className="gap-2">
                  <Inbox className="w-4 h-4" />
                  Pending
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px] rounded-full bg-slate-200 dark:bg-slate-700">{PENDING_TASKS.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2">
                  <History className="w-4 h-4" />
                  History
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex-1 overflow-y-auto">
            {activeTab === 'pending' ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {PENDING_TASKS.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className={`w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex gap-3 ${selectedTaskId === task.id ? 'bg-primary/5 dark:bg-primary/10 relative' : ''}`}
                  >
                    {selectedTaskId === task.id && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r" />
                    )}
                    <Avatar className="w-10 h-10 border border-slate-200 dark:border-slate-700 shrink-0">
                      <AvatarFallback className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm">{task.member.avatar}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm truncate pr-2">{task.member.name}</span>
                        <Badge variant="outline" className={`text-[10px] uppercase tracking-wider px-1.5 py-0 h-4 ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{task.title}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          {getTypeIcon(task.type)}
                          <span className="capitalize">{task.type}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          2h ago
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {HISTORY_TASKS.map((task) => (
                  <div key={task.id} className="p-4 opacity-80 flex gap-3">
                     <Avatar className="w-10 h-10 border border-slate-200 dark:border-slate-700 shrink-0 opacity-70 grayscale">
                      <AvatarFallback className="bg-slate-100 dark:bg-slate-800 text-slate-500 text-sm">{task.member.avatar}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm truncate pr-2 text-slate-600 dark:text-slate-400">{task.member.name}</span>
                        <span className="text-xs text-slate-400">{task.date}</span>
                      </div>
                      <p className="text-sm text-slate-500 truncate mb-2">{task.title}</p>
                      <Badge variant="outline" className="text-xs font-normal bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/50">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        {task.outcome}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Detail Panel (Right Panel) */}
        <div className="flex-1 bg-slate-50/50 dark:bg-slate-950 flex flex-col min-w-0 overflow-y-auto">
          {isOverview ? (
            <div className="p-8 max-w-5xl mx-auto w-full">
              <div className="mb-8">
                <h1 className="text-3xl font-display font-bold tracking-tight mb-2">Morning Overview</h1>
                <p className="text-slate-500">You have 5 pending tasks today. The AI is managing outreach, billing, and leads.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card className="shadow-sm border-slate-200/60 dark:border-slate-800">
                  <CardHeader className="pb-2">
                    <CardDescription className="font-medium">Members Saved This Month</CardDescription>
                    <CardTitle className="text-4xl font-display">12</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                      <TrendingUp className="w-4 h-4" />
                      +3 from last month
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm border-slate-200/60 dark:border-slate-800">
                  <CardHeader className="pb-2">
                    <CardDescription className="font-medium">Revenue Retained</CardDescription>
                    <CardTitle className="text-4xl font-display text-emerald-600 dark:text-emerald-500">$2,400</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-slate-500">Monthly recurring revenue</div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm border-slate-200/60 dark:border-slate-800">
                  <CardHeader className="pb-2">
                    <CardDescription className="font-medium">AI Success Rate</CardDescription>
                    <CardTitle className="text-4xl font-display">73%</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Progress value={73} className="h-2 bg-slate-100 dark:bg-slate-800" />
                  </CardContent>
                </Card>
              </div>

              <h2 className="text-lg font-display font-semibold mb-4">Auto-Pilot Configuration</h2>
              <Card className="shadow-sm border-slate-200/60 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-slate-400" />
                      Attendance Outreach
                    </div>
                    <div className="text-sm text-slate-500 mt-1">Automatically send check-ins to at-risk members.</div>
                  </div>
                  <Switch checked={true} className="data-[state=checked]:bg-primary" />
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-slate-400" />
                      Failed Billing Recovery
                    </div>
                    <div className="text-sm text-slate-500 mt-1">Send payment update links immediately upon failure.</div>
                  </div>
                  <Switch checked={true} className="data-[state=checked]:bg-primary" />
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-slate-400" />
                      Stale Lead Follow-up
                    </div>
                    <div className="text-sm text-slate-500 mt-1">Drip campaigns for no-shows and cold inquiries.</div>
                  </div>
                  <Switch checked={false} />
                </div>
              </Card>
            </div>
          ) : selectedTask ? (
            <div className="flex flex-col h-full">
              {/* Detail Header */}
              <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-6 shrink-0 shadow-sm z-10">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-16 h-16 border-2 border-slate-100 dark:border-slate-800 shadow-sm">
                      <AvatarFallback className="text-xl bg-slate-100 dark:bg-slate-800">{selectedTask.member.avatar}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="text-2xl font-display font-bold">{selectedTask.member.name}</h2>
                      <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {selectedTask.member.tenure} member
                        </div>
                        <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Last seen {selectedTask.member.lastAttendance}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" className="gap-2">
                      <X className="w-4 h-4" />
                      Dismiss
                    </Button>
                    <Button variant="default" className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
                      <Mail className="w-4 h-4" />
                      Send Email
                    </Button>
                  </div>
                </div>
              </div>

              {/* Detail Content */}
              <div className="p-6 flex-1 overflow-y-auto">
                <div className="max-w-5xl mx-auto grid grid-cols-1 xl:grid-cols-[1fr_1.5fr] gap-6">
                  
                  {/* Left Col: Context */}
                  <div className="flex flex-col gap-6">
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800 p-5 shadow-sm">
                      <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
                        <TrendingDown className="w-4 h-4" />
                        Risk Analysis
                      </h3>
                      
                      <div className="mb-6">
                        <div className="flex justify-between items-end mb-2">
                          <span className="text-3xl font-display font-bold text-red-500">{selectedTask.member.riskScore}</span>
                          <span className="text-sm font-medium text-slate-500">Risk Score</span>
                        </div>
                        <Progress value={selectedTask.member.riskScore} className="h-2 bg-slate-100 dark:bg-slate-800 [&>div]:bg-red-500" />
                        <p className="text-xs text-slate-500 mt-2">{selectedTask.description}</p>
                      </div>

                      <Separator className="my-4 dark:bg-slate-800" />
                      
                      <div className="space-y-4">
                        <div>
                          <div className="text-xs text-slate-500 mb-1 font-medium">Favorite Class</div>
                          <div className="font-medium text-sm flex items-center gap-2">
                            <Timer className="w-4 h-4 text-slate-400" />
                            {selectedTask.member.favoriteClass}
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-xs text-slate-500 mb-1 font-medium">Recent Activity</div>
                          <div className="flex items-end gap-1 h-8 mt-2">
                            {/* Fake Sparkline */}
                            {[4, 3, 4, 0, 2, 0, 0, 0].map((val, i) => (
                              <div key={i} className="w-full bg-slate-100 dark:bg-slate-800 rounded-t relative group">
                                <div 
                                  className={`absolute bottom-0 left-0 right-0 rounded-t transition-all ${val === 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-primary/40'}`} 
                                  style={{ height: `${Math.max(val * 20, 10)}%` }}
                                ></div>
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-400 mt-1 uppercase tracking-wider">
                            <span>4w ago</span>
                            <span>This week</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Context Card based on type */}
                    {selectedTask.type === 'billing' && (
                      <div className="bg-orange-50 dark:bg-orange-950/20 rounded-xl border border-orange-100 dark:border-orange-900/30 p-5">
                        <div className="flex items-start gap-3">
                          <ShieldAlert className="w-5 h-5 text-orange-500 mt-0.5" />
                          <div>
                            <h4 className="font-semibold text-orange-900 dark:text-orange-400 mb-1">Billing Issue</h4>
                            <p className="text-sm text-orange-800/80 dark:text-orange-300/80 leading-relaxed">
                              Card ending in 4242 expired on 10/24. 
                              Member is still attending classes regularly.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Col: The Action/Draft */}
                  <div className="flex flex-col">
                    <Card className="shadow-sm border-slate-200/60 dark:border-slate-800 flex-1 flex flex-col bg-white dark:bg-slate-900">
                      <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Bot className="w-5 h-5 text-primary" />
                            <CardTitle className="text-lg">Generated Draft</CardTitle>
                          </div>
                          <Badge variant="secondary" className="font-normal bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">
                            Smart Personalization Active
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0 flex-1 flex flex-col">
                        <div className="p-6 flex-1 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-sans">
                           {renderDraftContent(selectedTask.draft, selectedTask.dataPoints)}
                        </div>
                      </CardContent>
                      <CardFooter className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 py-3 px-4 flex justify-between rounded-b-xl">
                        <Button variant="ghost" size="sm" className="text-slate-500">Edit Copy</Button>
                        <div className="text-xs text-slate-400 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          AI customized using {selectedTask.dataPoints.length} data points
                        </div>
                      </CardFooter>
                    </Card>
                  </div>

                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
