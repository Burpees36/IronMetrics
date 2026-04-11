import { pgTable, text, serial, timestamp, integer, numeric, boolean, index, date, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { gymsTable } from "./gyms";

export const expenseCategoriesTable = pgTable("expense_categories", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id),
  name: text("name").notNull(),
  type: text("type").notNull().default("operating"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_expense_categories_gym").on(table.gymId),
]);

export const insertExpenseCategorySchema = createInsertSchema(expenseCategoriesTable).omit({ id: true, createdAt: true });
export type InsertExpenseCategory = z.infer<typeof insertExpenseCategorySchema>;
export type ExpenseCategory = typeof expenseCategoriesTable.$inferSelect;

export const expensesTable = pgTable("expenses", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id),
  categoryId: integer("category_id").references(() => expenseCategoriesTable.id),
  name: text("name").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  frequency: text("frequency").notNull().default("monthly"),
  isRecurring: boolean("is_recurring").notNull().default(true),
  expenseDate: date("expense_date", { mode: "string" }),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  index("idx_expenses_gym").on(table.gymId),
  index("idx_expenses_gym_recurring").on(table.gymId, table.isRecurring),
  index("idx_expenses_category").on(table.categoryId),
]);

export const insertExpenseSchema = createInsertSchema(expensesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expensesTable.$inferSelect;

export const monthlyFinancialSnapshotsTable = pgTable("monthly_financial_snapshots", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  totalRevenue: numeric("total_revenue", { precision: 12, scale: 2 }).notNull().default("0"),
  totalExpenses: numeric("total_expenses", { precision: 12, scale: 2 }).notNull().default("0"),
  payrollAmount: numeric("payroll_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  payrollPercent: numeric("payroll_percent", { precision: 5, scale: 2 }).notNull().default("0"),
  ownerTakeHome: numeric("owner_take_home", { precision: 12, scale: 2 }).notNull().default("0"),
  netProfit: numeric("net_profit", { precision: 12, scale: 2 }).notNull().default("0"),
  profitMargin: numeric("profit_margin", { precision: 5, scale: 2 }).notNull().default("0"),
  activeMemberCount: integer("active_member_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("idx_financial_snapshots_gym_month").on(table.gymId, table.year, table.month),
]);

export type MonthlyFinancialSnapshot = typeof monthlyFinancialSnapshotsTable.$inferSelect;

export const payrollSettingsTable = pgTable("payroll_settings", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id).unique(),
  payrollPercent: numeric("payroll_percent", { precision: 5, scale: 2 }).notNull().default("30"),
  ownerPayPercent: numeric("owner_pay_percent", { precision: 5, scale: 2 }).notNull().default("0"),
  ownerPayFixed: numeric("owner_pay_fixed", { precision: 10, scale: 2 }).notNull().default("0"),
  ownerPayMethod: text("owner_pay_method").notNull().default("remainder"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type PayrollSettings = typeof payrollSettingsTable.$inferSelect;
