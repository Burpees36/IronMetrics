/**
 * Wodify → Iron Metrics Field Map
 *
 * Source-of-truth mapping between Wodify API/CSV entities and Iron Metrics
 * internal schema. This file is both documentation AND the runtime reference
 * that the sync layer will use.
 *
 * ## Verification status
 * - CSV fields: VERIFIED against real Wodify "All Memberships" export
 * - API fields: INFERRED from docs.wodify.com/reference endpoint names
 *   and Wodify Custom Reporting documentation. Every API field is marked
 *   with its verification status.
 *
 * ## Architecture decision
 * This file lives in docs/integrations/ as DOCUMENTATION ONLY — it is
 * NOT imported at runtime by any package. It uses TypeScript for
 * structured readability and type-checking of the map itself, but is
 * not part of any tsconfig build scope.
 *
 * Runtime types live in:
 *   artifacts/api-server/src/routes/integrations/wodify/types.ts
 * The actual sync implementation will live in:
 *   artifacts/api-server/src/routes/integrations/wodify/
 */

// ---------------------------------------------------------------------------
// Field verification status
// ---------------------------------------------------------------------------

export type FieldVerification =
  | "verified-csv"       // Seen in real CSV export from user
  | "verified-docs"      // Confirmed in Wodify docs
  | "inferred-docs"      // Endpoint exists in docs nav, field names inferred
  | "needs-live-verify"; // Must hit live API to confirm field name/shape

// ---------------------------------------------------------------------------
// Mapping priority for Tier 1
// ---------------------------------------------------------------------------

export type Tier1Priority =
  | "must-have"         // Required for core Tier 1 metrics
  | "useful"            // Enriches Tier 1 but not blocking
  | "ignore-for-now";   // Not needed until Growth/Pro tiers

// ---------------------------------------------------------------------------
// 1. CLIENTS → members table
// ---------------------------------------------------------------------------
// Wodify endpoint: GET /clients (docs.wodify.com/reference/get_clients)
// CSV source: "All Memberships" report (Client ID, Client Name, Email columns)
//
// Conceptual note: A Wodify "Client" maps 1:1 to an Iron Metrics "Member".
// A client may have MULTIPLE memberships (rows in the CSV), but we
// deduplicate on Client ID / email to produce one member record.
// ---------------------------------------------------------------------------

export const CLIENT_FIELD_MAP = [
  {
    wodifyEntity: "Client",
    wodifyField: "Client ID",
    wodifyEndpoint: "GET /clients",
    verification: "verified-csv" as FieldVerification,
    expectedType: "integer",
    required: true,
    targetTable: "members",
    targetField: "(external ID — not yet stored; see open questions)",
    transform: "Store as-is for dedup/reconciliation",
    nullBehavior: "Skip row if missing",
    tier1Priority: "must-have" as Tier1Priority,
    notes: "Primary dedup key. Current members table has no wodifyClientId column — needs migration.",
  },
  {
    wodifyEntity: "Client",
    wodifyField: "Client Name",
    wodifyEndpoint: "GET /clients",
    verification: "verified-csv" as FieldVerification,
    expectedType: "string",
    required: true,
    targetTable: "members",
    targetField: "firstName + lastName",
    transform: "Split on first whitespace: parts[0] → firstName, rest → lastName",
    nullBehavior: "Error row if missing",
    tier1Priority: "must-have" as Tier1Priority,
    notes: "API may return separate FirstName/LastName fields — needs live verify.",
  },
  {
    wodifyEntity: "Client",
    wodifyField: "FirstName",
    wodifyEndpoint: "GET /clients",
    verification: "needs-live-verify" as FieldVerification,
    expectedType: "string",
    required: true,
    targetTable: "members",
    targetField: "firstName",
    transform: "Title-case normalization",
    nullBehavior: "Fall back to Client Name split",
    tier1Priority: "must-have" as Tier1Priority,
    notes: "API likely returns this separately. CSV only has combined Client Name.",
  },
  {
    wodifyEntity: "Client",
    wodifyField: "LastName",
    wodifyEndpoint: "GET /clients",
    verification: "needs-live-verify" as FieldVerification,
    expectedType: "string",
    required: true,
    targetTable: "members",
    targetField: "lastName",
    transform: "Title-case normalization",
    nullBehavior: "Fall back to Client Name split",
    tier1Priority: "must-have" as Tier1Priority,
    notes: "API likely returns this separately. CSV only has combined Client Name.",
  },
  {
    wodifyEntity: "Client",
    wodifyField: "Email",
    wodifyEndpoint: "GET /clients",
    verification: "verified-csv" as FieldVerification,
    expectedType: "string (email)",
    required: true,
    targetTable: "members",
    targetField: "email",
    transform: "Lowercase, trim",
    nullBehavior: "Error row if missing",
    tier1Priority: "must-have" as Tier1Priority,
    notes: "Secondary dedup key alongside Client ID.",
  },
  {
    wodifyEntity: "Client",
    wodifyField: "Phone",
    wodifyEndpoint: "GET /clients",
    verification: "needs-live-verify" as FieldVerification,
    expectedType: "string",
    required: false,
    targetTable: "members",
    targetField: "phone",
    transform: "normalizePhone() from import-utils.ts",
    nullBehavior: "null",
    tier1Priority: "useful" as Tier1Priority,
    notes: "NOT in CSV export. API likely has it. Zapier 'new client' trigger includes phone.",
  },
  {
    wodifyEntity: "Client",
    wodifyField: "DateOfBirth",
    wodifyEndpoint: "GET /clients",
    verification: "needs-live-verify" as FieldVerification,
    expectedType: "string (date)",
    required: false,
    targetTable: "members",
    targetField: "birthDate",
    transform: "parseImportDate() from import-utils.ts",
    nullBehavior: "null",
    tier1Priority: "useful" as Tier1Priority,
    notes: "NOT in CSV export. Likely in API. Useful for birthday campaigns.",
  },
  {
    wodifyEntity: "Client",
    wodifyField: "Address / City / State / Zip / Country",
    wodifyEndpoint: "GET /clients",
    verification: "needs-live-verify" as FieldVerification,
    expectedType: "string fields",
    required: false,
    targetTable: "members",
    targetField: "address, city, state",
    transform: "Trim each",
    nullBehavior: "null",
    tier1Priority: "ignore-for-now" as Tier1Priority,
    notes: "NOT in CSV export. May be in API. Low priority for analytics.",
  },
  {
    wodifyEntity: "Client",
    wodifyField: "Status / IsActive",
    wodifyEndpoint: "GET /clients OR GET /client-statuses",
    verification: "needs-live-verify" as FieldVerification,
    expectedType: "string or boolean",
    required: true,
    targetTable: "members",
    targetField: "status",
    transform: "Map to Iron Metrics statuses: active|inactive|hold|cancelled|prospect",
    nullBehavior: "Default 'active'",
    tier1Priority: "must-have" as Tier1Priority,
    notes: "CSV has no explicit status column. Current import defaults all to 'active'. API likely has client status. Needs normalization — see CLIENT_STATUS_MAP below.",
  },
  {
    wodifyEntity: "Client",
    wodifyField: "CreatedDate / JoinDate",
    wodifyEndpoint: "GET /clients",
    verification: "needs-live-verify" as FieldVerification,
    expectedType: "string (ISO date)",
    required: false,
    targetTable: "members",
    targetField: "joinDate",
    transform: "parseImportDate(). Currently uses earliest membership Start Date as proxy.",
    nullBehavior: "Use earliest membership start date",
    tier1Priority: "must-have" as Tier1Priority,
    notes: "CSV uses Start Date of earliest membership. API should have actual client creation date.",
  },
  {
    wodifyEntity: "Client",
    wodifyField: "Mass Email Subscribed",
    wodifyEndpoint: "GET /clients",
    verification: "verified-csv" as FieldVerification,
    expectedType: "string ('Subscribed' | 'Not Subscribed')",
    required: false,
    targetTable: "members",
    targetField: "tags[]",
    transform: "'Not Subscribed' → add 'email-opt-out' tag",
    nullBehavior: "Default to subscribed",
    tier1Priority: "useful" as Tier1Priority,
    notes: "Already handled in current import-wodify.ts.",
  },
  {
    wodifyEntity: "Client",
    wodifyField: "Default Payment Method",
    wodifyEndpoint: "GET /clients",
    verification: "verified-csv" as FieldVerification,
    expectedType: "string ('Visa', 'MasterCard', 'AmEx', 'Discover', 'Checking Account', '')",
    required: false,
    targetTable: "(not stored — display only in preview)",
    targetField: "N/A",
    transform: "None",
    nullBehavior: "null",
    tier1Priority: "ignore-for-now" as Tier1Priority,
    notes: "Wodify handles payments. Iron Metrics Tier 1 doesn't manage billing directly.",
  },
] as const;

// ---------------------------------------------------------------------------
// 2. CLIENT STATUSES → members.status normalization
// ---------------------------------------------------------------------------
// Wodify endpoint: GET /client-statuses (docs.wodify.com/reference)
// CSV: No explicit status column — all exported members are implicitly active
//
// Conceptual note: Wodify has its own status taxonomy. We need to map these
// to Iron Metrics' 5 statuses: active, inactive, hold, cancelled, prospect.
// The exact Wodify status values are UNKNOWN until we hit the live API.
// ---------------------------------------------------------------------------

export const CLIENT_STATUS_MAP = {
  _verification: "needs-live-verify" as FieldVerification,
  _notes: "Wodify status values unknown. These are best guesses from CSV/docs context. Must verify against live GET /client-statuses response.",
  mapping: {
    "Active": "active",
    "Inactive": "inactive",
    "On Hold": "hold",
    "Suspended": "hold",
    "Cancelled": "cancelled",
    "Terminated": "cancelled",
    "Lead": "prospect",
    "Prospect": "prospect",
  } as Record<string, string>,
  defaultStatus: "active",
};

// ---------------------------------------------------------------------------
// 3. MEMBERSHIPS → members.membershipType + revenue context
// ---------------------------------------------------------------------------
// Wodify endpoint: GET /membership (docs.wodify.com/reference/get_membership-1)
// CSV source: "All Memberships" report (Membership, Membership Type,
//   Payment Plan, Start Date, Expiration Date, etc.)
//
// Conceptual note: A Wodify Client can have MULTIPLE active memberships
// simultaneously (e.g., "Unlimited" + "24 Hour Access"). We already handle
// this in import-wodify.ts by consolidating into one member record with
// the highest-revenue membership as primaryMembership. For Tier 1
// analytics, we track:
//   - Primary membership type on the member record
//   - Total MRR across all memberships
//   - Membership count (for couples plan detection)
// ---------------------------------------------------------------------------

export const MEMBERSHIP_FIELD_MAP = [
  {
    wodifyEntity: "Membership",
    wodifyField: "Membership ID",
    verification: "verified-csv" as FieldVerification,
    expectedType: "integer",
    targetTable: "(not stored individually — consolidated per member)",
    targetField: "N/A",
    transform: "Used for dedup within import",
    tier1Priority: "useful" as Tier1Priority,
    notes: "Each membership row is unique by this ID. We consolidate per Client ID.",
  },
  {
    wodifyEntity: "Membership",
    wodifyField: "Membership",
    verification: "verified-csv" as FieldVerification,
    expectedType: "string",
    targetTable: "members",
    targetField: "membershipType",
    transform: "Highest-revenue membership becomes primaryMembership",
    tier1Priority: "must-have" as Tier1Priority,
    notes: "Values observed: 'Unlimited', 'couples zero (non paying spouse)', '12x per month', '8x per month', '24 Hour Hybrid Access', '10 Session Punch Card', 'Couples Unlimited', 'Couples 12x per month', 'Couples 8x per month'",
  },
  {
    wodifyEntity: "Membership",
    wodifyField: "Membership Type",
    verification: "verified-csv" as FieldVerification,
    expectedType: "string ('Class Plan' | 'Class Pack')",
    targetTable: "(metadata — not stored separately)",
    targetField: "N/A",
    transform: "Used to distinguish recurring vs punch-card memberships",
    tier1Priority: "useful" as Tier1Priority,
    notes: "'Class Plan' = recurring monthly. 'Class Pack' = finite sessions (punch card).",
  },
  {
    wodifyEntity: "Membership",
    wodifyField: "Autorenew Commitment Total",
    verification: "verified-csv" as FieldVerification,
    expectedType: "decimal string",
    targetTable: "(computed — member.totalMonthlyRevenue in preview)",
    targetField: "MRR computation",
    transform: "parseFloat, sum across memberships per member",
    tier1Priority: "must-have" as Tier1Priority,
    notes: "This is the per-membership recurring amount. Summed across all memberships = member MRR. Values: 0.00 (comp), 10.99 (addon), 95-305 (plans).",
  },
  {
    wodifyEntity: "Membership",
    wodifyField: "Start Date",
    verification: "verified-csv" as FieldVerification,
    expectedType: "string ('Feb 24, 2026' format)",
    targetTable: "members",
    targetField: "joinDate (earliest start date)",
    transform: "parseWodifyDate() — handles 'MMM DD, YYYY' and 'YYYY-MM-DD'",
    tier1Priority: "must-have" as Tier1Priority,
    notes: "Already handled in import-wodify.ts.",
  },
  {
    wodifyEntity: "Membership",
    wodifyField: "Expiration Date",
    verification: "verified-csv" as FieldVerification,
    expectedType: "string ('Mar 24, 2026' format)",
    targetTable: "(not stored — but needed for retention logic)",
    targetField: "N/A (future: membership_periods table?)",
    transform: "parseWodifyDate()",
    tier1Priority: "useful" as Tier1Priority,
    notes: "Critical for detecting upcoming expirations. Not currently tracked.",
  },
  {
    wodifyEntity: "Membership",
    wodifyField: "Membership Autorenew",
    verification: "verified-csv" as FieldVerification,
    expectedType: "string ('Auto Renew' | 'No Auto Renew')",
    targetTable: "(not stored)",
    targetField: "N/A",
    transform: "Detect churn risk: 'No Auto Renew' + near expiration = at-risk",
    tier1Priority: "useful" as Tier1Priority,
    notes: "Key retention signal. Should factor into riskScore computation.",
  },
  {
    wodifyEntity: "Membership",
    wodifyField: "Payment Plan",
    verification: "verified-csv" as FieldVerification,
    expectedType: "string",
    targetTable: "(not stored separately)",
    targetField: "N/A",
    transform: "Informational",
    tier1Priority: "ignore-for-now" as Tier1Priority,
    notes: "Values: 'Unlimited', '3x/week', 'Couples Unlimited', '10 Class Pack', etc.",
  },
  {
    wodifyEntity: "Membership",
    wodifyField: "Payment Plan Type",
    verification: "verified-csv" as FieldVerification,
    expectedType: "string ('Monthly' | 'Pay in Full')",
    targetTable: "(not stored)",
    targetField: "N/A",
    transform: "None",
    tier1Priority: "ignore-for-now" as Tier1Priority,
    notes: "Useful for billing context but not needed for analytics.",
  },
  {
    wodifyEntity: "Membership",
    wodifyField: "Location",
    verification: "verified-csv" as FieldVerification,
    expectedType: "string",
    targetTable: "(not stored — single-location assumption for now)",
    targetField: "N/A",
    transform: "None",
    tier1Priority: "ignore-for-now" as Tier1Priority,
    notes: "Multi-location support is a future consideration.",
  },
  {
    wodifyEntity: "Membership",
    wodifyField: "Programs",
    verification: "verified-csv" as FieldVerification,
    expectedType: "comma-separated string",
    targetTable: "(not stored — programs tracked separately if needed)",
    targetField: "N/A",
    transform: "Split on comma, trim, deduplicate per member",
    tier1Priority: "useful" as Tier1Priority,
    notes: "Values: 'WOD', 'Open Gym', 'Yoga', 'Oly Class', etc. Already parsed in import-wodify.ts.",
  },
  {
    wodifyEntity: "Membership",
    wodifyField: "Commitment Total",
    verification: "verified-csv" as FieldVerification,
    expectedType: "decimal string",
    targetTable: "(not stored separately)",
    targetField: "N/A",
    transform: "parseFloat",
    tier1Priority: "ignore-for-now" as Tier1Priority,
    notes: "Represents total commitment (same as Autorenew for monthly, or full price for punch cards).",
  },
] as const;

// ---------------------------------------------------------------------------
// 4. INVOICES → revenue analytics
// ---------------------------------------------------------------------------
// Wodify endpoint: GET /invoices (docs.wodify.com/reference/get_invoices)
// CSV: NOT available in "All Memberships" report — separate report or API only
//
// Conceptual note: Wodify invoices represent REALIZED revenue (actual charges),
// not projected revenue. For Tier 1, we need invoices to:
//   - Calculate actual MRR (not just commitment amounts)
//   - Detect failed payments / payment gaps
//   - Build revenue trend charts over time
//
// The Iron Metrics billing schema (invoices, payments tables) is designed
// around Stripe. For Wodify-sourced revenue, we need a lighter approach —
// likely a separate wodify_invoices table or revenue_events table, since
// we're not managing billing, just observing it.
// ---------------------------------------------------------------------------

export const INVOICE_FIELD_MAP = [
  {
    wodifyEntity: "Invoice",
    wodifyField: "InvoiceId",
    wodifyEndpoint: "GET /invoices",
    verification: "inferred-docs" as FieldVerification,
    expectedType: "integer or string",
    targetTable: "(new: wodify_revenue_events or similar)",
    targetField: "externalId",
    tier1Priority: "must-have" as Tier1Priority,
    notes: "Needs live verify. Dedup key for invoice sync.",
  },
  {
    wodifyEntity: "Invoice",
    wodifyField: "ClientId",
    wodifyEndpoint: "GET /invoices",
    verification: "inferred-docs" as FieldVerification,
    expectedType: "integer",
    targetTable: "(join to members via wodifyClientId)",
    targetField: "memberId (resolved)",
    tier1Priority: "must-have" as Tier1Priority,
    notes: "Links invoice to member. Needs live verify.",
  },
  {
    wodifyEntity: "Invoice",
    wodifyField: "Amount / Total",
    wodifyEndpoint: "GET /invoices",
    verification: "needs-live-verify" as FieldVerification,
    expectedType: "decimal",
    targetTable: "(new revenue table)",
    targetField: "amount",
    tier1Priority: "must-have" as Tier1Priority,
    notes: "Actual charged amount. Needed for real MRR vs projected.",
  },
  {
    wodifyEntity: "Invoice",
    wodifyField: "Status",
    wodifyEndpoint: "GET /invoices",
    verification: "inferred-docs" as FieldVerification,
    expectedType: "string ('Paid' | 'Partially Refunded' | 'Refunded' | 'Unpaid' | 'Voided')",
    targetTable: "(new revenue table)",
    targetField: "status",
    tier1Priority: "must-have" as Tier1Priority,
    notes: "Status values from Wodify help docs. Needed for failed payment detection.",
  },
  {
    wodifyEntity: "Invoice",
    wodifyField: "InvoiceDate / CreatedDate",
    wodifyEndpoint: "GET /invoices",
    verification: "needs-live-verify" as FieldVerification,
    expectedType: "string (ISO date)",
    targetTable: "(new revenue table)",
    targetField: "invoiceDate",
    tier1Priority: "must-have" as Tier1Priority,
    notes: "Needed for revenue trend charts and MRR time series.",
  },
  {
    wodifyEntity: "Invoice",
    wodifyField: "DueDate",
    wodifyEndpoint: "GET /invoices",
    verification: "needs-live-verify" as FieldVerification,
    expectedType: "string (ISO date)",
    targetTable: "(new revenue table)",
    targetField: "dueDate",
    tier1Priority: "useful" as Tier1Priority,
    notes: "For overdue invoice detection.",
  },
  {
    wodifyEntity: "Invoice",
    wodifyField: "RevenueCategory",
    wodifyEndpoint: "GET /invoices",
    verification: "needs-live-verify" as FieldVerification,
    expectedType: "string",
    targetTable: "(new revenue table)",
    targetField: "category",
    tier1Priority: "useful" as Tier1Priority,
    notes: "Wodify has Revenue Categories as a separate entity. Useful for breaking down revenue by type (memberships vs retail vs drop-ins).",
  },
] as const;

// ---------------------------------------------------------------------------
// 5. CLASS SIGN-INS → attendance table
// ---------------------------------------------------------------------------
// Wodify endpoint: GET /class-signins (inferred from docs nav)
// CSV: Wodify "Attendance" report (separate from Memberships report)
// Zapier: "Client signed into class" trigger
//
// Conceptual note: This is the MOST CRITICAL missing data for Tier 1.
// Without attendance data, engagement rate, risk scores, and retention
// metrics are all empty. Iron Metrics already has an attendance table
// that matches this data shape well.
// ---------------------------------------------------------------------------

export const CLASS_SIGNIN_FIELD_MAP = [
  {
    wodifyEntity: "ClassSignIn",
    wodifyField: "SignInId / AttendanceId",
    wodifyEndpoint: "GET /class-signins",
    verification: "needs-live-verify" as FieldVerification,
    expectedType: "integer",
    targetTable: "attendance",
    targetField: "(external ID — not yet stored)",
    tier1Priority: "must-have" as Tier1Priority,
    notes: "Dedup key for attendance sync. Needs column addition.",
  },
  {
    wodifyEntity: "ClassSignIn",
    wodifyField: "ClientId",
    wodifyEndpoint: "GET /class-signins",
    verification: "needs-live-verify" as FieldVerification,
    expectedType: "integer",
    targetTable: "attendance",
    targetField: "memberId (resolved via wodifyClientId)",
    tier1Priority: "must-have" as Tier1Priority,
    notes: "Must resolve to internal member ID.",
  },
  {
    wodifyEntity: "ClassSignIn",
    wodifyField: "ClientName",
    wodifyEndpoint: "GET /class-signins",
    verification: "needs-live-verify" as FieldVerification,
    expectedType: "string",
    targetTable: "attendance",
    targetField: "memberName",
    tier1Priority: "must-have" as Tier1Priority,
    notes: "Denormalized name for display. Already exists in attendance table.",
  },
  {
    wodifyEntity: "ClassSignIn",
    wodifyField: "ClassName / ProgramName",
    wodifyEndpoint: "GET /class-signins",
    verification: "needs-live-verify" as FieldVerification,
    expectedType: "string",
    targetTable: "attendance",
    targetField: "className",
    tier1Priority: "must-have" as Tier1Priority,
    notes: "e.g., 'WOD', 'Open Gym', 'Yoga'. Maps to attendance.className.",
  },
  {
    wodifyEntity: "ClassSignIn",
    wodifyField: "ClassDate / SignInDate",
    wodifyEndpoint: "GET /class-signins",
    verification: "needs-live-verify" as FieldVerification,
    expectedType: "string (ISO datetime)",
    targetTable: "attendance",
    targetField: "checkinTime",
    tier1Priority: "must-have" as Tier1Priority,
    notes: "The actual check-in timestamp. Critical for lastVisitDate and attendanceCount30d.",
  },
  {
    wodifyEntity: "ClassSignIn",
    wodifyField: "Status / SignInType",
    wodifyEndpoint: "GET /class-signins",
    verification: "needs-live-verify" as FieldVerification,
    expectedType: "string",
    targetTable: "attendance",
    targetField: "status",
    tier1Priority: "useful" as Tier1Priority,
    notes: "Possible values: signed-in, drop-in, late-cancel, no-show. Needs normalization to Iron Metrics attendance statuses.",
  },
  {
    wodifyEntity: "ClassSignIn",
    wodifyField: "ClassId",
    wodifyEndpoint: "GET /class-signins",
    verification: "needs-live-verify" as FieldVerification,
    expectedType: "integer",
    targetTable: "attendance",
    targetField: "classId (nullable — we may not sync classes)",
    tier1Priority: "useful" as Tier1Priority,
    notes: "For Tier 1 we mostly care about the check-in fact, not the class details.",
  },
] as const;

// ---------------------------------------------------------------------------
// 6. SECONDARY ENTITIES (Classes, Programs, Reservations, Revenue Categories)
// ---------------------------------------------------------------------------
// These are NOT required for Tier 1 MVP but may enrich analytics.
// ---------------------------------------------------------------------------

export const SECONDARY_ENTITIES = {
  Classes: {
    endpoint: "GET /classes",
    verification: "needs-live-verify" as FieldVerification,
    tier1Priority: "ignore-for-now" as Tier1Priority,
    notes: "Useful for schedule display (Growth tier). For Tier 1, className from sign-ins is sufficient.",
    likelyFields: ["ClassId", "Name", "ProgramName", "StartTime", "EndTime", "Capacity", "Location"],
  },
  Programs: {
    endpoint: "GET /programs",
    verification: "inferred-docs" as FieldVerification,
    tier1Priority: "ignore-for-now" as Tier1Priority,
    notes: "Already extracted from CSV Programs column. API likely has: ProgramId, Name, Description, IsActive.",
    likelyFields: ["ProgramId", "Name", "Description", "IsActive"],
  },
  ClientReservations: {
    endpoint: "GET /client-reservations",
    verification: "needs-live-verify" as FieldVerification,
    tier1Priority: "ignore-for-now" as Tier1Priority,
    notes: "Future reservations and no-shows. Could enhance attendance analytics but not needed for Tier 1 launch.",
    likelyFields: ["ReservationId", "ClientId", "ClassId", "Status", "CreatedDate"],
  },
  RevenueCategories: {
    endpoint: "GET /revenue-categories",
    verification: "needs-live-verify" as FieldVerification,
    tier1Priority: "ignore-for-now" as Tier1Priority,
    notes: "Categorizes invoice line items (Membership, Retail, Drop-in, etc.). Useful for revenue breakdown charts.",
    likelyFields: ["CategoryId", "Name", "Description"],
  },
} as const;

// ---------------------------------------------------------------------------
// 7. CONCEPTUAL DIFFERENCES: Wodify vs Iron Metrics
// ---------------------------------------------------------------------------

export const CONCEPTUAL_NOTES = {
  clientVsMember: `
    Wodify "Client" = Iron Metrics "Member" (1:1).
    A Client can have MULTIPLE Memberships simultaneously.
    We consolidate all memberships into one member record, storing the
    primary (highest-revenue) membership as membershipType.
  `,
  membershipVsSubscription: `
    Wodify "Membership" ≠ Iron Metrics "Subscription".
    - Wodify Membership: the plan assignment in Wodify (their system of record)
    - Iron Metrics Subscription: a Stripe-backed billing relationship
    For Tier 1, Wodify remains billing SoR. We import membership data
    as read-only context (membershipType, MRR), NOT as Iron Metrics subscriptions.
    Iron Metrics subscriptions table is for gyms that migrate billing to us.
  `,
  invoiceVsPayment: `
    Wodify "Invoice" ≈ a charge record with status (Paid/Unpaid/Voided).
    Iron Metrics has separate invoices and payments tables (Stripe-oriented).
    For Wodify-sourced data, we should create a lightweight revenue_events
    or wodify_invoices table rather than shoehorning into the Stripe schema.
  `,
  attendanceVsReservation: `
    Wodify "Class Sign-In" = an actual check-in (happened in the past).
    Wodify "Reservation" = an intent to attend (future, may become no-show).
    Iron Metrics "Attendance" table stores actual check-ins.
    For Tier 1, we only need sign-ins. Reservations are Growth-tier territory.
  `,
  statusNormalization: `
    Wodify client statuses are their own taxonomy (likely: Active, Inactive,
    On Hold, Suspended, Cancelled, Lead, etc.).
    Iron Metrics uses: active, inactive, hold, cancelled, prospect.
    Normalization mapping is defined in CLIENT_STATUS_MAP above.
    Exact Wodify values NEED LIVE API VERIFICATION.
  `,
  manyToOneRelationships: `
    - Client → Memberships: ONE client has MANY memberships (already handled)
    - Client → Invoices: ONE client has MANY invoices over time
    - Client → Sign-Ins: ONE client has MANY attendance records
    - Class → Sign-Ins: ONE class has MANY sign-in records
    - Membership → Invoices: ONE membership can generate MANY invoices
  `,
};

// ---------------------------------------------------------------------------
// 8. RECOMMENDED SYNC ORDER
// ---------------------------------------------------------------------------

export const SYNC_ORDER = [
  {
    step: 1,
    entity: "Clients + Client Statuses",
    reason: "Foundation — members must exist before attendance/invoices can reference them",
    dependencies: "None",
    existingCode: "import-wodify.ts handles CSV version. API sync extends same pattern.",
  },
  {
    step: 2,
    entity: "Memberships",
    reason: "Enriches member records with plan context and projected MRR",
    dependencies: "Clients must be synced first",
    existingCode: "import-wodify.ts already consolidates memberships per client.",
  },
  {
    step: 3,
    entity: "Invoices",
    reason: "Realized revenue for actual MRR, payment gap detection, revenue trends",
    dependencies: "Clients must exist for FK resolution",
    existingCode: "None — new table needed for Wodify-sourced revenue data.",
  },
  {
    step: 4,
    entity: "Class Sign-Ins",
    reason: "Attendance data for engagement rate, risk scores, retention analytics",
    dependencies: "Clients must exist for FK resolution",
    existingCode: "attendance table exists with compatible schema.",
  },
  {
    step: 5,
    entity: "Classes / Programs (optional)",
    reason: "Enriches attendance records with class metadata",
    dependencies: "Useful but not blocking",
    existingCode: "classes table exists but is designed for Iron Metrics-managed scheduling.",
  },
] as const;

// ---------------------------------------------------------------------------
// 9. OPEN QUESTIONS REQUIRING LIVE API VERIFICATION
// ---------------------------------------------------------------------------

export const OPEN_QUESTIONS = [
  {
    id: "Q1",
    question: "Does GET /clients return separate FirstName and LastName fields, or just a combined Name?",
    impact: "Determines whether we need the name-splitting logic for API sync (already have it for CSV).",
    howToVerify: "curl -H 'x-api-key: KEY' https://api.wodify.com/v1/clients | head",
  },
  {
    id: "Q2",
    question: "Does GET /clients include Phone, DateOfBirth, Address fields?",
    impact: "Phone is notably missing from CSV export. If API has it, we can enrich member profiles.",
    howToVerify: "Same as Q1 — inspect response body.",
  },
  {
    id: "Q3",
    question: "What are the exact client status values returned by GET /client-statuses?",
    impact: "Needed to build accurate CLIENT_STATUS_MAP normalization.",
    howToVerify: "curl -H 'x-api-key: KEY' https://api.wodify.com/v1/client-statuses",
  },
  {
    id: "Q4",
    question: "Does GET /invoices exist and what fields does it return?",
    impact: "Determines whether we can build real revenue analytics or must rely on commitment totals from memberships.",
    howToVerify: "curl -H 'x-api-key: KEY' https://api.wodify.com/v1/invoices",
  },
  {
    id: "Q5",
    question: "Does GET /class-signins (or similar) exist? What's the exact endpoint path?",
    impact: "CRITICAL — attendance is the #1 missing data for Tier 1. Without this endpoint, we fall back to CSV import of Attendance report.",
    howToVerify: "Try: /v1/class-signins, /v1/attendance, /v1/signins, /v1/class-sign-ins",
  },
  {
    id: "Q6",
    question: "What pagination does the API use? Cursor-based or offset/limit?",
    impact: "Determines sync job implementation. Large gyms may have 10k+ attendance records.",
    howToVerify: "Check response headers/body for pagination metadata on any list endpoint.",
  },
  {
    id: "Q7",
    question: "Does the API support filtering by date range (e.g., ?since=2026-01-01)?",
    impact: "Enables incremental sync instead of full re-sync each time.",
    howToVerify: "Try query params like ?startDate=, ?since=, ?updatedSince= on list endpoints.",
  },
  {
    id: "Q8",
    question: "Are there rate limits on the API?",
    impact: "Determines sync job scheduling and backoff strategy.",
    howToVerify: "Check response headers for X-RateLimit-* or similar after making requests.",
  },
  {
    id: "Q9",
    question: "Does GET /memberships return per-client or global membership catalog?",
    impact: "Determines if we can get membership details per client or need to cross-reference.",
    howToVerify: "curl -H 'x-api-key: KEY' https://api.wodify.com/v1/memberships?clientId=2642634",
  },
] as const;
