/**
 * Wodify integration types.
 *
 * These types model the VERIFIED shape of Wodify API responses (probed
 * 2026-03-25 against api.wodify.com/v1 with a live API key) and the
 * internal normalized forms used by ForgeOS.
 *
 * API uses snake_case field names. Response wrappers use plural entity
 * names: { "clients": [...] }, { "memberships": [...] }, etc.
 *
 * Full field map with verification status:
 *   docs/integrations/wodify-field-map.ts
 */

export interface WodifyApiConfig {
  apiKey: string;
  baseUrl: string; // https://api.wodify.com/v1
}

export type WodifySyncEntity =
  | "clients"
  | "memberships"
  | "classes"
  | "programs"
  | "leads";

export type WodifySyncStatus =
  | "pending"
  | "running"
  | "completed"
  | "completed_with_errors"
  | "failed";

export interface WodifyAuditFields {
  created_by_id: number;
  created_by: string;
  created_on_datetime: string;
}

export interface WodifyUpdateFields {
  updated_by_id: number;
  updated_by: string;
  updated_on_datetime: string;
}

/**
 * Wodify Client — VERIFIED against live API (73 fields).
 * Only Tier 1-relevant fields are typed. Full field list in field map.
 */
export interface WodifyClient {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  client_status_id: number;
  client_status: string;
  location_id: number;
  location: string;
  default_program_id: number;
  default_program: string;
  date_of_birth: string;
  gender_id: number;
  gender: string;
  street_address_1: string;
  street_address_2: string;
  city: string;
  state_id: number;
  state: string;
  province: string;
  zipcode: string;
  country_id: number;
  country: string;
  is_email_subscribed: boolean;
  is_sms_subscribed: boolean;
  tags: string[];
  created_on: WodifyAuditFields;
  updated: WodifyUpdateFields;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  last_attendance: string;
  days_since_last_attendance: number;
  member_since: string;
  last_contacted: string;
  is_at_risk: boolean;
  retain_snooze_until_date: string;
  lead_source_id: number;
  lead_source: string;
  referring_user_id: number;
  referring_user: string;
  is_converted_from_lead: boolean;
  client_owner_id: number;
  client_owner: string;
  total_class_sign_ins: number;
  total_booking_sign_ins: number;
  last_class_sign_in: string;
  last_booking_sign_in: string;
  current_weekstreak: number;
  highest_weekstreak: number;
  current_weekstreak_updatedon: string;
  next_class_reservation: string;
  next_appointment_booking: string;
}

/**
 * Wodify Payment Plan — nested inside membership records.
 * VERIFIED — full shape confirmed including cost fields.
 *
 * MRR calculation:
 *   - For auto-renew: use renewal_payment_option.renewal_cost
 *   - For initial: use initial_payment_option.initial_cost
 *   - Interval: initial_payment_interval_time_unit ("Month(s)")
 *   - 0 cost = comp/non-paying (e.g., couples zero plan)
 */
export interface WodifyPaymentOption {
  initial_payment_option_id: number;
  initial_payment_option_template_id: number;
  initial_payment_option_type_id: number;
  initial_payment_option_type: string;
  initial_cost: number;
  initial_setup_fee: number;
}

export interface WodifyRenewalPaymentOption {
  renewal_payment_option_id: number;
  renewal_payment_option_template_id: number;
  renewal_payment_option_type_id: number;
  renewal_payment_option_type: string;
  renewal_cost: number;
}

export interface WodifyPaymentPlan {
  payment_plan_id: number;
  payment_plan_template_id: number;
  payment_plan_name: string;
  is_auto_renew: boolean;
  auto_renew_stop_date: string;
  is_deactivate_user_on_auto_renew_stop_date: boolean;
  billing_day_id: number;
  billing_day: string;
  initial_payment_interval_time_unit_id: number;
  initial_payment_interval_time_unit: string;
  initial_payment_interval_length: number;
  initial_commitment_time_unit_id: number;
  initial_commitment_time_unit: string;
  initial_commitment_length: number;
  initial_payment_option: WodifyPaymentOption;
  renewal_payment_interval_time_unit_id: number;
  renewal_payment_interval_time_unit: string;
  renewal_payment_interval_length: number;
  renewal_commitment_time_unit_id: number;
  renewal_commitment_time_unit: string;
  renewal_commitment_length: number;
  renewal_payment_option: WodifyRenewalPaymentOption;
}

/**
 * Wodify Membership — VERIFIED against live API (50 fields).
 */
export interface WodifyMembership {
  id: number;
  client_id: number;
  name: string;
  membership_template_id: number;
  renewed_from_membership_id: number;
  has_been_renewed: boolean;
  location_of_sale_id: number;
  location_of_sale: string;
  start_date: string;
  end_date: string;
  membership_type_id: number;
  membership_type: string;
  attendance_type_id: number;
  attendance_type: string;
  attendance_limit: number;
  attendance_limit_frequency: number;
  attendance_limit_type_id: number;
  attendance_limit_type: string;
  number_of_sessions: number;
  sessions_already_used: number;
  does_membership_expire: boolean;
  expiration_type_id: number;
  expiration_type: string;
  expiration_length: number;
  expiration_date: string;
  original_expiration_date: string;
  revenue_category_id: number;
  revenue_category: string;
  membership_contract_template_id: number;
  contract_name: string;
  contract_signed_on_date: string;
  tax_rate_id: number;
  tax_rate_name: string;
  tax_rate: number;
  is_absorbing_fees: boolean;
  service_id: number;
  service: string;
  service_duration_id: number;
  service_duration_hours: number;
  service_duration_minutes: number;
  payment_plan: WodifyPaymentPlan;
  has_scheduled_deactivation: boolean;
  scheduled_deactivation_date: string;
  allow_rollover: boolean;
  rollover_sessions: number;
  max_total_sessions: number;
  is_active: boolean;
  is_deleted: boolean;
  created: WodifyAuditFields;
  updated: WodifyUpdateFields;
}

/**
 * Wodify Class — VERIFIED against live API (69 fields).
 * Only key fields typed.
 */
export interface WodifyClass {
  id: number;
  name: string;
  description: string;
  program_id: number;
  program_name: string;
  location_id: number;
  location: string;
  start_date_time: string;
  start_date: string;
  start_time: string;
  end_date_time: string;
  end_date: string;
  recurring_class_id: number;
  recurring_class: string;
  calendar_color: string;
  class_limit: number;
  allow_waitlist: boolean;
  is_cancelled: boolean;
  count_towards_attendance_limits: boolean;
  reserved: number;
  signed_in: number;
  drop_in: number;
  waitlisted: number;
  available: number;
  cancelled: number;
  no_show: number;
  percent_filled: number;
  is_full: boolean;
  is_deleted: boolean;
  created: WodifyAuditFields;
  updated: WodifyUpdateFields;
}

/**
 * Wodify Program — VERIFIED against live API (12 fields).
 */
export interface WodifyProgram {
  id: number;
  name: string;
  description: string;
  color: string;
  publish_externally: boolean;
  count_towards_attendance_limits: boolean;
  secure_programming_enabled: boolean;
  secure_programming_option_id: number;
  secure_programming_option: string;
  is_active: boolean;
  created: WodifyAuditFields;
  updated: WodifyUpdateFields;
}

/**
 * Wodify Lead — VERIFIED against live API (47 fields).
 */
export interface WodifyLead {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  lead_status_id: number;
  lead_status: string;
  location_id: number;
  location: string;
  gender_id: number;
  gender: string;
  phone_number: string;
  date_of_birth: string;
  street_address1: string;
  street_address2: string;
  city: string;
  state_id: number;
  state: string;
  province: string;
  zipcode: string;
  country_id: number;
  country: string;
  tags: string[];
  created: WodifyAuditFields;
  updated: WodifyUpdateFields;
  last_contact_datetime: string;
  is_converted_to_client: boolean;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  lead_source_id: number;
  lead_source: string;
  lead_owner_id: number;
  lead_owner: string;
  total_class_sign_ins: number;
  total_booking_sign_ins: number;
  last_class_sign_in: string;
  last_booking_sign_in: string;
  days_since_last_attendance: number;
}

export interface WodifyClientListResponse {
  clients: WodifyClient[];
}

export interface WodifyMembershipListResponse {
  memberships: WodifyMembership[];
}

export interface WodifyClassListResponse {
  classes: WodifyClass[];
}

export interface WodifyProgramListResponse {
  programs: WodifyProgram[];
}

export interface WodifyLeadListResponse {
  leads: WodifyLead[];
}

export const WODIFY_SENTINEL_DATE = "1900-01-01";

export function isWodifySentinelDate(value: string): boolean {
  return value === WODIFY_SENTINEL_DATE || value.startsWith("1900-01-01");
}

export const IRON_METRICS_STATUS_MAP: Record<string, string> = {
  "Active": "active",
  "Inactive": "inactive",
  "On Hold": "hold",
  "Suspended": "hold",
  "Cancelled": "cancelled",
  "Terminated": "cancelled",
  "Former": "cancelled",
  "Lead": "prospect",
  "Prospect": "prospect",
};

export function normalizeWodifyStatus(wodifyStatus: string): string {
  return IRON_METRICS_STATUS_MAP[wodifyStatus] || "active";
}
