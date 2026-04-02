import React, { useState } from "react";
import { 
  Users, 
  AlertCircle, 
  TrendingUp, 
  DollarSign, 
  Search, 
  Filter, 
  MoreVertical, 
  Settings, 
  CreditCard,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  PauseCircle,
  Activity,
  ChevronRight,
  ArrowRight,
  Mail,
  History
} from "lucide-react";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
  SheetFooter,
  SheetClose
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

// --- MOCK DATA ---
const SUMMARY_METRICS = {
  mrr: "$14,250",
  activeMembers: 142,
  arm: "$100.35",
  atRisk: 8,
  churned: 3,
  collections: "$12,100"
};

const PLANS = [
  { id: "p1", name: "Unlimited Crossfit", price: 150, interval: "month", members: 85 },
  { id: "p2", name: "3x a Week", price: 110, interval: "month", members: 42 },
  { id: "p3", name: "Open Gym", price: 75, interval: "month", members: 15 },
  { id: "p4", name: "Drop-In", price: 25, interval: "day", members: 0 },
];

type MemberStatus = "healthy" | "at_risk" | "churned";

const MEMBERS = [
  { 
    id: "m1", 
    name: "Alex Rivera", 
    email: "alex.r@example.com", 
    plan: "Unlimited Crossfit", 
    status: "healthy" as MemberStatus,
    ltv: "$1,800",
    joinDate: "2023-01-15",
    lastPayment: "2024-05-15",
    nextPayment: "2024-06-15",
    avatar: "AR",
    riskReason: null
  },
  { 
    id: "m2", 
    name: "Sarah Chen", 
    email: "sarah.c@example.com", 
    plan: "3x a Week", 
    status: "healthy" as MemberStatus,
    ltv: "$880",
    joinDate: "2023-08-01",
    lastPayment: "2024-05-01",
    nextPayment: "2024-06-01",
    avatar: "SC",
    riskReason: null
  },
  { 
    id: "m3", 
    name: "Marcus Johnson", 
    email: "mj@example.com", 
    plan: "Unlimited Crossfit", 
    status: "at_risk" as MemberStatus,
    ltv: "$3,600",
    joinDate: "2022-03-10",
    lastPayment: "2024-04-10 (Failed)",
    nextPayment: "Past Due",
    avatar: "MJ",
    riskReason: "Card Expired"
  },
  { 
    id: "m4", 
    name: "Elena Rodriguez", 
    email: "elena.r@example.com", 
    plan: "Open Gym", 
    status: "at_risk" as MemberStatus,
    ltv: "$450",
    joinDate: "2023-11-20",
    lastPayment: "2024-05-20",
    nextPayment: "2024-06-20",
    avatar: "ER",
    riskReason: "Low Attendance (1x/week)"
  },
  { 
    id: "m5", 
    name: "David Kim", 
    email: "dkim@example.com", 
    plan: "Unlimited Crossfit", 
    status: "churned" as MemberStatus,
    ltv: "$2,100",
    joinDate: "2022-11-05",
    lastPayment: "2024-04-05",
    nextPayment: "Cancelled",
    avatar: "DK",
    riskReason: "Moved away"
  },
  { 
    id: "m6", 
    name: "Jessica Taylor", 
    email: "jess.t@example.com", 
    plan: "3x a Week", 
    status: "healthy" as MemberStatus,
    ltv: "$1,320",
    joinDate: "2023-05-12",
    lastPayment: "2024-05-12",
    nextPayment: "2024-06-12",
    avatar: "JT",
    riskReason: null
  },
  { 
    id: "m7", 
    name: "Tom Wilson", 
    email: "tomw@example.com", 
    plan: "Unlimited Crossfit", 
    status: "healthy" as MemberStatus,
    ltv: "$4,500",
    joinDate: "2021-09-01",
    lastPayment: "2024-05-01",
    nextPayment: "2024-06-01",
    avatar: "TW",
    riskReason: null
  },
  { 
    id: "m8", 
    name: "Rachel Green", 
    email: "rachel.g@example.com", 
    plan: "Unlimited Crossfit", 
    status: "at_risk" as MemberStatus,
    ltv: "$600",
    joinDate: "2024-01-15",
    lastPayment: "2024-04-15 (Failed)",
    nextPayment: "Past Due",
    avatar: "RG",
    riskReason: "Insufficient Funds"
  },
];

const TIMELINE = [
  { id: "t1", date: "May 15, 2024", type: "payment", description: "Successful charge of $150.00 for Unlimited Crossfit", status: "success" },
  { id: "t2", date: "Apr 15, 2024", type: "payment", description: "Successful charge of $150.00 for Unlimited Crossfit", status: "success" },
  { id: "t3", date: "Mar 10, 2024", type: "plan_change", description: "Upgraded from 3x a Week to Unlimited Crossfit", status: "info" },
  { id: "t4", date: "Feb 15, 2024", type: "payment", description: "Successful charge of $110.00 for 3x a Week", status: "success" },
  { id: "t5", date: "Jan 15, 2024", type: "join", description: "Joined the gym on 3x a Week plan", status: "info" },
];

export function MemberLifecycle() {
  const [selectedTab, setSelectedTab] = useState<MemberStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState<typeof MEMBERS[0] | null>(null);

  const filteredMembers = MEMBERS.filter(m => {
    const matchesTab = selectedTab === "all" || m.status === selectedTab;
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          m.plan.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const getStatusColor = (status: MemberStatus) => {
    switch (status) {
      case "healthy": return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "at_risk": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "churned": return "bg-rose-500/10 text-rose-600 border-rose-500/20";
    }
  };

  const getStatusLabel = (status: MemberStatus) => {
    switch (status) {
      case "healthy": return "Healthy";
      case "at_risk": return "At Risk";
      case "churned": return "Churned";
    }
  };

  const getStatusIcon = (status: MemberStatus) => {
    switch (status) {
      case "healthy": return <CheckCircle2 className="w-4 h-4 mr-1" />;
      case "at_risk": return <AlertCircle className="w-4 h-4 mr-1" />;
      case "churned": return <XCircle className="w-4 h-4 mr-1" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans">
      {/* Top Header & Summary */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Member Lifecycle</h1>
              <p className="text-sm text-slate-500">Financial relationships at a glance</p>
            </div>
            <div className="flex gap-3">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Settings className="w-4 h-4" />
                    Plans & Settings
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-[400px] sm:w-[540px] border-l-0 shadow-2xl">
                  <SheetHeader className="mb-6">
                    <SheetTitle>Billing Administration</SheetTitle>
                    <SheetDescription>
                      Manage membership tiers, tax settings, and integrations.
                    </SheetDescription>
                  </SheetHeader>
                  
                  <Tabs defaultValue="plans" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                      <TabsTrigger value="plans">Membership Plans</TabsTrigger>
                      <TabsTrigger value="settings">Settings</TabsTrigger>
                    </TabsList>
                    <TabsContent value="plans" className="space-y-4">
                      {PLANS.map(plan => (
                        <div key={plan.id} className="p-4 border border-slate-200 rounded-lg bg-slate-50 flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-slate-900">{plan.name}</p>
                            <p className="text-sm text-slate-500">${plan.price} / {plan.interval} • {plan.members} members</p>
                          </div>
                          <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4 text-slate-400" /></Button>
                        </div>
                      ))}
                      <Button className="w-full mt-4" variant="outline">Create New Plan</Button>
                    </TabsContent>
                    <TabsContent value="settings" className="space-y-6">
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium text-sm mb-2 text-slate-900">Payment Gateway</h4>
                          <div className="p-3 border border-slate-200 rounded-lg bg-white flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-indigo-50 rounded flex items-center justify-center text-indigo-600 font-bold text-xs">Stripe</div>
                              <div>
                                <p className="text-sm font-medium">Stripe Connected</p>
                                <p className="text-xs text-emerald-600">Active</p>
                              </div>
                            </div>
                            <Button variant="outline" size="sm">Manage</Button>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium text-sm mb-2 text-slate-900">Tax Rates</h4>
                          <div className="p-3 border border-slate-200 rounded-lg bg-white">
                            <p className="text-sm text-slate-600 mb-2">Default tax rate applied to all plans.</p>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">State Sales Tax (8.5%)</span>
                              <Button variant="ghost" size="sm">Edit</Button>
                            </div>
                          </div>
                        </div>
                        <Button className="w-full" variant="secondary">View Full Billing Settings</Button>
                      </div>
                    </TabsContent>
                  </Tabs>
                </SheetContent>
              </Sheet>
              <Button className="gap-2">
                <Users className="w-4 h-4" />
                Add Member
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
              <p className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3"/> MRR</p>
              <p className="text-xl font-bold text-slate-900">{SUMMARY_METRICS.mrr}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
              <p className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1"><Users className="w-3 h-3"/> Active</p>
              <p className="text-xl font-bold text-slate-900">{SUMMARY_METRICS.activeMembers}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
              <p className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1"><Activity className="w-3 h-3"/> ARM</p>
              <p className="text-xl font-bold text-slate-900">{SUMMARY_METRICS.arm}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
              <p className="text-xs font-medium text-slate-500 mb-1 flex items-center gap-1"><DollarSign className="w-3 h-3"/> Collected</p>
              <p className="text-xl font-bold text-slate-900">{SUMMARY_METRICS.collections}</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 border border-amber-100 cursor-pointer hover:bg-amber-100/80 transition-colors" onClick={() => setSelectedTab('at_risk')}>
              <p className="text-xs font-medium text-amber-600 mb-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> At Risk</p>
              <p className="text-xl font-bold text-amber-700">{SUMMARY_METRICS.atRisk}</p>
            </div>
            <div className="bg-rose-50 rounded-lg p-3 border border-rose-100 cursor-pointer hover:bg-rose-100/80 transition-colors" onClick={() => setSelectedTab('churned')}>
              <p className="text-xs font-medium text-rose-600 mb-1 flex items-center gap-1"><XCircle className="w-3 h-3"/> Churned</p>
              <p className="text-xl font-bold text-rose-700">{SUMMARY_METRICS.churned}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <Tabs defaultValue="all" value={selectedTab} onValueChange={(v) => setSelectedTab(v as any)} className="w-full md:w-auto">
            <TabsList className="bg-white border border-slate-200">
              <TabsTrigger value="all">All Members</TabsTrigger>
              <TabsTrigger value="healthy" className="data-[state=active]:text-emerald-700 data-[state=active]:bg-emerald-50">Healthy</TabsTrigger>
              <TabsTrigger value="at_risk" className="data-[state=active]:text-amber-700 data-[state=active]:bg-amber-50">At Risk</TabsTrigger>
              <TabsTrigger value="churned" className="data-[state=active]:text-rose-700 data-[state=active]:bg-rose-50">Churned</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search members..." 
                className="pl-9 bg-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon" className="bg-white">
              <Filter className="w-4 h-4 text-slate-500" />
            </Button>
          </div>
        </div>

        {/* Member Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredMembers.map(member => (
            <Sheet key={member.id}>
              <SheetTrigger asChild>
                <Card className="group cursor-pointer hover:shadow-md transition-all duration-200 hover:border-slate-300">
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10 border border-slate-100">
                          <AvatarFallback className="bg-slate-100 text-slate-600">{member.avatar}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{member.name}</h3>
                          <p className="text-xs text-slate-500 truncate w-32">{member.email}</p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-slate-400 hover:text-slate-600">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>Change Plan</DropdownMenuItem>
                          <DropdownMenuItem>Record Payment</DropdownMenuItem>
                          {member.status === 'at_risk' && (
                            <DropdownMenuItem className="text-blue-600">Send Payment Link</DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-rose-600">Cancel Membership</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5" /> Plan
                        </span>
                        <span className="font-medium text-slate-700">{member.plan}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5" /> Status
                        </span>
                        <Badge variant="outline" className={`font-medium ${getStatusColor(member.status)}`}>
                          {getStatusIcon(member.status)}
                          {getStatusLabel(member.status)}
                        </Badge>
                      </div>
                      
                      {member.riskReason && (
                        <div className="mt-2 p-2 bg-slate-50 rounded border border-slate-100 text-xs flex gap-2">
                          <AlertCircle className={`w-4 h-4 shrink-0 ${member.status === 'at_risk' ? 'text-amber-500' : 'text-rose-500'}`} />
                          <span className="text-slate-600 leading-tight">{member.riskReason}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="bg-slate-50/50 p-3 flex justify-between items-center text-xs border-t border-slate-100">
                    <div className="flex flex-col">
                      <span className="text-slate-400 font-medium">LTV</span>
                      <span className="font-semibold text-slate-700">{member.ltv}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-slate-400 font-medium">Last Paid</span>
                      <span className={`font-semibold ${member.status === 'at_risk' && member.lastPayment.includes('Failed') ? 'text-amber-600' : 'text-slate-700'}`}>
                        {member.lastPayment}
                      </span>
                    </div>
                  </CardFooter>
                </Card>
              </SheetTrigger>

              <SheetContent className="w-full sm:max-w-md lg:max-w-lg overflow-y-auto p-0 border-l-0 shadow-2xl">
                {/* Detail Panel Header */}
                <div className="bg-white p-6 border-b border-slate-100 sticky top-0 z-20">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex gap-4 items-center">
                      <Avatar className="w-16 h-16 border-2 border-white shadow-sm">
                        <AvatarFallback className="bg-slate-100 text-xl text-slate-600">{member.avatar}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h2 className="text-2xl font-bold text-slate-900">{member.name}</h2>
                        <div className="flex items-center gap-2 mt-1">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <a href={`mailto:${member.email}`} className="text-sm text-blue-600 hover:underline">{member.email}</a>
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className={`font-medium shadow-sm ${getStatusColor(member.status)}`}>
                      {getStatusIcon(member.status)}
                      {getStatusLabel(member.status)}
                    </Badge>
                  </div>

                  <div className="flex gap-2">
                    {member.status === 'at_risk' && (
                      <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white w-full gap-2">
                        <Mail className="w-4 h-4" /> Resolve Issue
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="w-full gap-2">
                      <CreditCard className="w-4 h-4" /> Manage Plan
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline" className="px-3"><MoreVertical className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Pause Billing</DropdownMenuItem>
                        <DropdownMenuItem>Issue Refund</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-rose-600">Cancel Member</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="p-6 bg-slate-50 min-h-full">
                  {/* Quick Stats Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-8">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Current Plan</p>
                      <p className="font-semibold text-slate-900">{member.plan}</p>
                      <p className="text-xs text-slate-500 mt-1">Since {member.joinDate}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Lifetime Value</p>
                      <p className="font-semibold text-slate-900">{member.ltv}</p>
                      <p className="text-xs text-slate-500 mt-1">Average $150/mo</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Next Payment</p>
                      <p className={`font-semibold ${member.nextPayment === 'Past Due' ? 'text-rose-600' : 'text-slate-900'}`}>{member.nextPayment}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Payment Method</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="w-8 h-5 bg-slate-800 rounded flex items-center justify-center text-[8px] text-white font-bold">VISA</div>
                        <span className="font-semibold text-slate-900">•••• 4242</span>
                      </div>
                    </div>
                  </div>

                  {/* Billing Timeline */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <History className="w-4 h-4 text-slate-500" />
                      Financial Timeline
                    </h3>
                    
                    <div className="space-y-0 pl-2">
                      {TIMELINE.map((item, i) => (
                        <div key={item.id} className="relative pl-6 pb-6 last:pb-0">
                          {/* Timeline line */}
                          {i !== TIMELINE.length - 1 && (
                            <div className="absolute left-[-5px] top-2 bottom-0 w-px bg-slate-200" />
                          )}
                          
                          {/* Timeline dot */}
                          <div className={`absolute left-[-9px] top-1.5 w-2 h-2 rounded-full border-2 border-white ring-1 ring-slate-200 ${
                            item.status === 'success' ? 'bg-emerald-500' :
                            item.status === 'error' ? 'bg-rose-500' : 'bg-blue-500'
                          }`} />

                          <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-xs font-medium text-slate-500">{item.date}</span>
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                {item.type === 'payment' ? 'Payment' : 
                                 item.type === 'plan_change' ? 'Plan Change' : 'Account'}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-700">{item.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          ))}
        </div>
        
        {filteredMembers.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-slate-200 border-dashed mt-4">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-slate-900">No members found</h3>
            <p className="text-slate-500 text-sm mt-1">Try adjusting your filters or search query.</p>
          </div>
        )}
      </div>
    </div>
  );
}
