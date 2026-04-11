import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import {
  db,
  expenseCategoriesTable,
  expensesTable,
  monthlyFinancialSnapshotsTable,
  payrollSettingsTable,
  mrrSnapshotsTable,
} from "@workspace/db";
import { requireBillingPermission, requireBillingRead } from "../middlewares/billingRbac";
import { computeBillingSummary } from "../billingMetrics";

const router: IRouter = Router();

function parseGymId(params: any): number | null {
  const raw = Array.isArray(params.gymId) ? params.gymId[0] : params.gymId;
  const id = parseInt(raw, 10);
  return isNaN(id) ? null : id;
}

const VALID_FREQUENCIES = ["weekly", "biweekly", "monthly", "quarterly", "annually"];
const VALID_PAY_METHODS = ["remainder", "percentage", "fixed"];

function normalizeToMonthly(amount: number, frequency: string): number {
  switch (frequency) {
    case "weekly": return amount * 4.33;
    case "biweekly": return amount * 2.17;
    case "monthly": return amount;
    case "quarterly": return amount / 3;
    case "annually": return amount / 12;
    default: return amount;
  }
}

function computeRecurringMonthly(expenses: Array<{ amount: string; frequency: string; isRecurring: boolean }>): number {
  return expenses
    .filter(e => e.isRecurring)
    .reduce((sum, e) => sum + normalizeToMonthly(parseFloat(e.amount), e.frequency), 0);
}

async function validateCategoryOwnership(categoryId: number | null, gymId: number): Promise<boolean> {
  if (!categoryId) return true;
  const [cat] = await db
    .select({ id: expenseCategoriesTable.id })
    .from(expenseCategoriesTable)
    .where(and(eq(expenseCategoriesTable.id, categoryId), eq(expenseCategoriesTable.gymId, gymId)));
  return !!cat;
}

router.get("/gyms/:gymId/finances/categories", requireBillingRead(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  try {
    const categories = await db
      .select()
      .from(expenseCategoriesTable)
      .where(eq(expenseCategoriesTable.gymId, gymId))
      .orderBy(expenseCategoriesTable.name);

    if (categories.length === 0) {
      const defaults = ["Rent", "Utilities", "Insurance", "Software/Tech", "Equipment", "Marketing", "Supplies", "Maintenance"];
      const inserted = [];
      for (const name of defaults) {
        const [cat] = await db.insert(expenseCategoriesTable).values({
          gymId,
          name,
          type: "operating",
          isDefault: true,
        }).returning();
        inserted.push(cat);
      }
      res.json(inserted);
      return;
    }

    res.json(categories);
  } catch (err: any) {
    console.error("Error fetching categories:", err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

router.post("/gyms/:gymId/finances/categories", requireBillingPermission("billing.edit_plan"), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const { name, type } = req.body;
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    res.status(400).json({ error: "Name is required" }); return;
  }

  try {
    const [category] = await db.insert(expenseCategoriesTable).values({
      gymId,
      name: name.trim(),
      type: type || "operating",
    }).returning();

    res.json(category);
  } catch (err: any) {
    console.error("Error creating category:", err);
    res.status(500).json({ error: "Failed to create category" });
  }
});

router.get("/gyms/:gymId/finances/expenses", requireBillingRead(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  try {
    const expenses = await db
      .select()
      .from(expensesTable)
      .where(eq(expensesTable.gymId, gymId))
      .orderBy(desc(expensesTable.createdAt));

    res.json(expenses.map(e => ({ ...e, amount: parseFloat(e.amount) })));
  } catch (err: any) {
    console.error("Error fetching expenses:", err);
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
});

router.post("/gyms/:gymId/finances/expenses", requireBillingPermission("billing.edit_plan"), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const { name, amount, frequency, isRecurring, categoryId, expenseDate, notes } = req.body;
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    res.status(400).json({ error: "Name is required" }); return;
  }
  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount < 0) {
    res.status(400).json({ error: "Amount must be a non-negative number" }); return;
  }
  if (frequency && !VALID_FREQUENCIES.includes(frequency)) {
    res.status(400).json({ error: `Invalid frequency. Must be one of: ${VALID_FREQUENCIES.join(", ")}` }); return;
  }

  const catId = categoryId ? parseInt(categoryId, 10) : null;
  if (catId && !(await validateCategoryOwnership(catId, gymId))) {
    res.status(400).json({ error: "Invalid category" }); return;
  }

  try {
    const [expense] = await db.insert(expensesTable).values({
      gymId,
      name: name.trim(),
      amount: String(parsedAmount),
      frequency: frequency || "monthly",
      isRecurring: isRecurring !== false,
      categoryId: catId,
      expenseDate: expenseDate || null,
      notes: notes || null,
    }).returning();

    res.json({ ...expense, amount: parseFloat(expense.amount) });
  } catch (err: any) {
    console.error("Error creating expense:", err);
    res.status(500).json({ error: "Failed to create expense" });
  }
});

router.patch("/gyms/:gymId/finances/expenses/:expenseId", requireBillingPermission("billing.edit_plan"), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const expenseId = parseInt(req.params.expenseId, 10);
  if (!gymId || isNaN(expenseId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const updates: any = {};
  if (req.body.name !== undefined) {
    if (typeof req.body.name !== "string" || req.body.name.trim().length === 0) {
      res.status(400).json({ error: "Name cannot be empty" }); return;
    }
    updates.name = req.body.name.trim();
  }
  if (req.body.amount !== undefined) {
    const amt = parseFloat(req.body.amount);
    if (isNaN(amt) || amt < 0) {
      res.status(400).json({ error: "Amount must be a non-negative number" }); return;
    }
    updates.amount = String(amt);
  }
  if (req.body.frequency !== undefined) {
    if (!VALID_FREQUENCIES.includes(req.body.frequency)) {
      res.status(400).json({ error: `Invalid frequency` }); return;
    }
    updates.frequency = req.body.frequency;
  }
  if (req.body.isRecurring !== undefined) updates.isRecurring = req.body.isRecurring;
  if (req.body.categoryId !== undefined) {
    const catId = req.body.categoryId ? parseInt(req.body.categoryId, 10) : null;
    if (catId && !(await validateCategoryOwnership(catId, gymId))) {
      res.status(400).json({ error: "Invalid category" }); return;
    }
    updates.categoryId = catId;
  }
  if (req.body.notes !== undefined) updates.notes = req.body.notes;
  if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;

  try {
    const [expense] = await db
      .update(expensesTable)
      .set(updates)
      .where(and(eq(expensesTable.id, expenseId), eq(expensesTable.gymId, gymId)))
      .returning();

    if (!expense) { res.status(404).json({ error: "Expense not found" }); return; }
    res.json({ ...expense, amount: parseFloat(expense.amount) });
  } catch (err: any) {
    console.error("Error updating expense:", err);
    res.status(500).json({ error: "Failed to update expense" });
  }
});

router.delete("/gyms/:gymId/finances/expenses/:expenseId", requireBillingPermission("billing.edit_plan"), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const expenseId = parseInt(req.params.expenseId, 10);
  if (!gymId || isNaN(expenseId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  try {
    await db.delete(expensesTable).where(and(eq(expensesTable.id, expenseId), eq(expensesTable.gymId, gymId)));
    res.json({ success: true });
  } catch (err: any) {
    console.error("Error deleting expense:", err);
    res.status(500).json({ error: "Failed to delete expense" });
  }
});

router.get("/gyms/:gymId/finances/payroll-settings", requireBillingRead(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  try {
    const [settings] = await db
      .select()
      .from(payrollSettingsTable)
      .where(eq(payrollSettingsTable.gymId, gymId));

    if (!settings) {
      const [created] = await db.insert(payrollSettingsTable).values({ gymId }).returning();
      res.json({
        ...created,
        payrollPercent: parseFloat(created.payrollPercent),
        ownerPayPercent: parseFloat(created.ownerPayPercent),
        ownerPayFixed: parseFloat(created.ownerPayFixed),
      });
      return;
    }

    res.json({
      ...settings,
      payrollPercent: parseFloat(settings.payrollPercent),
      ownerPayPercent: parseFloat(settings.ownerPayPercent),
      ownerPayFixed: parseFloat(settings.ownerPayFixed),
    });
  } catch (err: any) {
    console.error("Error fetching payroll settings:", err);
    res.status(500).json({ error: "Failed to fetch payroll settings" });
  }
});

router.patch("/gyms/:gymId/finances/payroll-settings", requireBillingPermission("billing.edit_plan"), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const updates: any = {};
  if (req.body.payrollPercent !== undefined) {
    const val = parseFloat(req.body.payrollPercent);
    if (isNaN(val) || val < 0 || val > 100) {
      res.status(400).json({ error: "Payroll percent must be 0-100" }); return;
    }
    updates.payrollPercent = String(val);
  }
  if (req.body.ownerPayPercent !== undefined) {
    const val = parseFloat(req.body.ownerPayPercent);
    if (isNaN(val) || val < 0 || val > 100) {
      res.status(400).json({ error: "Owner pay percent must be 0-100" }); return;
    }
    updates.ownerPayPercent = String(val);
  }
  if (req.body.ownerPayFixed !== undefined) {
    const val = parseFloat(req.body.ownerPayFixed);
    if (isNaN(val) || val < 0) {
      res.status(400).json({ error: "Owner pay fixed must be non-negative" }); return;
    }
    updates.ownerPayFixed = String(val);
  }
  if (req.body.ownerPayMethod !== undefined) {
    if (!VALID_PAY_METHODS.includes(req.body.ownerPayMethod)) {
      res.status(400).json({ error: `Invalid pay method. Must be one of: ${VALID_PAY_METHODS.join(", ")}` }); return;
    }
    updates.ownerPayMethod = req.body.ownerPayMethod;
  }

  try {
    const [existing] = await db.select().from(payrollSettingsTable).where(eq(payrollSettingsTable.gymId, gymId));

    let settings;
    if (existing) {
      [settings] = await db.update(payrollSettingsTable).set(updates).where(eq(payrollSettingsTable.gymId, gymId)).returning();
    } else {
      [settings] = await db.insert(payrollSettingsTable).values({ gymId, ...updates }).returning();
    }

    res.json({
      ...settings,
      payrollPercent: parseFloat(settings.payrollPercent),
      ownerPayPercent: parseFloat(settings.ownerPayPercent),
      ownerPayFixed: parseFloat(settings.ownerPayFixed),
    });
  } catch (err: any) {
    console.error("Error updating payroll settings:", err);
    res.status(500).json({ error: "Failed to update payroll settings" });
  }
});

router.get("/gyms/:gymId/finances/summary", requireBillingRead(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  try {
    const billing = await computeBillingSummary(gymId);
    const mrr = billing.mrr;

    const expenses = await db
      .select()
      .from(expensesTable)
      .where(and(eq(expensesTable.gymId, gymId), eq(expensesTable.isActive, true)));

    const recurringMonthly = computeRecurringMonthly(expenses);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const oneTimeThisMonth = expenses
      .filter(e => !e.isRecurring && e.expenseDate && e.expenseDate >= monthStart.toISOString().split("T")[0] && e.expenseDate < monthEnd.toISOString().split("T")[0])
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);

    const totalMonthlyExpenses = recurringMonthly + oneTimeThisMonth;

    const [payrollSettings] = await db
      .select()
      .from(payrollSettingsTable)
      .where(eq(payrollSettingsTable.gymId, gymId));

    const payrollPercent = payrollSettings ? parseFloat(payrollSettings.payrollPercent) : 30;
    const payrollAmount = mrr * (payrollPercent / 100);

    const netProfit = mrr - totalMonthlyExpenses - payrollAmount;
    const profitMargin = mrr > 0 ? (netProfit / mrr) * 100 : 0;
    const payrollRatio = mrr > 0 ? (payrollAmount / mrr) * 100 : 0;
    const expenseRatio = mrr > 0 ? (totalMonthlyExpenses / mrr) * 100 : 0;

    let ownerTakeHome = netProfit;
    if (payrollSettings) {
      if (payrollSettings.ownerPayMethod === "percentage") {
        ownerTakeHome = mrr * (parseFloat(payrollSettings.ownerPayPercent) / 100);
      } else if (payrollSettings.ownerPayMethod === "fixed") {
        ownerTakeHome = parseFloat(payrollSettings.ownerPayFixed);
      }
    }

    let payrollHealth: "healthy" | "warning" | "danger" = "healthy";
    if (payrollRatio > 44) payrollHealth = "danger";
    else if (payrollRatio > 35) payrollHealth = "warning";

    let marginHealth: "healthy" | "warning" | "danger" = "healthy";
    if (profitMargin < 10) marginHealth = "danger";
    else if (profitMargin < 20) marginHealth = "warning";

    res.json({
      revenue: Math.round(mrr * 100) / 100,
      totalExpenses: Math.round(totalMonthlyExpenses * 100) / 100,
      recurringExpenses: Math.round(recurringMonthly * 100) / 100,
      oneTimeExpenses: Math.round(oneTimeThisMonth * 100) / 100,
      payrollAmount: Math.round(payrollAmount * 100) / 100,
      payrollPercent: Math.round(payrollRatio * 10) / 10,
      payrollHealth,
      ownerTakeHome: Math.round(ownerTakeHome * 100) / 100,
      netProfit: Math.round(netProfit * 100) / 100,
      profitMargin: Math.round(profitMargin * 10) / 10,
      marginHealth,
      expenseRatio: Math.round(expenseRatio * 10) / 10,
      activeMemberCount: billing.activeBillableMembers,
    });
  } catch (err: any) {
    console.error("Error computing financial summary:", err);
    res.status(500).json({ error: "Failed to compute financial summary" });
  }
});

router.get("/gyms/:gymId/finances/trends", requireBillingRead(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const months = Math.min(parseInt(req.query.months as string) || 12, 24);

  try {
    const snapshots = await db
      .select()
      .from(monthlyFinancialSnapshotsTable)
      .where(eq(monthlyFinancialSnapshotsTable.gymId, gymId))
      .orderBy(desc(monthlyFinancialSnapshotsTable.year), desc(monthlyFinancialSnapshotsTable.month))
      .limit(months);

    if (snapshots.length > 0) {
      const trends = snapshots.reverse().map(s => ({
        month: s.month,
        year: s.year,
        label: `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][s.month - 1]} ${s.year}`,
        revenue: parseFloat(s.totalRevenue),
        expenses: parseFloat(s.totalExpenses),
        payroll: parseFloat(s.payrollAmount),
        ownerTakeHome: parseFloat(s.ownerTakeHome),
        netProfit: parseFloat(s.netProfit),
        profitMargin: parseFloat(s.profitMargin),
        activeMemberCount: s.activeMemberCount,
      }));
      res.json(trends);
      return;
    }

    const mrrSnapshots = await db
      .select()
      .from(mrrSnapshotsTable)
      .where(eq(mrrSnapshotsTable.gymId, gymId))
      .orderBy(desc(mrrSnapshotsTable.snapshotDate))
      .limit(months);

    if (mrrSnapshots.length > 0) {
      const expenses = await db
        .select()
        .from(expensesTable)
        .where(and(eq(expensesTable.gymId, gymId), eq(expensesTable.isActive, true)));

      const [payrollSettings] = await db
        .select()
        .from(payrollSettingsTable)
        .where(eq(payrollSettingsTable.gymId, gymId));

      const payrollPercent = payrollSettings ? parseFloat(payrollSettings.payrollPercent) : 30;
      const recurringMonthly = computeRecurringMonthly(expenses);

      const monthlyMap = new Map<string, { revenue: number; memberCount: number }>();
      for (const snap of mrrSnapshots) {
        const d = new Date(snap.snapshotDate);
        const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
        const mrrVal = parseFloat(snap.totalMRR);
        const existing = monthlyMap.get(key);
        if (!existing || mrrVal > existing.revenue) {
          monthlyMap.set(key, { revenue: mrrVal, memberCount: snap.activeMemberCount });
        }
      }

      const trends = Array.from(monthlyMap.entries())
        .map(([key, val]) => {
          const [year, month] = key.split("-").map(Number);
          const payroll = val.revenue * (payrollPercent / 100);
          const netProfit = val.revenue - recurringMonthly - payroll;
          return {
            month,
            year,
            label: `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][month - 1]} ${year}`,
            revenue: Math.round(val.revenue * 100) / 100,
            expenses: Math.round(recurringMonthly * 100) / 100,
            payroll: Math.round(payroll * 100) / 100,
            ownerTakeHome: Math.round(Math.max(0, netProfit) * 100) / 100,
            netProfit: Math.round(netProfit * 100) / 100,
            profitMargin: val.revenue > 0 ? Math.round((netProfit / val.revenue) * 1000) / 10 : 0,
            activeMemberCount: val.memberCount,
          };
        })
        .sort((a, b) => a.year - b.year || a.month - b.month)
        .slice(-months);

      res.json(trends);
      return;
    }

    res.json([]);
  } catch (err: any) {
    console.error("Error fetching trends:", err);
    res.status(500).json({ error: "Failed to fetch trends" });
  }
});

router.get("/gyms/:gymId/finances/insights", requireBillingRead(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  try {
    const billing = await computeBillingSummary(gymId);
    const mrr = billing.mrr;

    const expenses = await db
      .select()
      .from(expensesTable)
      .where(and(eq(expensesTable.gymId, gymId), eq(expensesTable.isActive, true)));

    const recurringMonthly = computeRecurringMonthly(expenses);

    const [payrollSettings] = await db
      .select()
      .from(payrollSettingsTable)
      .where(eq(payrollSettingsTable.gymId, gymId));

    const payrollPercent = payrollSettings ? parseFloat(payrollSettings.payrollPercent) : 30;
    const payrollAmount = mrr * (payrollPercent / 100);

    const netProfit = mrr - recurringMonthly - payrollAmount;
    const profitMargin = mrr > 0 ? (netProfit / mrr) * 100 : 0;
    const payrollRatio = mrr > 0 ? (payrollAmount / mrr) * 100 : 0;

    const mrrSnapshots = await db
      .select()
      .from(mrrSnapshotsTable)
      .where(eq(mrrSnapshotsTable.gymId, gymId))
      .orderBy(desc(mrrSnapshotsTable.snapshotDate))
      .limit(6);

    const revenueValues = mrrSnapshots.map(s => parseFloat(s.totalMRR));
    const avgRevenue = revenueValues.length > 0 ? revenueValues.reduce((a, b) => a + b, 0) / revenueValues.length : 0;
    const revenueStdDev = revenueValues.length > 1
      ? Math.sqrt(revenueValues.reduce((sum, v) => sum + Math.pow(v - avgRevenue, 2), 0) / revenueValues.length)
      : 0;
    const revenueStable = revenueValues.length >= 3 && (avgRevenue === 0 || revenueStdDev / avgRevenue < 0.1);
    const revenueGrowing = revenueValues.length >= 2 && revenueValues[0] > revenueValues[revenueValues.length - 1];

    const insights: Array<{
      type: "success" | "warning" | "danger" | "info";
      title: string;
      message: string;
      category: string;
    }> = [];

    if (mrr === 0) {
      insights.push({
        type: "info",
        title: "No Revenue Data Yet",
        message: "Connect your billing or import revenue data to see financial insights and recommendations.",
        category: "revenue",
      });
      res.json(insights);
      return;
    }

    if (payrollRatio > 44) {
      insights.push({
        type: "danger",
        title: "Payroll Ratio Too High",
        message: `Your coach payroll is ${payrollRatio.toFixed(1)}% of revenue. Industry best practice is 30-44%. Consider adjusting class sizes or coach schedules to bring this below 44%.`,
        category: "payroll",
      });
    } else if (payrollRatio > 35) {
      insights.push({
        type: "warning",
        title: "Payroll Ratio Approaching Threshold",
        message: `Coach payroll is ${payrollRatio.toFixed(1)}% of revenue (target: under 35%). You have some buffer, but monitor this as you grow.`,
        category: "payroll",
      });
    } else {
      insights.push({
        type: "success",
        title: "Healthy Payroll Ratio",
        message: `Coach payroll is ${payrollRatio.toFixed(1)}% of revenue — well within the healthy range (under 35%). This leaves room for growth investments.`,
        category: "payroll",
      });
    }

    if (profitMargin < 10) {
      insights.push({
        type: "danger",
        title: "Low Profit Margin",
        message: `Your profit margin is ${profitMargin.toFixed(1)}%. Focus on either growing revenue or reducing expenses before making any large investments.`,
        category: "profitability",
      });
    } else if (profitMargin < 20) {
      insights.push({
        type: "warning",
        title: "Moderate Profit Margin",
        message: `Your profit margin is ${profitMargin.toFixed(1)}%. You're covering costs, but building a larger buffer would give you more flexibility.`,
        category: "profitability",
      });
    } else {
      insights.push({
        type: "success",
        title: "Strong Profit Margin",
        message: `Your profit margin is ${profitMargin.toFixed(1)}%. You have healthy margins that support growth and owner compensation.`,
        category: "profitability",
      });
    }

    if (revenueStable && mrr > 10000) {
      const quarterlyBudget = Math.round(netProfit * 3 * 0.25);
      if (quarterlyBudget > 0) {
        insights.push({
          type: "success",
          title: "Equipment Budget Available",
          message: `Your revenue has been stable around $${Math.round(avgRevenue).toLocaleString()}/mo. Based on your margins, you could invest up to $${quarterlyBudget.toLocaleString()} in equipment this quarter without impacting your take-home.`,
          category: "investment",
        });
      }
    } else if (revenueGrowing && mrr > 15000) {
      insights.push({
        type: "info",
        title: "Revenue Trending Up",
        message: `Revenue is growing — current MRR is $${Math.round(mrr).toLocaleString()}. Wait for 2-3 more months of stable growth before committing to large equipment purchases.`,
        category: "investment",
      });
    }

    if (revenueStable && profitMargin > 20 && billing.activeBillableMembers > 80) {
      insights.push({
        type: "info",
        title: "Expansion Readiness",
        message: `With ${billing.activeBillableMembers} active members, ${profitMargin.toFixed(0)}% margins, and stable revenue, you may be approaching capacity. Consider whether adding space or hours could support continued growth.`,
        category: "expansion",
      });
    } else if (billing.activeBillableMembers > 0 && profitMargin < 15) {
      insights.push({
        type: "warning",
        title: "Tighten Before Expanding",
        message: `Your margins (${profitMargin.toFixed(1)}%) suggest focusing on profitability before expansion. Look for ways to increase per-member revenue or reduce costs.`,
        category: "expansion",
      });
    }

    if (recurringMonthly > 0 && mrr > 0) {
      const expenseRatio = (recurringMonthly / mrr) * 100;
      if (expenseRatio > 50) {
        insights.push({
          type: "danger",
          title: "High Fixed Costs",
          message: `Your fixed expenses are ${expenseRatio.toFixed(0)}% of revenue ($${Math.round(recurringMonthly).toLocaleString()}/mo). Review your expense categories for possible savings — rent negotiation, insurance shopping, or consolidating software subscriptions.`,
          category: "expenses",
        });
      } else if (expenseRatio > 35) {
        insights.push({
          type: "warning",
          title: "Moderate Fixed Costs",
          message: `Fixed expenses are ${expenseRatio.toFixed(0)}% of revenue. This is manageable but leaves less room for payroll and owner pay.`,
          category: "expenses",
        });
      }
    }

    if (netProfit > 0) {
      insights.push({
        type: "success",
        title: "Owner Take-Home Estimate",
        message: `After all expenses and payroll, your estimated monthly take-home is $${Math.round(netProfit).toLocaleString()}. This is ${profitMargin.toFixed(0)}% of your revenue.`,
        category: "owner_pay",
      });
    } else {
      insights.push({
        type: "danger",
        title: "Negative Net Position",
        message: `Your expenses and payroll exceed your revenue by $${Math.round(Math.abs(netProfit)).toLocaleString()}/mo. Focus on reducing costs or growing membership before taking owner pay.`,
        category: "owner_pay",
      });
    }

    res.json(insights);
  } catch (err: any) {
    console.error("Error generating financial insights:", err);
    res.status(500).json({ error: "Failed to generate financial insights" });
  }
});

export default router;
