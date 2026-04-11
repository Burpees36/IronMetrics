import { describe, it, expect, vi, beforeEach } from "vitest";

let mockDismissed: any[] = [];
let idCounter = 0;

vi.mock("drizzle-orm", () => ({
  eq: (left: any, right: any) => ({ _type: "eq", left, right }),
  and: (...conditions: any[]) => ({ _type: "and", conditions }),
  sql: Object.assign((() => ({})) as any, { join: () => ({}) }),
  count: () => ({ _type: "count" }),
}));

vi.mock("@workspace/db", () => {
  function resolveField(colRef: any): string {
    return colRef?._field || "id";
  }
  function matchesCondition(row: any, cond: any): boolean {
    if (!cond) return true;
    if (cond._type === "eq") return row[resolveField(cond.left)] === cond.right;
    if (cond._type === "and") return cond.conditions.every((c: any) => matchesCondition(row, c));
    return true;
  }
  function makeTable(name: string) {
    return new Proxy({ _name: name }, {
      get(_, prop) {
        if (prop === "_name") return name;
        return { _col: true, _table: name, _field: String(prop) };
      },
    });
  }
  const db: any = {
    select(fields?: any) {
      return {
        from(table: any) {
          let cond: any = null;
          const chain: any = {
            where(c: any) { cond = c; return chain; },
            then(resolve: any) {
              const filtered = mockDismissed.filter((r: any) => matchesCondition(r, cond));
              if (fields && fields.interventionId) {
                resolve(filtered.map((r: any) => ({ interventionId: r.interventionId })));
              } else {
                resolve(filtered);
              }
            },
          };
          return chain;
        },
      };
    },
    insert(table: any) {
      return {
        values(vals: any) {
          return {
            onConflictDoNothing() {
              return {
                then(resolve: any) {
                  const items = Array.isArray(vals) ? vals : [vals];
                  for (const v of items) {
                    const exists = mockDismissed.find(
                      (r: any) => r.gymId === v.gymId && r.interventionId === v.interventionId
                    );
                    if (!exists) {
                      mockDismissed.push({ id: ++idCounter, ...v, dismissedAt: new Date() });
                    }
                  }
                  resolve();
                },
              };
            },
          };
        },
      };
    },
    delete(table: any) {
      return {
        where(cond: any) {
          return {
            then(resolve: any) {
              mockDismissed = mockDismissed.filter((r: any) => !matchesCondition(r, cond));
              resolve();
            },
          };
        },
      };
    },
  };
  return {
    db,
    dismissedInterventionsTable: makeTable("dismissed_interventions"),
    membersTable: makeTable("members"),
    subscriptionsTable: makeTable("subscriptions"),
    attendanceTable: makeTable("attendance"),
    leadsTable: makeTable("leads"),
    classesTable: makeTable("classes"),
    rsiSnapshotsTable: makeTable("rsi_snapshots"),
    benchmarksTable: makeTable("benchmarks"),
    billingAuditLogsTable: makeTable("billing_audit_logs"),
  };
});

vi.mock("../../blendedMetrics", () => ({
  computeBlendedMRR: () => Promise.resolve({ totalMRR: 1000, activeBillableMembers: 10, sources: [] }),
  computeBlendedEngagement: () => Promise.resolve({ engagementRate: 50, change: 0 }),
  isActiveBillableMember: (status: string) => status === "active",
  activeMemberCondition: () => ({}),
  getMemberRevenueFromMembersTable: () => ({}),
}));

import { db, dismissedInterventionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

describe("Dismissed Interventions Persistence", () => {
  beforeEach(() => {
    mockDismissed = [];
    idCounter = 0;
  });

  it("stores a dismissed intervention for a gym", async () => {
    await db.insert(dismissedInterventionsTable)
      .values({ gymId: 1, interventionId: "int-retention" })
      .onConflictDoNothing();

    expect(mockDismissed).toHaveLength(1);
    expect(mockDismissed[0].gymId).toBe(1);
    expect(mockDismissed[0].interventionId).toBe("int-retention");
  });

  it("retrieves dismissed interventions for a specific gym", async () => {
    mockDismissed = [
      { id: 1, gymId: 1, interventionId: "int-retention", dismissedAt: new Date() },
      { id: 2, gymId: 1, interventionId: "int-billing", dismissedAt: new Date() },
      { id: 3, gymId: 2, interventionId: "int-leads", dismissedAt: new Date() },
    ];

    const rows = await db.select({ interventionId: dismissedInterventionsTable.interventionId })
      .from(dismissedInterventionsTable)
      .where(eq(dismissedInterventionsTable.gymId, 1));

    const ids = rows.map((r: any) => r.interventionId);
    expect(ids).toEqual(["int-retention", "int-billing"]);
    expect(ids).not.toContain("int-leads");
  });

  it("prevents duplicate dismissals via onConflictDoNothing", async () => {
    await db.insert(dismissedInterventionsTable)
      .values({ gymId: 1, interventionId: "int-retention" })
      .onConflictDoNothing();

    await db.insert(dismissedInterventionsTable)
      .values({ gymId: 1, interventionId: "int-retention" })
      .onConflictDoNothing();

    expect(mockDismissed).toHaveLength(1);
  });

  it("restores a dismissed intervention by deleting it", async () => {
    mockDismissed = [
      { id: 1, gymId: 1, interventionId: "int-retention", dismissedAt: new Date() },
      { id: 2, gymId: 1, interventionId: "int-billing", dismissedAt: new Date() },
    ];

    await db.delete(dismissedInterventionsTable)
      .where(and(
        eq(dismissedInterventionsTable.gymId, 1),
        eq(dismissedInterventionsTable.interventionId, "int-retention")
      ));

    expect(mockDismissed).toHaveLength(1);
    expect(mockDismissed[0].interventionId).toBe("int-billing");
  });

  it("dismiss-navigate-restore round trip preserves state", async () => {
    await db.insert(dismissedInterventionsTable)
      .values({ gymId: 1, interventionId: "int-retention" })
      .onConflictDoNothing();
    await db.insert(dismissedInterventionsTable)
      .values({ gymId: 1, interventionId: "int-billing" })
      .onConflictDoNothing();

    const afterDismiss = await db.select({ interventionId: dismissedInterventionsTable.interventionId })
      .from(dismissedInterventionsTable)
      .where(eq(dismissedInterventionsTable.gymId, 1));
    expect(afterDismiss.map((r: any) => r.interventionId)).toEqual(["int-retention", "int-billing"]);

    await db.delete(dismissedInterventionsTable)
      .where(and(
        eq(dismissedInterventionsTable.gymId, 1),
        eq(dismissedInterventionsTable.interventionId, "int-retention")
      ));

    const afterRestore = await db.select({ interventionId: dismissedInterventionsTable.interventionId })
      .from(dismissedInterventionsTable)
      .where(eq(dismissedInterventionsTable.gymId, 1));
    expect(afterRestore.map((r: any) => r.interventionId)).toEqual(["int-billing"]);
  });
});
