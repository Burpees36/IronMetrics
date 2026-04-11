import React, { useState, useEffect, useRef } from "react";
import { useGym } from "@/store/GymContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  DollarSign, TrendingUp, TrendingDown, Wallet, PiggyBank, Users,
  Plus, Pencil, Trash2, Loader2, AlertTriangle, CheckCircle2,
  Info, Lightbulb, BarChart3, ArrowUpRight, ArrowDownRight,
  Settings2, Building2, Zap, ShieldCheck, X
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, Legend
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const BASE_URL = import.meta.env.BASE_URL || "/";
const API_BASE = `${BASE_URL}api`.replace(/\/\//g, "/");

type FinancesTab = "overview" | "expenses" | "settings";

function useFetch<T>(key: string[], url: string, enabled = true) {
  return useQuery<T>({
    queryKey: key,
    queryFn: async () => {
      const res = await fetch(`${API_BASE}${url}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled,
    staleTime: 30000,
  });
}

export function Finances() {
  const { activeGymId } = useGym();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<FinancesTab>("overview");
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [expenseForm, setExpenseForm] = useState({
    name: "", amount: "", frequency: "monthly", isRecurring: true,
    categoryId: "", expenseDate: "", notes: "",
  });

  const { data: summary, isLoading: summaryLoading } = useFetch<any>(
    ["finances-summary", String(activeGymId)],
    `/gyms/${activeGymId}/finances/summary`,
    !!activeGymId
  );

  const { data: expenses } = useFetch<any[]>(
    ["finances-expenses", String(activeGymId)],
    `/gyms/${activeGymId}/finances/expenses`,
    !!activeGymId
  );

  const { data: categories } = useFetch<any[]>(
    ["finances-categories", String(activeGymId)],
    `/gyms/${activeGymId}/finances/categories`,
    !!activeGymId
  );

  const { data: trends } = useFetch<any[]>(
    ["finances-trends", String(activeGymId)],
    `/gyms/${activeGymId}/finances/trends?months=12`,
    !!activeGymId
  );

  const { data: insights } = useFetch<any[]>(
    ["finances-insights", String(activeGymId)],
    `/gyms/${activeGymId}/finances/insights`,
    !!activeGymId
  );

  const { data: payrollSettings } = useFetch<any>(
    ["finances-payroll-settings", String(activeGymId)],
    `/gyms/${activeGymId}/finances/payroll-settings`,
    !!activeGymId
  );

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["finances-summary"] });
    queryClient.invalidateQueries({ queryKey: ["finances-expenses"] });
    queryClient.invalidateQueries({ queryKey: ["finances-trends"] });
    queryClient.invalidateQueries({ queryKey: ["finances-insights"] });
  };

  const saveExpense = async () => {
    if (!expenseForm.name || !expenseForm.amount) return;
    const body = {
      name: expenseForm.name,
      amount: parseFloat(expenseForm.amount),
      frequency: expenseForm.frequency,
      isRecurring: expenseForm.isRecurring,
      categoryId: expenseForm.categoryId ? parseInt(expenseForm.categoryId) : null,
      expenseDate: expenseForm.expenseDate || null,
      notes: expenseForm.notes || null,
    };

    try {
      const method = editingExpense ? "PATCH" : "POST";
      const url = editingExpense
        ? `${API_BASE}/gyms/${activeGymId}/finances/expenses/${editingExpense.id}`
        : `${API_BASE}/gyms/${activeGymId}/finances/expenses`;

      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast({ title: editingExpense ? "Expense updated" : "Expense added" });
      setExpenseDialogOpen(false);
      setEditingExpense(null);
      resetForm();
      invalidateAll();
    } catch {
      toast({ title: "Failed to save expense", variant: "destructive" });
    }
  };

  const deleteExpense = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/gyms/${activeGymId}/finances/expenses/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast({ title: "Expense deleted" });
      invalidateAll();
    } catch {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  const [settingsForm, setSettingsForm] = useState<any>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const settingsInitialized = useRef(false);

  useEffect(() => {
    if (payrollSettings && !settingsInitialized.current) {
      setSettingsForm({
        payrollPercent: payrollSettings.payrollPercent ?? 30,
        ownerPayMethod: payrollSettings.ownerPayMethod ?? "remainder",
        ownerPayPercent: payrollSettings.ownerPayPercent ?? 0,
        ownerPayFixed: payrollSettings.ownerPayFixed ?? 0,
      });
      settingsInitialized.current = true;
    }
  }, [payrollSettings]);

  const settingsDirty = settingsForm && payrollSettings && (
    settingsForm.payrollPercent !== (payrollSettings.payrollPercent ?? 30) ||
    settingsForm.ownerPayMethod !== (payrollSettings.ownerPayMethod ?? "remainder") ||
    settingsForm.ownerPayPercent !== (payrollSettings.ownerPayPercent ?? 0) ||
    settingsForm.ownerPayFixed !== (payrollSettings.ownerPayFixed ?? 0)
  );

  const savePayrollSettings = async () => {
    if (!settingsForm) return;
    setSettingsSaving(true);
    try {
      const res = await fetch(`${API_BASE}/gyms/${activeGymId}/finances/payroll-settings`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsForm),
      });
      if (!res.ok) throw new Error("Failed to save");
      queryClient.invalidateQueries({ queryKey: ["finances-payroll-settings"] });
      invalidateAll();
      toast({ title: "Settings saved" });
    } catch {
      toast({ title: "Failed to update settings", variant: "destructive" });
    } finally {
      setSettingsSaving(false);
    }
  };

  const resetForm = () => {
    setExpenseForm({
      name: "", amount: "", frequency: "monthly", isRecurring: true,
      categoryId: "", expenseDate: "", notes: "",
    });
  };

  const openEditExpense = (expense: any) => {
    setEditingExpense(expense);
    setExpenseForm({
      name: expense.name,
      amount: String(expense.amount),
      frequency: expense.frequency,
      isRecurring: expense.isRecurring,
      categoryId: expense.categoryId ? String(expense.categoryId) : "",
      expenseDate: expense.expenseDate || "",
      notes: expense.notes || "",
    });
    setExpenseDialogOpen(true);
  };

  if (!activeGymId) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">Select a gym to view finances.</p>
      </div>
    );
  }

  if (summaryLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  const tabs: { key: FinancesTab; label: string; icon: React.ElementType }[] = [
    { key: "overview", label: "Overview", icon: BarChart3 },
    { key: "expenses", label: "Expenses", icon: Building2 },
    { key: "settings", label: "Settings", icon: Settings2 },
  ];

  const healthColor = (health: string) => {
    switch (health) {
      case "healthy": return "text-emerald-500";
      case "warning": return "text-amber-500";
      case "danger": return "text-destructive";
      default: return "text-muted-foreground";
    }
  };

  const healthBg = (health: string) => {
    switch (health) {
      case "healthy": return "bg-emerald-500/10 border-emerald-500/20";
      case "warning": return "bg-amber-500/10 border-amber-500/20";
      case "danger": return "bg-destructive/10 border-destructive/20";
      default: return "bg-muted border-border";
    }
  };

  const insightIcon = (type: string) => {
    switch (type) {
      case "success": return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case "warning": return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case "danger": return <AlertTriangle className="w-5 h-5 text-destructive" />;
      case "info": return <Lightbulb className="w-5 h-5 text-blue-500" />;
      default: return <Info className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const insightBg = (type: string) => {
    switch (type) {
      case "success": return "bg-emerald-500/5 border-emerald-500/20";
      case "warning": return "bg-amber-500/5 border-amber-500/20";
      case "danger": return "bg-destructive/5 border-destructive/20";
      case "info": return "bg-blue-500/5 border-blue-500/20";
      default: return "bg-muted border-border";
    }
  };

  const recurringExpenses = (expenses || []).filter((e: any) => e.isRecurring && e.isActive);
  const oneTimeExpenses = (expenses || []).filter((e: any) => !e.isRecurring);

  const categoryMap = new Map((categories || []).map((c: any) => [c.id, c.name]));

  return (
    <div className="space-y-6 pb-10">
      <header>
        <div className="flex items-center gap-3 mb-1">
          <div className="h-8 w-8 bg-primary/20 rounded-lg flex items-center justify-center">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground">Finances</h1>
        </div>
        <p className="text-muted-foreground mt-1">
          Revenue, expenses, payroll, and owner take-home — your complete P&L picture.
        </p>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border p-4 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Revenue</span>
          </div>
          <p className="text-xl font-display font-bold text-foreground">${(summary?.revenue || 0).toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">monthly</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-card border border-border p-4 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Expenses</span>
          </div>
          <p className="text-xl font-display font-bold text-foreground">${(summary?.totalExpenses || 0).toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{summary?.expenseRatio || 0}% of revenue</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className={cn("border p-4 rounded-2xl shadow-sm", healthBg(summary?.payrollHealth || "healthy"))}>
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4" />
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Payroll</span>
          </div>
          <p className={cn("text-xl font-display font-bold", healthColor(summary?.payrollHealth || "healthy"))}>
            ${(summary?.payrollAmount || 0).toLocaleString()}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{summary?.payrollPercent || 0}% of revenue</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className={cn("border p-4 rounded-2xl shadow-sm", healthBg(summary?.marginHealth || "healthy"))}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4" />
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Net Profit</span>
          </div>
          <p className={cn("text-xl font-display font-bold", summary?.netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
            ${Math.abs(summary?.netProfit || 0).toLocaleString()}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{summary?.profitMargin || 0}% margin</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-primary/5 border border-primary/20 p-4 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <PiggyBank className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-medium text-primary uppercase tracking-wider">Owner Pay</span>
          </div>
          <p className="text-xl font-display font-bold text-primary">${(summary?.ownerTakeHome || 0).toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">take-home/mo</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-card border border-border p-4 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Members</span>
          </div>
          <p className="text-xl font-display font-bold text-foreground">{summary?.activeMemberCount || 0}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">active</p>
        </motion.div>
      </div>

      <div className="flex gap-1 bg-muted/50 p-1 rounded-xl w-fit">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === tab.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            {trends && trends.length > 0 && (
              <Card className="shadow-sm">
                <div className="p-4 border-b border-border">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    Monthly Trends
                  </h3>
                </div>
                <div className="p-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={trends}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} className="text-muted-foreground" />
                      <RechartsTooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                        formatter={(value: number, name: string) => [`$${value.toLocaleString()}`, name]}
                      />
                      <Legend />
                      <Area type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.1} strokeWidth={2} />
                      <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" fill="#ef4444" fillOpacity={0.05} strokeWidth={2} />
                      <Area type="monotone" dataKey="payroll" name="Payroll" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.05} strokeWidth={2} />
                      <Area type="monotone" dataKey="ownerTakeHome" name="Owner Take-Home" stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}

            {trends && trends.length > 0 && (
              <Card className="shadow-sm">
                <div className="p-4 border-b border-border">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Profit Margin Trend
                  </h3>
                </div>
                <div className="p-4">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={trends}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                      <RechartsTooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                        formatter={(value: number) => [`${value.toFixed(1)}%`, "Margin"]}
                      />
                      <Bar dataKey="profitMargin" name="Profit Margin" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}

            {(!trends || trends.length === 0) && (
              <Card className="shadow-sm">
                <div className="p-8 text-center">
                  <BarChart3 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-sm font-medium text-foreground">No trend data yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Revenue history will appear here as data accumulates over time.</p>
                </div>
              </Card>
            )}
          </div>

          <div className="lg:col-span-4 space-y-4">
            {insights && insights.length > 0 && (
              <Card className="shadow-sm">
                <div className="p-4 border-b border-border">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-primary" />
                    Financial Insights
                  </h3>
                </div>
                <div className="p-3 space-y-3">
                  {insights.map((insight: any, idx: number) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={cn("border rounded-xl p-3", insightBg(insight.type))}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 shrink-0">{insightIcon(insight.type)}</div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">{insight.title}</p>
                          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{insight.message}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </Card>
            )}

            <Card className="shadow-sm">
              <div className="p-4 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-primary" />
                  P&L Breakdown
                </h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Revenue</span>
                  <span className="text-sm font-semibold text-foreground">${(summary?.revenue || 0).toLocaleString()}</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">- Recurring Expenses</span>
                  <span className="text-sm text-destructive">-${(summary?.recurringExpenses || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">- One-Time Expenses</span>
                  <span className="text-sm text-destructive">-${(summary?.oneTimeExpenses || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">- Coach Payroll ({summary?.payrollPercent || 0}%)</span>
                  <span className="text-sm text-amber-600 dark:text-amber-400">-${(summary?.payrollAmount || 0).toLocaleString()}</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-foreground">Net Profit</span>
                  <span className={cn("text-sm font-bold", (summary?.netProfit || 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
                    ${Math.abs(summary?.netProfit || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-sm font-semibold text-primary">Owner Take-Home</span>
                  <span className="text-sm font-bold text-primary">${(summary?.ownerTakeHome || 0).toLocaleString()}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "expenses" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Manage Expenses</h2>
            <Button onClick={() => { resetForm(); setEditingExpense(null); setExpenseDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-1.5" />
              Add Expense
            </Button>
          </div>

          {recurringExpenses.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                Recurring Expenses ({recurringExpenses.length})
              </h3>
              <div className="space-y-2">
                {recurringExpenses.map((expense: any) => (
                  <div key={expense.id} className="flex items-center justify-between p-3 bg-card border border-border rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{expense.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {categoryMap.get(expense.categoryId) || "Uncategorized"} · {expense.frequency}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-foreground">${expense.amount.toLocaleString()}</span>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditExpense(expense)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => deleteExpense(expense.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {oneTimeExpenses.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
                One-Time Expenses ({oneTimeExpenses.length})
              </h3>
              <div className="space-y-2">
                {oneTimeExpenses.map((expense: any) => (
                  <div key={expense.id} className="flex items-center justify-between p-3 bg-card border border-border rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                        <Zap className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{expense.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {categoryMap.get(expense.categoryId) || "Uncategorized"}
                          {expense.expenseDate && ` · ${new Date(expense.expenseDate).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-foreground">${expense.amount.toLocaleString()}</span>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditExpense(expense)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => deleteExpense(expense.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recurringExpenses.length === 0 && oneTimeExpenses.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm font-medium text-foreground">No expenses logged yet</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Add your recurring expenses like rent, utilities, and insurance to see your complete P&L picture.</p>
              <Button onClick={() => { resetForm(); setEditingExpense(null); setExpenseDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-1.5" />
                Add Your First Expense
              </Button>
            </div>
          )}
        </div>
      )}

      {activeTab === "settings" && settingsForm && (
        <div className="max-w-xl space-y-6">
          <Card className="shadow-sm">
            <div className="p-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Payroll Settings
              </h3>
              <p className="text-xs text-muted-foreground mt-1">Set your coach payroll percentage to calculate costs against revenue.</p>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <Label className="text-sm">Coach Payroll (% of Revenue)</Label>
                <div className="flex items-center gap-3 mt-1.5">
                  <Input
                    type="number"
                    value={settingsForm.payrollPercent}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val >= 0 && val <= 100) {
                        setSettingsForm({ ...settingsForm, payrollPercent: val });
                      }
                    }}
                    className="w-24"
                    min={0}
                    max={100}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                  <Badge variant="outline" className={cn("text-xs",
                    settingsForm.payrollPercent <= 35 ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                    settingsForm.payrollPercent <= 44 ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                    "bg-destructive/10 text-destructive border-destructive/20"
                  )}>
                    {settingsForm.payrollPercent <= 35 ? "Healthy" :
                     settingsForm.payrollPercent <= 44 ? "Warning" : "High"}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5">Industry benchmark: 30-44% of revenue for coach compensation.</p>
              </div>
            </div>
          </Card>

          <Card className="shadow-sm">
            <div className="p-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <PiggyBank className="w-4 h-4 text-primary" />
                Owner Pay Method
              </h3>
              <p className="text-xs text-muted-foreground mt-1">How your take-home pay is calculated.</p>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <Label className="text-sm">Calculation Method</Label>
                <Select
                  value={settingsForm.ownerPayMethod}
                  onValueChange={(val) => setSettingsForm({ ...settingsForm, ownerPayMethod: val })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="remainder">Remainder (Revenue - Expenses - Payroll)</SelectItem>
                    <SelectItem value="percentage">Percentage of Revenue</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {settingsForm.ownerPayMethod === "percentage" && (
                <div>
                  <Label className="text-sm">Owner Pay Percentage</Label>
                  <div className="flex items-center gap-3 mt-1.5">
                    <Input
                      type="number"
                      value={settingsForm.ownerPayPercent}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val >= 0 && val <= 100) {
                          setSettingsForm({ ...settingsForm, ownerPayPercent: val });
                        }
                      }}
                      className="w-24"
                      min={0}
                      max={100}
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>
              )}

              {settingsForm.ownerPayMethod === "fixed" && (
                <div>
                  <Label className="text-sm">Fixed Monthly Amount</Label>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-sm text-muted-foreground">$</span>
                    <Input
                      type="number"
                      value={settingsForm.ownerPayFixed}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val >= 0) {
                          setSettingsForm({ ...settingsForm, ownerPayFixed: val });
                        }
                      }}
                      className="w-32"
                      min={0}
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>

          <div className="flex items-center gap-3">
            <Button onClick={savePayrollSettings} disabled={!settingsDirty || settingsSaving}>
              {settingsSaving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
              Save Settings
            </Button>
            {settingsDirty && (
              <span className="text-xs text-muted-foreground">You have unsaved changes</span>
            )}
          </div>
        </div>
      )}

      <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingExpense ? "Edit Expense" : "Add Expense"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={expenseForm.name}
                onChange={(e) => setExpenseForm({ ...expenseForm, name: e.target.value })}
                placeholder="e.g., Rent, Utilities, Equipment"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Amount ($)</Label>
                <Input
                  type="number"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  placeholder="0.00"
                  className="mt-1"
                  min={0}
                  step={0.01}
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select
                  value={expenseForm.categoryId}
                  onValueChange={(val) => setExpenseForm({ ...expenseForm, categoryId: val })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(categories || []).map((cat: any) => (
                      <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select
                  value={expenseForm.isRecurring ? "recurring" : "one-time"}
                  onValueChange={(val) => setExpenseForm({ ...expenseForm, isRecurring: val === "recurring" })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recurring">Recurring</SelectItem>
                    <SelectItem value="one-time">One-Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {expenseForm.isRecurring ? (
                <div>
                  <Label>Frequency</Label>
                  <Select
                    value={expenseForm.frequency}
                    onValueChange={(val) => setExpenseForm({ ...expenseForm, frequency: val })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Bi-Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="annually">Annually</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={expenseForm.expenseDate}
                    onChange={(e) => setExpenseForm({ ...expenseForm, expenseDate: e.target.value })}
                    className="mt-1"
                  />
                </div>
              )}
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                value={expenseForm.notes}
                onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                placeholder="Any additional details..."
                className="mt-1"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpenseDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveExpense} disabled={!expenseForm.name || !expenseForm.amount}>
              {editingExpense ? "Update" : "Add"} Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
