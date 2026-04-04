import React, { useState } from "react";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CreditCard,
  DollarSign,
  Edit2,
  FileText,
  GripVertical,
  MoreVertical,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Trash2,
  Users,
  XCircle,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// --- Mock Data ---

const summaryData = {
  mrr: 12450,
  mrrGrowth: 5.2,
  activeMembers: 142,
  arm: 87.67,
  failedPayments: 3,
  failedAmount: 435,
  collectionsThisMonth: 11200,
  cancelledThisMonth: 2,
};

const failedPayments = [
  { id: "fp1", memberName: "Alex Mercer", amount: 145, plan: "Unlimited Plus", attempts: 2, lastAttempt: "2023-10-24" },
  { id: "fp2", memberName: "Sarah Jenkins", amount: 99, plan: "Basic 3x/Week", attempts: 1, lastAttempt: "2023-10-25" },
  { id: "fp3", memberName: "Marcus Chen", amount: 191, plan: "Couples Unlimited", attempts: 3, lastAttempt: "2023-10-22" },
];

const plans = [
  { id: "p1", name: "Unlimited Plus", price: 145, interval: "monthly", activeSubs: 84, description: "Unlimited classes + open gym" },
  { id: "p2", name: "Basic 3x/Week", price: 99, interval: "monthly", activeSubs: 42, description: "Up to 13 classes per month" },
  { id: "p3", name: "Couples Unlimited", price: 191, interval: "monthly", activeSubs: 12, description: "Unlimited for 2 members" },
  { id: "p4", name: "Drop-in", price: 20, interval: "one-time", activeSubs: 0, description: "Single class pass" },
];

const subscriptions = [
  { id: "s1", memberName: "John Doe", plan: "Unlimited Plus", amount: 145, status: "active", nextBilling: "2023-11-01" },
  { id: "s2", memberName: "Jane Smith", plan: "Basic 3x/Week", amount: 99, status: "active", nextBilling: "2023-11-05" },
  { id: "s3", memberName: "Mike Johnson", plan: "Unlimited Plus", amount: 145, status: "paused", nextBilling: "Paused" },
  { id: "s4", memberName: "Emily Davis", plan: "Couples Unlimited", amount: 191, status: "active", nextBilling: "2023-11-12" },
  { id: "s5", memberName: "Chris Wilson", plan: "Basic 3x/Week", amount: 99, status: "active", nextBilling: "2023-11-15" },
];

const payments = [
  { id: "tx1", date: "2023-10-25", memberName: "John Doe", amount: 145, status: "succeeded", method: "Visa •••• 4242" },
  { id: "tx2", date: "2023-10-24", memberName: "Jane Smith", amount: 99, status: "succeeded", method: "Mastercard •••• 5555" },
  { id: "tx3", date: "2023-10-24", memberName: "Alex Mercer", amount: 145, status: "failed", method: "Visa •••• 1234" },
  { id: "tx4", date: "2023-10-23", memberName: "Emily Davis", amount: 191, status: "succeeded", method: "Amex •••• 1005" },
  { id: "tx5", date: "2023-10-22", memberName: "Marcus Chen", amount: 191, status: "failed", method: "Discover •••• 9876" },
];

const refunds = [
  { id: "r1", date: "2023-10-15", memberName: "Tom Hardy", amount: 145, reason: "Accidental charge", status: "processed" },
  { id: "r2", date: "2023-10-02", memberName: "Lisa Wong", amount: 45, reason: "Prorated cancellation", status: "processed" },
];

const cancellations = [
  { id: "c1", date: "2023-10-20", memberName: "Sam Wilson", plan: "Basic 3x/Week", reason: "Moving away" },
  { id: "c2", date: "2023-10-10", memberName: "Diana Prince", plan: "Unlimited Plus", reason: "Injury" },
];

// --- Components ---

function FormatCurrency({ amount }: { amount: number }) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function StatusBadge({ status }: { status: string }) {
  switch (status.toLowerCase()) {
    case "active":
    case "succeeded":
    case "processed":
      return <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20">Active</Badge>;
    case "failed":
      return <Badge variant="destructive" className="bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border-rose-500/20">Failed</Badge>;
    case "paused":
      return <Badge variant="outline" className="text-amber-500 border-amber-500/30 bg-amber-500/10">Paused</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

// Collapsible Card Container
function DisclosureCard({
  title,
  icon: Icon,
  description,
  defaultOpen = false,
  urgent = false,
  rightContent,
  children,
}: {
  title: string;
  icon: React.ElementType;
  description: React.ReactNode;
  defaultOpen?: boolean;
  urgent?: boolean;
  rightContent?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card className={`overflow-hidden transition-all duration-300 ${isOpen ? "shadow-md" : "shadow-sm hover:shadow-md"} ${urgent ? "border-rose-500/50 dark:border-rose-500/30" : ""}`}>
      <div 
        className={`flex items-center justify-between p-5 cursor-pointer select-none transition-colors ${isOpen ? "bg-muted/30" : "hover:bg-muted/50"} ${urgent && !isOpen ? "bg-rose-50 dark:bg-rose-950/20" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-4">
          <div className={`p-2 rounded-full ${urgent ? "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400" : "bg-primary/10 text-primary"}`}>
            <Icon size={20} />
          </div>
          <div>
            <h3 className={`font-semibold text-lg ${urgent ? "text-rose-700 dark:text-rose-400" : ""}`}>{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {rightContent && <div onClick={(e) => e.stopPropagation()}>{rightContent}</div>}
          <Button variant="ghost" size="icon" className="shrink-0">
            {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </Button>
        </div>
      </div>
      
      {isOpen && (
        <div className="p-0 border-t animate-in fade-in slide-in-from-top-4 duration-300">
          {children}
        </div>
      )}
    </Card>
  );
}

export function ProgressiveDisclosure() {
  return (
    <div className="min-h-screen bg-neutral-50/50 dark:bg-neutral-950 text-foreground pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 flex flex-col gap-6">
        
        {/* Header / Hero Summary */}
        <div className="flex flex-col gap-2 mb-4">
          <h1 className="text-3xl font-bold tracking-tight">Financial Overview</h1>
          <p className="text-muted-foreground">Your gym's revenue engine at a glance.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="col-span-1 md:col-span-3 bg-primary text-primary-foreground shadow-lg border-primary">
            <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <p className="text-primary-foreground/80 font-medium mb-1">Monthly Recurring Revenue</p>
                <div className="flex items-baseline gap-3">
                  <h2 className="text-5xl md:text-6xl font-bold tracking-tighter">
                    <FormatCurrency amount={summaryData.mrr} />
                  </h2>
                  <Badge className="bg-white/20 hover:bg-white/30 text-white border-0">
                    <ArrowUpRight className="mr-1 h-3 w-3" />
                    {summaryData.mrrGrowth}%
                  </Badge>
                </div>
              </div>
              
              <div className="flex flex-row md:flex-col gap-6 md:gap-4 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                <div className="flex flex-col">
                  <span className="text-primary-foreground/70 text-sm">Active Members</span>
                  <span className="text-2xl font-semibold">{summaryData.activeMembers}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-primary-foreground/70 text-sm">Avg Revenue / Member</span>
                  <span className="text-2xl font-semibold"><FormatCurrency amount={summaryData.arm} /></span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Priority Stack */}
        <div className="flex flex-col gap-4 mt-4">
          
          {/* 1. Action Required (Urgent) */}
          {summaryData.failedPayments > 0 && (
            <DisclosureCard
              title="Action Required: Failed Payments"
              icon={AlertCircle}
              description={`${summaryData.failedPayments} members have failed payments totaling $${summaryData.failedAmount}.`}
              defaultOpen={true}
              urgent={true}
              rightContent={
                <Button variant="outline" size="sm" className="bg-white dark:bg-neutral-900">
                  <RefreshCw className="mr-2 h-4 w-4" /> Retry All
                </Button>
              }
            >
              <div className="p-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Attempts</TableHead>
                      <TableHead>Last Attempt</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {failedPayments.map((fp) => (
                      <TableRow key={fp.id}>
                        <TableCell className="font-medium">{fp.memberName}</TableCell>
                        <TableCell><FormatCurrency amount={fp.amount} /></TableCell>
                        <TableCell>{fp.attempts}</TableCell>
                        <TableCell>{fp.lastAttempt}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm">Send Update Link</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </DisclosureCard>
          )}

          {/* 2. Active Subscriptions */}
          <DisclosureCard
            title="Active Subscriptions"
            icon={Users}
            description={`${summaryData.activeMembers} total active recurring subscriptions.`}
            defaultOpen={false}
            rightContent={
              <Button variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" /> New Subscription
              </Button>
            }
          >
            <div className="p-6 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div className="relative w-72">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input type="search" placeholder="Search members..." className="pl-8" />
                </div>
                <Button variant="secondary" size="sm">Export CSV</Button>
              </div>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Next Billing</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{sub.memberName.substring(0,2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          {sub.memberName}
                        </TableCell>
                        <TableCell>{sub.plan}</TableCell>
                        <TableCell><StatusBadge status={sub.status} /></TableCell>
                        <TableCell><FormatCurrency amount={sub.amount} /></TableCell>
                        <TableCell>{sub.nextBilling}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem><Edit2 className="mr-2 h-4 w-4" /> Edit Subscription</DropdownMenuItem>
                              <DropdownMenuItem><Pause className="mr-2 h-4 w-4" /> Pause Subscription</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-rose-600"><Trash2 className="mr-2 h-4 w-4" /> Cancel Subscription</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </DisclosureCard>

          {/* 3. Membership Plans */}
          <DisclosureCard
            title="Membership Plans"
            icon={FileText}
            description={`${plans.length} active plans offering different tiers of service.`}
            defaultOpen={false}
            rightContent={
              <Button variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" /> Create Plan
              </Button>
            }
          >
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {plans.map((plan) => (
                  <Card key={plan.id} className="flex flex-col">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{plan.name}</CardTitle>
                        <Badge variant="secondary">{plan.interval}</Badge>
                      </div>
                      <CardDescription>{plan.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <div className="text-3xl font-bold"><FormatCurrency amount={plan.price} /></div>
                      <div className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
                        <Users className="h-4 w-4" /> {plan.activeSubs} active subscribers
                      </div>
                    </CardContent>
                    <CardFooter className="pt-3 border-t bg-muted/20 flex justify-end gap-2">
                      <Button variant="ghost" size="sm">Edit</Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          </DisclosureCard>

          {/* 4. Recent Payments */}
          <DisclosureCard
            title="Recent Payments"
            icon={CreditCard}
            description={`${payments.length} transactions processed in the last 7 days.`}
            defaultOpen={false}
          >
            <div className="p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{payment.date}</TableCell>
                      <TableCell className="font-medium">{payment.memberName}</TableCell>
                      <TableCell><FormatCurrency amount={payment.amount} /></TableCell>
                      <TableCell><StatusBadge status={payment.status} /></TableCell>
                      <TableCell className="text-muted-foreground">{payment.method}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 flex justify-center">
                <Button variant="link">View All Transactions</Button>
              </div>
            </div>
          </DisclosureCard>

          {/* 5. Refunds & Cancellations */}
          <DisclosureCard
            title="Refunds & Cancellations"
            icon={RefreshCw}
            description={`${refunds.length} refunds and ${cancellations.length} cancellations this month.`}
            defaultOpen={false}
          >
             <div className="p-6 flex flex-col gap-8">
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Recent Refunds</h4>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Member</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {refunds.map((refund) => (
                        <TableRow key={refund.id}>
                          <TableCell>{refund.date}</TableCell>
                          <TableCell className="font-medium">{refund.memberName}</TableCell>
                          <TableCell><FormatCurrency amount={refund.amount} /></TableCell>
                          <TableCell className="text-muted-foreground">{refund.reason}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Recent Cancellations</h4>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Member</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cancellations.map((cancellation) => (
                        <TableRow key={cancellation.id}>
                          <TableCell>{cancellation.date}</TableCell>
                          <TableCell className="font-medium">{cancellation.memberName}</TableCell>
                          <TableCell>{cancellation.plan}</TableCell>
                          <TableCell className="text-muted-foreground">{cancellation.reason}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </DisclosureCard>

          {/* 6. Settings & Discounts */}
          <DisclosureCard
            title="Settings & Discounts"
            icon={Settings}
            description="Manage tax rates, discount codes, and global billing settings."
            defaultOpen={false}
          >
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="font-semibold text-lg">Active Discounts</h4>
                <Card>
                  <CardContent className="p-4 flex justify-between items-center">
                    <div>
                      <div className="font-medium font-mono text-sm">SUMMER2023</div>
                      <div className="text-sm text-muted-foreground">20% off for 3 months</div>
                    </div>
                    <Badge variant="outline">Active</Badge>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex justify-between items-center">
                    <div>
                      <div className="font-medium font-mono text-sm">FAMILY</div>
                      <div className="text-sm text-muted-foreground">$50 off recurring</div>
                    </div>
                    <Badge variant="outline">Active</Badge>
                  </CardContent>
                </Card>
                <Button variant="outline" className="w-full">Create Discount Code</Button>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-lg">Tax Settings</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label className="text-base">Collect Sales Tax</Label>
                      <p className="text-sm text-muted-foreground">Automatically calculate tax based on member location</p>
                    </div>
                    <div className="h-5 w-9 rounded-full bg-primary/20 flex items-center px-0.5 cursor-pointer">
                      <div className="h-4 w-4 rounded-full bg-primary transform translate-x-4 shadow-sm" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Default Tax Rate (%)</Label>
                    <Input type="number" defaultValue={8.5} />
                  </div>
                  <Button>Save Settings</Button>
                </div>
              </div>
            </div>
          </DisclosureCard>

        </div>
      </div>
    </div>
  );
}
