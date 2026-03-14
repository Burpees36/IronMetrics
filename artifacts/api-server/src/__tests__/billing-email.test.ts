import { describe, it, expect } from "vitest";
import { buildPaymentFailedEmail, buildPaymentUpdatedEmail, buildGraceExpiredEmail } from "../services/billing-email";

const testBranding = {
  name: "Iron CrossFit",
  fromEmail: "billing@ironcrossfit.com",
  fromName: "Iron CrossFit Billing",
  logoUrl: "https://example.com/logo.png",
  email: "info@ironcrossfit.com",
  phone: "555-123-4567",
};

describe("buildPaymentFailedEmail", () => {
  it("renders with full parameters", () => {
    const result = buildPaymentFailedEmail({
      memberName: "John Doe",
      amountDue: 49.99,
      cardLast4: "4242",
      cardBrand: "visa",
      updateLink: "https://example.com/update-payment?token=abc123",
      branding: testBranding,
    });

    expect(result.subject).toContain("Payment failed");
    expect(result.subject).toContain("Iron CrossFit");
    expect(result.html).toContain("John Doe");
    expect(result.html).toContain("$49.99");
    expect(result.html).toContain("4242");
    expect(result.html).toContain("visa");
    expect(result.html).toContain("https://example.com/update-payment?token=abc123");
    expect(result.html).toContain("72 hours");
    expect(result.text).toContain("John Doe");
    expect(result.text).toContain("$49.99");
    expect(result.text).toContain("https://example.com/update-payment?token=abc123");
  });

  it("renders without card info", () => {
    const result = buildPaymentFailedEmail({
      memberName: "Jane Smith",
      amountDue: 99.00,
      cardLast4: null,
      cardBrand: null,
      updateLink: "https://example.com/update-payment?token=xyz",
      branding: testBranding,
    });

    expect(result.html).toContain("Jane Smith");
    expect(result.html).toContain("$99.00");
    expect(result.html).not.toContain("ending in");
  });

  it("renders without optional branding fields", () => {
    const result = buildPaymentFailedEmail({
      memberName: "Test User",
      amountDue: 25.50,
      updateLink: "https://example.com/update",
      branding: { name: "Minimal Gym" },
    });

    expect(result.html).toContain("Minimal Gym");
    expect(result.html).toContain("$25.50");
    expect(result.html).not.toContain("logo");
  });

  it("handles zero amount safely", () => {
    const result = buildPaymentFailedEmail({
      memberName: "Zero Amt",
      amountDue: 0,
      updateLink: "https://example.com/update",
      branding: testBranding,
    });

    expect(result.html).toContain("$0.00");
  });
});

describe("buildPaymentUpdatedEmail", () => {
  it("renders confirmation with card details", () => {
    const result = buildPaymentUpdatedEmail({
      memberName: "John Doe",
      cardLast4: "1234",
      cardBrand: "mastercard",
      branding: testBranding,
    });

    expect(result.subject).toContain("Payment method updated");
    expect(result.subject).toContain("Iron CrossFit");
    expect(result.html).toContain("John Doe");
    expect(result.html).toContain("1234");
    expect(result.html).toContain("mastercard");
    expect(result.html).toContain("membership is now active");
    expect(result.text).toContain("1234");
    expect(result.text).toContain("mastercard");
  });
});

describe("buildGraceExpiredEmail", () => {
  it("renders final notice with urgency", () => {
    const result = buildGraceExpiredEmail({
      memberName: "John Doe",
      amountDue: 49.99,
      updateLink: "https://example.com/update-payment?token=abc",
      branding: testBranding,
    });

    expect(result.subject).toContain("FINAL NOTICE");
    expect(result.subject).toContain("Iron CrossFit");
    expect(result.html).toContain("Final Notice");
    expect(result.html).toContain("$49.99");
    expect(result.html).toContain("overdue");
    expect(result.html).toContain("suspended");
    expect(result.html).toContain("https://example.com/update-payment?token=abc");
    expect(result.text).toContain("FINAL NOTICE");
    expect(result.text).toContain("overdue");
  });

  it("handles zero amount in grace expired email", () => {
    const result = buildGraceExpiredEmail({
      memberName: "Test",
      amountDue: 0,
      updateLink: "https://example.com/update",
      branding: testBranding,
    });

    expect(result.html).toContain("$0.00");
  });
});
