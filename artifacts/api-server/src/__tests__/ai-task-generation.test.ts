import { describe, it, expect, vi, beforeEach } from "vitest";

let mockMembers: any[] = [];
let mockLeads: any[] = [];
let mockSubscriptions: any[] = [];
let mockAiTasks: any[] = [];
let idCounter = 0;

vi.mock("drizzle-orm", () => ({
  eq: (left: any, right: any) => ({ _type: "eq", left, right }),
  and: (...conditions: any[]) => ({ _type: "and", conditions }),
  sql: () => ({ _type: "sql" }),
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
    if (cond._type === "sql") return true;
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
  function getTableData(tn: string): any[] {
    if (tn === "members") return mockMembers;
    if (tn === "leads") return mockLeads;
    if (tn === "subscriptions") return mockSubscriptions;
    if (tn === "ai_tasks") return mockAiTasks;
    return [];
  }
  const db: any = {
    select(fields?: any) {
      return {
        from(table: any) {
          const tn = table._name;
          let cond: any = null;
          const chain: any = {
            where(c: any) { cond = c; return chain; },
            orderBy() { return chain; },
            limit() { return chain; },
            then(resolve: any) {
              if (fields && fields.count) {
                resolve([{ count: getTableData(tn).filter((r: any) => matchesCondition(r, cond)).length }]);
              } else {
                resolve(getTableData(tn).filter((r: any) => matchesCondition(r, cond)));
              }
            },
          };
          return chain;
        },
      };
    },
    insert(table: any) {
      const tn = table._name;
      return {
        values(vals: any) {
          return {
            returning() {
              return {
                then(resolve: any) {
                  const items = Array.isArray(vals) ? vals : [vals];
                  const inserted = items.map((v: any) => {
                    const nr = { id: ++idCounter, ...v, createdAt: new Date() };
                    getTableData(tn).push(nr);
                    return nr;
                  });
                  resolve(inserted);
                },
              };
            },
          };
        },
      };
    },
  };
  return {
    db,
    membersTable: makeTable("members"),
    leadsTable: makeTable("leads"),
    subscriptionsTable: makeTable("subscriptions"),
    aiTasksTable: makeTable("ai_tasks"),
  };
});

import { generateAiTasks } from "../services/ai-task-generation";

describe("AI Task Generation", () => {
  beforeEach(() => {
    mockMembers = [];
    mockLeads = [];
    mockSubscriptions = [];
    mockAiTasks = [];
    idCounter = 0;
  });

  describe("generateAiTasks", () => {
    it("returns zero tasks when gym has no actionable data", async () => {
      const result = await generateAiTasks(1);
      expect(result.created).toBe(0);
      expect(result.tasks).toHaveLength(0);
    });

    it("generates at-risk member outreach tasks for critical risk tier", async () => {
      mockMembers = [{
        id: 1, gymId: 1, status: "active", riskTier: "critical",
        firstName: "John", lastName: "Doe", attendanceCount30d: 0,
      }];
      const result = await generateAiTasks(1);
      expect(result.created).toBeGreaterThan(0);
      const outreach = result.tasks.find((t: any) => t.type === "outreach");
      expect(outreach).toBeDefined();
      expect(outreach!.title).toContain("Win back");
      expect(outreach!.priority).toBe("high");
    });

    it("generates re-engage tasks for high risk tier", async () => {
      mockMembers = [{
        id: 2, gymId: 1, status: "active", riskTier: "high",
        firstName: "Jane", lastName: "Smith", attendanceCount30d: 2,
      }];
      const result = await generateAiTasks(1);
      const outreach = result.tasks.find((t: any) => t.type === "outreach");
      expect(outreach).toBeDefined();
      expect(outreach!.title).toContain("Re-engage");
      expect(outreach!.priority).toBe("medium");
    });

    it("generates onboarding tasks for new members", async () => {
      mockMembers = [{
        id: 3, gymId: 1, status: "active", riskTier: "healthy",
        firstName: "New", lastName: "Member",
        joinDate: new Date().toISOString().split("T")[0],
        attendanceCount30d: 5,
      }];
      const result = await generateAiTasks(1);
      const onboarding = result.tasks.find((t: any) => t.type === "onboarding");
      expect(onboarding).toBeDefined();
      expect(onboarding!.title).toContain("Onboarding plan");
    });

    it("generates stale lead follow-up tasks", async () => {
      mockLeads = [{
        id: 1, gymId: 1, isStale: true,
        firstName: "Lead", lastName: "Prospect", source: "website",
      }];
      const result = await generateAiTasks(1);
      const lead = result.tasks.find((t: any) => t.type === "leads");
      expect(lead).toBeDefined();
      expect(lead!.title).toContain("No Sweat Intro");
      expect(lead!.targetType).toBe("lead");
    });

    it("generates billing tasks for past_due subscriptions", async () => {
      mockSubscriptions = [{
        id: 1, gymId: 1, memberId: 5, status: "past_due", planName: "Unlimited",
      }];
      mockMembers = [{
        id: 5, gymId: 1, firstName: "Bill", lastName: "Payer", status: "active",
      }];
      const result = await generateAiTasks(1);
      const billing = result.tasks.find((t: any) => t.type === "billing");
      expect(billing).toBeDefined();
      expect(billing!.title).toContain("Payment issue");
      expect(billing!.priority).toBe("high");
    });

    it("skips members that already have existing pending tasks", async () => {
      mockMembers = [{
        id: 1, gymId: 1, status: "active", riskTier: "critical",
        firstName: "Existing", lastName: "Task", attendanceCount30d: 0,
      }];
      mockAiTasks = [{
        id: 99, gymId: 1, targetType: "member", targetId: 1, status: "pending", type: "outreach",
      }];
      const result = await generateAiTasks(1);
      const outreach = result.tasks.filter((t: any) => t.type === "outreach");
      expect(outreach).toHaveLength(0);
    });

    it("generates tasks across all categories simultaneously", async () => {
      mockMembers = [
        { id: 1, gymId: 1, status: "active", riskTier: "critical", firstName: "A", lastName: "B", attendanceCount30d: 0 },
        { id: 2, gymId: 1, status: "active", riskTier: "healthy", firstName: "C", lastName: "D", joinDate: new Date().toISOString().split("T")[0], attendanceCount30d: 5 },
        { id: 3, gymId: 1, status: "active", firstName: "E", lastName: "F" },
      ];
      mockLeads = [{ id: 1, gymId: 1, isStale: true, firstName: "G", lastName: "H", source: "referral" }];
      mockSubscriptions = [{ id: 1, gymId: 1, memberId: 3, status: "past_due", planName: "Basic" }];
      const result = await generateAiTasks(1);
      expect(result.created).toBeGreaterThanOrEqual(4);
      const types = new Set(result.tasks.map((t: any) => t.type));
      expect(types.has("outreach")).toBe(true);
      expect(types.has("onboarding")).toBe(true);
      expect(types.has("leads")).toBe(true);
      expect(types.has("billing")).toBe(true);
    });

    it("includes AI-generated email content for outreach tasks", async () => {
      mockMembers = [{
        id: 1, gymId: 1, status: "active", riskTier: "critical",
        firstName: "Alex", lastName: "Test", attendanceCount30d: 0,
      }];
      const result = await generateAiTasks(1);
      expect(result.tasks[0].aiContent).toContain("Alex");
      expect(result.tasks[0].aiContent.length).toBeGreaterThan(100);
    });
  });
});
