import React, { useState } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  Clock,
  CreditCard,
  MoreHorizontal,
  PauseCircle,
  PlayCircle,
  Plus,
  Settings,
  ShieldAlert,
  Ticket,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

// --- MOCK DATA ---
const mockMetrics = {
  mrr: 12450,
  mrrGrowth: 8.2,
  arm: 145,
  armGrowth: 2.1,
  activeMembers: 86,
  failedPayments: 3,
  failedAmount: 435,
  cancelledThisMonth: 2,
  collectionsThisMonth: 11800,
};

const mockPlans = [
  { id: "p1", name: "Unlimited", price: 199, interval: "month", subscribers: 45, mrr: 8955, status: "active" },
  { id: "p2", name: "3x / Week", price: 149, interval: "month", subscribers: 28, mrr: 4172, status: "active" },
  { id: "p3", name: "Punch Card (10)", price: 180, interval: "one-time", subscribers: 12, mrr: 0, status: "active" },
  { id: "p4", name: "Drop-in", price: 25, interval: "one-time", subscribers: 35, mrr: 0, status: "active" },
  { id: "p5", name: "Founders", price: 129, interval: "month", subscribers: 13, mrr: 1677, status: "archived" },
];

const mockAttention = [
  { id: "a1", type: "failed_payment", member: "Sarah Jenkins", amount: 199, plan: "Unlimited", date: "Today", status: "unresolved" },
  { id: "a2", type: "failed_payment", member: "Mike Torres", amount: 149, plan: "3x / Week", date: "Yesterday", status: "unresolved" },
  { id: "a3", type: "expiring_card", member: "Emma Watson", amount: 0, plan: "Unlimited", date: "In 5 days", status: "unresolved" },
  { id: "a4", type: "cancellation_requested", member: "David Chen", amount: 199, plan: "Unlimited", date: "End of month", status: "unresolved" },
];

const mockActivity = [
  { id: "ac1", type: "payment_success", member: "Jessica Alba", amount: 199, plan: "Unlimited", date: "2 mins ago" },
  { id: "ac2", type: "payment_success", member: "Tom Hardy", amount: 149, plan: "3x / Week", date: "15 mins ago" },
  { id: "ac3", type: "subscription_created", member: "New User", amount: 199, plan: "Unlimited", date: "1 hour ago" },
  { id: "ac4", type: "payment_failed", member: "Sarah Jenkins", amount: 199, plan: "Unlimited", date: "2 hours ago" },
  { id: "ac5", type: "refund_issued", member: "Chris Evans", amount: 25, plan: "Drop-in", date: "Yesterday" },
  { id: "ac6", type: "subscription_paused", member: "Mark Ruffalo", amount: 0, plan: "3x / Week", date: "Yesterday" },
  { id: "ac7", type: "payment_success", member: "Scarlett Johansson", amount: 199, plan: "Unlimited", date: "Yesterday" },
  { id: "ac8", type: "payment_success", member: "Jeremy Renner", amount: 149, plan: "3x / Week", date: "2 days ago" },
];

export function RevenueCommandCenter() {
  const [plans, setPlans] = useState(mockPlans);
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-indigo-500/30">
      {/* HEADER */}
      <header className="sticky top-0 z-10 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-indigo-400" />
          <h1 className="text-xl font-semibold tracking-tight">Revenue Center</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white">
            <Ticket className="h-4 w-4 mr-2" />
            Discounts
          </Button>
          <Button variant="outline" size="sm" className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white" onClick={() => setIsSettingsOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            New Subscription
          </Button>
        </div>
      </header>

      <main className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
        
        {/* HERO METRICS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-zinc-900 border-zinc-800 shadow-xl overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent pointer-events-none" />
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-zinc-400">Monthly Recurring Revenue</p>
                  <div className="text-4xl font-bold text-white tracking-tight">
                    ${mockMetrics.mrr.toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center space-x-1 text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md text-sm font-medium">
                  <TrendingUp className="h-4 w-4" />
                  <span>+{mockMetrics.mrrGrowth}%</span>
                </div>
              </div>
              <div className="mt-4 h-12 flex items-end gap-1 opacity-60">
                {[40, 45, 60, 50, 70, 65, 80, 75, 90, 85, 95, 100].map((h, i) => (
                  <div key={i} className="flex-1 bg-indigo-500 rounded-t-sm" style={{ height: \`\${h}%\` }} />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800 shadow-xl relative overflow-hidden">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-zinc-400">Avg Revenue / Member</p>
                  <div className="text-4xl font-bold text-white tracking-tight">
                    ${mockMetrics.arm.toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center space-x-1 text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md text-sm font-medium">
                  <ArrowUpRight className="h-4 w-4" />
                  <span>+{mockMetrics.armGrowth}%</span>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between text-sm text-zinc-400">
                <span>{mockMetrics.activeMembers} Active Members</span>
                <span>Target: $160</span>
              </div>
              <Progress value={(mockMetrics.arm / 160) * 100} className="h-1.5 mt-2 bg-zinc-800 [&>div]:bg-indigo-400" />
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800 shadow-xl relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent pointer-events-none" />
            <CardContent className="p-6 flex flex-col justify-between h-full">
              <div className="space-y-1">
                <p className="text-sm font-medium text-zinc-400">Collections (MTD)</p>
                <div className="text-4xl font-bold text-white tracking-tight">
                  ${mockMetrics.collectionsThisMonth.toLocaleString()}
                </div>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4 border-t border-zinc-800 pt-4">
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Failed Payments</p>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-rose-400">{mockMetrics.failedPayments}</span>
                    <span className="text-xs text-rose-400/70">(${mockMetrics.failedAmount})</span>
                  </div>
                </div>
                 <div>
                  <p className="text-xs text-zinc-500 mb-1">Cancellations</p>
                  <span className="text-lg font-semibold text-amber-400">{mockMetrics.cancelledThisMonth}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* PRIORITY ZONES */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COL: Attention & Revenue Breakdown */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* NEEDS ATTENTION */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <h2 className="text-lg font-medium text-white">Needs Attention</h2>
                <Badge variant="secondary" className="bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-full px-2 py-0.5">
                  {mockAttention.length}
                </Badge>
              </div>
              
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden shadow-lg">
                <div className="divide-y divide-zinc-800/50">
                  {mockAttention.map((item) => (
                    <div key={item.id} className="p-4 flex items-center justify-between hover:bg-zinc-800/30 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className={\`mt-0.5 p-2 rounded-md \${
                          item.type === 'failed_payment' ? 'bg-rose-500/10 text-rose-400' :
                          item.type === 'cancellation_requested' ? 'bg-amber-500/10 text-amber-400' :
                          'bg-orange-500/10 text-orange-400'
                        }\`}>
                          {item.type === 'failed_payment' ? <XCircle className="h-4 w-4" /> :
                           item.type === 'cancellation_requested' ? <ArrowDownRight className="h-4 w-4" /> :
                           <CreditCard className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="font-medium text-zinc-200">{item.member}</p>
                          <p className="text-sm text-zinc-500">
                            {item.type === 'failed_payment' ? \`Failed payment for \${item.plan} ($\${item.amount})\` :
                             item.type === 'cancellation_requested' ? \`Requested cancellation for \${item.plan}\` :
                             \`Card expiring \${item.date.toLowerCase()}\`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-zinc-500">{item.date}</span>
                        {item.type === 'failed_payment' ? (
                          <Button size="sm" variant="outline" className="h-8 border-rose-500/30 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300">
                            Send Link
                          </Button>
                        ) : item.type === 'cancellation_requested' ? (
                          <Button size="sm" variant="outline" className="h-8 border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300">
                            Review
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" className="h-8 text-zinc-400 hover:text-zinc-200">
                            Remind
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* REVENUE BREAKDOWN (PLANS) */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-white">Revenue by Plan</h2>
                <Dialog open={isCreatePlanOpen} onOpenChange={setIsCreatePlanOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Plan
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-zinc-800 text-zinc-100">
                    <DialogHeader>
                      <DialogTitle>Create Membership Plan</DialogTitle>
                      <DialogDescription className="text-zinc-400">
                        Define a new tier or pass for your members.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="name" className="text-zinc-300">Name</Label>
                        <Input id="name" placeholder="e.g. Premium Access" className="bg-zinc-900 border-zinc-800" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <div className="grid gap-2">
                          <Label htmlFor="price" className="text-zinc-300">Price ($)</Label>
                          <Input id="price" type="number" placeholder="199" className="bg-zinc-900 border-zinc-800" />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="interval" className="text-zinc-300">Interval</Label>
                          <Select defaultValue="month">
                            <SelectTrigger className="bg-zinc-900 border-zinc-800">
                              <SelectValue placeholder="Select interval" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                              <SelectItem value="week">Weekly</SelectItem>
                              <SelectItem value="month">Monthly</SelectItem>
                              <SelectItem value="year">Yearly</SelectItem>
                              <SelectItem value="one-time">One-time</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                       <div className="grid gap-2">
                        <Label htmlFor="desc" className="text-zinc-300">Description (Optional)</Label>
                        <Textarea id="desc" placeholder="What's included?" className="bg-zinc-900 border-zinc-800 resize-none h-20" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="ghost" onClick={() => setIsCreatePlanOpen(false)} className="text-zinc-400 hover:text-white hover:bg-zinc-800">Cancel</Button>
                      <Button onClick={() => setIsCreatePlanOpen(false)} className="bg-indigo-600 hover:bg-indigo-700 text-white">Create Plan</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden shadow-lg">
                <Table>
                  <TableHeader className="bg-zinc-950/50">
                    <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead className="text-zinc-500 font-medium">Plan</TableHead>
                      <TableHead className="text-zinc-500 font-medium">Price</TableHead>
                      <TableHead className="text-zinc-500 font-medium text-right">Subscribers</TableHead>
                      <TableHead className="text-zinc-500 font-medium text-right">Est. MRR</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plans.map((plan) => (
                      <TableRow key={plan.id} className="border-zinc-800/50 hover:bg-zinc-800/30 transition-colors group">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={\`font-medium \${plan.status === 'archived' ? 'text-zinc-500 line-through' : 'text-zinc-200'}\`}>
                              {plan.name}
                            </span>
                            {plan.status === 'archived' && (
                              <Badge variant="outline" className="border-zinc-700 text-zinc-500 text-[10px] px-1.5 py-0 h-4">Archived</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-zinc-400">
                          ${plan.price} <span className="text-xs text-zinc-600">/{plan.interval === 'one-time' ? 'ea' : 'mo'}</span>
                        </TableCell>
                        <TableCell className="text-right text-zinc-300 font-medium">{plan.subscribers}</TableCell>
                        <TableCell className="text-right text-zinc-200 font-medium">
                           {plan.mrr > 0 ? \`$\${plan.mrr.toLocaleString()}\` : '-'}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-zinc-200">
                              <DropdownMenuItem className="hover:bg-zinc-800 hover:text-white cursor-pointer">Edit Plan</DropdownMenuItem>
                              <DropdownMenuItem className="hover:bg-zinc-800 hover:text-white cursor-pointer">View Subscribers</DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-zinc-800" />
                              {plan.status === 'active' ? (
                                <DropdownMenuItem className="text-rose-400 focus:bg-rose-500/10 focus:text-rose-300 cursor-pointer">Archive Plan</DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem className="text-indigo-400 focus:bg-indigo-500/10 focus:text-indigo-300 cursor-pointer">Restore Plan</DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-zinc-950/30 hover:bg-zinc-950/30">
                      <TableCell colSpan={3} className="text-right text-zinc-500 font-medium border-t border-zinc-800">Total MRR</TableCell>
                      <TableCell className="text-right text-indigo-400 font-bold border-t border-zinc-800 text-lg">
                        ${mockMetrics.mrr.toLocaleString()}
                      </TableCell>
                      <TableCell className="border-t border-zinc-800"></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </section>
          </div>

          {/* RIGHT COL: Activity Stream */}
          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-white">Live Activity</h2>
                <Button variant="ghost" size="sm" className="h-8 text-zinc-400 hover:text-zinc-200">
                  View All
                </Button>
              </div>
              
              <Card className="bg-zinc-900 border-zinc-800 shadow-lg">
                <CardContent className="p-0">
                  <ScrollArea className="h-[600px]">
                    <div className="p-4 relative">
                      <div className="absolute left-6 top-4 bottom-4 w-px bg-zinc-800/50 z-0" />
                      
                      <div className="space-y-6 relative z-10">
                        {mockActivity.map((event) => (
                          <div key={event.id} className="flex gap-4 group">
                            <div className={\`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 border \${
                              event.type === 'payment_success' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' :
                              event.type === 'payment_failed' ? 'bg-rose-500/20 border-rose-500/30 text-rose-400' :
                              event.type === 'subscription_created' ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400' :
                              event.type === 'refund_issued' ? 'bg-amber-500/20 border-amber-500/30 text-amber-400' :
                              'bg-zinc-800 border-zinc-700 text-zinc-400'
                            }\`}>
                              {event.type === 'payment_success' && <CheckCircle2 className="h-3 w-3" />}
                              {event.type === 'payment_failed' && <XCircle className="h-3 w-3" />}
                              {event.type === 'subscription_created' && <Plus className="h-3 w-3" />}
                              {event.type === 'refund_issued' && <ArrowDownRight className="h-3 w-3" />}
                              {event.type === 'subscription_paused' && <PauseCircle className="h-3 w-3" />}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-baseline mb-0.5">
                                <p className="text-sm font-medium text-zinc-200 truncate pr-2">
                                  {event.member}
                                </p>
                                <span className="text-xs text-zinc-500 shrink-0">{event.date}</span>
                              </div>
                              <p className="text-sm text-zinc-400">
                                {event.type === 'payment_success' && \`Paid $\${event.amount} for \${event.plan}\`}
                                {event.type === 'payment_failed' && \`Failed to pay $\${event.amount} (\${event.plan})\`}
                                {event.type === 'subscription_created' && \`Subscribed to \${event.plan}\`}
                                {event.type === 'refund_issued' && \`Refunded $\${event.amount} (\${event.plan})\`}
                                {event.type === 'subscription_paused' && \`Paused \${event.plan}\`}
                              </p>
                              <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="link" className="h-auto p-0 text-xs text-indigo-400 hover:text-indigo-300">
                                  View Details
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
          </div>

        </div>
      </main>

      {/* SETTINGS DIALOG (Mock) */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-[500px] bg-zinc-950 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle>Billing Settings</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Configure taxes, receipts, and payment methods.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-6">
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-zinc-300">Taxes & Fees</h4>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-zinc-200">Collect Tax</Label>
                  <p className="text-xs text-zinc-500">Automatically calculate and collect taxes</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-zinc-200">Pass Processing Fees</Label>
                  <p className="text-xs text-zinc-500">Add 2.9% + 30¢ to member invoices</p>
                </div>
                <Switch />
              </div>
            </div>
            <Separator className="bg-zinc-800" />
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-zinc-300">Dunning (Failed Payments)</h4>
              <div className="grid gap-2">
                <Label className="text-zinc-400">Retry Schedule</Label>
                <Select defaultValue="smart">
                  <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                    <SelectItem value="smart">Smart Retries (Recommended)</SelectItem>
                    <SelectItem value="strict">Strict (3, 5, 7 days)</SelectItem>
                    <SelectItem value="none">Don't retry automatically</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsSettingsOpen(false)} className="text-zinc-400 hover:text-white hover:bg-zinc-800">Close</Button>
            <Button onClick={() => setIsSettingsOpen(false)} className="bg-indigo-600 hover:bg-indigo-700 text-white">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
