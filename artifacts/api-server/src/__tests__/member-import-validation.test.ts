import { describe, it, expect } from "vitest";

function normalizePhone(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  return digits || phone.trim();
}

function isValidCalendarDate(dateStr: string): boolean {
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return false;
  const [y, m, day] = dateStr.split("-").map(Number);
  return d.getFullYear() === y && d.getMonth() + 1 === m && d.getDate() === day;
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function parseImportDate(val: string): string | null {
  if (!val) return null;
  const trimmed = val.trim();
  if (DATE_REGEX.test(trimmed)) {
    return isValidCalendarDate(trimmed) ? trimmed : null;
  }
  const parts = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (parts) {
    const year = parts[3].length === 2 ? "20" + parts[3] : parts[3];
    const month = parts[1].padStart(2, "0");
    const day = parts[2].padStart(2, "0");
    const candidate = `${year}-${month}-${day}`;
    if (isValidCalendarDate(candidate)) return candidate;
    return null;
  }
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    const iso = d.toISOString().split("T")[0];
    return isValidCalendarDate(iso) ? iso : null;
  }
  return null;
}

function safeStr(val: any): string {
  if (val === null || val === undefined) return "";
  return String(val);
}

interface ImportRow {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  status?: string;
  joinDate?: string;
  birthDate?: string;
  membershipType?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  address?: string;
  city?: string;
  state?: string;
  notes?: string;
  tags?: string;
}

function sanitizeRow(row: ImportRow): ImportRow {
  return {
    firstName: safeStr(row.firstName),
    lastName: safeStr(row.lastName),
    email: safeStr(row.email),
    phone: safeStr(row.phone),
    status: safeStr(row.status),
    joinDate: safeStr(row.joinDate),
    birthDate: safeStr(row.birthDate),
    membershipType: safeStr(row.membershipType),
    emergencyContactName: safeStr(row.emergencyContactName),
    emergencyContactPhone: safeStr(row.emergencyContactPhone),
    address: safeStr(row.address),
    city: safeStr(row.city),
    state: safeStr(row.state),
    notes: safeStr(row.notes),
    tags: safeStr(row.tags),
  };
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_STATUSES = ["active", "inactive", "cancelled", "frozen", "pending"];

function validateRow(row: ImportRow, rowIndex: number) {
  const safe = sanitizeRow(row);
  const errors: string[] = [];
  if (!safe.firstName?.trim()) errors.push("First name is required");
  if (!safe.lastName?.trim()) errors.push("Last name is required");
  if (!safe.email?.trim()) errors.push("Email is required");
  else if (!EMAIL_REGEX.test(safe.email.trim())) errors.push("Invalid email format");
  if (safe.status && !VALID_STATUSES.includes(safe.status.toLowerCase().trim())) {
    errors.push(`Invalid status "${safe.status}". Must be: ${VALID_STATUSES.join(", ")}`);
  }
  if (safe.joinDate && !parseImportDate(safe.joinDate)) errors.push(`Invalid join date format "${safe.joinDate}"`);
  if (safe.birthDate && !parseImportDate(safe.birthDate)) errors.push(`Invalid birth date format "${safe.birthDate}"`);
  return { rowIndex, data: safe, errors };
}

describe("normalizePhone", () => {
  it("formats 10-digit US phone numbers", () => {
    expect(normalizePhone("5551234567")).toBe("(555) 123-4567");
  });

  it("strips non-digit characters before formatting", () => {
    expect(normalizePhone("(555) 123-4567")).toBe("(555) 123-4567");
  });

  it("preserves international numbers with +", () => {
    const result = normalizePhone("+44 20 7123 4567");
    expect(result).toContain("+");
  });

  it("returns digits for non-10-digit numbers", () => {
    expect(normalizePhone("12345")).toBe("12345");
  });

  it("returns empty string for whitespace-only input", () => {
    const result = normalizePhone("  ");
    expect(result).toBe("");
  });
});

describe("isValidCalendarDate", () => {
  it("validates correct YYYY-MM-DD date", () => {
    expect(isValidCalendarDate("2026-03-15")).toBe(true);
  });

  it("rejects invalid date like Feb 30", () => {
    expect(isValidCalendarDate("2026-02-30")).toBe(false);
  });

  it("rejects nonsense date string", () => {
    expect(isValidCalendarDate("not-a-date")).toBe(false);
  });

  it("validates leap year date", () => {
    expect(isValidCalendarDate("2024-02-29")).toBe(true);
  });

  it("rejects non-leap year Feb 29", () => {
    expect(isValidCalendarDate("2025-02-29")).toBe(false);
  });
});

describe("parseImportDate", () => {
  it("parses ISO format", () => {
    expect(parseImportDate("2026-03-15")).toBe("2026-03-15");
  });

  it("parses MM/DD/YYYY format", () => {
    expect(parseImportDate("03/15/2026")).toBe("2026-03-15");
  });

  it("parses MM-DD-YYYY format", () => {
    expect(parseImportDate("03-15-2026")).toBe("2026-03-15");
  });

  it("parses two-digit year", () => {
    expect(parseImportDate("3/15/26")).toBe("2026-03-15");
  });

  it("returns null for empty string", () => {
    expect(parseImportDate("")).toBeNull();
  });

  it("returns null for invalid date", () => {
    expect(parseImportDate("99/99/9999")).toBeNull();
  });
});

describe("sanitizeRow", () => {
  it("converts null/undefined fields to empty strings", () => {
    const result = sanitizeRow({ firstName: undefined, lastName: null as any });
    expect(result.firstName).toBe("");
    expect(result.lastName).toBe("");
  });

  it("preserves valid string values", () => {
    const result = sanitizeRow({ firstName: "John", email: "john@test.com" });
    expect(result.firstName).toBe("John");
    expect(result.email).toBe("john@test.com");
  });

  it("converts numeric values to strings", () => {
    const result = sanitizeRow({ phone: 5551234567 as any });
    expect(result.phone).toBe("5551234567");
  });
});

describe("validateRow", () => {
  it("passes valid row with no errors", () => {
    const result = validateRow({
      firstName: "John", lastName: "Doe", email: "john@test.com", status: "active",
    }, 0);
    expect(result.errors).toHaveLength(0);
  });

  it("requires firstName", () => {
    const result = validateRow({ lastName: "Doe", email: "j@test.com" }, 0);
    expect(result.errors).toContain("First name is required");
  });

  it("requires lastName", () => {
    const result = validateRow({ firstName: "John", email: "j@test.com" }, 0);
    expect(result.errors).toContain("Last name is required");
  });

  it("requires email", () => {
    const result = validateRow({ firstName: "John", lastName: "Doe" }, 0);
    expect(result.errors).toContain("Email is required");
  });

  it("validates email format", () => {
    const result = validateRow({ firstName: "John", lastName: "Doe", email: "not-an-email" }, 0);
    expect(result.errors).toContain("Invalid email format");
  });

  it("rejects invalid status", () => {
    const result = validateRow({
      firstName: "John", lastName: "Doe", email: "j@test.com", status: "vip",
    }, 0);
    expect(result.errors[0]).toContain("Invalid status");
  });

  it("accepts all valid statuses", () => {
    for (const status of VALID_STATUSES) {
      const result = validateRow({ firstName: "J", lastName: "D", email: "j@t.com", status }, 0);
      expect(result.errors).toHaveLength(0);
    }
  });

  it("validates join date format", () => {
    const result = validateRow({
      firstName: "J", lastName: "D", email: "j@t.com", joinDate: "not-a-date",
    }, 0);
    expect(result.errors[0]).toContain("Invalid join date");
  });

  it("validates birth date format", () => {
    const result = validateRow({
      firstName: "J", lastName: "D", email: "j@t.com", birthDate: "99/99/9999",
    }, 0);
    expect(result.errors[0]).toContain("Invalid birth date");
  });

  it("collects multiple errors", () => {
    const result = validateRow({}, 0);
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });

  it("preserves rowIndex", () => {
    const result = validateRow({ firstName: "J", lastName: "D", email: "j@t.com" }, 42);
    expect(result.rowIndex).toBe(42);
  });
});
