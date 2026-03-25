/**
 * Wodify integration types.
 *
 * These types model the expected shape of Wodify API responses and the
 * internal normalized forms used by Iron Metrics. They are intentionally
 * separate from the existing Stripe-oriented billing types and the
 * CSV import types in import-wodify.ts.
 *
 * Verification status of each field is documented in:
 *   docs/integrations/wodify-field-map.ts
 *
 * IMPORTANT: Many field names here are INFERRED from Wodify docs navigation
 * and CSV exports. Fields marked with @needsLiveVerify MUST be confirmed
 * against actual API responses before the sync layer is built.
 */

export interface WodifyApiConfig {
  apiKey: string;
  baseUrl: string; // https://api.wodify.com/v1
}

export type WodifySyncEntity =
  | "clients"
  | "client-statuses"
  | "memberships"
  | "invoices"
  | "class-signins";

export type WodifySyncStatus =
  | "pending"
  | "running"
  | "completed"
  | "completed_with_errors"
  | "failed";

/**
 * Raw Wodify Client response shape.
 *
 * @needsLiveVerify — Field names are inferred from CSV columns and
 * docs navigation. The API may use different casing or field names.
 */
export interface WodifyClient {
  ClientId: number;
  /** @needsLiveVerify — API may return FirstName/LastName separately */
  ClientName?: string;
  FirstName?: string;
  LastName?: string;
  Email: string;
  /** @needsLiveVerify — NOT in CSV export, likely in API */
  Phone?: string;
  /** @needsLiveVerify */
  DateOfBirth?: string;
  /** @needsLiveVerify */
  Address?: string;
  /** @needsLiveVerify */
  City?: string;
  /** @needsLiveVerify */
  State?: string;
  /** @needsLiveVerify */
  Zip?: string;
  /** @needsLiveVerify */
  Country?: string;
  /** @needsLiveVerify — may be a string status name or boolean */
  Status?: string;
  /** @needsLiveVerify */
  IsActive?: boolean;
  /** @needsLiveVerify */
  CreatedDate?: string;
  DefaultPaymentMethod?: string;
  MassEmailSubscribed?: string;
}

/**
 * Raw Wodify Membership response shape.
 * CSV-verified fields use exact CSV column names.
 * API may use different casing — adjust after probe verification.
 */
export interface WodifyMembership {
  /** CSV column: "Membership ID" */
  "Membership ID": number;
  /** CSV column: "Client ID" */
  "Client ID": number;
  /** CSV column: "Membership" — e.g., "Unlimited", "8x per month" */
  Membership: string;
  /** CSV column: "Membership Type" — "Class Plan" | "Class Pack" */
  "Membership Type": string;
  /** CSV column: "Payment Plan" */
  "Payment Plan": string;
  /** CSV column: "Start Date" — format: "Feb 24, 2026" */
  "Start Date": string;
  /** CSV column: "Expiration Date" */
  "Expiration Date": string;
  /** CSV column: "Membership Autorenew" — "Auto Renew" | "No Auto Renew" */
  "Membership Autorenew": string;
  /** CSV column: "Autorenew Commitment Total" — decimal string */
  "Autorenew Commitment Total": string;
  /** CSV column: "Commitment Total" — decimal string */
  "Commitment Total": string;
  /** CSV column: "Payment Plan Type" — "Monthly" | "Pay in Full" */
  "Payment Plan Type": string;
  /** CSV column: "Location" */
  Location: string;
  /** CSV column: "Programs" — comma-separated */
  Programs: string;
}

/**
 * Raw Wodify Invoice response shape.
 *
 * @needsLiveVerify — Entire shape is inferred from docs navigation
 * and Wodify help articles about invoice statuses.
 */
export interface WodifyInvoice {
  /** @needsLiveVerify */
  InvoiceId: number;
  /** @needsLiveVerify */
  ClientId: number;
  /** @needsLiveVerify */
  Amount: number;
  /** Inferred from help docs: Paid | Partially Refunded | Refunded | Unpaid | Voided */
  Status: string;
  /** @needsLiveVerify */
  InvoiceDate: string;
  /** @needsLiveVerify */
  DueDate?: string;
  /** @needsLiveVerify */
  Description?: string;
  /** @needsLiveVerify */
  RevenueCategory?: string;
}

/**
 * Raw Wodify Class Sign-In response shape.
 *
 * @needsLiveVerify — Entire shape is inferred. This is the most
 * critical entity for Tier 1 but has the least documentation.
 */
export interface WodifyClassSignIn {
  /** @needsLiveVerify — could be SignInId or AttendanceId */
  Id: number;
  ClientId: number;
  /** @needsLiveVerify */
  ClientName?: string;
  /** @needsLiveVerify */
  ClassName?: string;
  /** @needsLiveVerify */
  ProgramName?: string;
  /** @needsLiveVerify — ISO datetime or Wodify date format */
  SignInDate: string;
  /** @needsLiveVerify — e.g., "Signed In", "Drop In", "No Show" */
  Status?: string;
  /** @needsLiveVerify */
  ClassId?: number;
}

export interface NormalizedMember {
  wodifyClientId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  status: string;
  membershipType: string | null;
  joinDate: string | null;
  birthDate: string | null;
  tags: string[];
  totalMonthlyRevenue: number;
}

export interface NormalizedAttendance {
  wodifySignInId: number;
  wodifyClientId: number;
  memberName: string;
  className: string;
  checkinTime: Date;
  status: string;
}

export interface NormalizedInvoice {
  wodifyInvoiceId: number;
  wodifyClientId: number;
  amount: number;
  status: string;
  invoiceDate: string;
  category: string | null;
}
