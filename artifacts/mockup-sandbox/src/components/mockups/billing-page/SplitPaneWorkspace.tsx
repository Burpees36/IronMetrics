import React, { useState, useMemo, KeyboardEvent, useRef, useEffect } from "react";
import { 
  Search, Filter, Plus, CreditCard, Users, History, Settings, 
  ArrowRight, Activity, ArrowUpRight, CheckCircle2, AlertCircle,
  MoreVertical, Clock, Check, ChevronRight, Ban, Play, Pause,
  Download, Edit2
} from "lucide-react";
import { 
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// --- MOCK DATA ---

const mockPlans = [
  { id: "pln_1", type: "plan", name: "Unlimited CrossFit", price: 199, interval: "month", activeMembers: 145, description: "Full access to all CrossFit classes." },
  { id: "pln_2", type: "plan", name: "3x Weekly", price: 149, interval: "month", activeMembers: 82, description: "Access to 3 classes per week." },
  { id: "pln_3", type: "plan", name: "Open Gym Only", price: 99, interval: "month", activeMembers: 34, description: "Access to open gym hours, no classes." },
  { id: "pln_4", type: "plan", name: "Drop-In", price: 25, interval: "day", activeMembers: 12, description: "Single class pass." },
  { id: "pln_5", type: "plan", name: "Foundations Course", price: 250, interval: "one-time", activeMembers: 8, description: "Mandatory intro course for beginners." },
];

const mockSubscriptions = [
  { id: "sub_1", type: "subscription", memberName: "Alex Johnson", planId: "pln_1", planName: "Unlimited CrossFit", amount: 199, status: "active", nextBilling: "2024-06-01", since: "2022-01-15", failedAttempts: 0 },
  { id: "sub_2", type: "subscription", memberName: "Sarah Smith", planId: "pln_2", planName: "3x Weekly", amount: 149, status: "past_due", nextBilling: "2024-05-15", since: "2023-03-10", failedAttempts: 2 },
  { id: "sub_3", type: "subscription", memberName: "Michael Brown", planId: "pln_1", planName: "Unlimited CrossFit", amount: 199, status: "active", nextBilling: "2024-06-05", since: "2021-11-20", failedAttempts: 0 },
  { id: "sub_4", type: "subscription", memberName: "Emily Davis", planId: "pln_3", planName: "Open Gym Only", amount: 99, status: "paused", nextBilling: "2024-07-01", since: "2023-08-05", failedAttempts: 0 },
  { id: "sub_5", type: "subscription", memberName: "David Wilson", planId: "pln_1", planName: "Unlimited CrossFit", amount: 199, status: "active", nextBilling: "2024-06-12", since: "2024-01-02", failedAttempts: 0 },
  { id: "sub_6", type: "subscription", memberName: "Jessica Garcia", planId: "pln_2", planName: "3x Weekly", amount: 149, status: "active", nextBilling: "2024-06-18", since: "2023-05-14", failedAttempts: 0 },
  { id: "sub_7", type: "subscription", memberName: "Robert Miller", planId: "pln_1", planName: "Unlimited CrossFit", amount: 199, status: "canceled", nextBilling: null, since: "2022-09-01", canceledAt: "2024-05-01", failedAttempts: 0 },
  { id: "sub_8", type: "subscription", memberName: "Lisa Taylor", planId: "pln_1", planName: "Unlimited CrossFit", amount: 199, status: "past_due", nextBilling: "2024-05-20", since: "2023-10-10", failedAttempts: 1 },
];

const mockPayments = [
  { id: "pay_1", type: "payment", memberName: "Alex Johnson", amount: 199, status: "succeeded", date: "2024-05-01T08:23:00Z", method: "Visa •••• 4242", description: "Unlimited CrossFit - May 2024" },
  { id: "pay_2", type: "payment", memberName: "Michael Brown", amount: 199, status: "succeeded", date: "2024-05-05T09:12:00Z", method: "Mastercard •••• 5555", description: "Unlimited CrossFit - May 2024" },
  { id: "pay_3", type: "payment", memberName: "Sarah Smith", amount: 149, status: "failed", date: "2024-05-15T10:00:00Z", method: "Visa •••• 1234", description: "3x Weekly - May 2024" },
  { id: "pay_4", type: "payment", memberName: "David Wilson", amount: 199, status: "succeeded", date: "2024-05-12T07:45:00Z", method: "Amex •••• 3000", description: "Unlimited CrossFit - May 2024" },
  { id: "pay_5", type: "payment", memberName: "Jessica Garcia", amount: 149, status: "succeeded", date: "2024-05-18T14:30:00Z", method: "Visa •••• 9876", description: "3x Weekly - May 2024" },
  { id: "pay_6", type: "payment", memberName: "Lisa Taylor", amount: 199, status: "failed", date: "2024-05-20T11:20:00Z", method: "Mastercard •••• 4444", description: "Unlimited CrossFit - May 2024" },
  { id: "pay_7", type: "payment", memberName: "Tom Harris", amount: 25, status: "succeeded", date: "2024-05-21T16:15:00Z", method: "Visa •••• 1111", description: "Drop-In" },
  { id: "pay_8", type: "payment", memberName: "Robert Miller", amount: 199, status: "refunded", date: "2024-04-01T08:00:00Z", method: "Visa •••• 2222", description: "Unlimited CrossFit - April 2024" },
];

const mockMetrics = {
  mrr: 42500,
  activeMembers: 281,
  arm: 151.24,
  failedPayments: 12,
  cancelledThisMonth: 5,
  collectionsThisMonth: 38200
};

// --- COMPONENTS ---

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatTime = (dateString: string) => {
  return new Date(dateString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

export function SplitPaneWorkspace() {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  
  const listRef = useRef<HTMLDivElement>(null);

  // Combine and filter data
  const filteredData = useMemo(() => {
    let data: any[] = [];
    
    if (activeTab === "all" || activeTab === "plans") data = [...data, ...mockPlans];
    if (activeTab === "all" || activeTab === "subscriptions") data = [...data, ...mockSubscriptions];
    if (activeTab === "all" || activeTab === "payments") data = [...data, ...mockPayments];
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter(item => {
        if (item.type === "plan") return item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
        if (item.type === "subscription") return item.memberName.toLowerCase().includes(q) || item.planName.toLowerCase().includes(q);
        if (item.type === "payment") return item.memberName.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
        return false;
      });
    }
    
    // Sort by type then by some criteria (just simple sort for mockup)
    return data.sort((a, b) => {
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      if (a.type === "payment") return new Date(b.date).getTime() - new Date(a.date).getTime();
      return 0; // maintain order
    });
  }, [activeTab, searchQuery]);

  const selectedItem = useMemo(() => {
    return filteredData.find(item => item.id === selectedItemId) || null;
  }, [selectedItemId, filteredData]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => {
          const next = Math.min(prev + 1, filteredData.length - 1);
          setSelectedItemId(filteredData[next]?.id || null);
          return next;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => {
          const next = Math.max(prev - 1, 0);
          setSelectedItemId(filteredData[next]?.id || null);
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredData]);

  // Sync selected index with clicks
  useEffect(() => {
    if (selectedItemId) {
      const idx = filteredData.findIndex(item => item.id === selectedItemId);
      if (idx !== -1) setSelectedIndex(idx);
    }
  }, [selectedItemId, filteredData]);

  // Select first item by default when filtering changes
  useEffect(() => {
    if (filteredData.length > 0 && !selectedItemId && activeTab !== "all") {
      setSelectedItemId(filteredData[0].id);
    }
  }, [filteredData, activeTab]);

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 text-slate-900 font-sans overflow-hidden dark:bg-slate-950 dark:text-slate-100">
      
      {/* TOP METRICS BAR */}
      <div className="flex-none h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-6 text-sm">
          <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center text-white">
              <Activity className="w-3 h-3" />
            </div>
            ForgeOS Billing
          </div>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-6">
            <MetricItem label="MRR" value={formatCurrency(mockMetrics.mrr)} trend="+2.4%" positive />
            <MetricItem label="Active Members" value={mockMetrics.activeMembers.toString()} trend="+4" positive />
            <MetricItem label="ARM" value={formatCurrency(mockMetrics.arm)} />
            <MetricItem label="Failed Payments" value={mockMetrics.failedPayments.toString()} alert={mockMetrics.failedPayments > 10} />
            <MetricItem label="Collections" value={formatCurrency(mockMetrics.collectionsThisMonth)} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-2 bg-slate-50 dark:bg-slate-800">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Billing Settings</span>
          </Button>
          <Button size="sm" className="h-8 gap-2 bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Plan</span>
          </Button>
        </div>
      </div>

      {/* SPLIT PANE CONTENT */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* LEFT PANE - LIST */}
        <div className="w-[380px] flex-none border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex flex-col">
          
          {/* SEARCH & FILTER */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
            <div className="relative mb-3">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input 
                placeholder="Search plans, members, payments..." 
                className="pl-9 h-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-sm shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-slate-400 flex gap-1">
                <kbd className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">⌘</kbd>
                <kbd className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">K</kbd>
              </div>
            </div>
            
            <div className="flex space-x-1 bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-md">
              <TabButton active={activeTab === "all"} onClick={() => setActiveTab("all")}>All</TabButton>
              <TabButton active={activeTab === "plans"} onClick={() => setActiveTab("plans")}>Plans</TabButton>
              <TabButton active={activeTab === "subscriptions"} onClick={() => setActiveTab("subscriptions")}>Subs</TabButton>
              <TabButton active={activeTab === "payments"} onClick={() => setActiveTab("payments")}>Payments</TabButton>
            </div>
          </div>

          {/* LIST CONTENT */}
          <ScrollArea className="flex-1" ref={listRef}>
            <div className="p-2 space-y-0.5">
              {filteredData.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-500">
                  No results found.
                </div>
              ) : (
                filteredData.map((item, idx) => (
                  <ListItem 
                    key={item.id} 
                    item={item} 
                    selected={selectedItemId === item.id}
                    onClick={() => {
                      setSelectedItemId(item.id);
                      setSelectedIndex(idx);
                    }}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* RIGHT PANE - DETAIL */}
        <div className="flex-1 bg-white dark:bg-slate-900 overflow-y-auto relative">
          {selectedItem ? (
            <DetailPane item={selectedItem} />
          ) : (
            <EmptyDashboard />
          )}
        </div>
      </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function MetricItem({ label, value, trend, positive, alert }: any) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-semibold tabular-nums tracking-tight ${alert ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
          {value}
        </span>
        {trend && (
          <span className={`text-[10px] font-medium ${positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}

function TabButton({ active, children, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 text-xs font-medium py-1.5 px-2 rounded-sm transition-all duration-200 ${
        active 
          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
      }`}
    >
      {children}
    </button>
  );
}

function ListItem({ item, selected, onClick }: any) {
  let icon, title, subtitle, rightTop, rightBottom, statusColor;

  if (item.type === "plan") {
    icon = <CreditCard className="w-4 h-4 text-slate-500" />;
    title = item.name;
    subtitle = `${item.activeMembers} members`;
    rightTop = formatCurrency(item.price);
    rightBottom = `/${item.interval.substring(0, 2)}`;
    statusColor = "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  } else if (item.type === "subscription") {
    icon = <Users className="w-4 h-4 text-slate-500" />;
    title = item.memberName;
    subtitle = item.planName;
    rightTop = formatCurrency(item.amount);
    
    if (item.status === 'active') {
      rightBottom = 'Active';
      statusColor = "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    } else if (item.status === 'past_due') {
      rightBottom = 'Past Due';
      statusColor = "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    } else if (item.status === 'paused') {
      rightBottom = 'Paused';
      statusColor = "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    } else {
      rightBottom = 'Canceled';
      statusColor = "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
    }
  } else if (item.type === "payment") {
    icon = <History className="w-4 h-4 text-slate-500" />;
    title = item.memberName;
    subtitle = formatDate(item.date);
    rightTop = formatCurrency(item.amount);
    
    if (item.status === 'succeeded') {
      rightBottom = 'Succeeded';
      statusColor = "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    } else if (item.status === 'failed') {
      rightBottom = 'Failed';
      statusColor = "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    } else {
      rightBottom = 'Refunded';
      statusColor = "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400";
    }
  }

  return (
    <div
      onClick={onClick}
      className={`group flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors border ${
        selected 
          ? 'bg-blue-50/50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 shadow-sm' 
          : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/50'
      }`}
    >
      <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${
        selected ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
      }`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium truncate ${selected ? 'text-blue-900 dark:text-blue-100' : 'text-slate-900 dark:text-slate-100'}`}>
          {title}
        </div>
        <div className={`text-xs truncate ${selected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400'}`}>
          {subtitle}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className={`text-sm font-medium tabular-nums ${selected ? 'text-blue-900 dark:text-blue-100' : 'text-slate-900 dark:text-slate-100'}`}>
          {rightTop}
        </div>
        <div className={`text-[10px] font-medium px-1.5 py-0.5 rounded-sm inline-block mt-0.5 ${statusColor}`}>
          {rightBottom}
        </div>
      </div>
    </div>
  );
}

function DetailPane({ item }: { item: any }) {
  if (item.type === "plan") return <PlanDetail item={item} />;
  if (item.type === "subscription") return <SubscriptionDetail item={item} />;
  if (item.type === "payment") return <PaymentDetail item={item} />;
  return null;
}

function PlanDetail({ item }: { item: any }) {
  return (
    <div className="h-full flex flex-col animate-in fade-in duration-200">
      <div className="flex-none p-8 pb-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs font-normal uppercase tracking-wider text-slate-500">Plan</Badge>
              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">Active</Badge>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">{item.name}</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xl">{item.description}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8 gap-2">
              <Edit2 className="w-3.5 h-3.5" />
              Edit
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
              <Ban className="w-3.5 h-3.5" />
              Archive
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-8 mt-8">
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Pricing</div>
            <div className="text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">
              {formatCurrency(item.price)}<span className="text-base text-slate-500 font-normal">/{item.interval}</span>
            </div>
          </div>
          <Separator orientation="vertical" className="h-10" />
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Active Subscribers</div>
            <div className="text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">
              {item.activeMembers}
            </div>
          </div>
          <Separator orientation="vertical" className="h-10" />
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">MRR Impact</div>
            <div className="text-2xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-500">
              {formatCurrency(item.price * item.activeMembers)}
            </div>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 bg-slate-50/50 dark:bg-slate-950/50">
        <div className="p-8 max-w-4xl mx-auto">
          <Tabs defaultValue="subscribers" className="w-full">
            <TabsList className="mb-6 h-9 bg-slate-200/50 dark:bg-slate-800/50">
              <TabsTrigger value="subscribers" className="text-xs data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">Active Subscribers</TabsTrigger>
              <TabsTrigger value="settings" className="text-xs data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900">Plan Settings</TabsTrigger>
            </TabsList>
            
            <TabsContent value="subscribers">
              <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {mockSubscriptions.filter(s => s.planId === item.id).map(sub => (
                    <div key={sub.id} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-medium">
                          {sub.memberName.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-900 dark:text-white">{sub.memberName}</div>
                          <div className="text-xs text-slate-500">Since {formatDate(sub.since)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" className={
                          sub.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          sub.status === 'past_due' ? 'bg-red-50 text-red-700 border-red-200' :
                          'bg-slate-50 text-slate-700 border-slate-200'
                        }>
                          {sub.status}
                        </Badge>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>
            
            <TabsContent value="settings">
              <Card className="border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Plan Name</label>
                    <Input defaultValue={item.name} className="h-9" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Billing Interval</label>
                    <Input defaultValue={item.interval} className="h-9" disabled />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Price (USD)</label>
                    <Input defaultValue={item.price} type="number" className="h-9 tabular-nums" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Setup Fee</label>
                    <Input defaultValue="0" type="number" className="h-9 tabular-nums" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Description</label>
                  <Input defaultValue={item.description} className="h-9" />
                </div>
                <div className="pt-4 flex justify-end">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">Save Changes</Button>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}

function SubscriptionDetail({ item }: { item: any }) {
  const isPastDue = item.status === 'past_due';
  
  return (
    <div className="h-full flex flex-col animate-in fade-in duration-200">
      
      {isPastDue && (
        <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-900/30 p-4 flex items-start gap-3 flex-none">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-red-900 dark:text-red-300">Payment Past Due</h3>
            <p className="text-xs text-red-700 dark:text-red-400 mt-1">
              This subscription has failed {item.failedAttempts} payment attempts. The next retry is scheduled for tomorrow.
            </p>
          </div>
          <Button size="sm" className="h-8 bg-red-600 hover:bg-red-700 text-white shadow-sm shrink-0">
            Send Update Link
          </Button>
        </div>
      )}

      <div className="flex-none p-8 pb-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl font-medium text-slate-600 border border-slate-200 dark:border-slate-700 shadow-sm">
              {item.memberName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-xs font-normal uppercase tracking-wider text-slate-500">Subscription</Badge>
                <Badge className={`border-0 ${
                  item.status === 'active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
                  item.status === 'past_due' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                  item.status === 'paused' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' :
                  'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                  {item.status.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{item.memberName}</h1>
              <div className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                <span className="font-medium text-slate-700 dark:text-slate-300">{item.planName}</span>
                <span>•</span>
                <span>Member since {formatDate(item.since)}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-2">
                  Actions <ChevronRight className="w-3 h-3 rotate-90" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem className="gap-2"><Edit2 className="w-4 h-4" /> Change Plan</DropdownMenuItem>
                <DropdownMenuItem className="gap-2"><Settings className="w-4 h-4" /> Update Card</DropdownMenuItem>
                <DropdownMenuItem className="gap-2 text-amber-600"><Pause className="w-4 h-4" /> Pause Subscription</DropdownMenuItem>
                <DropdownMenuItem className="gap-2 text-red-600"><Ban className="w-4 h-4" /> Cancel Subscription</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mt-6 p-4 rounded-lg bg-slate-50 border border-slate-100 dark:bg-slate-800/50 dark:border-slate-800">
          <div>
            <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Current MRR</div>
            <div className="text-xl font-semibold tabular-nums text-slate-900 dark:text-white">
              {formatCurrency(item.amount)}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Next Billing</div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
              {item.nextBilling ? formatDate(item.nextBilling) : '—'}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Payment Method</div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1 mt-1">
              <CreditCard className="w-3.5 h-3.5 text-slate-400" /> Visa •••• 4242
            </div>
          </div>
          <div>
            <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">LTV</div>
            <div className="text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-500 mt-1">
              {formatCurrency(item.amount * 24)} <span className="text-xs text-slate-400 font-normal">(est)</span>
            </div>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 bg-white dark:bg-slate-950">
        <div className="p-8 max-w-4xl mx-auto">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Payment History</h3>
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-xs uppercase text-slate-500 font-medium">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {mockPayments.filter(p => p.memberName === item.memberName).map(pay => (
                  <tr key={pay.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-400">{formatDate(pay.date)}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium tabular-nums text-slate-900 dark:text-white">{formatCurrency(pay.amount)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant="outline" className={`text-[10px] font-medium px-1.5 py-0 rounded-sm border-0 ${
                        pay.status === 'succeeded' ? 'bg-emerald-100 text-emerald-700' :
                        pay.status === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {pay.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 truncate max-w-[200px]">{pay.description}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-blue-600">
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}

function PaymentDetail({ item }: { item: any }) {
  const isSuccess = item.status === 'succeeded';
  const isFailed = item.status === 'failed';
  
  return (
    <div className="h-full flex flex-col animate-in fade-in duration-200 bg-slate-50/30 dark:bg-slate-950/30">
      <div className="flex-1 p-8 max-w-2xl mx-auto w-full">
        
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="sm" className="h-8 gap-1 -ml-2 text-slate-500 hover:text-slate-900">
            <ArrowRight className="w-4 h-4 rotate-180" /> Back
          </Button>
        </div>

        <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
          <div className={`h-1.5 w-full ${isSuccess ? 'bg-emerald-500' : isFailed ? 'bg-red-500' : 'bg-slate-500'}`} />
          <div className="p-8 text-center border-b border-slate-100 dark:border-slate-800">
            <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
              isSuccess ? 'bg-emerald-100 text-emerald-600' : 
              isFailed ? 'bg-red-100 text-red-600' : 
              'bg-slate-100 text-slate-600'
            }`}>
              {isSuccess ? <CheckCircle2 className="w-6 h-6" /> : 
               isFailed ? <AlertCircle className="w-6 h-6" /> : 
               <Clock className="w-6 h-6" />}
            </div>
            <div className="text-slate-500 text-sm mb-1 uppercase tracking-wider font-medium">{item.status}</div>
            <div className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white mb-2 tabular-nums">
              {formatCurrency(item.amount)}
            </div>
            <div className="text-slate-500 text-sm">{formatDate(item.date)} at {formatTime(item.date)}</div>
          </div>
          
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-y-4 text-sm">
              <div className="text-slate-500">Customer</div>
              <div className="font-medium text-slate-900 dark:text-white flex items-center gap-2 justify-end">
                {item.memberName} <ArrowUpRight className="w-3.5 h-3.5 text-blue-500" />
              </div>
              
              <div className="text-slate-500">Description</div>
              <div className="font-medium text-slate-900 dark:text-white text-right">{item.description}</div>
              
              <div className="text-slate-500">Payment Method</div>
              <div className="font-medium text-slate-900 dark:text-white text-right flex items-center justify-end gap-2">
                <CreditCard className="w-4 h-4 text-slate-400" /> {item.method}
              </div>
              
              <div className="text-slate-500">Transaction ID</div>
              <div className="font-mono text-xs text-slate-600 dark:text-slate-400 text-right">{item.id.replace('pay_', 'ch_3M4')}...</div>
            </div>

            <Separator className="bg-slate-100 dark:bg-slate-800" />

            {isFailed && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 p-4 rounded-lg text-sm border border-red-100 dark:border-red-900/50 flex flex-col gap-3">
                <div className="font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> Decline Reason: Insufficient Funds
                </div>
                <p className="text-red-700/80 dark:text-red-400/80 text-xs">
                  The customer's bank declined this charge due to insufficient funds. The automated retry process will attempt this charge again in 3 days.
                </p>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white h-8 text-xs">Retry Charge Now</Button>
                  <Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-100 h-8 text-xs">Send Update Link</Button>
                </div>
              </div>
            )}

            {isSuccess && (
              <div className="flex justify-center gap-3">
                <Button variant="outline" className="w-full h-9">
                  <Download className="w-4 h-4 mr-2" /> Download Receipt
                </Button>
                <Button variant="outline" className="w-full h-9 text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-200">
                  Refund Payment
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function EmptyDashboard() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8">
      <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 border border-slate-200 dark:border-slate-700">
        <CreditCard className="w-6 h-6 text-slate-300 dark:text-slate-600" />
      </div>
      <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">Billing Workspace</h3>
      <p className="text-sm text-center max-w-md mb-6">
        Select a plan, subscription, or payment from the left pane to view details, make edits, or take action.
      </p>
      <div className="flex gap-4 text-xs">
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
          <kbd className="font-mono bg-white dark:bg-slate-900 px-1 rounded shadow-sm border border-slate-200 dark:border-slate-700">↑</kbd>
          <kbd className="font-mono bg-white dark:bg-slate-900 px-1 rounded shadow-sm border border-slate-200 dark:border-slate-700">↓</kbd>
          <span>to navigate</span>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
          <kbd className="font-mono bg-white dark:bg-slate-900 px-1 rounded shadow-sm border border-slate-200 dark:border-slate-700">⌘K</kbd>
          <span>to search</span>
        </div>
      </div>
    </div>
  );
}
