import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("drizzle-orm", () => ({
  eq: (left: any, right: any) => ({ _type: "eq", left, right }),
  and: (...conditions: any[]) => ({ _type: "and", conditions }),
  ne: (left: any, right: any) => ({ _type: "ne", left, right }),
  desc: () => ({}),
  asc: () => ({}),
  lte: (left: any, right: any) => ({ _type: "lte", left, right }),
  gte: (left: any, right: any) => ({ _type: "gte", left, right }),
  sql: Object.assign((() => ({})) as any, { raw: () => ({}) }),
  count: () => ({ _type: "count" }),
  inArray: (left: any, values: any[]) => ({ _type: "inArray", left, values }),
}));

let mockEnrollments: any[] = [];
let exitedEnrollments: { id: number; status: string; exitReason: string }[] = [];
let insertedEvents: any[] = [];

vi.mock("@workspace/db", () => {
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
            orderBy() { return chain; },
            limit() { return chain; },
            then(resolve: any) {
              if (table._name === "member_sequence_enrollments") {
                resolve(mockEnrollments.filter(e => e.status === "active"));
              } else {
                resolve([]);
              }
            },
          };
          return chain;
        },
      };
    },
    update(table: any) {
      return {
        set(data: any) {
          return {
            where(cond: any) {
              const enrollmentId = cond?.right;
              exitedEnrollments.push({
                id: enrollmentId,
                status: data.status,
                exitReason: data.exitReason,
              });
              return Promise.resolve([]);
            },
          };
        },
      };
    },
    insert(table: any) {
      return {
        values(data: any) {
          insertedEvents.push(data);
          return {
            returning() { return Promise.resolve([data]); },
            then(resolve: any) { resolve([data]); },
          };
        },
      };
    },
  };

  return {
    db,
    membersTable: makeTable("members"),
    memberSequenceEnrollmentsTable: makeTable("member_sequence_enrollments"),
    retentionSequenceEventsTable: makeTable("retention_sequence_events"),
    retentionSequencesTable: makeTable("retention_sequences"),
    retentionSequenceStepsTable: makeTable("retention_sequence_steps"),
    gymsTable: makeTable("gyms"),
    attendanceTable: makeTable("attendance"),
    aiTasksTable: makeTable("ai_tasks"),
  };
});

vi.mock("../services/member-email", () => ({
  sendMemberEmail: vi.fn(),
}));
vi.mock("../services/email-service", () => ({
  getEmailService: () => ({ isConfigured: () => false }),
}));

beforeEach(() => {
  mockEnrollments = [];
  exitedEnrollments = [];
  insertedEvents = [];
});

describe("exitMemberSequences", () => {
  it("exits all active enrollments for a member", async () => {
    mockEnrollments = [
      { id: 101, memberId: 1, gymId: 10, sequenceId: 5, status: "active", currentStepIndex: 2 },
      { id: 102, memberId: 1, gymId: 10, sequenceId: 8, status: "active", currentStepIndex: 0 },
    ];

    const { exitMemberSequences } = await import("../schedulers/retention-engine");
    const count = await exitMemberSequences(1, 10, "member_inactive");

    expect(count).toBe(2);
    expect(exitedEnrollments).toHaveLength(2);
    expect(exitedEnrollments[0].exitReason).toBe("member_inactive");
    expect(exitedEnrollments[1].exitReason).toBe("member_inactive");
  });

  it("returns 0 when no active enrollments exist", async () => {
    mockEnrollments = [];

    const { exitMemberSequences } = await import("../schedulers/retention-engine");
    const count = await exitMemberSequences(99, 10, "member_inactive");

    expect(count).toBe(0);
    expect(exitedEnrollments).toHaveLength(0);
  });

  it("records exit events for each enrollment", async () => {
    mockEnrollments = [
      { id: 201, memberId: 2, gymId: 10, sequenceId: 3, status: "active", currentStepIndex: 1 },
    ];

    const { exitMemberSequences } = await import("../schedulers/retention-engine");
    await exitMemberSequences(2, 10, "member_inactive");

    expect(insertedEvents.length).toBeGreaterThanOrEqual(1);
    const exitEvent = insertedEvents.find(e => e.eventType === "exit_member_inactive");
    expect(exitEvent).toBeDefined();
    expect(exitEvent.memberId).toBe(2);
    expect(exitEvent.gymId).toBe(10);
  });
});

describe("evaluateTrigger scoping", () => {
  it("new_member_join trigger returns true for member joined today", async () => {
    const { evaluateTrigger } = await import("../schedulers/retention-engine");
    const result = evaluateTrigger(
      { type: "new_member_join", joinDays: 3 },
      {
        riskScore: null,
        lastVisitDate: null,
        joinDate: new Date().toISOString().split("T")[0],
        createdAt: new Date(),
      }
    );
    expect(result).toBe(true);
  });

  it("new_member_join trigger returns false for member joined 10 days ago", async () => {
    const { evaluateTrigger } = await import("../schedulers/retention-engine");
    const tenDaysAgo = new Date(Date.now() - 10 * 86400000);
    const result = evaluateTrigger(
      { type: "new_member_join", joinDays: 3 },
      {
        riskScore: null,
        lastVisitDate: null,
        joinDate: tenDaysAgo.toISOString().split("T")[0],
        createdAt: tenDaysAgo,
      }
    );
    expect(result).toBe(false);
  });

  it("no_attendance trigger does NOT apply to just-converted member with no visits", async () => {
    const { evaluateTrigger } = await import("../schedulers/retention-engine");
    const result = evaluateTrigger(
      { type: "no_attendance", days: 10 },
      {
        riskScore: null,
        lastVisitDate: null,
        joinDate: new Date().toISOString().split("T")[0],
        createdAt: new Date(),
      }
    );
    expect(result).toBe(true);
  });
});
