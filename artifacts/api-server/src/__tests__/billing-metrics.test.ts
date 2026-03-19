import { describe, it, expect } from "vitest";
import { getMonthWindow, computeMRR, computeARM } from "../billingMetrics";

describe("getMonthWindow", () => {
  it("returns first day of month as start", () => {
    const { start } = getMonthWindow(new Date(2026, 2, 15));
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(2);
    expect(start.getDate()).toBe(1);
  });

  it("returns first day of next month as end", () => {
    const { end } = getMonthWindow(new Date(2026, 2, 15));
    expect(end.getFullYear()).toBe(2026);
    expect(end.getMonth()).toBe(3);
    expect(end.getDate()).toBe(1);
  });

  it("handles December correctly (rolls to January)", () => {
    const { end } = getMonthWindow(new Date(2026, 11, 25));
    expect(end.getFullYear()).toBe(2027);
    expect(end.getMonth()).toBe(0);
    expect(end.getDate()).toBe(1);
  });

  it("uses current date when no argument provided", () => {
    const { start, end } = getMonthWindow();
    const now = new Date();
    expect(start.getMonth()).toBe(now.getMonth());
    expect(start.getFullYear()).toBe(now.getFullYear());
    expect(end.getTime()).toBeGreaterThan(start.getTime());
  });

  it("handles first day of month", () => {
    const { start } = getMonthWindow(new Date(2026, 5, 1));
    expect(start.getDate()).toBe(1);
    expect(start.getMonth()).toBe(5);
  });

  it("handles last day of month", () => {
    const { start, end } = getMonthWindow(new Date(2026, 0, 31));
    expect(start.getMonth()).toBe(0);
    expect(end.getMonth()).toBe(1);
  });
});

describe("computeMRR", () => {
  it("sums subscription amounts", () => {
    const subs = [{ amount: "100.00" }, { amount: "50.50" }, { amount: "200.00" }];
    expect(computeMRR(subs)).toBeCloseTo(350.50);
  });

  it("returns 0 for empty array", () => {
    expect(computeMRR([])).toBe(0);
  });

  it("handles single subscription", () => {
    expect(computeMRR([{ amount: "99.99" }])).toBeCloseTo(99.99);
  });

  it("handles zero-amount subscriptions", () => {
    expect(computeMRR([{ amount: "0" }])).toBe(0);
  });

  it("handles large amounts", () => {
    const subs = [{ amount: "9999.99" }, { amount: "5000.01" }];
    expect(computeMRR(subs)).toBeCloseTo(15000.00);
  });

  it("handles decimal precision", () => {
    const subs = [{ amount: "33.33" }, { amount: "33.33" }, { amount: "33.34" }];
    expect(computeMRR(subs)).toBeCloseTo(100.00);
  });
});

describe("computeARM", () => {
  it("divides MRR by active count", () => {
    expect(computeARM(1000, 10)).toBe(100);
  });

  it("returns 0 when no active subscriptions", () => {
    expect(computeARM(0, 0)).toBe(0);
  });

  it("returns 0 when count is 0 even with nonzero MRR", () => {
    expect(computeARM(500, 0)).toBe(0);
  });

  it("handles fractional results", () => {
    expect(computeARM(100, 3)).toBeCloseTo(33.333, 2);
  });

  it("handles single subscription", () => {
    expect(computeARM(150, 1)).toBe(150);
  });

  it("handles large numbers", () => {
    expect(computeARM(1000000, 500)).toBe(2000);
  });
});
