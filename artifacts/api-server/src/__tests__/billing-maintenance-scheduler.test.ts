import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@workspace/db", () => {
  function makeTable(name: string) {
    return new Proxy({}, { get: (_, prop) => ({ _col: true, _table: name, _field: prop }) });
  }

  const gymRows = [
    { id: 1, name: "Gym A" },
    { id: 2, name: "Gym B" },
    { id: 3, name: "Gym C" },
  ];

  const db = {
    select: () => ({
      from: () => ({
        then: (resolve: any) => resolve(gymRows),
        where: () => ({
          then: (resolve: any) => resolve([]),
        }),
      }),
    }),
    _gymRows: gymRows,
  };

  return {
    db,
    gymsTable: makeTable("gyms"),
    billingRecoveryTable: makeTable("billing_recovery"),
    paymentUpdateTokensTable: makeTable("payment_update_tokens"),
    subscriptionsTable: makeTable("subscriptions"),
    membersTable: makeTable("members"),
    billingWebhookEventsTable: makeTable("billing_webhook_events"),
    billingAuditLogsTable: makeTable("billing_audit_logs"),
    gymStaffTable: makeTable("gym_staff"),
    scheduledHoldsTable: makeTable("scheduled_holds"),
    eq: (l: any, r: any) => ({ _type: "eq", left: l, right: r }),
    and: (...c: any[]) => ({ _type: "and", conditions: c }),
    lt: (l: any, r: any) => ({ _type: "lt", left: l, right: r }),
    lte: (l: any, r: any) => ({ _type: "lte", left: l, right: r }),
    gt: (l: any, r: any) => ({ _type: "gt", left: l, right: r }),
    isNull: (c: any) => ({ _type: "isNull", col: c }),
    inArray: (l: any, v: any[]) => ({ _type: "inArray", left: l, values: v }),
    or: (...c: any[]) => ({ _type: "or", conditions: c }),
    sql: Object.assign((() => ({})) as any, { raw: () => ({}) }),
  };
});

vi.mock("../stripeClient", () => ({
  getStripeClient: vi.fn().mockReturnValue({
    subscriptions: {
      update: vi.fn().mockResolvedValue({}),
    },
  }),
}));

const mockCleanupExpiredTokens = vi.fn().mockResolvedValue(0);
const mockArchiveOldResolved = vi.fn().mockResolvedValue(0);
const mockEvaluateGrace = vi.fn().mockResolvedValue({ escalated: 0, errors: 0 });
const mockAuditLog = vi.fn().mockResolvedValue(undefined);

vi.mock("../services/payment-update-token", () => ({
  paymentUpdateTokenService: {
    cleanupExpiredTokens: (...args: any[]) => mockCleanupExpiredTokens(...args),
    createToken: vi.fn(),
    generateToken: vi.fn(),
    validateToken: vi.fn(),
    markUsed: vi.fn(),
    getTokenContext: vi.fn(),
  },
}));

const mockEvaluateAutoSuspensions = vi.fn().mockResolvedValue({ suspended: 0, errors: 0 });

vi.mock("../services/billing-recovery", () => ({
  billingRecoveryService: {
    evaluateGraceDeadlines: (...args: any[]) => mockEvaluateGrace(...args),
    archiveOldResolvedRecoveries: (...args: any[]) => mockArchiveOldResolved(...args),
    evaluateAutoSuspensions: (...args: any[]) => mockEvaluateAutoSuspensions(...args),
    handlePaymentFailure: vi.fn(),
    resolveRecovery: vi.fn(),
    getActiveRecoveries: vi.fn(),
    getMemberRecovery: vi.fn(),
    sendRecoveryNotification: vi.fn(),
  },
  BillingRecoveryService: vi.fn(),
  BILLING_RECOVERY_CONFIG: {
    GRACE_PERIOD_DAYS: 14,
    MIN_NOTIFICATION_INTERVAL_MS: 14400000,
    TOKEN_EXPIRY_HOURS: 72,
    RESOLVED_RETENTION_DAYS: 90,
  },
}));

vi.mock("../services/billing-email", () => ({
  buildPaymentFailedEmail: vi.fn().mockReturnValue({ subject: "test", html: "<p>test</p>", text: "test" }),
  buildGraceExpiredEmail: vi.fn().mockReturnValue({ subject: "test", html: "<p>test</p>", text: "test" }),
  buildPaymentUpdatedEmail: vi.fn().mockReturnValue({ subject: "test", html: "<p>test</p>", text: "test" }),
  sendBillingEmail: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("../billingAuditLogger", () => ({
  billingAuditLogger: {
    log: (...args: any[]) => mockAuditLog(...args),
  },
}));

import { runMaintenanceForAllGyms, MAINTENANCE_INTERVAL_MS, startBillingMaintenanceScheduler, stopBillingMaintenanceScheduler } from "../schedulers/billing-maintenance";

describe("Billing Maintenance Scheduler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    stopBillingMaintenanceScheduler();
    vi.useRealTimers();
  });

  it("runs maintenance for all gyms on invocation", async () => {
    await runMaintenanceForAllGyms();

    expect(mockCleanupExpiredTokens).toHaveBeenCalledTimes(3);
    expect(mockArchiveOldResolved).toHaveBeenCalledTimes(3);
    expect(mockEvaluateGrace).toHaveBeenCalledTimes(3);

    expect(mockCleanupExpiredTokens).toHaveBeenCalledWith(1);
    expect(mockCleanupExpiredTokens).toHaveBeenCalledWith(2);
    expect(mockCleanupExpiredTokens).toHaveBeenCalledWith(3);
  });

  it("processes each gym independently — one gym error does not stop others", async () => {
    mockCleanupExpiredTokens.mockImplementation(async (gymId: number) => {
      if (gymId === 2) throw new Error("DB connection error");
      return 0;
    });

    await runMaintenanceForAllGyms();

    expect(mockEvaluateGrace).toHaveBeenCalledWith(1);
    expect(mockEvaluateGrace).toHaveBeenCalledWith(3);
  });

  it("logs audit entry only when work was done", async () => {
    mockCleanupExpiredTokens.mockResolvedValue(0);
    mockArchiveOldResolved.mockResolvedValue(0);
    mockEvaluateGrace.mockResolvedValue({ escalated: 0, errors: 0 });

    await runMaintenanceForAllGyms();

    expect(mockAuditLog).not.toHaveBeenCalled();
  });

  it("logs audit entry when work was performed", async () => {
    mockCleanupExpiredTokens.mockResolvedValue(2);
    mockArchiveOldResolved.mockResolvedValue(1);
    mockEvaluateGrace.mockResolvedValue({ escalated: 1, errors: 0 });

    await runMaintenanceForAllGyms();

    expect(mockAuditLog).toHaveBeenCalledTimes(3);
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "maintenance.scheduled_run",
        entityType: "system",
        source: "system",
      })
    );
  });

  it("interval constant is 1 hour", () => {
    expect(MAINTENANCE_INTERVAL_MS).toBe(1 * 60 * 60 * 1000);
  });

  it("prevents duplicate scheduler starts", () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    startBillingMaintenanceScheduler();
    startBillingMaintenanceScheduler();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("already running")
    );

    consoleSpy.mockRestore();
  });
});
