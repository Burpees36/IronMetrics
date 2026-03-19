import { describe, it, expect } from "vitest";
import {
  normalizePhone,
  isValidCalendarDate,
  parseImportDate,
  sanitizeRow,
  validateRow,
} from "../routes/members";

describe("normalizePhone (production import)", () => {
  it("formats 10-digit US phone", () => {
    expect(normalizePhone("5551234567")).toBe("(555) 123-4567");
  });

  it("strips non-digit characters before formatting", () => {
    expect(normalizePhone("(555) 123-4567")).toBe("(555) 123-4567");
    expect(normalizePhone("555-123-4567")).toBe("(555) 123-4567");
    expect(normalizePhone("555.123.4567")).toBe("(555) 123-4567");
  });

  it("preserves + in international numbers", () => {
    const result = normalizePhone("+15551234567");
    expect(result).toContain("+");
  });

  it("returns digits for non-10-digit", () => {
    expect(normalizePhone("12345")).toBe("12345");
  });

  it("trims whitespace from empty-ish input", () => {
    const result = normalizePhone("   ");
    expect(result).toBe("");
  });
});

describe("isValidCalendarDate (production import)", () => {
  it("accepts valid YYYY-MM-DD", () => {
    expect(isValidCalendarDate("2024-01-15")).toBe(true);
  });

  it("rejects impossible date (Feb 30)", () => {
    expect(isValidCalendarDate("2024-02-30")).toBe(false);
  });

  it("rejects month 13", () => {
    expect(isValidCalendarDate("2024-13-01")).toBe(false);
  });

  it("rejects garbled string", () => {
    expect(isValidCalendarDate("not-a-date")).toBe(false);
  });

  it("accepts leap day", () => {
    expect(isValidCalendarDate("2024-02-29")).toBe(true);
  });

  it("rejects Feb 29 on non-leap year", () => {
    expect(isValidCalendarDate("2023-02-29")).toBe(false);
  });
});

describe("parseImportDate (production import)", () => {
  it("parses YYYY-MM-DD", () => {
    expect(parseImportDate("2024-01-15")).toBe("2024-01-15");
  });

  it("parses MM/DD/YYYY", () => {
    expect(parseImportDate("01/15/2024")).toBe("2024-01-15");
  });

  it("parses M/D/YY", () => {
    expect(parseImportDate("1/5/24")).toBe("2024-01-05");
  });

  it("returns null for empty", () => {
    expect(parseImportDate("")).toBeNull();
  });

  it("returns null for invalid date", () => {
    expect(parseImportDate("not-a-date")).toBeNull();
  });

  it("trims whitespace", () => {
    expect(parseImportDate("  2024-06-01  ")).toBe("2024-06-01");
  });
});

describe("sanitizeRow (production import)", () => {
  it("converts undefined fields to empty strings", () => {
    const result = sanitizeRow({});
    expect(result.firstName).toBe("");
    expect(result.email).toBe("");
  });

  it("converts null-ish values to empty strings", () => {
    const result = sanitizeRow({ firstName: null as any, email: undefined });
    expect(result.firstName).toBe("");
    expect(result.email).toBe("");
  });

  it("preserves valid string values", () => {
    const result = sanitizeRow({ firstName: "John", lastName: "Doe", email: "j@test.com" });
    expect(result.firstName).toBe("John");
    expect(result.lastName).toBe("Doe");
    expect(result.email).toBe("j@test.com");
  });
});

describe("validateRow (production import)", () => {
  const validRow = {
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    status: "active",
  };

  it("returns no errors for valid row", () => {
    const result = validateRow(validRow, 0);
    expect(result.errors).toHaveLength(0);
  });

  it("flags missing first name", () => {
    const result = validateRow({ ...validRow, firstName: "" }, 0);
    expect(result.errors).toContain("First name is required");
  });

  it("flags missing last name", () => {
    const result = validateRow({ ...validRow, lastName: "" }, 0);
    expect(result.errors).toContain("Last name is required");
  });

  it("flags missing email", () => {
    const result = validateRow({ ...validRow, email: "" }, 0);
    expect(result.errors).toContain("Email is required");
  });

  it("flags invalid email format", () => {
    const result = validateRow({ ...validRow, email: "not-an-email" }, 0);
    expect(result.errors.some(e => e.includes("Invalid email"))).toBe(true);
  });

  it("flags invalid status", () => {
    const result = validateRow({ ...validRow, status: "bogus" }, 0);
    expect(result.errors.some(e => e.includes("Invalid status"))).toBe(true);
  });

  it("accepts all valid statuses", () => {
    for (const status of ["active", "inactive", "hold", "cancelled", "prospect"]) {
      const result = validateRow({ ...validRow, status }, 0);
      expect(result.errors).toHaveLength(0);
    }
  });

  it("flags invalid join date", () => {
    const result = validateRow({ ...validRow, joinDate: "not-a-date" }, 0);
    expect(result.errors.some(e => e.includes("join date"))).toBe(true);
  });

  it("flags invalid birth date", () => {
    const result = validateRow({ ...validRow, birthDate: "2024-13-45" }, 0);
    expect(result.errors.some(e => e.includes("birth date"))).toBe(true);
  });

  it("includes rowIndex in result", () => {
    const result = validateRow(validRow, 7);
    expect(result.rowIndex).toBe(7);
  });

  it("returns sanitized data", () => {
    const result = validateRow({ firstName: "  Jane ", lastName: "Smith", email: "j@t.com" }, 0);
    expect(result.data.firstName).toBe("  Jane ");
  });

  it("collects multiple errors at once", () => {
    const result = validateRow({ firstName: "", lastName: "", email: "" }, 0);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });
});
