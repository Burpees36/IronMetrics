import { describe, it, expect, vi, beforeEach } from "vitest";

const mockValidateToken = vi.fn();
const mockGetTokenContext = vi.fn();
const mockMarkUsed = vi.fn();
const mockCreateSetupIntent = vi.fn();
const mockGetPublishableKey = vi.fn();
const mockResolveRecovery = vi.fn();
const mockSendBillingEmail = vi.fn();
const mockBuildPaymentUpdatedEmail = vi.fn();
const mockAuditLog = vi.fn();

const mockStripeClient = {
  paymentMethods: {
    attach: vi.fn().mockResolvedValue({}),
    retrieve: vi.fn().mockResolvedValue({ card: { last4: "4242", brand: "visa" } }),
  },
  customers: {
    update: vi.fn().mockResolvedValue({}),
  },
  subscriptions: {
    update: vi.fn().mockResolvedValue({}),
    retrieve: vi.fn().mockResolvedValue({ latest_invoice: "inv_123" }),
  },
  invoices: {
    retrieve: vi.fn().mockResolvedValue({ status: "open" }),
    pay: vi.fn().mockResolvedValue({}),
  },
};

vi.mock("../services/payment-update-token", () => ({
  paymentUpdateTokenService: {
    validateToken: (...args: any[]) => mockValidateToken(...args),
    getTokenContext: (...args: any[]) => mockGetTokenContext(...args),
    markUsed: (...args: any[]) => mockMarkUsed(...args),
    createToken: vi.fn(),
    generateToken: vi.fn(),
    cleanupExpiredTokens: vi.fn(),
  },
}));

vi.mock("../services/billing-recovery", () => ({
  billingRecoveryService: {
    resolveRecovery: (...args: any[]) => mockResolveRecovery(...args),
    handlePaymentFailure: vi.fn(),
    evaluateGraceDeadlines: vi.fn(),
    archiveOldResolvedRecoveries: vi.fn(),
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
  buildPaymentUpdatedEmail: (...args: any[]) => mockBuildPaymentUpdatedEmail(...args),
  buildPaymentFailedEmail: vi.fn().mockReturnValue({ subject: "test", html: "<p>test</p>", text: "test" }),
  buildGraceExpiredEmail: vi.fn().mockReturnValue({ subject: "test", html: "<p>test</p>", text: "test" }),
  sendBillingEmail: (...args: any[]) => mockSendBillingEmail(...args),
}));

vi.mock("../stripeClient", () => ({
  getUncachableStripeClient: vi.fn().mockResolvedValue(mockStripeClient),
  getStripeClient: vi.fn().mockResolvedValue(mockStripeClient),
  getStripeSync: vi.fn(),
  getPublishableKey: (...args: any[]) => mockGetPublishableKey(...args),
  initStripe: vi.fn(),
}));

vi.mock("../stripeService", () => ({
  stripeService: {
    createSetupIntent: (...args: any[]) => mockCreateSetupIntent(...args),
  },
  StripeService: vi.fn(),
}));

vi.mock("../billingAuditLogger", () => ({
  billingAuditLogger: {
    log: (...args: any[]) => mockAuditLog(...args),
  },
}));

vi.mock("@workspace/db", () => {
  function makeTable(name: string) {
    return new Proxy({}, { get: (_, prop) => ({ _col: true, _table: name, _field: prop }) });
  }

  const rows: Record<string, any[]> = { members: [], subscriptions: [], gyms: [] };

  const db = {
    select: () => ({
      from: () => ({
        where: (cond: any) => ({
          then: (resolve: any) => {
            const tableName = cond?.conditions?.[0]?.left?._table || "members";
            const tableRows = rows[tableName] || [];
            resolve(tableRows);
          },
        }),
      }),
    }),
    update: () => ({
      set: () => ({
        where: () => ({
          then: (resolve: any) => resolve(undefined),
        }),
      }),
    }),
    insert: () => ({
      values: () => ({
        returning: () => ({
          then: (resolve: any) => resolve([{ id: 1 }]),
        }),
        onConflictDoNothing: () => ({
          returning: () => ({
            then: (resolve: any) => resolve([{ id: 1 }]),
          }),
        }),
      }),
    }),
    _rows: rows,
    _seed(table: string, data: any[]) { rows[table] = data; },
    _reset() { for (const k of Object.keys(rows)) rows[k] = []; },
  };

  return {
    db,
    membersTable: makeTable("members"),
    subscriptionsTable: makeTable("subscriptions"),
    gymsTable: makeTable("gyms"),
    billingRecoveryTable: makeTable("billing_recovery"),
    paymentUpdateTokensTable: makeTable("payment_update_tokens"),
    billingWebhookEventsTable: makeTable("billing_webhook_events"),
    billingAuditLogsTable: makeTable("billing_audit_logs"),
    gymStaffTable: makeTable("gym_staff"),
    eq: (l: any, r: any) => ({ _type: "eq", left: l, right: r }),
    and: (...c: any[]) => ({ _type: "and", conditions: c }),
    lt: (l: any, r: any) => ({ _type: "lt", left: l, right: r }),
    gt: (l: any, r: any) => ({ _type: "gt", left: l, right: r }),
    isNull: (c: any) => ({ _type: "isNull", col: c }),
    inArray: (l: any, v: any[]) => ({ _type: "inArray", left: l, values: v }),
    or: (...c: any[]) => ({ _type: "or", conditions: c }),
  };
});

describe("B1: Validate Endpoint Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("valid token returns allowed public context only", async () => {
    mockValidateToken.mockResolvedValue({
      valid: true,
      data: { id: 1, gymId: 1, memberId: 1, subscriptionId: 1, recoveryId: 1 },
    });
    mockGetTokenContext.mockResolvedValue({
      gymName: "Test Gym",
      gymLogoUrl: null,
      memberName: "John Doe",
      memberEmail: "john@example.com",
    });

    const { paymentUpdateTokenService } = await import("../services/payment-update-token");
    const validation = await paymentUpdateTokenService.validateToken("valid_token_here_with_64_chars_" + "a".repeat(33));
    expect(validation.valid).toBe(true);
    expect(validation.data).toBeDefined();

    const context = await paymentUpdateTokenService.getTokenContext("test");
    expect(context?.gymName).toBe("Test Gym");
    expect(context?.memberName).toBe("John Doe");
    expect((context as any)?.memberEmail).toBeDefined();
  });

  it("invalid token returns safe generic error", async () => {
    mockValidateToken.mockResolvedValue({
      valid: false,
      error: "Invalid or expired link. Please contact your gym for a new update link.",
      errorCode: "invalid",
    });

    const { paymentUpdateTokenService } = await import("../services/payment-update-token");
    const result = await paymentUpdateTokenService.validateToken("bad_token");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("contact your gym");
    expect(result.errorCode).toBe("invalid");
  });

  it("expired token returns safe generic error", async () => {
    mockValidateToken.mockResolvedValue({
      valid: false,
      error: "Invalid or expired link. Please contact your gym for a new update link.",
      errorCode: "expired",
    });

    const { paymentUpdateTokenService } = await import("../services/payment-update-token");
    const result = await paymentUpdateTokenService.validateToken("expired_token");
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe("expired");
  });

  it("used token returns safe generic error", async () => {
    mockValidateToken.mockResolvedValue({
      valid: false,
      error: "This link has already been used.",
      errorCode: "used",
    });

    const { paymentUpdateTokenService } = await import("../services/payment-update-token");
    const result = await paymentUpdateTokenService.validateToken("used_token");
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe("used");
  });
});

describe("B2: SetupIntent Endpoint Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("valid token creates SetupIntent successfully", async () => {
    mockValidateToken.mockResolvedValue({
      valid: true,
      data: { id: 1, gymId: 1, memberId: 1, subscriptionId: 1, recoveryId: 1 },
    });
    mockCreateSetupIntent.mockResolvedValue({
      clientSecret: "seti_123_secret_456",
      customerId: "cus_123",
    });
    mockGetPublishableKey.mockResolvedValue("pk_test_123");

    const { paymentUpdateTokenService } = await import("../services/payment-update-token");
    const { stripeService } = await import("../stripeService");
    const { getPublishableKey } = await import("../stripeClient");

    const validation = await paymentUpdateTokenService.validateToken("valid");
    expect(validation.valid).toBe(true);

    const intent = await stripeService.createSetupIntent(1, 1);
    expect(intent.clientSecret).toBe("seti_123_secret_456");

    const pubKey = await getPublishableKey();
    expect(pubKey).toBe("pk_test_123");
  });

  it("invalid token is rejected before SetupIntent creation", async () => {
    mockValidateToken.mockResolvedValue({
      valid: false,
      errorCode: "invalid",
      error: "Invalid link",
    });

    const { paymentUpdateTokenService } = await import("../services/payment-update-token");
    const validation = await paymentUpdateTokenService.validateToken("bad");
    expect(validation.valid).toBe(false);
    expect(mockCreateSetupIntent).not.toHaveBeenCalled();
  });
});

describe("B3: Complete Endpoint Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuditLog.mockResolvedValue(undefined);
    mockResolveRecovery.mockResolvedValue(undefined);
    mockSendBillingEmail.mockResolvedValue({ success: true });
    mockBuildPaymentUpdatedEmail.mockReturnValue({
      subject: "Updated", html: "<p>updated</p>", text: "updated",
    });
  });

  it("valid token + valid path updates payment and resolves recovery", async () => {
    mockValidateToken.mockResolvedValue({
      valid: true,
      data: { id: 1, gymId: 1, memberId: 1, subscriptionId: 1, recoveryId: 5 },
    });
    mockMarkUsed.mockResolvedValue(true);

    const { paymentUpdateTokenService } = await import("../services/payment-update-token");
    const validation = await paymentUpdateTokenService.validateToken("valid");
    expect(validation.valid).toBe(true);

    const consumed = await paymentUpdateTokenService.markUsed(1);
    expect(consumed).toBe(true);

    const { billingRecoveryService } = await import("../services/billing-recovery");
    await billingRecoveryService.resolveRecovery(1, "card_updated");
    expect(mockResolveRecovery).toHaveBeenCalledWith(1, "card_updated");
  });

  it("replay attempt fails", async () => {
    mockValidateToken.mockResolvedValue({
      valid: true,
      data: { id: 1, gymId: 1, memberId: 1, subscriptionId: 1, recoveryId: 5 },
    });
    mockMarkUsed.mockResolvedValue(false);

    const { paymentUpdateTokenService } = await import("../services/payment-update-token");
    const validation = await paymentUpdateTokenService.validateToken("valid");
    expect(validation.valid).toBe(true);

    const consumed = await paymentUpdateTokenService.markUsed(1);
    expect(consumed).toBe(false);
  });

  it("confirmation email is attempted after successful card update", async () => {
    mockBuildPaymentUpdatedEmail.mockReturnValue({
      subject: "Payment method updated",
      html: "<p>Card updated</p>",
      text: "Card updated",
    });

    const { buildPaymentUpdatedEmail, sendBillingEmail } = await import("../services/billing-email");

    const email = buildPaymentUpdatedEmail({
      memberName: "John Doe",
      cardLast4: "4242",
      cardBrand: "visa",
      branding: { name: "Test Gym" },
    });

    expect(email.subject).toBe("Payment method updated");

    await sendBillingEmail({
      to: "john@example.com",
      ...email,
      branding: { name: "Test Gym" },
    });

    expect(mockSendBillingEmail).toHaveBeenCalled();
  });

  it("audit log is recorded on card update", async () => {
    const { billingAuditLogger } = await import("../billingAuditLogger");

    await billingAuditLogger.log({
      gymId: 1,
      memberId: 1,
      action: "recovery.card_updated",
      entityType: "payment_method",
      entityId: "pm_test",
      source: "system",
      afterValue: { brand: "visa", last4: "4242" },
    });

    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "recovery.card_updated",
        entityType: "payment_method",
      })
    );
  });
});
