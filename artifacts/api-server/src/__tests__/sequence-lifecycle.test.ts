import { describe, it, expect, vi, beforeEach } from "vitest";

const spyExitMemberSequences = vi.fn().mockResolvedValue(0);
const spyEvaluateTriggersForGym = vi.fn().mockResolvedValue(undefined);

vi.mock("../schedulers/retention-engine", () => ({
  exitMemberSequences: (...args: unknown[]) => spyExitMemberSequences(...args),
  evaluateTriggersForGym: (...args: unknown[]) => spyEvaluateTriggersForGym(...args),
  evaluateTrigger: vi.fn(),
  renderTemplate: vi.fn(),
  RETENTION_INTERVAL_MS: 7200000,
}));

const spyPauseLeadSequences = vi.fn().mockResolvedValue(0);
const spyEnrollLeadInSequence = vi.fn().mockResolvedValue(0);

vi.mock("../services/lead-sequence-engine", () => ({
  pauseLeadSequences: (...args: unknown[]) => spyPauseLeadSequences(...args),
  enrollLeadInSequence: (...args: unknown[]) => spyEnrollLeadInSequence(...args),
}));

vi.mock("drizzle-orm", () => ({
  eq: (l: unknown, r: unknown) => ({ _type: "eq", left: l, right: r }),
  and: (...c: unknown[]) => ({ _type: "and", conditions: c }),
  ne: (l: unknown, r: unknown) => ({ _type: "ne", left: l, right: r }),
  or: (...c: unknown[]) => ({ _type: "or", conditions: c }),
  desc: () => ({}),
  asc: () => ({}),
  lte: () => ({}),
  gte: () => ({}),
  sql: Object.assign((() => ({})) as (...a: unknown[]) => unknown, { raw: () => ({}) }),
  count: () => ({ _type: "count" }),
  ilike: () => ({}),
  inArray: () => ({}),
}));

function makeTable(name: string): Record<string, unknown> {
  return new Proxy({ _name: name } as Record<string, unknown>, {
    get(_, prop: string) {
      if (prop === "_name") return name;
      if (prop === "$inferSelect") return {};
      return { _col: true, _table: name, _field: prop };
    },
  });
}

let mockMembers: Record<string, unknown>[] = [];
let mockLeads: Record<string, unknown>[] = [];
let mockSubscriptions: Record<string, unknown>[] = [];
let lastUpdatedMember: Record<string, unknown> | null = null;

vi.mock("@workspace/db", () => {
  function buildChain(getData: () => unknown[]): Record<string, unknown> {
    let cond: unknown = null;
    const chain: Record<string, unknown> = {
      where(c: unknown) { cond = c; return chain; },
      orderBy() { return chain; },
      limit() { return chain; },
      offset() { return chain; },
      leftJoin() { return chain; },
      returning() { return chain; },
      then(resolve: (v: unknown[]) => void) { resolve(getData()); },
    };
    return chain;
  }

  const db = {
    select(fields?: Record<string, unknown>) {
      return {
        from(table: { _name: string }) {
          return buildChain(() => {
            if (table._name === "members") {
              if (fields && "count" in fields) return [{ count: mockMembers.length }];
              return mockMembers;
            }
            if (table._name === "leads") return mockLeads;
            if (table._name === "subscriptions") return mockSubscriptions;
            return [];
          });
        },
      };
    },
    update(table: { _name: string }) {
      return {
        set(data: Record<string, unknown>) {
          return buildChain(() => {
            if (table._name === "members") {
              lastUpdatedMember = data;
              const m = mockMembers[0] || {};
              return [{ ...m, ...data, id: m.id || 1 }];
            }
            if (table._name === "leads") {
              const l = mockLeads[0] || {};
              return [{ ...l, ...data }];
            }
            if (table._name === "subscriptions") {
              const s = mockSubscriptions[0] || {};
              return [{ ...s, ...data }];
            }
            return [data];
          });
        },
      };
    },
    insert(table: { _name: string }) {
      return {
        values(data: Record<string, unknown>) {
          return {
            returning() {
              return {
                then(resolve: (v: unknown[]) => void) {
                  resolve([{ id: 42, ...data }]);
                },
              };
            },
            then(resolve: (v: unknown[]) => void) { resolve([{ id: 42, ...data }]); },
          };
        },
      };
    },
  };

  return {
    db,
    membersTable: makeTable("members"),
    memberNotesTable: makeTable("member_notes"),
    timelineEventsTable: makeTable("timeline_events"),
    subscriptionsTable: makeTable("subscriptions"),
    attendanceTable: makeTable("attendance"),
    membershipPlansTable: makeTable("membership_plans"),
    gymsTable: makeTable("gyms"),
    leadsTable: makeTable("leads"),
    leadActivitiesTable: makeTable("lead_activities"),
    retentionSequencesTable: makeTable("retention_sequences"),
    retentionSequenceStepsTable: makeTable("retention_sequence_steps"),
    memberSequenceEnrollmentsTable: makeTable("member_sequence_enrollments"),
    retentionSequenceEventsTable: makeTable("retention_sequence_events"),
    scheduledHoldsTable: makeTable("scheduled_holds"),
    aiTasksTable: makeTable("ai_tasks"),
  };
});

vi.mock("../../stripeService", () => ({
  stripeService: { createCustomer: vi.fn(), createSubscription: vi.fn() },
}));
vi.mock("../../stripeClient", () => ({ getStripeClient: vi.fn() }));
vi.mock("../stripeClient", () => ({
  getStripeClient: vi.fn(),
  getStripeSync: vi.fn(),
  getUncachableStripeClient: vi.fn().mockResolvedValue({
    subscriptions: {
      update: vi.fn().mockResolvedValue({}),
      cancel: vi.fn().mockResolvedValue({}),
    },
  }),
}));
vi.mock("../../services/member-sms", () => ({ sendMemberSms: vi.fn(), sendLeadSms: vi.fn() }));
vi.mock("../../middlewares/billingRbac", () => ({
  requireBillingPermission: () => (_r: unknown, _s: unknown, n: () => void) => n(),
  requireBillingRead: () => (_r: unknown, _s: unknown, n: () => void) => n(),
}));
vi.mock("../../billingAuditLogger", () => ({
  billingAuditLogger: { log: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock("../billingAuditLogger", () => ({
  billingAuditLogger: { log: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock("../services/billing-recovery", () => ({
  billingRecoveryService: {},
}));
vi.mock("../tierConfig", () => ({
  getTierFromPriceId: vi.fn(),
}));
vi.mock("@workspace/api-zod", () => ({
  CreateMemberBody: { safeParse: (d: unknown) => ({ success: true, data: d }) },
  UpdateMemberBody: { safeParse: (d: unknown) => ({ success: true, data: d }) },
  CreateLeadBody: { safeParse: (d: unknown) => ({ success: true, data: d }) },
  UpdateLeadBody: { safeParse: (d: unknown) => ({ success: true, data: d }) },
  CreateSubscriptionBody: { safeParse: (d: unknown) => ({ success: true, data: d }) },
  UpdateSubscriptionBody: { safeParse: (d: unknown) => ({ success: true, data: d }) },
}));

function makeReq(params: Record<string, string>, body: Record<string, unknown>) {
  return {
    params,
    body,
    query: {},
    user: { id: 1, firstName: "Admin", gymId: parseInt(params.gymId || "0", 10) },
    isAuthenticated: () => true,
    gymRole: "owner",
  };
}

function makeRes() {
  const res: Record<string, unknown> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
}

type StackLayer = {
  route?: {
    path: string;
    methods: Record<string, boolean>;
    stack: Array<{ handle: (...args: unknown[]) => Promise<void> }>;
  };
  handle?: { stack?: StackLayer[] };
};

function findHandler(router: { stack: StackLayer[] }, method: string, pathPattern: RegExp): ((...args: unknown[]) => Promise<void>) | null {
  for (const layer of router.stack) {
    if (layer.route && pathPattern.test(layer.route.path) && layer.route.methods[method]) {
      const routeStack = layer.route.stack;
      return routeStack[routeStack.length - 1].handle;
    }
    if (layer.handle?.stack) {
      const found = findHandler(layer.handle as { stack: StackLayer[] }, method, pathPattern);
      if (found) return found;
    }
  }
  return null;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockMembers = [];
  mockLeads = [];
  mockSubscriptions = [];
  lastUpdatedMember = null;
});

describe("PATCH /gyms/:gymId/members/:memberId — sequence exit on cancel/hold", () => {
  it("calls exitMemberSequences with member_inactive when status set to cancelled", async () => {
    mockMembers = [
      { id: 42, gymId: 10, firstName: "Jane", lastName: "Doe", email: "jane@test.com", status: "active", riskScore: null },
    ];

    const mod = await import("../routes/members/crud");
    const handler = findHandler(mod.default as unknown as { stack: StackLayer[] }, "patch", /members/);
    expect(handler).not.toBeNull();

    const req = makeReq({ gymId: "10", memberId: "42" }, { status: "cancelled" });
    const res = makeRes();
    await handler!(req, res);

    expect(spyExitMemberSequences).toHaveBeenCalledTimes(1);
    expect(spyExitMemberSequences).toHaveBeenCalledWith(42, 10, "member_inactive");
  });

  it("calls exitMemberSequences with member_inactive when status set to hold", async () => {
    mockMembers = [
      { id: 42, gymId: 10, firstName: "Jane", lastName: "Doe", email: "jane@test.com", status: "active", riskScore: null },
    ];

    const mod = await import("../routes/members/crud");
    const handler = findHandler(mod.default as unknown as { stack: StackLayer[] }, "patch", /members/);
    expect(handler).not.toBeNull();

    const req = makeReq({ gymId: "10", memberId: "42" }, { status: "hold" });
    const res = makeRes();
    await handler!(req, res);

    expect(spyExitMemberSequences).toHaveBeenCalledTimes(1);
    expect(spyExitMemberSequences).toHaveBeenCalledWith(42, 10, "member_inactive");
  });

  it("does NOT call exitMemberSequences for a non-status update", async () => {
    mockMembers = [
      { id: 42, gymId: 10, firstName: "Jane", lastName: "Doe", email: "jane@test.com", status: "active", riskScore: null },
    ];

    const mod = await import("../routes/members/crud");
    const handler = findHandler(mod.default as unknown as { stack: StackLayer[] }, "patch", /members/);
    expect(handler).not.toBeNull();

    const req = makeReq({ gymId: "10", memberId: "42" }, { firstName: "Updated" });
    const res = makeRes();
    await handler!(req, res);

    expect(spyExitMemberSequences).not.toHaveBeenCalled();
  });
});

describe("POST /gyms/:gymId/leads/:leadId/convert — sequence transitions", () => {
  it("pauses lead sequences with lead_converted reason", async () => {
    mockLeads = [
      { id: 5, gymId: 10, firstName: "Bob", lastName: "Smith", email: "bob@test.com", phone: null, stage: "intro" },
    ];

    const mod = await import("../routes/leads");
    const handler = findHandler(mod.default as unknown as { stack: StackLayer[] }, "post", /convert/);
    expect(handler).not.toBeNull();

    const req = makeReq({ gymId: "10", leadId: "5" }, {});
    const res = makeRes();
    await handler!(req, res);

    expect(spyPauseLeadSequences).toHaveBeenCalledTimes(1);
    expect(spyPauseLeadSequences).toHaveBeenCalledWith(5, 10, "lead_converted");
  });

  it("evaluates onboarding triggers scoped to new member and onboarding_journey type", async () => {
    mockLeads = [
      { id: 5, gymId: 10, firstName: "Bob", lastName: "Smith", email: "bob@test.com", phone: null, stage: "intro" },
    ];

    const mod = await import("../routes/leads");
    const handler = findHandler(mod.default as unknown as { stack: StackLayer[] }, "post", /convert/);
    expect(handler).not.toBeNull();

    const req = makeReq({ gymId: "10", leadId: "5" }, {});
    const res = makeRes();
    await handler!(req, res);

    expect(spyEvaluateTriggersForGym).toHaveBeenCalledTimes(1);
    expect(spyEvaluateTriggersForGym).toHaveBeenCalledWith(
      10,
      expect.objectContaining({ onlyMemberId: 42, onlySequenceType: "onboarding_journey" })
    );
  });

  it("pauses lead sequences before evaluating onboarding triggers", async () => {
    const callOrder: string[] = [];
    spyPauseLeadSequences.mockImplementation(async () => { callOrder.push("pause"); return 1; });
    spyEvaluateTriggersForGym.mockImplementation(async () => { callOrder.push("evaluate"); });

    mockLeads = [
      { id: 5, gymId: 10, firstName: "Bob", lastName: "Smith", email: "bob@test.com", phone: null, stage: "intro" },
    ];

    const mod = await import("../routes/leads");
    const handler = findHandler(mod.default as unknown as { stack: StackLayer[] }, "post", /convert/);
    expect(handler).not.toBeNull();

    const req = makeReq({ gymId: "10", leadId: "5" }, {});
    const res = makeRes();
    await handler!(req, res);

    expect(callOrder).toEqual(["pause", "evaluate"]);
  });
});

describe("PATCH /gyms/:gymId/subscriptions/:subscriptionId — sequence exit on cancel/pause", () => {
  it("calls exitMemberSequences when subscription status set to cancelled", async () => {
    mockSubscriptions = [
      { id: 1, gymId: 10, memberId: 42, status: "active", amount: "50.00" },
    ];

    const mod = await import("../routes/billing/subscriptions");
    const handler = findHandler(mod.default as unknown as { stack: StackLayer[] }, "patch", /subscriptions/);
    expect(handler).not.toBeNull();

    const req = makeReq({ gymId: "10", subscriptionId: "1" }, { status: "cancelled" });
    const res = makeRes();
    await handler!(req, res);

    expect(spyExitMemberSequences).toHaveBeenCalledTimes(1);
    expect(spyExitMemberSequences).toHaveBeenCalledWith(42, 10, "member_inactive");
  });

  it("calls exitMemberSequences when subscription status set to paused", async () => {
    mockSubscriptions = [
      { id: 1, gymId: 10, memberId: 42, status: "active", amount: "50.00" },
    ];

    const mod = await import("../routes/billing/subscriptions");
    const handler = findHandler(mod.default as unknown as { stack: StackLayer[] }, "patch", /subscriptions/);
    expect(handler).not.toBeNull();

    const req = makeReq({ gymId: "10", subscriptionId: "1" }, { status: "paused" });
    const res = makeRes();
    await handler!(req, res);

    expect(spyExitMemberSequences).toHaveBeenCalledTimes(1);
    expect(spyExitMemberSequences).toHaveBeenCalledWith(42, 10, "member_inactive");
  });

  it("does NOT call exitMemberSequences when subscription status set to active", async () => {
    mockSubscriptions = [
      { id: 1, gymId: 10, memberId: 42, status: "paused", amount: "50.00" },
    ];

    const mod = await import("../routes/billing/subscriptions");
    const handler = findHandler(mod.default as unknown as { stack: StackLayer[] }, "patch", /subscriptions/);
    expect(handler).not.toBeNull();

    const req = makeReq({ gymId: "10", subscriptionId: "1" }, { status: "active" });
    const res = makeRes();
    await handler!(req, res);

    expect(spyExitMemberSequences).not.toHaveBeenCalled();
  });
});

describe("Stripe webhook handleSubscriptionDeleted — sequence exit on cancel", () => {
  it("calls exitMemberSequences when a subscription is deleted via webhook", async () => {
    mockSubscriptions = [
      { id: 1, gymId: 10, memberId: 42, status: "active", stripeSubscriptionId: "sub_123", cancelledAt: null, amount: "50.00" },
    ];

    const mod = await import("../webhookHandlers");
    const handler = (mod as unknown as { _handleSubscriptionDeleted: (sub: { id: string }) => Promise<void> })._handleSubscriptionDeleted;
    expect(handler).toBeDefined();

    await handler({ id: "sub_123" });

    expect(spyExitMemberSequences).toHaveBeenCalledTimes(1);
    expect(spyExitMemberSequences).toHaveBeenCalledWith(42, 10, "member_inactive");
  });

  it("does NOT call exitMemberSequences when subscription not found in DB", async () => {
    mockSubscriptions = [];

    const mod = await import("../webhookHandlers");
    const handler = (mod as unknown as { _handleSubscriptionDeleted: (sub: { id: string }) => Promise<void> })._handleSubscriptionDeleted;

    await handler({ id: "sub_nonexistent" });

    expect(spyExitMemberSequences).not.toHaveBeenCalled();
  });
});

describe("StripeService.cancelSubscription — sequence exit on immediate cancel", () => {
  it("calls exitMemberSequences when cancelAtPeriodEnd is false", async () => {
    mockSubscriptions = [
      { id: 1, gymId: 10, memberId: 42, status: "active", stripeSubscriptionId: "sub_123", cancelledAt: null, amount: "50.00" },
    ];

    const mod = await import("../stripeService");
    const service = mod.stripeService;

    await service.cancelSubscription(1, 10, false, "Test reason");

    expect(spyExitMemberSequences).toHaveBeenCalledTimes(1);
    expect(spyExitMemberSequences).toHaveBeenCalledWith(42, 10, "member_inactive");
  });

  it("does NOT call exitMemberSequences when cancelAtPeriodEnd is true", async () => {
    mockSubscriptions = [
      { id: 1, gymId: 10, memberId: 42, status: "active", stripeSubscriptionId: "sub_123", cancelledAt: null, amount: "50.00" },
    ];

    const mod = await import("../stripeService");
    const service = mod.stripeService;

    await service.cancelSubscription(1, 10, true, "Test reason");

    expect(spyExitMemberSequences).not.toHaveBeenCalled();
  });
});
