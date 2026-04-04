import { pgTable, text, serial, timestamp, integer, numeric, date, uniqueIndex } from "drizzle-orm/pg-core";
import { gymsTable } from "./gyms";

export const mrrSnapshotsTable = pgTable("mrr_snapshots", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id),
  snapshotDate: date("snapshot_date").notNull(),
  totalMRR: numeric("total_mrr").notNull().default("0"),
  subscriptionMRR: numeric("subscription_mrr").notNull().default("0"),
  wodifyMRR: numeric("wodify_mrr").notNull().default("0"),
  activeMemberCount: integer("active_member_count").notNull().default(0),
  arm: numeric("arm").notNull().default("0"),
  revenueSource: text("revenue_source").notNull().default("wodify_only"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("idx_mrr_snapshots_gym_date").on(table.gymId, table.snapshotDate),
]);
