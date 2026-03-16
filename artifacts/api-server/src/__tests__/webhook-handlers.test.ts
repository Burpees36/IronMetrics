import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

let mockSubscriptions: any[] = [];
let mockPayments: any[] = [];
let mockRefunds: any[] = [];
let mockMembers: any[] = [];
let mockWebhookEvents: any[] = [];
let idCounter = 100;

vi.mock("../stripeClient", () => ({
  getStripeSync: vi.fn(),
  getUncachableStripeClient: vi.fn().mockResolvedValue({
    webhooks: {
      constructEvent: (payload: Buffer, sig: string, secret: string) => {
        return JSON.parse(payload.toString());
      },
    },
  }),
}));

vi.mock("../billingAuditLogger", () => ({
  billingAuditLogger: {
    log: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../services/billing-recovery", () => ({
  billingRecoveryService: {
    handlePaymentFailure: vi.fn().mockResolvedValue(undefined),
    resolveRecovery: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: (left: any, right: any) => ({ _type: "eq", left, right }),
  and: (...conditions: any[]) => ({ _type: "and", conditions }),
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
  function getTableData(tn: string): any[] {
    if (tn === "subscriptions") return mockSubscriptions;
    if (tn === "payments") return mockPayments;
    if (tn === "refunds") return mockRefunds;
    if (tn === "members") return mockMembers;
    if (tn === "billing_webhook_events") return mockWebhookEvents;
    return [];
  }
  const db: any = {
    select() {
      return {
        from(table: any) {
          const tn = table._name;
          let cond: any = null;
          const chain: any = {
            where(c: any) { cond = c; return chain; },
            then(resolve: any) {
              resolve(getTableData(tn).filter((r: any) => matchesCondition(r, cond)));
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
              return {
                returning() {
                  return {
                    then(resolve: any) {
                      const existing = getTableData(tn).find((r: any) => r.stripeEventId === vals.stripeEventId);
                      if (existing) {
                        resolve([]);
                      } else {
                        const nr = { id: ++idCounter, ...vals };
                        getTableData(tn).push(nr);
                        resolve([nr]);
                      }
                    },
                  };
                },
              };
            },
            returning() {
              return {
                then(resolve: any) {
                  const nr = { id: ++idCounter, ...vals };
                  getTableData(tn).push(nr);
                  resolve([nr]);
                },
              };
            },
            then(resolve: any) {
              const nr = { id: ++idCounter, ...vals };
              getTableData(tn).push(nr);
              resolve(undefined);
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
                then(resolve: any) {
                  for (const row of getTableData(tn)) {
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
  };
  return {
    db,
    subscriptionsTable: makeTable("subscriptions"),
    paymentsTable: makeTable("payments"),
    refundsTable: makeTable("refunds"),
    membersTable: makeTable("members"),
    billingWebhookEventsTable: makeTable("billing_webhook_events"),
    invoicesTable: makeTable("invoices"),
  };
});

import { WebhookHandlers } from "../webhookHandlers";
import { billingRecoveryService } from "../services/billing-recovery";

describe("WebhookHandlers", () => {
  beforeEach(() => {
    mockSubscriptions = [];
    mockPayments = [];
    mockRefunds = [];
    mockMembers = [];
    mockWebhookEvents = [];
    idCounter = 100;
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  function makeEvent(type: string, data: any) {
    return Buffer.from(JSON.stringify({
      id: `evt_${Date.now()}_${Math.random()}`,
      type,
      data: { object: data },
    }));
  }

  describe("idempotency via claimEvent", () => {
    it("processes event on first receipt", async () => {
      mockSubscriptions = [{ id: 1, stripeSubscriptionId: "sub_123", gymId: 1, memberId: 1, status: "active", failedPayments: 0 }];
      const payload = makeEvent("customer.subscription.updated", {
        id: "sub_123", status: "active", metadata: { gymId: "1", memberId: "1" },
        current_period_start: Date.now() / 1000, current_period_end: Date.now() / 1000 + 86400 * 30,
      });
      await WebhookHandlers.processWebhook(payload, "sig_test");
      expect(mockWebhookEvents).toHaveLength(1);
      expect(mockWebhookEvents[0].status).toBe("processed");
    });

    it("skips duplicate event IDs", async () => {
      const eventPayload = {
        id: "evt_duplicate_123",
        type: "customer.subscription.updated",
        data: {
          object: {
            id: "sub_123", status: "active", metadata: {},
            current_period_start: Date.now() / 1000, current_period_end: Date.now() / 1000 + 86400 * 30,
          },
        },
      };
      mockWebhookEvents.push({ stripeEventId: "evt_duplicate_123", eventType: "customer.subscription.updated", status: "processed" });
      const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
      await WebhookHandlers.processWebhook(Buffer.from(JSON.stringify(eventPayload)), "sig_test");
      expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining("Skipping duplicate"));
      consoleLog.mockRestore();
    });
  });

  describe("handleSubscriptionUpdated", () => {
    it("transitions active subscription to cancelled when Stripe status is canceled", async () => {
      mockSubscriptions = [{ id: 1, stripeSubscriptionId: "sub_100", gymId: 1, memberId: 10, status: "active", failedPayments: 0 }];
      mockMembers = [{ id: 10, gymId: 1, firstName: "John", lastName: "Doe", status: "active" }];
      const payload = makeEvent("customer.subscription.updated", {
        id: "sub_100", status: "canceled", metadata: { gymId: "1", memberId: "10" },
        current_period_start: Date.now() / 1000, current_period_end: Date.now() / 1000 + 86400 * 30,
      });
      await WebhookHandlers.processWebhook(payload, "sig_test");
      expect(mockSubscriptions[0].status).toBe("cancelled");
      expect(mockMembers[0].status).toBe("cancelled");
    });

    it("transitions to cancel_at_period_end when cancel_at_period_end flag is set", async () => {
      mockSubscriptions = [{ id: 1, stripeSubscriptionId: "sub_200", gymId: 1, memberId: 10, status: "active", failedPayments: 0 }];
      const payload = makeEvent("customer.subscription.updated", {
        id: "sub_200", status: "active", cancel_at_period_end: true, metadata: {},
        current_period_start: Date.now() / 1000, current_period_end: Date.now() / 1000 + 86400 * 30,
      });
      await WebhookHandlers.processWebhook(payload, "sig_test");
      expect(mockSubscriptions[0].status).toBe("cancel_at_period_end");
    });

    it("resolves billing recovery when reactivated from past_due", async () => {
      mockSubscriptions = [{ id: 5, stripeSubscriptionId: "sub_300", gymId: 1, memberId: 10, status: "past_due", failedPayments: 3 }];
      mockMembers = [{ id: 10, gymId: 1, status: "active" }];
      const payload = makeEvent("customer.subscription.updated", {
        id: "sub_300", status: "active", metadata: {},
        current_period_start: Date.now() / 1000, current_period_end: Date.now() / 1000 + 86400 * 30,
      });
      await WebhookHandlers.processWebhook(payload, "sig_test");
      expect(mockSubscriptions[0].status).toBe("active");
      expect(billingRecoveryService.resolveRecovery).toHaveBeenCalledWith(5, "subscription_reactivated");
    });

    it("skips if subscription not found in local DB", async () => {
      const payload = makeEvent("customer.subscription.updated", {
        id: "sub_nonexistent", status: "active", metadata: {},
        current_period_start: Date.now() / 1000, current_period_end: Date.now() / 1000 + 86400 * 30,
      });
      await WebhookHandlers.processWebhook(payload, "sig_test");
      expect(mockSubscriptions).toHaveLength(0);
    });
  });

  describe("handleInvoicePaymentSucceeded", () => {
    it("creates payment record and resets failedPayments", async () => {
      mockSubscriptions = [{ id: 1, stripeSubscriptionId: "sub_pay", gymId: 1, memberId: 10, status: "past_due", failedPayments: 2 }];
      mockMembers = [{ id: 10, gymId: 1, firstName: "Jane", lastName: "Doe" }];
      const payload = makeEvent("invoice.payment_succeeded", {
        id: "inv_123", subscription: "sub_pay", amount_paid: 15000,
        payment_intent: "pi_abc",
      });
      await WebhookHandlers.processWebhook(payload, "sig_test");
      expect(mockPayments).toHaveLength(1);
      expect(mockPayments[0].amount).toBe("150");
      expect(mockSubscriptions[0].failedPayments).toBe(0);
      expect(mockSubscriptions[0].status).toBe("active");
    });

    it("resets failedPayments to 0 and activates subscription on payment success", async () => {
      mockSubscriptions = [{ id: 2, stripeSubscriptionId: "sub_rec", gymId: 1, memberId: 10, status: "past_due", failedPayments: 3 }];
      mockMembers = [{ id: 10, gymId: 1, firstName: "A", lastName: "B" }];
      const payload = makeEvent("invoice.payment_succeeded", {
        id: "inv_rec", subscription: "sub_rec", amount_paid: 5000, payment_intent: "pi_rec",
      });
      await WebhookHandlers.processWebhook(payload, "sig_test");
      expect(mockSubscriptions[0].failedPayments).toBe(0);
      expect(mockSubscriptions[0].status).toBe("active");
    });

    it("skips payment record if no subscription match", async () => {
      const payload = makeEvent("invoice.payment_succeeded", {
        id: "inv_no", subscription: "sub_nonexistent", amount_paid: 5000, payment_intent: "pi_x",
      });
      await WebhookHandlers.processWebhook(payload, "sig_test");
      expect(mockPayments).toHaveLength(0);
    });
  });

  describe("handleInvoicePaymentFailed", () => {
    it("increments failedPayments counter", async () => {
      mockSubscriptions = [{ id: 1, stripeSubscriptionId: "sub_fail", gymId: 1, memberId: 10, status: "active", failedPayments: 0 }];
      const payload = makeEvent("invoice.payment_failed", {
        id: "inv_fail", subscription: "sub_fail", amount_due: 15000,
      });
      await WebhookHandlers.processWebhook(payload, "sig_test");
      expect(mockSubscriptions[0].failedPayments).toBe(1);
    });

    it("sets past_due after 2+ failures", async () => {
      mockSubscriptions = [{ id: 1, stripeSubscriptionId: "sub_pastdue", gymId: 1, memberId: 10, status: "active", failedPayments: 2 }];
      const payload = makeEvent("invoice.payment_failed", {
        id: "inv_pastdue", subscription: "sub_pastdue", amount_due: 15000,
      });
      await WebhookHandlers.processWebhook(payload, "sig_test");
      expect(mockSubscriptions[0].status).toBe("past_due");
      expect(mockSubscriptions[0].failedPayments).toBe(3);
    });

    it("triggers billing recovery service", async () => {
      mockSubscriptions = [{ id: 3, stripeSubscriptionId: "sub_recov", gymId: 1, memberId: 10, status: "active", failedPayments: 0 }];
      const payload = makeEvent("invoice.payment_failed", {
        id: "inv_recov", subscription: "sub_recov", amount_due: 10000,
      });
      await WebhookHandlers.processWebhook(payload, "sig_test");
      expect(billingRecoveryService.handlePaymentFailure).toHaveBeenCalledWith(
        expect.objectContaining({ subscriptionId: 3, gymId: 1, memberId: 10, amountDue: 100 })
      );
    });
  });

  describe("handleChargeRefunded", () => {
    it("records refund linked to original payment", async () => {
      mockPayments = [{ id: 50, gymId: 1, memberId: 10, stripePaymentIntentId: "pi_refund", memberName: "Test User" }];
      mockMembers = [{ id: 10, gymId: 1, firstName: "Test", lastName: "User" }];
      const payload = makeEvent("charge.refunded", {
        id: "ch_123", payment_intent: "pi_refund", amount_refunded: 5000,
      });
      await WebhookHandlers.processWebhook(payload, "sig_test");
      expect(mockRefunds).toHaveLength(1);
      expect(mockRefunds[0].amount).toBe("50");
      expect(mockRefunds[0].paymentId).toBe(50);
    });

    it("skips if payment not found", async () => {
      const payload = makeEvent("charge.refunded", {
        id: "ch_nopay", payment_intent: "pi_nonexistent", amount_refunded: 5000,
      });
      await WebhookHandlers.processWebhook(payload, "sig_test");
      expect(mockRefunds).toHaveLength(0);
    });
  });

  describe("handleSubscriptionCreated", () => {
    it("skips when metadata missing gymId or memberId", async () => {
      const payload = makeEvent("customer.subscription.created", {
        id: "sub_nometa", status: "active", metadata: {},
        current_period_start: Date.now() / 1000, current_period_end: Date.now() / 1000 + 86400 * 30,
      });
      await WebhookHandlers.processWebhook(payload, "sig_test");
      expect(mockSubscriptions).toHaveLength(0);
    });
  });

  describe("unhandled event types", () => {
    it("logs and processes unhandled event type without error", async () => {
      const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
      const payload = makeEvent("account.updated", { id: "acct_123" });
      await WebhookHandlers.processWebhook(payload, "sig_test");
      expect(consoleLog).toHaveBeenCalledWith(expect.stringContaining("Unhandled event type"));
      consoleLog.mockRestore();
    });
  });

  describe("processWebhook", () => {
    it("rejects non-Buffer payload", async () => {
      await expect(WebhookHandlers.processWebhook("string" as any, "sig")).rejects.toThrow("Payload must be a Buffer");
    });
  });
});
