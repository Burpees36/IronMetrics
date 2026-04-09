/**
 * Wodify → ForgeOS Field Map
 *
 * Source-of-truth mapping between Wodify API entities and ForgeOS
 * internal schema.
 *
 * ## Verification status (updated 2026-03-25)
 * - LIVE API VERIFIED: Probed with real API key against api.wodify.com/v1
 * - CSV fields: Cross-referenced against real "All Memberships" export
 *
 * ## Available endpoints (5 of 15 probed):
 *   ✅ GET /clients      — 73 fields (VERIFIED)
 *   ✅ GET /memberships   — 50 fields (VERIFIED)
 *   ✅ GET /classes        — 69 fields (VERIFIED)
 *   ✅ GET /programs       — 12 fields (VERIFIED)
 *   ✅ GET /leads          — 47 fields (VERIFIED)
 *
 * ## Unavailable endpoints (all return 403 "Missing Authentication Token"):
 *   ❌ /client-statuses, /invoices, /class-signins, /class-sign-ins,
 *   ❌ /attendance, /signins, /reservations, /client-reservations,
 *   ❌ /revenue-categories
 *
 * ## Key discovery:
 * The /clients endpoint includes ATTENDANCE SUMMARY fields
 * (last_attendance, days_since_last_attendance, total_class_sign_ins,
 * is_at_risk, current_weekstreak) — eliminating the need for a
 * dedicated attendance endpoint for Tier 1 analytics.
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
  | "verified-api"       // Seen in live API response
  | "verified-csv"       // Seen in real CSV export from user
  | "verified-both"      // Confirmed in both API and CSV
  | "api-only"           // In API but not in CSV export
  | "csv-only"           // In CSV but not in API (or different field name)
  | "endpoint-unavailable"; // Endpoint returned 403

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
// Wodify endpoint: GET /v1/clients (VERIFIED — 73 fields)
// Response wrapper: { "clients": [...] }
//
// API uses snake_case field names (e.g., first_name, phone_number).
// CSV uses Title Case with spaces (e.g., "Client Name", "Email").
//
// Critical discovery: Client records include attendance summary data
// (last_attendance, days_since_last_attendance, total_class_sign_ins,
// is_at_risk, current_weekstreak). This eliminates the Tier 1 data gap.
// ---------------------------------------------------------------------------

export const CLIENT_FIELD_MAP = [
  {
    apiField: "id",
    verification: "verified-api" as FieldVerification,
    apiType: "integer",
    sampleValue: 2627425,
    targetTable: "members",
    targetField: "wodifyClientId (NEW — needs migration)",
    transform: "Store as-is for dedup/reconciliation",
    nullBehavior: "Skip row if missing",
    tier1Priority: "must-have" as Tier1Priority,
    csvEquivalent: "Client ID",
  },
  {
    apiField: "first_name",
    verification: "verified-api" as FieldVerification,
    apiType: "string",
    sampleValue: "Andrea",
    targetTable: "members",
    targetField: "firstName",
    transform: "Trim",
    nullBehavior: "Error row if missing",
    tier1Priority: "must-have" as Tier1Priority,
    csvEquivalent: "Client Name (combined — split on first space)",
  },
  {
    apiField: "last_name",
    verification: "verified-api" as FieldVerification,
    apiType: "string",
    sampleValue: "Nisler",
    targetTable: "members",
    targetField: "lastName",
    transform: "Trim",
    nullBehavior: "Error row if missing",
    tier1Priority: "must-have" as Tier1Priority,
    csvEquivalent: "Client Name (combined — split on first space)",
  },
  {
    apiField: "email",
    verification: "verified-both" as FieldVerification,
    apiType: "string",
    sampleValue: "andreanisler8@gmail.com",
    targetTable: "members",
    targetField: "email",
    transform: "Lowercase, trim",
    nullBehavior: "Error row if missing",
    tier1Priority: "must-have" as Tier1Priority,
    csvEquivalent: "Email",
  },
  {
    apiField: "phone_number",
    verification: "verified-api" as FieldVerification,
    apiType: "string",
    sampleValue: "(651) 233-0613",
    targetTable: "members",
    targetField: "phone",
    transform: "normalizePhone() — strip parens/dashes/spaces",
    nullBehavior: "null (empty string in API = no phone)",
    tier1Priority: "useful" as Tier1Priority,
    csvEquivalent: "NOT IN CSV",
  },
  {
    apiField: "client_status_id",
    verification: "verified-api" as FieldVerification,
    apiType: "integer",
    sampleValue: 226263,
    targetTable: "(reference only — use client_status string)",
    targetField: "N/A",
    transform: "None",
    nullBehavior: "N/A",
    tier1Priority: "useful" as Tier1Priority,
    csvEquivalent: "NOT IN CSV",
  },
  {
    apiField: "client_status",
    verification: "verified-api" as FieldVerification,
    apiType: "string",
    sampleValue: "Active",
    targetTable: "members",
    targetField: "status",
    transform: "Normalize to Iron Metrics statuses — see CLIENT_STATUS_MAP",
    nullBehavior: "Default 'active'",
    tier1Priority: "must-have" as Tier1Priority,
    csvEquivalent: "NOT IN CSV (all exported members are implicitly active)",
  },
  {
    apiField: "date_of_birth",
    verification: "verified-api" as FieldVerification,
    apiType: "string (ISO date)",
    sampleValue: "1989-07-04",
    targetTable: "members",
    targetField: "birthDate",
    transform: "Already ISO format — store as-is",
    nullBehavior: "null",
    tier1Priority: "useful" as Tier1Priority,
    csvEquivalent: "NOT IN CSV",
  },
  {
    apiField: "gender_id",
    verification: "verified-api" as FieldVerification,
    apiType: "integer",
    sampleValue: 1,
    targetTable: "(not stored — no gender column in members)",
    targetField: "N/A",
    transform: "None",
    nullBehavior: "N/A",
    tier1Priority: "ignore-for-now" as Tier1Priority,
    csvEquivalent: "NOT IN CSV",
  },
  {
    apiField: "gender",
    verification: "verified-api" as FieldVerification,
    apiType: "string",
    sampleValue: "Female",
    targetTable: "(not stored — could add if needed for demographics)",
    targetField: "N/A",
    transform: "None",
    nullBehavior: "N/A",
    tier1Priority: "ignore-for-now" as Tier1Priority,
    csvEquivalent: "NOT IN CSV",
  },
  {
    apiField: "street_address_1",
    verification: "verified-api" as FieldVerification,
    apiType: "string",
    sampleValue: "753 scheffer ave",
    targetTable: "members",
    targetField: "address",
    transform: "Trim. Concatenate street_address_1 + street_address_2 if both present.",
    nullBehavior: "null (empty string = no address)",
    tier1Priority: "ignore-for-now" as Tier1Priority,
    csvEquivalent: "NOT IN CSV",
  },
  {
    apiField: "street_address_2",
    verification: "verified-api" as FieldVerification,
    apiType: "string",
    sampleValue: "",
    targetTable: "members",
    targetField: "address (appended)",
    transform: "Append to street_address_1 if non-empty",
    nullBehavior: "Skip",
    tier1Priority: "ignore-for-now" as Tier1Priority,
    csvEquivalent: "NOT IN CSV",
  },
  {
    apiField: "city",
    verification: "verified-api" as FieldVerification,
    apiType: "string",
    sampleValue: "Saint Paul",
    targetTable: "members",
    targetField: "city",
    transform: "Trim",
    nullBehavior: "null",
    tier1Priority: "ignore-for-now" as Tier1Priority,
    csvEquivalent: "NOT IN CSV",
  },
  {
    apiField: "state",
    verification: "verified-api" as FieldVerification,
    apiType: "string",
    sampleValue: "Minnesota",
    targetTable: "members",
    targetField: "state",
    transform: "Trim (API returns full name, not abbreviation)",
    nullBehavior: "null",
    tier1Priority: "ignore-for-now" as Tier1Priority,
    csvEquivalent: "NOT IN CSV",
  },
  {
    apiField: "zipcode",
    verification: "verified-api" as FieldVerification,
    apiType: "string",
    sampleValue: "55102",
    targetTable: "(not stored — no zip column in members)",
    targetField: "N/A",
    transform: "None",
    nullBehavior: "N/A",
    tier1Priority: "ignore-for-now" as Tier1Priority,
    csvEquivalent: "NOT IN CSV",
  },
  {
    apiField: "is_email_subscribed",
    verification: "verified-api" as FieldVerification,
    apiType: "boolean",
    sampleValue: true,
    targetTable: "members",
    targetField: "tags[]",
    transform: "false → add 'email-opt-out' tag",
    nullBehavior: "Default true (subscribed)",
    tier1Priority: "useful" as Tier1Priority,
    csvEquivalent: "Mass Email Subscribed ('Subscribed' | 'Not Subscribed')",
  },
  {
    apiField: "is_sms_subscribed",
    verification: "verified-api" as FieldVerification,
    apiType: "boolean",
    sampleValue: true,
    targetTable: "members",
    targetField: "tags[]",
    transform: "false → add 'sms-opt-out' tag",
    nullBehavior: "Default true",
    tier1Priority: "useful" as Tier1Priority,
    csvEquivalent: "NOT IN CSV",
  },
  {
    apiField: "tags",
    verification: "verified-api" as FieldVerification,
    apiType: "string[]",
    sampleValue: ["HybridAF"],
    targetTable: "members",
    targetField: "tags[]",
    transform: "Merge with Iron Metrics tags (deduplicate)",
    nullBehavior: "Empty array",
    tier1Priority: "useful" as Tier1Priority,
    csvEquivalent: "NOT IN CSV",
  },
  {
    apiField: "created_on",
    verification: "verified-api" as FieldVerification,
    apiType: "object { created_by_id, created_by, created_on_datetime }",
    sampleValue: { created_by_id: 98405, created_by: "Tony Koens", created_on_datetime: "2017-08-16T15:52:53Z" },
    targetTable: "(metadata — could log who created the client)",
    targetField: "N/A",
    transform: "Extract created_on_datetime for joinDate fallback",
    nullBehavior: "N/A",
    tier1Priority: "useful" as Tier1Priority,
    csvEquivalent: "NOT IN CSV",
  },
  {
    apiField: "updated",
    verification: "verified-api" as FieldVerification,
    apiType: "object { updated_by_id, updated_by, updated_on_datetime }",
    sampleValue: { updated_by_id: 17597, updated_by: "System User", updated_on_datetime: "2026-01-14T18:57:11Z" },
    targetTable: "(sync metadata — for incremental sync)",
    targetField: "N/A",
    transform: "Use updated_on_datetime for delta sync (only re-sync clients updated since last sync)",
    nullBehavior: "N/A",
    tier1Priority: "must-have" as Tier1Priority,
    csvEquivalent: "NOT IN CSV",
  },
  {
    apiField: "emergency_contact_name",
    verification: "verified-api" as FieldVerification,
    apiType: "string",
    sampleValue: "cheryl nisler",
    targetTable: "members",
    targetField: "emergencyContactName",
    transform: "Title-case normalize",
    nullBehavior: "null (empty string = none)",
    tier1Priority: "useful" as Tier1Priority,
    csvEquivalent: "NOT IN CSV",
  },
  {
    apiField: "emergency_contact_phone",
    verification: "verified-api" as FieldVerification,
    apiType: "string",
    sampleValue: "6512330614",
    targetTable: "members",
    targetField: "emergencyContactPhone",
    transform: "normalizePhone()",
    nullBehavior: "null",
    tier1Priority: "useful" as Tier1Priority,
    csvEquivalent: "NOT IN CSV",
  },

  // -----------------------------------------------------------------------
  // ATTENDANCE SUMMARY FIELDS (on client record — no separate endpoint needed!)
  // -----------------------------------------------------------------------
  {
    apiField: "last_attendance",
    verification: "verified-api" as FieldVerification,
    apiType: "string (ISO datetime)",
    sampleValue: "2026-03-21T09:00:00Z",
    targetTable: "members",
    targetField: "lastVisitDate",
    transform: "Parse ISO → Date. THIS SOLVES THE TIER 1 DATA GAP.",
    nullBehavior: "null (member has never attended)",
    tier1Priority: "must-have" as Tier1Priority,
    csvEquivalent: "NOT IN CSV",
  },
  {
    apiField: "days_since_last_attendance",
    verification: "verified-api" as FieldVerification,
    apiType: "integer",
    sampleValue: 4,
    targetTable: "(computed — used for risk scoring)",
    targetField: "riskScore (input)",
    transform: "Feed into calculateRiskScore(). Higher days = higher risk.",
    nullBehavior: "null = never attended = highest risk",
    tier1Priority: "must-have" as Tier1Priority,
    csvEquivalent: "NOT IN CSV",
  },
  {
    apiField: "total_class_sign_ins",
    verification: "verified-api" as FieldVerification,
    apiType: "integer",
    sampleValue: 847,
    targetTable: "(computed — lifetime attendance count)",
    targetField: "N/A (could add lifetime_attendance to members)",
    transform: "Store as-is. Not the same as attendanceCount30d — this is lifetime.",
    nullBehavior: "0",
    tier1Priority: "useful" as Tier1Priority,
    csvEquivalent: "NOT IN CSV",
  },
  {
    apiField: "total_booking_sign_ins",
    verification: "verified-api" as FieldVerification,
    apiType: "integer",
    sampleValue: 0,
    targetTable: "(not stored separately)",
    targetField: "N/A",
    transform: "Could add to total for combined attendance metrics",
    nullBehavior: "0",
    tier1Priority: "ignore-for-now" as Tier1Priority,
    csvEquivalent: "NOT IN CSV",
  },
  {
    apiField: "last_class_sign_in",
    verification: "verified-api" as FieldVerification,
    apiType: "string (ISO datetime)",
    sampleValue: "2026-03-21T09:00:00Z",
    targetTable: "(same as last_attendance for class context)",
    targetField: "lastVisitDate (same target — use most recent of class/booking)",
    transform: "Compare with last_booking_sign_in, use most recent",
    nullBehavior: "Check last_attendance instead",
    tier1Priority: "must-have" as Tier1Priority,
    csvEquivalent: "NOT IN CSV",
  },
  {
    apiField: "is_at_risk",
    verification: "verified-api" as FieldVerification,
    apiType: "boolean",
    sampleValue: false,
    targetTable: "(reference — could compare with our own risk calculation)",
    targetField: "N/A",
    transform: "Log for comparison but use our own riskScore system",
    nullBehavior: "false",
    tier1Priority: "useful" as Tier1Priority,
    csvEquivalent: "NOT IN CSV",
  },
  {
    apiField: "current_weekstreak",
    verification: "verified-api" as FieldVerification,
    apiType: "integer",
    sampleValue: 12,
    targetTable: "(not stored — could add to members for engagement display)",
    targetField: "N/A",
    transform: "Store as-is. Great engagement signal.",
    nullBehavior: "0",
    tier1Priority: "useful" as Tier1Priority,
    csvEquivalent: "NOT IN CSV",
  },
  {
    apiField: "highest_weekstreak",
    verification: "verified-api" as FieldVerification,
    apiType: "integer",
    sampleValue: 52,
    targetTable: "(not stored)",
    targetField: "N/A",
    transform: "Store for gamification features",
    nullBehavior: "0",
    tier1Priority: "ignore-for-now" as Tier1Priority,
    csvEquivalent: "NOT IN CSV",
  },
  {
    apiField: "member_since",
    verification: "verified-api" as FieldVerification,
    apiType: "string (ISO date)",
    sampleValue: "2019-04-03",
    targetTable: "members",
    targetField: "joinDate",
    transform: "Already ISO format — store as-is. MORE ACCURATE than CSV Start Date.",
    nullBehavior: "Fall back to created_on.created_on_datetime",
    tier1Priority: "must-have" as Tier1Priority,
    csvEquivalent: "Start Date (first membership — less accurate)",
  },
  {
    apiField: "last_contacted",
    verification: "verified-api" as FieldVerification,
    apiType: "string (ISO date)",
    sampleValue: "2026-03-20",
    targetTable: "(not stored — could add for retention outreach tracking)",
    targetField: "N/A",
    transform: "None",
    nullBehavior: "null",
    tier1Priority: "useful" as Tier1Priority,
    csvEquivalent: "NOT IN CSV",
  },

  // -----------------------------------------------------------------------
  // LOCATION / PROGRAM CONTEXT
  // -----------------------------------------------------------------------
  {
    apiField: "location_id",
    verification: "verified-api" as FieldVerification,
    apiType: "integer",
    sampleValue: 7523,
    targetTable: "(not stored — single-location assumption for now)",
    targetField: "N/A",
    transform: "None (multi-location is Growth tier)",
    nullBehavior: "N/A",
    tier1Priority: "ignore-for-now" as Tier1Priority,
    csvEquivalent: "Location (name, not ID)",
  },
  {
    apiField: "location",
    verification: "verified-api" as FieldVerification,
    apiType: "string",
    sampleValue: "Timberwolf Fitness Roseville",
    targetTable: "(not stored)",
    targetField: "N/A",
    transform: "None",
    nullBehavior: "N/A",
    tier1Priority: "ignore-for-now" as Tier1Priority,
    csvEquivalent: "Location",
  },
  {
    apiField: "default_program_id",
    verification: "verified-api" as FieldVerification,
    apiType: "integer",
    sampleValue: 58747,
    targetTable: "(not stored)",
    targetField: "N/A",
    transform: "None",
    nullBehavior: "N/A",
    tier1Priority: "ignore-for-now" as Tier1Priority,
    csvEquivalent: "NOT IN CSV",
  },
  {
    apiField: "default_program",
    verification: "verified-api" as FieldVerification,
    apiType: "string",
    sampleValue: "WOD",
    targetTable: "(not stored — programs in CSV are per-membership)",
    targetField: "N/A",
    transform: "None",
    nullBehavior: "N/A",
    tier1Priority: "ignore-for-now" as Tier1Priority,
    csvEquivalent: "Programs (per-membership, comma-separated)",
  },

  // -----------------------------------------------------------------------
  // LEAD/REFERRAL CONTEXT
  // -----------------------------------------------------------------------
  {
    apiField: "lead_source",
    verification: "verified-api" as FieldVerification,
    apiType: "string",
    sampleValue: "",
    targetTable: "(not stored — could add to member timeline)",
    targetField: "N/A",
    transform: "None",
    nullBehavior: "null",
    tier1Priority: "ignore-for-now" as Tier1Priority,
    csvEquivalent: "NOT IN CSV",
  },
  {
    apiField: "referring_user",
    verification: "verified-api" as FieldVerification,
    apiType: "string",
    sampleValue: "",
    targetTable: "(not stored)",
    targetField: "N/A",
    transform: "None",
    nullBehavior: "null",
    tier1Priority: "ignore-for-now" as Tier1Priority,
    csvEquivalent: "NOT IN CSV",
  },
  {
    apiField: "is_converted_from_lead",
    verification: "verified-api" as FieldVerification,
    apiType: "boolean",
    sampleValue: false,
    targetTable: "(not stored)",
    targetField: "N/A",
    transform: "None",
    nullBehavior: "false",
    tier1Priority: "ignore-for-now" as Tier1Priority,
    csvEquivalent: "NOT IN CSV",
  },

  // -----------------------------------------------------------------------
  // COACH-SPECIFIC FIELDS (irrelevant for member sync)
  // -----------------------------------------------------------------------
  {
    apiField: "coach_title / coach_bio / coach_link_*",
    verification: "verified-api" as FieldVerification,
    apiType: "string fields",
    sampleValue: "(empty for non-coach clients)",
    targetTable: "(not stored)",
    targetField: "N/A",
    transform: "None — these are populated only for staff who are also coaches",
    nullBehavior: "N/A",
    tier1Priority: "ignore-for-now" as Tier1Priority,
    csvEquivalent: "NOT IN CSV",
  },

  // -----------------------------------------------------------------------
  // BODY METRICS (rarely populated)
  // -----------------------------------------------------------------------
  {
    apiField: "height_measurement_1 / height_measurement_2 / weight",
    verification: "verified-api" as FieldVerification,
    apiType: "numeric",
    sampleValue: "0 / 0 / 0.00000000",
    targetTable: "(not stored)",
    targetField: "N/A",
    transform: "None — typically zero / unpopulated",
    nullBehavior: "N/A",
    tier1Priority: "ignore-for-now" as Tier1Priority,
    csvEquivalent: "NOT IN CSV",
  },
] as const;

// ---------------------------------------------------------------------------
// 2. CLIENT STATUS NORMALIZATION
// ---------------------------------------------------------------------------
// Verified from live API: client_status field returns string values.
// Observed value: "Active". Other values inferred from Wodify docs.
// The /client-statuses endpoint returned 403 — cannot enumerate all values.
// ---------------------------------------------------------------------------

export const CLIENT_STATUS_MAP = {
  _verification: "verified-api" as FieldVerification,
  _notes: "Observed 'Active' in live data. Other values inferred from Wodify context. Gyms can create custom statuses in Wodify, so we need a fallback.",
  mapping: {
    "Active": "active",
    "Inactive": "inactive",
    "On Hold": "hold",
    "Suspended": "hold",
    "Cancelled": "cancelled",
    "Terminated": "cancelled",
    "Lead": "prospect",
    "Prospect": "prospect",
    "Former": "cancelled",
  } as Record<string, string>,
  defaultStatus: "active",
  customStatusBehavior: "If status string not in mapping, default to 'active' and log a warning for the gym owner to review.",
};

// ---------------------------------------------------------------------------
// 3. MEMBERSHIPS → members.membershipType + revenue context
// ---------------------------------------------------------------------------
// Wodify endpoint: GET /v1/memberships (VERIFIED — 50 fields)
// Response wrapper: { "memberships": [...] }
//
// Key difference from CSV: API uses snake_case and has RICHER data,
// including attendance limits, session tracking, contract info, and
// a NESTED payment_plan object with auto-renew and billing details.
// ---------------------------------------------------------------------------

export const MEMBERSHIP_FIELD_MAP = [
  {
    apiField: "id",
    verification: "verified-api" as FieldVerification,
    apiType: "integer",
    sampleValue: 15331620,
    targetTable: "(dedup key — not stored as standalone entity)",
    targetField: "N/A",
    tier1Priority: "useful" as Tier1Priority,
    csvEquivalent: "Membership ID",
  },
  {
    apiField: "client_id",
    verification: "verified-api" as FieldVerification,
    apiType: "integer",
    sampleValue: 2642631,
    targetTable: "members (join key)",
    targetField: "wodifyClientId (resolved to memberId)",
    tier1Priority: "must-have" as Tier1Priority,
    csvEquivalent: "Client ID",
  },
  {
    apiField: "name",
    verification: "verified-api" as FieldVerification,
    apiType: "string",
    sampleValue: "Couples 3x/week",
    targetTable: "members",
    targetField: "membershipType (highest-revenue membership wins)",
    tier1Priority: "must-have" as Tier1Priority,
    csvEquivalent: "Membership",
  },
  {
    apiField: "membership_type",
    verification: "verified-api" as FieldVerification,
    apiType: "string",
    sampleValue: "Class Plan",
    targetTable: "(metadata — 'Class Plan' = recurring, 'Class Pack' = sessions)",
    targetField: "N/A",
    tier1Priority: "useful" as Tier1Priority,
    csvEquivalent: "Membership Type",
  },
  {
    apiField: "attendance_type",
    verification: "verified-api" as FieldVerification,
    apiType: "string",
    sampleValue: "Limited",
    targetTable: "(metadata — 'Unlimited' vs 'Limited')",
    targetField: "N/A",
    tier1Priority: "useful" as Tier1Priority,
    csvEquivalent: "NOT IN CSV",
    notes: "Key for understanding member capacity. 'Limited' = has attendance_limit.",
  },
  {
    apiField: "attendance_limit",
    verification: "verified-api" as FieldVerification,
    apiType: "integer",
    sampleValue: 12,
    targetTable: "(metadata — sessions allowed per period)",
    targetField: "N/A",
    tier1Priority: "useful" as Tier1Priority,
    csvEquivalent: "NOT IN CSV (inferred from membership name like '12x per month')",
  },
  {
    apiField: "number_of_sessions",
    verification: "verified-api" as FieldVerification,
    apiType: "integer",
    sampleValue: 0,
    targetTable: "(metadata — for Class Pack / punch card types)",
    targetField: "N/A",
    tier1Priority: "useful" as Tier1Priority,
    csvEquivalent: "NOT IN CSV",
  },
  {
    apiField: "sessions_already_used",
    verification: "verified-api" as FieldVerification,
    apiType: "integer",
    sampleValue: 0,
    targetTable: "(metadata — session burn rate for punch cards)",
    targetField: "N/A",
    tier1Priority: "useful" as Tier1Priority,
    csvEquivalent: "NOT IN CSV",
  },
  {
    apiField: "start_date",
    verification: "verified-api" as FieldVerification,
    apiType: "string (ISO date)",
    sampleValue: "1900-01-01",
    targetTable: "members",
    targetField: "joinDate (earliest start across memberships)",
    tier1Priority: "must-have" as Tier1Priority,
    csvEquivalent: "Start Date ('Feb 24, 2026' format in CSV)",
    notes: "API returns ISO dates. '1900-01-01' appears to mean 'not set' — treat as null.",
  },
  {
    apiField: "end_date",
    verification: "verified-api" as FieldVerification,
    apiType: "string (ISO date)",
    sampleValue: "1900-01-01",
    targetTable: "(retention tracking — expiration detection)",
    targetField: "N/A",
    tier1Priority: "useful" as Tier1Priority,
    csvEquivalent: "Expiration Date",
    notes: "'1900-01-01' = no end date (open-ended / auto-renew). Non-1900 = membership has defined end.",
  },
  {
    apiField: "expiration_date",
    verification: "verified-api" as FieldVerification,
    apiType: "string (ISO date)",
    sampleValue: "1900-01-01",
    targetTable: "(retention — upcoming expirations)",
    targetField: "N/A",
    tier1Priority: "useful" as Tier1Priority,
    csvEquivalent: "Expiration Date",
    notes: "Separate from end_date. May differ for memberships with grace periods.",
  },
  {
    apiField: "is_active",
    verification: "verified-api" as FieldVerification,
    apiType: "boolean",
    sampleValue: true,
    targetTable: "(filter — only sync active memberships for current state)",
    targetField: "N/A",
    tier1Priority: "must-have" as Tier1Priority,
    csvEquivalent: "NOT IN CSV (CSV only exports active memberships)",
  },
  {
    apiField: "is_deleted",
    verification: "verified-api" as FieldVerification,
    apiType: "boolean",
    sampleValue: false,
    targetTable: "(filter — skip deleted memberships)",
    targetField: "N/A",
    tier1Priority: "must-have" as Tier1Priority,
    csvEquivalent: "NOT IN CSV",
  },
  {
    apiField: "payment_plan",
    verification: "verified-api" as FieldVerification,
    apiType: "object (nested — see PAYMENT_PLAN_SHAPE below)",
    sampleValue: "{ payment_plan_id, is_auto_renew, billing_day, ... }",
    targetTable: "(revenue computation)",
    targetField: "MRR input",
    tier1Priority: "must-have" as Tier1Priority,
    csvEquivalent: "Payment Plan (name only in CSV), Autorenew Commitment Total (amount in CSV)",
    notes: "API returns a NESTED object with full billing details. Much richer than CSV.",
  },
  {
    apiField: "revenue_category",
    verification: "verified-api" as FieldVerification,
    apiType: "string",
    sampleValue: "Membership Sales",
    targetTable: "(revenue category breakdown — Growth tier feature)",
    targetField: "N/A",
    tier1Priority: "ignore-for-now" as Tier1Priority,
    csvEquivalent: "NOT IN CSV",
  },
  {
    apiField: "contract_name",
    verification: "verified-api" as FieldVerification,
    apiType: "string",
    sampleValue: "",
    targetTable: "(not stored)",
    targetField: "N/A",
    tier1Priority: "ignore-for-now" as Tier1Priority,
    csvEquivalent: "NOT IN CSV",
  },
  {
    apiField: "has_scheduled_deactivation",
    verification: "verified-api" as FieldVerification,
    apiType: "boolean",
    sampleValue: false,
    targetTable: "(retention — churn prediction signal)",
    targetField: "N/A",
    tier1Priority: "useful" as Tier1Priority,
    csvEquivalent: "NOT IN CSV",
    notes: "If true, member is planning to cancel. Critical retention signal.",
  },
  {
    apiField: "scheduled_deactivation_date",
    verification: "verified-api" as FieldVerification,
    apiType: "string (ISO date)",
    sampleValue: "1900-01-01",
    targetTable: "(retention — when cancellation takes effect)",
    targetField: "N/A",
    tier1Priority: "useful" as Tier1Priority,
    csvEquivalent: "NOT IN CSV",
  },
] as const;

// ---------------------------------------------------------------------------
// 3a. PAYMENT PLAN NESTED OBJECT SHAPE (inside membership)
// ---------------------------------------------------------------------------
// The payment_plan field on each membership is a nested object.
// This is MUCH richer than the CSV, which only has the plan name
// and commitment total.
// ---------------------------------------------------------------------------

export const PAYMENT_PLAN_SHAPE = {
  _verification: "verified-api" as FieldVerification,
  _notes: "FULLY VERIFIED — nested inside each membership record. Contains all billing details for MRR calculation.",
  fields: {
    payment_plan_id: "integer",
    payment_plan_template_id: "integer",
    payment_plan_name: "string — e.g., 'Couples 3x/week'",
    is_auto_renew: "boolean — critical for churn prediction",
    auto_renew_stop_date: "string (ISO date) — '1900-01-01' = no stop date",
    is_deactivate_user_on_auto_renew_stop_date: "boolean",
    billing_day_id: "integer",
    billing_day: "string — e.g., 'Membership start day'",
    initial_payment_interval_time_unit: "string — 'Month(s)'",
    initial_payment_interval_length: "integer — 1 = monthly, 3 = quarterly",
    initial_commitment_time_unit: "string — 'Month(s)'",
    initial_commitment_length: "integer",
    initial_payment_option: {
      initial_payment_option_type: "string — 'Monthly'",
      initial_cost: "number — THE AMOUNT (e.g., 275 for $275/mo)",
      initial_setup_fee: "number — one-time setup fee",
    },
    renewal_payment_interval_time_unit: "string — 'Month(s)'",
    renewal_payment_interval_length: "integer",
    renewal_commitment_time_unit: "string",
    renewal_commitment_length: "integer",
    renewal_payment_option: {
      renewal_payment_option_type: "string — 'Monthly'",
      renewal_cost: "number — RECURRING AMOUNT (e.g., 275 for $275/mo)",
    },
  },
  mrrCalculation: `
    For MRR computation:
    1. If is_auto_renew = true: use renewal_payment_option.renewal_cost
    2. Otherwise: use initial_payment_option.initial_cost
    3. Adjust for interval: divide by initial_payment_interval_length if not monthly
    4. Zero cost = comp/non-paying member (couples zero plan, etc.)
    5. Sample: "Couples 3x/week" → renewal_cost: 275, interval: Month(s)/1 → MRR = $275
  `,
} as const;

// ---------------------------------------------------------------------------
// 4. CLASSES → class schedule data
// ---------------------------------------------------------------------------
// Wodify endpoint: GET /v1/classes (VERIFIED — 69 fields)
// Response wrapper: { "classes": [...] }
//
// Classes include attendance COUNTS per class (signed_in, drop_in,
// no_show, reserved), making it possible to compute per-class
// utilization metrics even without individual sign-in records.
// ---------------------------------------------------------------------------

export const CLASS_FIELD_MAP = [
  {
    apiField: "id",
    verification: "verified-api" as FieldVerification,
    apiType: "integer",
    sampleValue: 78922459,
    targetTable: "classes",
    targetField: "id or wodifyClassId",
    tier1Priority: "useful" as Tier1Priority,
  },
  {
    apiField: "name",
    verification: "verified-api" as FieldVerification,
    apiType: "string",
    sampleValue: "CrossFit WOD: 8:30 AM",
    targetTable: "classes",
    targetField: "name",
    tier1Priority: "useful" as Tier1Priority,
  },
  {
    apiField: "program_name",
    verification: "verified-api" as FieldVerification,
    apiType: "string",
    sampleValue: "WOD",
    targetTable: "classes",
    targetField: "type (mapped from program)",
    tier1Priority: "useful" as Tier1Priority,
  },
  {
    apiField: "start_date_time",
    verification: "verified-api" as FieldVerification,
    apiType: "string (ISO datetime)",
    sampleValue: "2019-04-20T08:30:00Z",
    targetTable: "classes",
    targetField: "startTime",
    tier1Priority: "useful" as Tier1Priority,
  },
  {
    apiField: "end_date_time",
    verification: "verified-api" as FieldVerification,
    apiType: "string (ISO datetime)",
    sampleValue: "2019-04-20T09:30:00Z",
    targetTable: "classes",
    targetField: "endTime",
    tier1Priority: "useful" as Tier1Priority,
  },
  {
    apiField: "class_limit",
    verification: "verified-api" as FieldVerification,
    apiType: "integer",
    sampleValue: 0,
    targetTable: "classes",
    targetField: "capacity",
    tier1Priority: "useful" as Tier1Priority,
    notes: "0 appears to mean 'no limit'. Non-zero = cap.",
  },
  {
    apiField: "signed_in",
    verification: "verified-api" as FieldVerification,
    apiType: "integer",
    sampleValue: 0,
    targetTable: "classes",
    targetField: "enrolled (or attendance count)",
    tier1Priority: "useful" as Tier1Priority,
    notes: "Actual check-ins for this class. Enables per-class utilization.",
  },
  {
    apiField: "drop_in",
    verification: "verified-api" as FieldVerification,
    apiType: "integer",
    sampleValue: 0,
    targetTable: "(attendance enrichment)",
    targetField: "N/A",
    tier1Priority: "useful" as Tier1Priority,
  },
  {
    apiField: "no_show",
    verification: "verified-api" as FieldVerification,
    apiType: "integer",
    sampleValue: 0,
    targetTable: "(no-show tracking — retention signal)",
    targetField: "N/A",
    tier1Priority: "useful" as Tier1Priority,
  },
  {
    apiField: "percent_filled",
    verification: "verified-api" as FieldVerification,
    apiType: "integer (percentage)",
    sampleValue: 0,
    targetTable: "(utilization metric — pre-computed by Wodify)",
    targetField: "N/A",
    tier1Priority: "useful" as Tier1Priority,
  },
  {
    apiField: "is_cancelled",
    verification: "verified-api" as FieldVerification,
    apiType: "boolean",
    sampleValue: false,
    targetTable: "classes",
    targetField: "status (cancelled if true)",
    tier1Priority: "useful" as Tier1Priority,
  },
] as const;

// ---------------------------------------------------------------------------
// 5. PROGRAMS → program metadata
// ---------------------------------------------------------------------------
// Wodify endpoint: GET /v1/programs (VERIFIED — 12 fields)
// Response wrapper: { "programs": [...] }
// ---------------------------------------------------------------------------

export const PROGRAM_FIELD_MAP = [
  {
    apiField: "id",
    verification: "verified-api" as FieldVerification,
    apiType: "integer",
    sampleValue: 58747,
    tier1Priority: "ignore-for-now" as Tier1Priority,
  },
  {
    apiField: "name",
    verification: "verified-api" as FieldVerification,
    apiType: "string",
    sampleValue: "WOD",
    tier1Priority: "useful" as Tier1Priority,
    notes: "Programs observed: WOD, All Levels / Free Intro, Competition Class, etc.",
  },
  {
    apiField: "description",
    verification: "verified-api" as FieldVerification,
    apiType: "string",
    sampleValue: "Functional Fitness at its best.",
    tier1Priority: "ignore-for-now" as Tier1Priority,
  },
  {
    apiField: "color",
    verification: "verified-api" as FieldVerification,
    apiType: "string (hex)",
    sampleValue: "#8e9296",
    tier1Priority: "ignore-for-now" as Tier1Priority,
  },
  {
    apiField: "is_active",
    verification: "verified-api" as FieldVerification,
    apiType: "boolean",
    sampleValue: true,
    tier1Priority: "useful" as Tier1Priority,
  },
] as const;

// ---------------------------------------------------------------------------
// 6. LEADS → lead pipeline sync
// ---------------------------------------------------------------------------
// Wodify endpoint: GET /v1/leads (VERIFIED — 47 fields)
// Response wrapper: { "leads": [...] }
//
// Leads have nearly identical structure to clients with additional
// lead-specific fields (lead_status, lead_source, is_converted_to_client).
// ---------------------------------------------------------------------------

export const LEAD_FIELD_MAP_SUMMARY = {
  _verification: "verified-api" as FieldVerification,
  totalFields: 47,
  keyFields: [
    { field: "id", type: "integer", sample: 1679431 },
    { field: "first_name", type: "string", sample: "Kristina" },
    { field: "last_name", type: "string", sample: "Knudsen" },
    { field: "email", type: "string", sample: "ktinaknudsen@gmail.com" },
    { field: "lead_status_id", type: "integer", sample: 41720 },
    { field: "lead_status", type: "string", sample: "Converted" },
    { field: "phone_number", type: "string", sample: "" },
    { field: "lead_source", type: "string", sample: "" },
    { field: "is_converted_to_client", type: "boolean", sample: true },
    { field: "created_from_source", type: "string", sample: "Manual" },
    { field: "days_since_last_attendance", type: "integer", sample: 2521 },
  ],
  tier1Priority: "ignore-for-now" as Tier1Priority,
  notes: "Lead sync is Growth tier. Structure is similar to clients. Iron Metrics has its own leads pipeline that could be seeded from Wodify leads.",
} as const;

// ---------------------------------------------------------------------------
// 7. UNAVAILABLE ENDPOINTS (all returned 403)
// ---------------------------------------------------------------------------

export const UNAVAILABLE_ENDPOINTS = {
  _notes: "All returned 403 'Missing Authentication Token'. This likely means these endpoints don't exist in Wodify's public API (they use 403 as a catch-all for unknown routes, not 404).",
  endpoints: [
    {
      path: "/client-statuses",
      workaround: "client_status string is already on each client record — no need for separate endpoint.",
    },
    {
      path: "/invoices",
      workaround: "No API access to invoice data. Revenue must be computed from membership payment_plan amounts. For realized revenue, gym would need to export from Wodify Custom Reporting.",
    },
    {
      path: "/class-signins (and /attendance, /signins, /class-sign-ins)",
      workaround: "CRITICAL — no individual attendance records via API. However, /clients includes last_attendance, days_since_last_attendance, total_class_sign_ins which covers Tier 1 needs. For detailed history: Attendance CSV from Custom Reporting + Zapier 'Client signed into class' trigger for ongoing.",
    },
    {
      path: "/reservations (and /client-reservations)",
      workaround: "No reservation data via API. Classes endpoint has reserved/waitlisted counts per class.",
    },
    {
      path: "/revenue-categories",
      workaround: "revenue_category string is already on each membership record.",
    },
  ],
} as const;

// ---------------------------------------------------------------------------
// 8. CONCEPTUAL DIFFERENCES: Wodify vs Iron Metrics (updated post-verification)
// ---------------------------------------------------------------------------

export const CONCEPTUAL_NOTES = {
  clientVsMember: `
    Wodify "Client" = Iron Metrics "Member" (1:1).
    API field naming: snake_case (first_name, last_name).
    CSV field naming: Title Case with spaces (Client Name — combined).
    API returns MUCH richer data than CSV (73 vs 17 fields).
  `,
  attendanceData: `
    NO dedicated attendance endpoint exists in the API.
    HOWEVER, each client record includes:
      - last_attendance (ISO datetime)
      - days_since_last_attendance (integer)
      - total_class_sign_ins (integer, lifetime)
      - last_class_sign_in (ISO datetime)
      - current_weekstreak / highest_weekstreak
      - is_at_risk (boolean — Wodify's own assessment)
    This is SUFFICIENT for Tier 1 analytics (risk scores, engagement rates).
    For detailed attendance history (trend charts, class-level analytics):
      - Backfill: Wodify Custom Reporting → Attendance CSV export
      - Ongoing: Zapier "Client signed into class" trigger → webhook
  `,
  membershipRevenue: `
    CSV has 'Autorenew Commitment Total' (simple decimal).
    API has nested payment_plan object with full billing structure.
    The payment_plan shape was truncated in probe — need deeper probe
    to get amount fields for accurate MRR computation.
  `,
  dateFormats: `
    API: ISO dates (2019-04-03, 2026-03-21T09:00:00Z) — clean, no parsing needed.
    CSV: US format (Feb 24, 2026) — requires parseWodifyDate() conversion.
    Sentinel value: "1900-01-01" means "not set" — treat as null.
  `,
  statusNormalization: `
    API returns client_status as a string (e.g., "Active").
    Gyms can create CUSTOM statuses in Wodify.
    Normalization must handle unknown values with a fallback + warning.
  `,
  nestedObjects: `
    API uses nested objects for audit fields:
      created_on: { created_by_id, created_by, created_on_datetime }
      updated: { updated_by_id, updated_by, updated_on_datetime }
      payment_plan: { payment_plan_id, is_auto_renew, ... }
    These need to be flattened during normalization.
  `,
};

// ---------------------------------------------------------------------------
// 9. RECOMMENDED SYNC ORDER (updated post-verification)
// ---------------------------------------------------------------------------

export const SYNC_ORDER = [
  {
    step: 1,
    entity: "Clients",
    endpoint: "GET /v1/clients",
    reason: "Foundation — creates member records with attendance summary data (last_attendance, is_at_risk, etc.)",
    dependencies: "None",
    existingCode: "import-wodify.ts handles CSV version. API sync extends same upsert pattern.",
    dataVolume: "~100-300 records per gym",
    incrementalSync: "Filter by updated.updated_on_datetime > lastSyncTime",
  },
  {
    step: 2,
    entity: "Memberships",
    endpoint: "GET /v1/memberships",
    reason: "Enriches member records with plan context and MRR data",
    dependencies: "Clients must be synced first (client_id FK resolution)",
    existingCode: "import-wodify.ts consolidates memberships per client from CSV. API sync adds attendance limits, session tracking.",
    dataVolume: "~150-500 records per gym (members × active memberships)",
    incrementalSync: "Filter by updated.updated_on_datetime > lastSyncTime",
  },
  {
    step: 3,
    entity: "Programs (optional)",
    endpoint: "GET /v1/programs",
    reason: "Reference data for class categorization",
    dependencies: "None",
    dataVolume: "~5-20 records per gym",
    incrementalSync: "Full sync (small dataset)",
  },
  {
    step: 4,
    entity: "Classes (optional — Growth tier)",
    endpoint: "GET /v1/classes",
    reason: "Schedule import with per-class utilization data",
    dependencies: "Programs for categorization",
    dataVolume: "~500-5000 records per gym (historical)",
    incrementalSync: "Filter by date range (only future + recent past)",
  },
  {
    step: 5,
    entity: "Leads (optional — Growth tier)",
    endpoint: "GET /v1/leads",
    reason: "Seeds Iron Metrics lead pipeline from Wodify lead data",
    dependencies: "None",
    dataVolume: "~50-500 records per gym",
    incrementalSync: "Filter by updated timestamp",
  },
] as const;

// ---------------------------------------------------------------------------
// 10. OPEN QUESTIONS (updated — many resolved by probe)
// ---------------------------------------------------------------------------

export const OPEN_QUESTIONS = [
  {
    id: "Q1",
    question: "Does GET /clients return separate FirstName and LastName?",
    status: "RESOLVED ✅",
    answer: "Yes — first_name and last_name are separate fields. No name splitting needed for API sync.",
  },
  {
    id: "Q2",
    question: "Does GET /clients include Phone, DateOfBirth, Address?",
    status: "RESOLVED ✅",
    answer: "Yes — phone_number, date_of_birth, street_address_1/2, city, state, zipcode, country all present.",
  },
  {
    id: "Q3",
    question: "What are the exact client status values?",
    status: "RESOLVED ✅",
    answer: "client_status is a string field. Observed values across 200+ clients: 'Active', 'Inactive'. Only these two observed. Gyms may create custom statuses. /client-statuses endpoint returned 403.",
  },
  {
    id: "Q4",
    question: "Does GET /invoices exist?",
    status: "RESOLVED ❌",
    answer: "No — returns 403. Invoices are not available via API. Revenue computed from membership payment_plan data.",
  },
  {
    id: "Q5",
    question: "Does an attendance/sign-ins endpoint exist?",
    status: "RESOLVED ❌ (but mitigated)",
    answer: "No dedicated attendance endpoint. ALL paths (/class-signins, /attendance, /signins) return 403. HOWEVER, /clients includes last_attendance, days_since_last_attendance, total_class_sign_ins, is_at_risk — sufficient for Tier 1. Detailed history requires CSV import.",
  },
  {
    id: "Q6",
    question: "What pagination does the API use?",
    status: "RESOLVED ✅",
    answer: "Page-based: ?page=N, 100 records per page. No total count header. Detect last page when count < 100. Tested on /memberships (2000+ records across 20+ pages) and /clients (200+ records across 2+ pages).",
  },
  {
    id: "Q7",
    question: "Does the API support date range filtering?",
    status: "NEEDS INVESTIGATION",
    answer: "Not tested. Try ?startDate=, ?since=, ?updatedSince= on /clients endpoint.",
  },
  {
    id: "Q8",
    question: "Are there rate limits?",
    status: "NEEDS INVESTIGATION",
    answer: "No X-RateLimit-* headers observed in probe responses. May not be rate-limited or may use a different mechanism.",
  },
  {
    id: "Q9",
    question: "What is the full payment_plan nested object shape?",
    status: "RESOLVED ✅",
    answer: "Fully verified. Contains initial_payment_option.initial_cost and renewal_payment_option.renewal_cost for MRR calculation. See PAYMENT_PLAN_SHAPE above. Sample: 'Couples 3x/week' → renewal_cost: 275 ($275/mo).",
  },
  {
    id: "Q10",
    question: "What is the '1900-01-01' sentinel value semantics?",
    status: "RESOLVED ✅",
    answer: "Observed in membership start_date, end_date, expiration_date. Means 'not set' or 'N/A'. Treat as null during normalization.",
  },
] as const;

// ---------------------------------------------------------------------------
// 11. SCHEMA CHANGES NEEDED FOR API SYNC
// ---------------------------------------------------------------------------

export const SCHEMA_CHANGES = [
  {
    table: "members",
    change: "ADD COLUMN wodifyClientId integer",
    reason: "Dedup key for API sync. Links Iron Metrics member to Wodify client ID.",
    migration: "ALTER TABLE members ADD COLUMN wodify_client_id INTEGER; CREATE UNIQUE INDEX idx_members_wodify_client ON members(gym_id, wodify_client_id) WHERE wodify_client_id IS NOT NULL;",
    priority: "must-have" as Tier1Priority,
  },
  {
    table: "gyms",
    change: "ADD COLUMN wodifyApiKey text (encrypted)",
    reason: "Per-gym Wodify API key for sync. Set during onboarding.",
    migration: "ALTER TABLE gyms ADD COLUMN wodify_api_key TEXT;",
    priority: "must-have" as Tier1Priority,
    securityNote: "Must be encrypted at rest. Consider using pgcrypto or application-level encryption.",
  },
  {
    table: "sync_runs",
    change: "Extend source values to include 'wodify-api'",
    reason: "Distinguish API syncs from CSV imports in sync history.",
    priority: "must-have" as Tier1Priority,
  },
] as const;
