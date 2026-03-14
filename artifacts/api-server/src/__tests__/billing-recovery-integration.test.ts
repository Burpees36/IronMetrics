import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("drizzle-orm", () => {
  return {
    eq: (left: any, right: any) => ({ _type: "eq", left, right }),
    and: (...conditions: any[]) => ({ _type: "and", conditions }),
    lt: (left: any, right: any) => ({ _type: "lt", left, right }),
    gt: (left: any, right: any) => ({ _type: "gt", left, right }),
    isNull: (col: any) => ({ _type: "isNull", col }),
    inArray: (left: any, values: any[]) => ({ _type: "inArray", left, values }),
    or: (...conditions: any[]) => ({ _type: "or", conditions }),
  };
});

vi.mock("@workspace/db", () => {
  const rows: Record<string, any[]> = {
    billing_recovery: [], payment_update_tokens: [], subscriptions: [],
    members: [], gyms: [], billing_webhook_events: [],
  };

  let idCounters: Record<string, number> = {};

  function nextId(table: string) {
    idCounters[table] = (idCounters[table] || 0) + 1;
    return idCounters[table];
  }

  function resolveField(colRef: any): string {
    if (colRef && colRef._field) return colRef._field as string;
    return "id";
  }

  function matchesCondition(row: any, condition: any): boolean {
    if (!condition) return true;
    if (condition._type === "eq") return row[resolveField(condition.left)] === condition.right;
    if (condition._type === "and") return condition.conditions.every((c: any) => matchesCondition(row, c));
    if (condition._type === "lt") {
      const v = row[resolveField(condition.left)], r = condition.right;
      return v instanceof Date && r instanceof Date ? v.getTime() < r.getTime() : v < r;
    }
    if (condition._type === "gt") {
      const v = row[resolveField(condition.left)], r = condition.right;
      return v instanceof Date && r instanceof Date ? v.getTime() > r.getTime() : v > r;
    }
    if (condition._type === "isNull") return row[resolveField(condition.col)] == null;
    if (condition._type === "inArray") return condition.values.includes(row[resolveField(condition.left)]);
    if (condition._type === "or") return condition.conditions.some((c: any) => matchesCondition(row, c));
    return true;
  }

  function makeTable(name: string) {
    const cols: Record<string, any> = {};
    return new Proxy({ _name: name }, {
      get(_, prop) {
        if (prop === "_name") return name;
        if (prop === "$inferSelect") return {};
        const key = String(prop);
        if (!cols[key]) cols[key] = { _col: true, _table: name, _field: key };
        return cols[key];
      },
    });
  }

  const db: any = {
    select(fields?: any) {
      return {
        from(table: any) {
          const tableName = table._name;
          let cond: any = null;
          const chain: any = {
            where(c: any) { cond = c; return chain; },
            innerJoin() { return chain; },
            then(resolve: any) {
              resolve((rows[tableName] || []).filter((r: any) => matchesCondition(r, cond)));
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
            onConflictDoNothing() {
              return { returning() {
                return { then(resolve: any) {
                  const existing = (rows[tn] || []).find((r: any) => r.stripeEventId && r.stripeEventId === vals.stripeEventId);
                  if (existing) { resolve([]); return; }
                  const nr = { id: nextId(tn), ...vals, createdAt: new Date() };
                  rows[tn].push(nr); resolve([nr]);
                }};
              }};
            },
            returning() {
              return { then(resolve: any) {
                const nr = { id: nextId(tn), ...vals, createdAt: new Date() };
                rows[tn].push(nr); resolve([nr]);
              }};
            },
          };
        },
      };
    },
    update(table: any) {
      const tn = table._name;
      return {
        set(vals: any) {
          return {
            where(c: any) {
              return {
                returning() {
                  return { then(resolve: any) {
                    const result: any[] = [];
                    for (const row of rows[tn] || []) {
                      if (matchesCondition(row, c)) { Object.assign(row, vals); result.push(row); }
                    }
                    resolve(result);
                  }};
                },
                then(resolve: any) {
                  for (const row of rows[tn] || []) {
                    if (matchesCondition(row, c)) Object.assign(row, vals);
                  }
                  resolve(undefined);
                },
              };
            },
          };
        },
      };
    },
    delete(table: any) {
      const tn = table._name;
      return {
        where(c: any) {
          return { returning() {
            return { then(resolve: any) {
              const result: any[] = [];
              rows[tn] = (rows[tn] || []).filter((row: any) => {
                if (matchesCondition(row, c)) { result.push(row); return false; }
                return true;
              });
              resolve(result);
            }};
          }};
        },
      };
    },
    _rows: rows,
    _reset() { for (const k of Object.keys(rows)) rows[k] = []; idCounters = {}; },
  };

  return {
    db,
    billingRecoveryTable: makeTable("billing_recovery"),
    paymentUpdateTokensTable: makeTable("payment_update_tokens"),
    subscriptionsTable: makeTable("subscriptions"),
    membersTable: makeTable("members"),
    gymsTable: makeTable("gyms"),
    billingWebhookEventsTable: makeTable("billing_webhook_events"),
    billingAuditLogsTable: makeTable("billing_audit_logs"),
    gymStaffTable: makeTable("gym_staff"),
  };
});

vi.mock("../billingAuditLogger", () => ({
  billingAuditLogger: {
    log: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../services/billing-email", () => ({
  buildPaymentFailedEmail: vi.fn().mockReturnValue({
    subject: "Payment failed", html: "<p>test</p>", text: "test",
  }),
  buildGraceExpiredEmail: vi.fn().mockReturnValue({
    subject: "FINAL NOTICE", html: "<p>final</p>", text: "final",
  }),
  buildPaymentUpdatedEmail: vi.fn().mockReturnValue({
    subject: "Updated", html: "<p>updated</p>", text: "updated",
  }),
  sendBillingEmail: vi.fn().mockResolvedValue({ success: true }),
}));

import { db } from "@workspace/db";
import { BillingRecoveryService, BILLING_RECOVERY_CONFIG } from "../services/billing-recovery";
import { PaymentUpdateTokenService } from "../services/payment-update-token";
import { billingAuditLogger } from "../billingAuditLogger";
import { sendBillingEmail } from "../services/billing-email";

const mockDb = db as any;

function resetRows() {
  mockDb._reset();
}

function seedTestData() {
  mockDb._rows.gyms = [
    { id: 1, name: "Gym A", ownerId: "user-owner-1", fromEmail: "a@gym.com", fromName: "Gym A", logoUrl: null, email: "a@gym.com", phone: "555-1111" },
    { id: 2, name: "Gym B", ownerId: "user-owner-2", fromEmail: "b@gym.com", fromName: "Gym B", logoUrl: null, email: "b@gym.com", phone: "555-2222" },
  ];
  mockDb._rows.members = [
    { id: 1, gymId: 1, firstName: "John", lastName: "Doe", email: "john@example.com", stripeCustomerId: "cus_123", status: "active" },
    { id: 2, gymId: 1, firstName: "Jane", lastName: "Smith", email: "jane@example.com", stripeCustomerId: "cus_456", status: "active" },
    { id: 3, gymId: 2, firstName: "Bob", lastName: "Jones", email: "bob@example.com", stripeCustomerId: "cus_789", status: "active" },
  ];
  mockDb._rows.subscriptions = [
    { id: 1, gymId: 1, memberId: 1, stripeSubscriptionId: "sub_1", status: "active", failedPayments: 0, memberName: "John Doe", planName: "Monthly" },
    { id: 2, gymId: 1, memberId: 2, stripeSubscriptionId: "sub_2", status: "active", failedPayments: 0, memberName: "Jane Smith", planName: "Monthly" },
    { id: 3, gymId: 2, memberId: 3, stripeSubscriptionId: "sub_3", status: "active", failedPayments: 0, memberName: "Bob Jones", planName: "Annual" },
  ];
}

describe("A1: Webhook Idempotency", () => {
  beforeEach(() => {
    resetRows();
    seedTestData();
    vi.clearAllMocks();
  });

  it("duplicate payment failure does not create duplicate active recovery", async () => {
    const service = new BillingRecoveryService();
    await service.handlePaymentFailure({
      subscriptionId: 1, gymId: 1, memberId: 1,
      stripeSubscriptionId: "sub_1", amountDue: 49.99,
    });
    await service.handlePaymentFailure({
      subscriptionId: 1, gymId: 1, memberId: 1,
      stripeSubscriptionId: "sub_1", amountDue: 49.99,
    });
    const active = mockDb._rows.billing_recovery.filter((r: any) => r.subscriptionId === 1 && r.status === "active");
    expect(active).toHaveLength(1);
  });

  it("duplicate payment failure increments failedAttempts", async () => {
    const service = new BillingRecoveryService();
    await service.handlePaymentFailure({
      subscriptionId: 1, gymId: 1, memberId: 1,
      stripeSubscriptionId: "sub_1", amountDue: 49.99,
    });
    mockDb._rows.billing_recovery[0].lastNotifiedAt = new Date(Date.now() - 5 * 60 * 60 * 1000);
    await service.handlePaymentFailure({
      subscriptionId: 1, gymId: 1, memberId: 1,
      stripeSubscriptionId: "sub_1", amountDue: 59.99,
    });
    expect(mockDb._rows.billing_recovery[0].failedAttempts).toBe(2);
    expect(mockDb._rows.billing_recovery[0].amountDue).toBe("59.99");
  });

  it("skips notification within dedup window", async () => {
    const service = new BillingRecoveryService();
    await service.handlePaymentFailure({
      subscriptionId: 1, gymId: 1, memberId: 1,
      stripeSubscriptionId: "sub_1", amountDue: 49.99,
    });
    const emailCount = (sendBillingEmail as any).mock.calls.length;
    mockDb._rows.billing_recovery[0].lastNotifiedAt = new Date();
    await service.handlePaymentFailure({
      subscriptionId: 1, gymId: 1, memberId: 1,
      stripeSubscriptionId: "sub_1", amountDue: 49.99,
    });
    expect((sendBillingEmail as any).mock.calls.length).toBe(emailCount);
  });

  it("payment_succeeded resolves the correct active recovery", async () => {
    const service = new BillingRecoveryService();
    await service.handlePaymentFailure({
      subscriptionId: 1, gymId: 1, memberId: 1,
      stripeSubscriptionId: "sub_1", amountDue: 49.99,
    });
    await service.handlePaymentFailure({
      subscriptionId: 2, gymId: 1, memberId: 2,
      stripeSubscriptionId: "sub_2", amountDue: 99.99,
    });

    expect(mockDb._rows.billing_recovery).toHaveLength(2);
    await service.resolveRecovery(1, "payment_succeeded");

    const sub1 = mockDb._rows.billing_recovery.find((r: any) => r.subscriptionId === 1);
    const sub2 = mockDb._rows.billing_recovery.find((r: any) => r.subscriptionId === 2);
    expect(sub1.status).toBe("resolved");
    expect(sub1.resolvedReason).toBe("payment_succeeded");
    expect(sub2.status).toBe("active");
  });

  it("subscription_reactivated resolves the correct active recovery", async () => {
    const service = new BillingRecoveryService();
    await service.handlePaymentFailure({
      subscriptionId: 1, gymId: 1, memberId: 1,
      stripeSubscriptionId: "sub_1", amountDue: 49.99,
    });
    await service.resolveRecovery(1, "subscription_reactivated");
    expect(mockDb._rows.billing_recovery[0].status).toBe("resolved");
    expect(mockDb._rows.billing_recovery[0].resolvedReason).toBe("subscription_reactivated");
  });

  it("recovery failure does not break webhook processing path", async () => {
    const service = new BillingRecoveryService();
    const result = await service.sendRecoveryNotification(99999, 1, 1, 1);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Recovery record not found");
  });
});

describe("A2: Recovery State Transitions", () => {
  beforeEach(() => {
    resetRows();
    seedTestData();
    vi.clearAllMocks();
  });

  it("first payment failure creates active recovery with grace deadline", async () => {
    const service = new BillingRecoveryService();
    await service.handlePaymentFailure({
      subscriptionId: 1, gymId: 1, memberId: 1,
      stripeSubscriptionId: "sub_1", amountDue: 49.99,
    });
    const recovery = mockDb._rows.billing_recovery[0];
    expect(recovery.status).toBe("active");
    expect(recovery.failedAttempts).toBe(1);
    expect(recovery.gymId).toBe(1);
    expect(recovery.graceDeadline).toBeInstanceOf(Date);
    const expected = Date.now() + BILLING_RECOVERY_CONFIG.GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;
    expect(Math.abs(recovery.graceDeadline.getTime() - expected)).toBeLessThan(5000);
  });

  it("grace evaluation moves overdue recovery to grace_expired", async () => {
    const service = new BillingRecoveryService();
    await service.handlePaymentFailure({
      subscriptionId: 1, gymId: 1, memberId: 1,
      stripeSubscriptionId: "sub_1", amountDue: 49.99,
    });
    mockDb._rows.billing_recovery[0].graceDeadline = new Date(Date.now() - 1000);
    const result = await service.evaluateGraceDeadlines(1);
    expect(result.escalated).toBe(1);
    expect(mockDb._rows.billing_recovery[0].status).toBe("grace_expired");
  });

  it("grace evaluation sends final warning email and audit log", async () => {
    const service = new BillingRecoveryService();
    await service.handlePaymentFailure({
      subscriptionId: 1, gymId: 1, memberId: 1,
      stripeSubscriptionId: "sub_1", amountDue: 49.99,
    });
    vi.clearAllMocks();
    mockDb._rows.billing_recovery[0].graceDeadline = new Date(Date.now() - 1000);
    await service.evaluateGraceDeadlines(1);
    expect(sendBillingEmail).toHaveBeenCalled();
    expect(billingAuditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "recovery.grace_expired" })
    );
    expect(billingAuditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "recovery.final_warning_sent" })
    );
  });

  it("resolved recovery is not returned in active queries", async () => {
    const service = new BillingRecoveryService();
    await service.handlePaymentFailure({
      subscriptionId: 1, gymId: 1, memberId: 1,
      stripeSubscriptionId: "sub_1", amountDue: 49.99,
    });
    await service.resolveRecovery(1, "payment_succeeded");
    const active = await service.getActiveRecoveries(1);
    expect(active).toHaveLength(0);
  });

  it("both active and grace_expired appear in staff queries", async () => {
    const service = new BillingRecoveryService();
    await service.handlePaymentFailure({
      subscriptionId: 1, gymId: 1, memberId: 1,
      stripeSubscriptionId: "sub_1", amountDue: 49.99,
    });
    await service.handlePaymentFailure({
      subscriptionId: 2, gymId: 1, memberId: 2,
      stripeSubscriptionId: "sub_2", amountDue: 99.99,
    });
    mockDb._rows.billing_recovery[0].graceDeadline = new Date(Date.now() - 1000);
    await service.evaluateGraceDeadlines(1);

    const all = mockDb._rows.billing_recovery.filter(
      (r: any) => r.gymId === 1 && (r.status === "active" || r.status === "grace_expired")
    );
    expect(all).toHaveLength(2);
    expect(all.map((r: any) => r.status).sort()).toEqual(["active", "grace_expired"]);
  });
});

describe("A3: Token Security / Atomicity", () => {
  beforeEach(() => {
    resetRows();
    seedTestData();
    vi.clearAllMocks();
  });

  const tokenService = new PaymentUpdateTokenService();

  it("rejects invalid token", async () => {
    const result = await tokenService.validateToken("short");
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe("invalid");
  });

  it("rejects expired token", async () => {
    mockDb._rows.payment_update_tokens.push({
      id: 1, token: "a".repeat(64), gymId: 1, memberId: 1, subscriptionId: 1,
      recoveryId: null, expiresAt: new Date(Date.now() - 1000), usedAt: null,
    });
    const result = await tokenService.validateToken("a".repeat(64));
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe("expired");
  });

  it("rejects used token", async () => {
    mockDb._rows.payment_update_tokens.push({
      id: 1, token: "b".repeat(64), gymId: 1, memberId: 1, subscriptionId: 1,
      recoveryId: null, expiresAt: new Date(Date.now() + 86400000), usedAt: new Date(),
    });
    const result = await tokenService.validateToken("b".repeat(64));
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe("used");
  });

  it("markUsed consumes token atomically — second call returns false", async () => {
    mockDb._rows.payment_update_tokens.push({
      id: 1, token: "c".repeat(64), gymId: 1, memberId: 1, subscriptionId: 1,
      recoveryId: null, expiresAt: new Date(Date.now() + 86400000), usedAt: null,
    });
    const first = await tokenService.markUsed(1);
    expect(first).toBe(true);
    expect(mockDb._rows.payment_update_tokens[0].usedAt).toBeInstanceOf(Date);

    const second = await tokenService.markUsed(1);
    expect(second).toBe(false);
  });

  it("replay attempt is rejected after first success", async () => {
    mockDb._rows.payment_update_tokens.push({
      id: 1, token: "d".repeat(64), gymId: 1, memberId: 1, subscriptionId: 1,
      recoveryId: null, expiresAt: new Date(Date.now() + 86400000), usedAt: null,
    });
    await tokenService.markUsed(1);
    const result = await tokenService.validateToken("d".repeat(64));
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe("used");
  });

  it("token creation rejects mismatched gym/member/subscription ownership", async () => {
    await expect(
      tokenService.createToken({ gymId: 1, memberId: 1, subscriptionId: 3 })
    ).rejects.toThrow("Subscription does not belong to the specified member and gym");
  });

  it("token creation succeeds with valid ownership", async () => {
    const result = await tokenService.createToken({ gymId: 1, memberId: 1, subscriptionId: 1 });
    expect(result.token).toHaveLength(64);
    expect(result.expiresAt).toBeInstanceOf(Date);
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});

describe("A4: RBAC Permission Model", () => {
  it("owner has all billing permissions", async () => {
    const { getPermissionsForRole } = await import("../middlewares/billingRbac");
    const perms = getPermissionsForRole("owner");
    expect(perms).toContain("billing.read");
    expect(perms).toContain("billing.create_subscription");
    expect(perms).toContain("billing.issue_refund");
    expect(perms).toContain("billing.view_audit_logs");
  });

  it("admin has full billing permissions", async () => {
    const { getPermissionsForRole } = await import("../middlewares/billingRbac");
    const perms = getPermissionsForRole("admin");
    expect(perms).toContain("billing.read");
    expect(perms).toContain("billing.create_subscription");
    expect(perms).toContain("billing.issue_refund");
  });

  it("analyst can read but cannot mutate", async () => {
    const { getPermissionsForRole } = await import("../middlewares/billingRbac");
    const perms = getPermissionsForRole("analyst");
    expect(perms).toContain("billing.read");
    expect(perms).not.toContain("billing.create_subscription");
    expect(perms).not.toContain("billing.issue_refund");
  });

  it("coach has no billing permissions", async () => {
    const { getPermissionsForRole } = await import("../middlewares/billingRbac");
    expect(getPermissionsForRole("coach")).toHaveLength(0);
  });

  it("front_desk can read and create subscriptions but cannot refund", async () => {
    const { getPermissionsForRole } = await import("../middlewares/billingRbac");
    const perms = getPermissionsForRole("front_desk");
    expect(perms).toContain("billing.read");
    expect(perms).toContain("billing.create_subscription");
    expect(perms).not.toContain("billing.issue_refund");
    expect(perms).not.toContain("billing.edit_plan");
  });

  it("unknown role has no permissions", async () => {
    const { getPermissionsForRole } = await import("../middlewares/billingRbac");
    expect(getPermissionsForRole("unknown")).toHaveLength(0);
  });
});

describe("A5: Maintenance / Lifecycle — Multi-Tenant Isolation", () => {
  beforeEach(() => {
    resetRows();
    seedTestData();
    vi.clearAllMocks();
  });

  it("cleanupExpiredTokens only affects the requested gym", async () => {
    const tokenService = new PaymentUpdateTokenService();
    const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    mockDb._rows.payment_update_tokens = [
      { id: 1, token: "x".repeat(64), gymId: 1, memberId: 1, subscriptionId: 1, recoveryId: null, expiresAt: oldDate, usedAt: oldDate },
      { id: 2, token: "y".repeat(64), gymId: 2, memberId: 3, subscriptionId: 3, recoveryId: null, expiresAt: oldDate, usedAt: oldDate },
      { id: 3, token: "z".repeat(64), gymId: 1, memberId: 1, subscriptionId: 1, recoveryId: null, expiresAt: new Date(Date.now() + 86400000), usedAt: null },
    ];
    const deleted = await tokenService.cleanupExpiredTokens(1);
    expect(deleted).toBe(1);
    expect(mockDb._rows.payment_update_tokens).toHaveLength(2);
    expect(mockDb._rows.payment_update_tokens.find((t: any) => t.gymId === 2)).toBeTruthy();
  });

  it("archiveOldResolvedRecoveries only affects the requested gym", async () => {
    const service = new BillingRecoveryService();
    const oldDate = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000);
    mockDb._rows.billing_recovery = [
      { id: 1, gymId: 1, memberId: 1, subscriptionId: 1, status: "resolved", resolvedAt: oldDate, failedAttempts: 1 },
      { id: 2, gymId: 2, memberId: 3, subscriptionId: 3, status: "resolved", resolvedAt: oldDate, failedAttempts: 1 },
      { id: 3, gymId: 1, memberId: 2, subscriptionId: 2, status: "active", failedAttempts: 1 },
    ];
    const archived = await service.archiveOldResolvedRecoveries(1);
    expect(archived).toBe(1);
    expect(mockDb._rows.billing_recovery).toHaveLength(2);
    expect(mockDb._rows.billing_recovery.find((r: any) => r.gymId === 2 && r.status === "resolved")).toBeTruthy();
  });

  it("grace evaluation only affects the requested gym", async () => {
    const service = new BillingRecoveryService();
    const expiredDeadline = new Date(Date.now() - 1000);
    mockDb._rows.billing_recovery = [
      { id: 1, gymId: 1, memberId: 1, subscriptionId: 1, status: "active", graceDeadline: expiredDeadline, failedAttempts: 2, amountDue: "49.99" },
      { id: 2, gymId: 2, memberId: 3, subscriptionId: 3, status: "active", graceDeadline: expiredDeadline, failedAttempts: 1, amountDue: "99.99" },
    ];
    const result = await service.evaluateGraceDeadlines(1);
    expect(result.escalated).toBe(1);
    expect(mockDb._rows.billing_recovery.find((r: any) => r.gymId === 1)!.status).toBe("grace_expired");
    expect(mockDb._rows.billing_recovery.find((r: any) => r.gymId === 2)!.status).toBe("active");
  });

  it("getMemberRecovery returns null for wrong gym", async () => {
    const service = new BillingRecoveryService();
    mockDb._rows.billing_recovery = [
      { id: 1, gymId: 1, memberId: 1, subscriptionId: 1, status: "active", failedAttempts: 1, amountDue: "49.99" },
    ];
    const result = await service.getMemberRecovery(1, 2);
    expect(result).toBeNull();
  });
});
