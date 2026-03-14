import { describe, it, expect } from "vitest";
import { BILLING_RECOVERY_CONFIG } from "../services/billing-recovery";

describe("BILLING_RECOVERY_CONFIG", () => {
  it("has a 14-day default grace period", () => {
    expect(BILLING_RECOVERY_CONFIG.GRACE_PERIOD_DAYS).toBe(14);
  });

  it("has a 4-hour minimum notification interval", () => {
    expect(BILLING_RECOVERY_CONFIG.MIN_NOTIFICATION_INTERVAL_MS).toBe(4 * 60 * 60 * 1000);
  });

  it("has a 72-hour token expiry", () => {
    expect(BILLING_RECOVERY_CONFIG.TOKEN_EXPIRY_HOURS).toBe(72);
  });

  it("has a 90-day resolved retention period", () => {
    expect(BILLING_RECOVERY_CONFIG.RESOLVED_RETENTION_DAYS).toBe(90);
  });

  it("all config values are positive numbers", () => {
    expect(BILLING_RECOVERY_CONFIG.GRACE_PERIOD_DAYS).toBeGreaterThan(0);
    expect(BILLING_RECOVERY_CONFIG.MIN_NOTIFICATION_INTERVAL_MS).toBeGreaterThan(0);
    expect(BILLING_RECOVERY_CONFIG.TOKEN_EXPIRY_HOURS).toBeGreaterThan(0);
    expect(BILLING_RECOVERY_CONFIG.RESOLVED_RETENTION_DAYS).toBeGreaterThan(0);
  });
});
