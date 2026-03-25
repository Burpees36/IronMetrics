import { pgTable, text, serial, timestamp, integer, jsonb, index } from "drizzle-orm/pg-core";
import { gymsTable } from "./gyms";

export const syncRunsTable = pgTable("sync_runs", {
  id: serial("id").primaryKey(),
  gymId: integer("gym_id").notNull().references(() => gymsTable.id),
  source: text("source").notNull(),
  status: text("status").notNull().default("running"),
  fileName: text("file_name"),
  totalRows: integer("total_rows").default(0),
  created: integer("created").default(0),
  skipped: integer("skipped").default(0),
  errored: integer("errored").default(0),
  errorDetails: jsonb("error_details").$type<{ rowIndex: number; error: string }[]>(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  triggeredBy: text("triggered_by"),
}, (table) => [
  index("idx_sync_runs_gym").on(table.gymId),
  index("idx_sync_runs_gym_status").on(table.gymId, table.status),
]);
