import { describe, it, expect, vi, beforeEach } from "vitest";

let mockMembers: any[] = [];
let mockLeads: any[] = [];
let mockSubscriptions: any[] = [];
let mockAiTasks: any[] = [];
let idCounter = 0;
let updateCalls: any[] = [];

vi.mock("drizzle-orm", () => ({
  eq: (left: any, right: any) => ({ _type: "eq", left, right }),
  and: (...conditions: any[]) => ({ _type: "and", conditions }),
  sql: Object.assign((() => ({ _type: "sql" })) as any, { join: (...args: any[]) => ({}) }),
  count: () => ({ _type: "count" }),
  gte: () => ({ _type: "gte" }),
  desc: () => ({}),
  asc: () => ({}),
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
    update(table: any) {
      return {
        set(values: any) {
          return {
            where(cond: any) {
              const tn = table._name;
              const data = getTableData(tn);
              for (const row of data) {
                if (cond._type === "eq" && row[resolveField(cond.left)] === cond.right) {
                  Object.assign(row, values);
                  updateCalls.push({ table: tn, id: cond.right, values });
                }
              }
              return Promise.resolve();
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
    gymsTable: makeTable("gyms"),
    attendanceTable: makeTable("attendance"),
    classesTable: makeTable("classes"),
    leadActivitiesTable: makeTable("lead_activities"),
    workoutResultsTable: makeTable("workout_results"),
    workoutsTable: makeTable("workouts"),
  };
});

import { generateAiTasks } from "../services/ai-task-generation";

describe("AI Task Generation", () => {
  beforeEach(() => {
    mockMembers = [];
    mockLeads = [];
    mockSubscriptions = [];
    mockAiTasks = [];
    updateCalls = [];
    idCounter = 0;
  });

  describe("generateAiTasks", () => {
    it("returns zero tasks when gym has no actionable data", async () => {
      const result = await generateAiTasks(1);
      expect(result.created).toBe(0);
      expect(result.tasks).toHaveLength(0);
    });

    it("returns a reason when zero tasks are created due to no risks", async () => {
      const result = await generateAiTasks(1);
      expect(result.created).toBe(0);
      expect(result.reason).toBeDefined();
      expect(result.reason).toContain("nothing flagged");
    });

    it("returns a reason about pending tasks when queue is full", async () => {
      mockMembers = [];
      mockLeads = [
        { id: 1, gymId: 1, firstName: "Jane", lastName: "Doe", source: "web", stage: "new", isStale: true, createdAt: new Date(Date.now() - 3 * 86400000) },
      ];
      mockAiTasks = Array.from({ length: 5 }, (_, i) => ({
        id: i + 1, gymId: 1, type: "outreach", status: "pending",
        targetId: i + 10, targetType: "member",
      }));
      const result = await generateAiTasks(1);
      expect(result.created).toBe(0);
      expect(result.reason).toBeDefined();
      expect(result.reason).toContain("already pending");
    });

    it("generates at-risk member outreach tasks for critical risk tier", async () => {
      mockMembers = [{
        id: 1, gymId: 1, status: "active", riskTier: "critical",
        firstName: "John", lastName: "Doe", attendanceCount30d: 0,
        lastVisitDate: new Date(Date.now() - 35 * 86400000),
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
        lastVisitDate: new Date(Date.now() - 20 * 86400000),
      }];
      const result = await generateAiTasks(1);
      const outreach = result.tasks.find((t: any) => t.type === "outreach");
      expect(outreach).toBeDefined();
      expect(outreach!.title).toContain("Re-engage");
      expect(outreach!.priority).toBe("medium");
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
        lastVisitDate: new Date(), attendanceCount30d: 10,
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
        lastVisitDate: new Date(Date.now() - 35 * 86400000),
      }];
      mockAiTasks = [{
        id: 99, gymId: 1, targetType: "member", targetId: 1, status: "pending", type: "outreach",
      }];
      const result = await generateAiTasks(1);
      const outreach = result.tasks.filter((t: any) => t.type === "outreach");
      expect(outreach).toHaveLength(0);
    });

    it("includes AI-generated email content for outreach tasks", async () => {
      mockMembers = [{
        id: 1, gymId: 1, status: "active", riskTier: "critical",
        firstName: "Alex", lastName: "Test", attendanceCount30d: 0,
        lastVisitDate: new Date(Date.now() - 35 * 86400000),
      }];
      const result = await generateAiTasks(1);
      expect(result.tasks[0].aiContent).toContain("Alex");
      expect(result.tasks[0].aiContent.length).toBeGreaterThan(100);
    });

    it("computes risk for imported members with null riskTier", async () => {
      mockMembers = [{
        id: 10, gymId: 1, status: "active",
        riskTier: null, riskScore: null,
        firstName: "Imported", lastName: "Member",
        attendanceCount30d: 0,
        lastVisitDate: null,
        daysSinceLastAttendance: null,
      }];
      const result = await generateAiTasks(1);
      expect(updateCalls.length).toBeGreaterThan(0);
      const updated = updateCalls.find((c: any) => c.id === 10);
      expect(updated).toBeDefined();
      expect(updated.values.riskTier).toBe("critical");

      const outreach = result.tasks.find((t: any) => t.type === "outreach");
      expect(outreach).toBeDefined();
      expect(outreach!.title).toContain("Win back Imported");
    });

    it("computes risk for imported members with Wodify attendance data", async () => {
      mockMembers = [{
        id: 11, gymId: 1, status: "active",
        riskTier: null, riskScore: null,
        firstName: "Wodify", lastName: "Import",
        attendanceCount30d: 2,
        lastVisitDate: new Date(Date.now() - 25 * 86400000),
        daysSinceLastAttendance: 25,
      }];
      const result = await generateAiTasks(1);
      const updated = updateCalls.find((c: any) => c.id === 11);
      expect(updated).toBeDefined();
      expect(["high", "critical"]).toContain(updated.values.riskTier);

      const outreach = result.tasks.find((t: any) => t.type === "outreach");
      expect(outreach).toBeDefined();
      expect(outreach!.title).toContain("Wodify Import");
    });

    it("caps total pending tasks at 5", async () => {
      mockMembers = [];
      for (let i = 1; i <= 8; i++) {
        mockMembers.push({
          id: i, gymId: 1, status: "active", riskTier: "critical",
          firstName: `Member${i}`, lastName: "Test", attendanceCount30d: 0,
          lastVisitDate: new Date(Date.now() - 35 * 86400000),
        });
      }
      const result = await generateAiTasks(1);
      expect(result.created).toBe(5);
      expect(result.tasks).toHaveLength(5);
    });

    it("accounts for existing pending tasks in the cap", async () => {
      mockAiTasks = [
        { id: 100, gymId: 1, targetType: "member", targetId: 100, status: "pending", type: "outreach" },
        { id: 101, gymId: 1, targetType: "member", targetId: 101, status: "pending", type: "outreach" },
        { id: 102, gymId: 1, targetType: "member", targetId: 102, status: "pending", type: "outreach" },
      ];
      mockMembers = [];
      for (let i = 1; i <= 5; i++) {
        mockMembers.push({
          id: i, gymId: 1, status: "active", riskTier: "critical",
          firstName: `New${i}`, lastName: "Test", attendanceCount30d: 0,
          lastVisitDate: new Date(Date.now() - 35 * 86400000),
        });
      }
      const result = await generateAiTasks(1);
      expect(result.created).toBe(2);
    });

    it("creates zero tasks when already at the cap", async () => {
      mockAiTasks = [];
      for (let i = 1; i <= 5; i++) {
        mockAiTasks.push({ id: i, gymId: 1, targetType: "member", targetId: 50 + i, status: "pending", type: "outreach" });
      }
      mockMembers = [{
        id: 1, gymId: 1, status: "active", riskTier: "critical",
        firstName: "Extra", lastName: "Member", attendanceCount30d: 0,
        lastVisitDate: new Date(Date.now() - 35 * 86400000),
      }];
      const result = await generateAiTasks(1);
      expect(result.created).toBe(0);
    });

    it("prioritizes critical outreach over leads", async () => {
      mockMembers = [{
        id: 1, gymId: 1, status: "active", riskTier: "critical",
        firstName: "Critical", lastName: "Member", attendanceCount30d: 0,
        lastVisitDate: new Date(Date.now() - 35 * 86400000),
      }];
      mockLeads = [];
      for (let i = 1; i <= 6; i++) {
        mockLeads.push({
          id: i, gymId: 1, isStale: true,
          firstName: `Lead${i}`, lastName: "Stale", source: "web",
        });
      }
      const result = await generateAiTasks(1);
      expect(result.created).toBe(5);
      expect(result.tasks[0].type).toBe("outreach");
      expect(result.tasks[0].title).toContain("Critical");
      const leadTasks = result.tasks.filter((t: any) => t.type === "leads");
      expect(leadTasks.length).toBe(4);
    });

    it("sorts mixed categories: critical > high > billing > leads under cap", async () => {
      mockMembers = [
        {
          id: 1, gymId: 1, status: "active", riskTier: "high",
          firstName: "HighRisk", lastName: "Member", attendanceCount30d: 2,
          lastVisitDate: new Date(Date.now() - 20 * 86400000),
        },
        {
          id: 2, gymId: 1, status: "active", riskTier: "critical",
          firstName: "CriticalRisk", lastName: "Member", attendanceCount30d: 0,
          lastVisitDate: new Date(Date.now() - 35 * 86400000),
        },
        {
          id: 3, gymId: 1, firstName: "Bill", lastName: "Payer", status: "active",
          lastVisitDate: new Date(), attendanceCount30d: 10,
        },
      ];
      mockSubscriptions = [{
        id: 1, gymId: 1, memberId: 3, status: "past_due", planName: "Unlimited",
      }];
      mockLeads = [
        { id: 1, gymId: 1, isStale: true, firstName: "Lead1", lastName: "Stale", source: "web" },
        { id: 2, gymId: 1, isStale: true, firstName: "Lead2", lastName: "Stale", source: "web" },
      ];
      const result = await generateAiTasks(1);
      expect(result.created).toBe(5);
      const types = result.tasks.map((t: any) => t.type);
      const critIdx = types.indexOf("outreach");
      const billingIdx = types.indexOf("billing");
      const leadsIdx = types.indexOf("leads");
      expect(critIdx).toBeLessThan(billingIdx);
      expect(billingIdx).toBeLessThan(leadsIdx);
    });
  });
});
