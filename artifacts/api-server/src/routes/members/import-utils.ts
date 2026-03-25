import { EMAIL_REGEX } from "./helpers";

const VALID_STATUSES = ["active", "inactive", "hold", "cancelled", "prospect"];
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  return digits || phone.trim();
}

export function isValidCalendarDate(dateStr: string): boolean {
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return false;
  const [y, m, day] = dateStr.split("-").map(Number);
  return d.getFullYear() === y && d.getMonth() + 1 === m && d.getDate() === day;
}

export function parseImportDate(val: string): string | null {
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

export interface ImportRow {
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

export interface ValidatedRow {
  rowIndex: number;
  data: ImportRow;
  errors: string[];
  isDuplicate: boolean;
  duplicateOf?: { id: number; name: string; email: string };
}

function safeStr(val: any): string {
  if (val === null || val === undefined) return "";
  return String(val);
}

export function sanitizeRow(row: ImportRow): ImportRow {
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

export function validateRow(row: ImportRow, rowIndex: number): Omit<ValidatedRow, "isDuplicate" | "duplicateOf"> {
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
