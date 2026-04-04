import { pgTable, text, serial, timestamp, integer, numeric, index, date } from "drizzle-orm/pg-core";

export const benchmarksTable = pgTable("benchmarks", {
  id: serial("id").primaryKey(),
  metric: text("metric").notNull(),
  sizeSegment: text("size_segment").notNull(),
  p25: numeric("p25", { precision: 10, scale: 2 }),
  p50: numeric("p50", { precision: 10, scale: 2 }),
  p75: numeric("p75", { precision: 10, scale: 2 }),
  p90: numeric("p90", { precision: 10, scale: 2 }),
  sampleCount: integer("sample_count").notNull().default(0),
  computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_benchmarks_metric_segment").on(table.metric, table.sizeSegment),
  index("idx_benchmarks_computed_at").on(table.computedAt),
]);

export type Benchmark = typeof benchmarksTable.$inferSelect;
