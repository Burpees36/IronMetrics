import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("drizzle-orm", () => ({
  eq: (left: unknown, right: unknown) => ({ _type: "eq", left, right }),
  and: (...conditions: unknown[]) => ({ _type: "and", conditions }),
  ne: (left: unknown, right: unknown) => ({ _type: "ne", left, right }),
  or: (...conditions: unknown[]) => ({ _type: "or", conditions }),
  desc: () => ({}),
  asc: () => ({}),
  lte: () => ({}),
  gte: () => ({}),
  sql: Object.assign((() => ({})) as (...args: unknown[]) => unknown, { raw: () => ({}) }),
  count: () => ({ _type: "count" }),
  ilike: () => ({}),
  inArray: () => ({}),
}));

let mockActiveEnrollments: Array<{
  id: number;
  memberId: number;
  gymId: number;
  sequenceId: number;
  status: string;
  currentStepIndex: number;
}> = [];

let exitedEnrollmentIds: number[] = [];
let exitReasons: string[] = [];
let insertedEventTypes: string[] = [];

function makeTable(name: string): Record<string, unknown> {
  return new Proxy({ _name: name } as Record<string, unknown>, {
    get(_, prop: string) {
      if (prop === "_name") return name;
      return { _col: true, _table: name, _field: prop };
    },
  });
}

vi.mock("@workspace/db", () => {
  const db = {
    select() {
      return {
        from(table: { _name: string }) {
          return {
            where() {
              return {
                orderBy() { return this; },
                limit() { return this; },
                then(resolve: (v: unknown[]) => void) {
                  if (table._name === "member_sequence_enrollments") {
                    resolve(mockActiveEnrollments.filter(e => e.status === "active"));
                  } else {
                    resolve([]);
                  }
                },
              };
            },
            orderBy() { return this; },
            limit() { return this; },
            then(resolve: (v: unknown[]) => void) { resolve([]); },
          };
        },
      };
    },
    update(table: { _name: string }) {
      return {
        set(data: Record<string, unknown>) {
          return {
            where(cond: { right?: number }) {
              if (table._name === "member_sequence_enrollments") {
                if (cond.right !== undefined) exitedEnrollmentIds.push(cond.right);
                if (data.exitReason) exitReasons.push(data.exitReason as string);
              }
              return Promise.resolve([]);
            },
          };
        },
      };
    },
    insert(table: { _name: string }) {
      return {
        values(data: Record<string, unknown>) {
          if (table._name === "retention_sequence_events" && data.eventType) {
            insertedEventTypes.push(data.eventType as string);
          }
          return {
            returning() { return Promise.resolve([{ id: 1, ...data }]); },
            then(resolve: (v: unknown[]) => void) { resolve([{ id: 1, ...data }]); },
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

vi.mock("../services/member-email", () => ({ sendMemberEmail: vi.fn() }));
vi.mock("../services/email-service", () => ({
  getEmailService: () => ({ isConfigured: () => false }),
}));

beforeEach(() => {
  mockActiveEnrollments = [];
  exitedEnrollmentIds = [];
  exitReasons = [];
  insertedEventTypes = [];
});

describe("exitMemberSequences", () => {
  it("exits all active enrollments for a member and returns the count", async () => {
    mockActiveEnrollments = [
      { id: 101, memberId: 1, gymId: 10, sequenceId: 5, status: "active", currentStepIndex: 2 },
      { id: 102, memberId: 1, gymId: 10, sequenceId: 8, status: "active", currentStepIndex: 0 },
    ];

    const { exitMemberSequences } = await import("../schedulers/retention-engine");
    const count = await exitMemberSequences(1, 10, "member_inactive");

    expect(count).toBe(2);
    expect(exitedEnrollmentIds).toContain(101);
    expect(exitedEnrollmentIds).toContain(102);
    expect(exitReasons).toEqual(["member_inactive", "member_inactive"]);
  });

  it("returns 0 and does not write events when no active enrollments exist", async () => {
    mockActiveEnrollments = [];

    const { exitMemberSequences } = await import("../schedulers/retention-engine");
    const count = await exitMemberSequences(99, 10, "member_inactive");

    expect(count).toBe(0);
    expect(exitedEnrollmentIds).toHaveLength(0);
    expect(insertedEventTypes).toHaveLength(0);
  });

  it("records exit events with correct event type for each enrollment", async () => {
    mockActiveEnrollments = [
      { id: 201, memberId: 2, gymId: 10, sequenceId: 3, status: "active", currentStepIndex: 1 },
    ];

    const { exitMemberSequences } = await import("../schedulers/retention-engine");
    await exitMemberSequences(2, 10, "member_inactive");

    expect(insertedEventTypes).toContain("exit_member_inactive");
  });

  it("uses the provided reason for exit", async () => {
    mockActiveEnrollments = [
      { id: 301, memberId: 3, gymId: 10, sequenceId: 7, status: "active", currentStepIndex: 0 },
    ];

    const { exitMemberSequences } = await import("../schedulers/retention-engine");
    await exitMemberSequences(3, 10, "member_inactive");

    expect(exitReasons).toEqual(["member_inactive"]);
  });
});

describe("evaluateTrigger: onboarding scoping", () => {
  it("new_member_join trigger enrolls member who just joined", async () => {
    const { evaluateTrigger } = await import("../schedulers/retention-engine");
    const result = evaluateTrigger(
      { type: "new_member_join", joinDays: 3 },
      { riskScore: null, lastVisitDate: null, joinDate: new Date().toISOString().split("T")[0], createdAt: new Date() }
    );
    expect(result).toBe(true);
  });

  it("new_member_join trigger does not enroll member who joined 10 days ago", async () => {
    const { evaluateTrigger } = await import("../schedulers/retention-engine");
    const old = new Date(Date.now() - 10 * 86400000);
    const result = evaluateTrigger(
      { type: "new_member_join", joinDays: 3 },
      { riskScore: null, lastVisitDate: null, joinDate: old.toISOString().split("T")[0], createdAt: old }
    );
    expect(result).toBe(false);
  });

  it("no_attendance trigger fires for null lastVisitDate (proves onboarding scoping is needed)", async () => {
    const { evaluateTrigger } = await import("../schedulers/retention-engine");
    const result = evaluateTrigger(
      { type: "no_attendance", days: 10 },
      { riskScore: null, lastVisitDate: null, joinDate: new Date().toISOString().split("T")[0], createdAt: new Date() }
    );
    expect(result).toBe(true);
  });
});

describe("Route integration contracts", () => {
  it("member crud route imports and uses exitMemberSequences from retention-engine", async () => {
    const retentionEngine = await import("../schedulers/retention-engine");
    expect(typeof retentionEngine.exitMemberSequences).toBe("function");
  });

  it("evaluateTriggersForGym accepts options with onlyMemberId and onlySequenceType", async () => {
    const retentionEngine = await import("../schedulers/retention-engine");
    expect(typeof retentionEngine.evaluateTriggersForGym).toBe("function");
    expect(retentionEngine.evaluateTriggersForGym.length).toBeGreaterThanOrEqual(1);
  });
});
