CREATE TYPE "public"."programming_day_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."section_type" AS ENUM('warmup', 'strength', 'conditioning', 'skill', 'cooldown', 'wod', 'accessory', 'custom');--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "gym_onboarding" (
	"id" serial PRIMARY KEY NOT NULL,
	"gym_id" integer NOT NULL,
	"current_step" text DEFAULT 'basics' NOT NULL,
	"completed_steps" text[] DEFAULT '{}' NOT NULL,
	"skipped_steps" text[] DEFAULT '{}' NOT NULL,
	"is_complete" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gym_onboarding_gym_id_unique" UNIQUE("gym_id")
);
--> statement-breakpoint
CREATE TABLE "gym_staff" (
	"id" serial PRIMARY KEY NOT NULL,
	"gym_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'coach' NOT NULL,
	"specialties" text[] DEFAULT '{}' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"join_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gyms" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"email" text,
	"phone" text,
	"address" text,
	"city" text,
	"state" text,
	"zip" text,
	"timezone" text DEFAULT 'America/New_York' NOT NULL,
	"logo_url" text,
	"website" text,
	"business_name" text,
	"description" text,
	"from_email" text,
	"from_name" text,
	"owner_id" text NOT NULL,
	"subscription_tier" text DEFAULT 'none' NOT NULL,
	"is_beta_access" boolean DEFAULT false NOT NULL,
	"stripe_gym_customer_id" text,
	"platform_subscription_id" text,
	"platform_cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"platform_current_period_end" timestamp with time zone,
	"tax_enabled" boolean DEFAULT false NOT NULL,
	"tax_label" text DEFAULT 'Sales Tax',
	"tax_rate" text DEFAULT '0',
	"tax_jurisdiction" text,
	"stripe_tax_rate_id" text,
	"past_due_policy" text DEFAULT 'grace_period' NOT NULL,
	"auto_suspend_enabled" boolean DEFAULT true NOT NULL,
	"auto_suspend_buffer_days" integer DEFAULT 3 NOT NULL,
	"wodify_api_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gyms_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "member_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer NOT NULL,
	"gym_id" integer NOT NULL,
	"content" text NOT NULL,
	"author_name" text NOT NULL,
	"author_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" serial PRIMARY KEY NOT NULL,
	"gym_id" integer NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"status" text DEFAULT 'active' NOT NULL,
	"membership_type" text,
	"join_date" date,
	"birth_date" date,
	"profile_image_url" text,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"risk_score" numeric,
	"risk_tier" text,
	"last_visit_date" timestamp with time zone,
	"attendance_count_30d" integer DEFAULT 0,
	"emergency_contact_name" text,
	"emergency_contact_phone" text,
	"address" text,
	"city" text,
	"state" text,
	"waiver_signed" boolean DEFAULT false NOT NULL,
	"stripe_customer_id" text,
	"linked_billing_member_id" integer,
	"wodify_client_id" integer,
	"monthly_revenue" numeric,
	"total_class_sign_ins" integer,
	"current_weekstreak" integer,
	"days_since_last_attendance" integer,
	"is_at_risk" boolean,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timeline_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer NOT NULL,
	"gym_id" integer NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"date" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"lead_id" integer NOT NULL,
	"gym_id" integer NOT NULL,
	"type" text NOT NULL,
	"description" text NOT NULL,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_capture_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"gym_id" integer NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"headline" text,
	"subheadline" text,
	"cta_button_text" text,
	"success_message" text,
	"disclaimer_text" text,
	"show_phone" boolean DEFAULT true NOT NULL,
	"show_address" boolean DEFAULT true NOT NULL,
	"phone_required" boolean DEFAULT false NOT NULL,
	"show_interests" boolean DEFAULT true NOT NULL,
	"show_consent" boolean DEFAULT false NOT NULL,
	"consent_text" text,
	"source_label" text DEFAULT 'website' NOT NULL,
	"campaign_tag" text,
	"default_stage" text DEFAULT 'new' NOT NULL,
	"auto_assign_staff_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lead_capture_config_gym_id_unique" UNIQUE("gym_id")
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"gym_id" integer NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"stage" text DEFAULT 'new' NOT NULL,
	"source" text,
	"assigned_to_id" integer,
	"last_contact_date" timestamp with time zone,
	"next_follow_up_date" date,
	"follow_up_note" text,
	"lost_reason" text,
	"notes" text,
	"is_stale" boolean DEFAULT false NOT NULL,
	"converted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" serial PRIMARY KEY NOT NULL,
	"gym_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"member_notes" text,
	"staff_notes" text,
	"coach_id" integer,
	"coach_name" text,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"capacity" integer DEFAULT 20 NOT NULL,
	"enrolled" integer DEFAULT 0 NOT NULL,
	"waitlist_count" integer DEFAULT 0 NOT NULL,
	"type" text DEFAULT 'regular' NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"is_bookable" boolean DEFAULT true NOT NULL,
	"waitlist_enabled" boolean DEFAULT false NOT NULL,
	"is_recurring" boolean DEFAULT false NOT NULL,
	"recurring_days" integer[],
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_template_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer NOT NULL,
	"weekday" integer NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"class_name" text NOT NULL,
	"type" text DEFAULT 'regular' NOT NULL,
	"capacity" integer DEFAULT 20 NOT NULL,
	"coach_id" integer,
	"coach_name" text,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "class_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"gym_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_by" text,
	"total_classes" integer DEFAULT 0 NOT NULL,
	"used_count" integer DEFAULT 0 NOT NULL,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"gym_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"member_name" text NOT NULL,
	"class_id" integer,
	"class_name" text,
	"checkin_time" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text DEFAULT 'reserved' NOT NULL,
	"waitlist_position" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"gym_id" integer NOT NULL,
	"member_id" integer,
	"actor_user_id" text,
	"actor_name" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"before_value" text,
	"after_value" text,
	"amount" numeric(10, 2),
	"currency" text DEFAULT 'usd',
	"reason" text,
	"source" text DEFAULT 'ui' NOT NULL,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"gym_id" integer NOT NULL,
	"member_id" integer,
	"type" text NOT NULL,
	"description" text,
	"stripe_event_id" text,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_recovery" (
	"id" serial PRIMARY KEY NOT NULL,
	"gym_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"subscription_id" integer NOT NULL,
	"stripe_subscription_id" text,
	"status" text DEFAULT 'active' NOT NULL,
	"failed_attempts" integer DEFAULT 1 NOT NULL,
	"last_failed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_notified_at" timestamp with time zone,
	"grace_deadline" timestamp with time zone,
	"amount_due" numeric(10, 2),
	"card_last4" text,
	"card_brand" text,
	"resolved_at" timestamp with time zone,
	"resolved_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_webhook_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"stripe_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"processing_error" text,
	"raw_payload" text,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_webhook_events_stripe_event_id_unique" UNIQUE("stripe_event_id")
);
--> statement-breakpoint
CREATE TABLE "discount_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"gym_id" integer NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"type" text DEFAULT 'percentage' NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"duration" text DEFAULT 'once' NOT NULL,
	"duration_in_months" integer,
	"max_redemptions" integer,
	"times_redeemed" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"stripe_coupon_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"gym_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"member_name" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"status" text DEFAULT 'unpaid' NOT NULL,
	"due_date" date,
	"paid_at" timestamp with time zone,
	"description" text,
	"stripe_invoice_id" text,
	"stripe_payment_intent_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "membership_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"gym_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price" numeric(10, 2) NOT NULL,
	"billing_interval" text DEFAULT 'monthly' NOT NULL,
	"sessions_per_month" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"stripe_product_id" text,
	"stripe_price_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_update_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"gym_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"subscription_id" integer NOT NULL,
	"recovery_id" integer,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_update_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"gym_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"member_name" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"type" text DEFAULT 'subscription' NOT NULL,
	"status" text DEFAULT 'succeeded' NOT NULL,
	"description" text,
	"stripe_payment_intent_id" text,
	"stripe_charge_id" text,
	"invoice_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" serial PRIMARY KEY NOT NULL,
	"gym_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"member_name" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"reason" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"payment_id" integer,
	"stripe_refund_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_holds" (
	"id" serial PRIMARY KEY NOT NULL,
	"gym_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"subscription_id" integer NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"reason" text,
	"created_by" text,
	"created_by_name" text,
	"activated_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"gym_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"member_name" text NOT NULL,
	"plan_id" integer NOT NULL,
	"plan_name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"current_period_start" date,
	"current_period_end" date,
	"amount" numeric(10, 2) NOT NULL,
	"failed_payments" integer DEFAULT 0 NOT NULL,
	"stripe_subscription_id" text,
	"stripe_price_id" text,
	"cancelled_at" timestamp with time zone,
	"cancel_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"gym_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price" numeric(10, 2) NOT NULL,
	"category" text,
	"stock_quantity" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" serial PRIMARY KEY NOT NULL,
	"gym_id" integer NOT NULL,
	"member_id" integer,
	"member_name" text,
	"items" text NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL,
	"tax" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"payment_method" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"workout_id" integer NOT NULL,
	"programming_section_id" integer,
	"member_id" integer NOT NULL,
	"member_name" text NOT NULL,
	"gym_id" integer NOT NULL,
	"result" text NOT NULL,
	"notes" text,
	"is_rx" boolean DEFAULT false NOT NULL,
	"is_pr" boolean DEFAULT false NOT NULL,
	"rank" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"gym_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"workout_date" date NOT NULL,
	"type" text DEFAULT 'WOD' NOT NULL,
	"movements" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "programming_days" (
	"id" serial PRIMARY KEY NOT NULL,
	"gym_id" integer NOT NULL,
	"date" date NOT NULL,
	"title" text NOT NULL,
	"status" "programming_day_status" DEFAULT 'draft' NOT NULL,
	"public_notes" text,
	"coach_notes" text,
	"track" text DEFAULT 'default',
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "programming_sections" (
	"id" serial PRIMARY KEY NOT NULL,
	"day_id" integer NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"section_type" "section_type" DEFAULT 'wod' NOT NULL,
	"title" text NOT NULL,
	"instructions" text,
	"duration" text,
	"time_cap" text,
	"intended_stimulus" text,
	"movements" text[] DEFAULT '{}' NOT NULL,
	"scaling_notes" text,
	"coach_notes" text,
	"member_notes" text,
	"result_tracking_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" serial PRIMARY KEY NOT NULL,
	"gym_id" integer NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"author_name" text NOT NULL,
	"author_id" text,
	"audience" text DEFAULT 'all' NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"gym_id" integer NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'waiver' NOT NULL,
	"content" text,
	"version" integer DEFAULT 1 NOT NULL,
	"is_required" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_generated_content" (
	"id" serial PRIMARY KEY NOT NULL,
	"gym_id" integer NOT NULL,
	"type" text NOT NULL,
	"content" text NOT NULL,
	"subject" text,
	"confidence" numeric(3, 2) DEFAULT '0.8' NOT NULL,
	"is_ai_generated" boolean DEFAULT true NOT NULL,
	"context_summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"gym_id" integer NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"target_id" integer,
	"target_type" text,
	"ai_content" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checklist_item_completions" (
	"id" serial PRIMARY KEY NOT NULL,
	"recommendation_id" integer NOT NULL,
	"item_id" text NOT NULL,
	"checked" boolean DEFAULT false NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "outcome_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"gym_id" integer NOT NULL,
	"period_start" text NOT NULL,
	"active_members" integer DEFAULT 0 NOT NULL,
	"mrr" numeric(10, 2) DEFAULT '0' NOT NULL,
	"churn_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"snapshot_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "owner_additional_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"gym_id" integer NOT NULL,
	"period_start" text NOT NULL,
	"text" text NOT NULL,
	"classified_type" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recommendation_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"gym_id" integer NOT NULL,
	"period_start" text NOT NULL,
	"recommendation_type" text NOT NULL,
	"headline" text NOT NULL,
	"checklist_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"baseline_forecast" jsonb,
	"execution_strength_threshold" numeric(3, 2) DEFAULT '0.60' NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recommendation_learning_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"gym_id" integer NOT NULL,
	"recommendation_type" text NOT NULL,
	"period_start" text NOT NULL,
	"execution_strength" numeric(5, 4) NOT NULL,
	"impact_score" numeric(10, 4) NOT NULL,
	"outcome_metrics" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recommendation_learning_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"recommendation_type" text NOT NULL,
	"gym_id" integer,
	"expected_impact" numeric(10, 4) DEFAULT '0' NOT NULL,
	"confidence" numeric(5, 4) DEFAULT '0.10' NOT NULL,
	"sample_size" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_chunks" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"taxonomy" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"token_count" integer DEFAULT 0 NOT NULL,
	"embedding" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" integer NOT NULL,
	"external_id" text NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"channel_name" text,
	"duration_seconds" integer,
	"raw_transcript" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"chunk_count" integer DEFAULT 0 NOT NULL,
	"ingested_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_ingest_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"videos_found" integer DEFAULT 0 NOT NULL,
	"videos_processed" integer DEFAULT 0 NOT NULL,
	"chunks_created" integer DEFAULT 0 NOT NULL,
	"error_details" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "knowledge_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"source_type" text DEFAULT 'youtube_channel' NOT NULL,
	"last_ingested_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recommendation_chunk_audit" (
	"id" serial PRIMARY KEY NOT NULL,
	"gym_id" integer NOT NULL,
	"period_start" date NOT NULL,
	"recommendation_type" text NOT NULL,
	"chunk_id" integer NOT NULL,
	"similarity_score" numeric(5, 4),
	"used_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_sequence_enrollments" (
	"id" serial PRIMARY KEY NOT NULL,
	"gym_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"sequence_id" integer NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"current_step_index" integer DEFAULT 0 NOT NULL,
	"next_action_at" timestamp with time zone,
	"enrolled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"exit_reason" text,
	"trigger_snapshot" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "retention_sequence_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"gym_id" integer NOT NULL,
	"enrollment_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"sequence_id" integer NOT NULL,
	"event_type" text NOT NULL,
	"step_index" integer,
	"details" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "retention_sequence_steps" (
	"id" serial PRIMARY KEY NOT NULL,
	"sequence_id" integer NOT NULL,
	"step_order" integer NOT NULL,
	"action_type" text NOT NULL,
	"delay_days" integer DEFAULT 0 NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "retention_sequences" (
	"id" serial PRIMARY KEY NOT NULL,
	"gym_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" text DEFAULT 'custom' NOT NULL,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"trigger_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"cooldown_days" integer DEFAULT 30 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"gym_id" integer NOT NULL,
	"source" text NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"file_name" text,
	"total_rows" integer DEFAULT 0,
	"created" integer DEFAULT 0,
	"skipped" integer DEFAULT 0,
	"errored" integer DEFAULT 0,
	"error_details" jsonb,
	"metadata" jsonb,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"triggered_by" text
);
--> statement-breakpoint
ALTER TABLE "gym_onboarding" ADD CONSTRAINT "gym_onboarding_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gym_staff" ADD CONSTRAINT "gym_staff_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_notes" ADD CONSTRAINT "member_notes_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_notes" ADD CONSTRAINT "member_notes_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_events" ADD CONSTRAINT "timeline_events_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_activities" ADD CONSTRAINT "lead_activities_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_capture_config" ADD CONSTRAINT "lead_capture_config_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_template_items" ADD CONSTRAINT "class_template_items_template_id_class_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."class_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_templates" ADD CONSTRAINT "class_templates_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_audit_logs" ADD CONSTRAINT "billing_audit_logs_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_audit_logs" ADD CONSTRAINT "billing_audit_logs_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_events" ADD CONSTRAINT "billing_events_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_events" ADD CONSTRAINT "billing_events_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_recovery" ADD CONSTRAINT "billing_recovery_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_recovery" ADD CONSTRAINT "billing_recovery_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_recovery" ADD CONSTRAINT "billing_recovery_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_codes" ADD CONSTRAINT "discount_codes_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_plans" ADD CONSTRAINT "membership_plans_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_update_tokens" ADD CONSTRAINT "payment_update_tokens_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_update_tokens" ADD CONSTRAINT "payment_update_tokens_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_update_tokens" ADD CONSTRAINT "payment_update_tokens_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_update_tokens" ADD CONSTRAINT "payment_update_tokens_recovery_id_billing_recovery_id_fk" FOREIGN KEY ("recovery_id") REFERENCES "public"."billing_recovery"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_holds" ADD CONSTRAINT "scheduled_holds_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_holds" ADD CONSTRAINT "scheduled_holds_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_holds" ADD CONSTRAINT "scheduled_holds_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_membership_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."membership_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_results" ADD CONSTRAINT "workout_results_workout_id_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_results" ADD CONSTRAINT "workout_results_programming_section_id_programming_sections_id_fk" FOREIGN KEY ("programming_section_id") REFERENCES "public"."programming_sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_results" ADD CONSTRAINT "workout_results_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_results" ADD CONSTRAINT "workout_results_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programming_days" ADD CONSTRAINT "programming_days_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programming_sections" ADD CONSTRAINT "programming_sections_day_id_programming_days_id_fk" FOREIGN KEY ("day_id") REFERENCES "public"."programming_days"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_generated_content" ADD CONSTRAINT "ai_generated_content_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_tasks" ADD CONSTRAINT "ai_tasks_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_item_completions" ADD CONSTRAINT "checklist_item_completions_recommendation_id_recommendation_cards_id_fk" FOREIGN KEY ("recommendation_id") REFERENCES "public"."recommendation_cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outcome_snapshots" ADD CONSTRAINT "outcome_snapshots_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "owner_additional_actions" ADD CONSTRAINT "owner_additional_actions_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_cards" ADD CONSTRAINT "recommendation_cards_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_learning_events" ADD CONSTRAINT "recommendation_learning_events_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_learning_stats" ADD CONSTRAINT "recommendation_learning_stats_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_document_id_knowledge_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."knowledge_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_source_id_knowledge_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."knowledge_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_ingest_jobs" ADD CONSTRAINT "knowledge_ingest_jobs_source_id_knowledge_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."knowledge_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_chunk_audit" ADD CONSTRAINT "recommendation_chunk_audit_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_chunk_audit" ADD CONSTRAINT "recommendation_chunk_audit_chunk_id_knowledge_chunks_id_fk" FOREIGN KEY ("chunk_id") REFERENCES "public"."knowledge_chunks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_sequence_enrollments" ADD CONSTRAINT "member_sequence_enrollments_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_sequence_enrollments" ADD CONSTRAINT "member_sequence_enrollments_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_sequence_enrollments" ADD CONSTRAINT "member_sequence_enrollments_sequence_id_retention_sequences_id_fk" FOREIGN KEY ("sequence_id") REFERENCES "public"."retention_sequences"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retention_sequence_events" ADD CONSTRAINT "retention_sequence_events_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retention_sequence_events" ADD CONSTRAINT "retention_sequence_events_enrollment_id_member_sequence_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."member_sequence_enrollments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retention_sequence_events" ADD CONSTRAINT "retention_sequence_events_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retention_sequence_events" ADD CONSTRAINT "retention_sequence_events_sequence_id_retention_sequences_id_fk" FOREIGN KEY ("sequence_id") REFERENCES "public"."retention_sequences"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retention_sequence_steps" ADD CONSTRAINT "retention_sequence_steps_sequence_id_retention_sequences_id_fk" FOREIGN KEY ("sequence_id") REFERENCES "public"."retention_sequences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retention_sequences" ADD CONSTRAINT "retention_sequences_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_runs" ADD CONSTRAINT "sync_runs_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "idx_member_notes_member" ON "member_notes" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_member_notes_gym" ON "member_notes" USING btree ("gym_id");--> statement-breakpoint
CREATE INDEX "idx_members_gym" ON "members" USING btree ("gym_id");--> statement-breakpoint
CREATE INDEX "idx_members_gym_status" ON "members" USING btree ("gym_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_members_wodify_client" ON "members" USING btree ("gym_id","wodify_client_id");--> statement-breakpoint
CREATE INDEX "idx_timeline_events_member" ON "timeline_events" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_timeline_events_gym" ON "timeline_events" USING btree ("gym_id");--> statement-breakpoint
CREATE INDEX "idx_timeline_events_member_date" ON "timeline_events" USING btree ("member_id","date");--> statement-breakpoint
CREATE INDEX "idx_lead_activities_lead" ON "lead_activities" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "idx_lead_activities_gym" ON "lead_activities" USING btree ("gym_id");--> statement-breakpoint
CREATE INDEX "idx_leads_gym" ON "leads" USING btree ("gym_id");--> statement-breakpoint
CREATE INDEX "idx_leads_gym_stage" ON "leads" USING btree ("gym_id","stage");--> statement-breakpoint
CREATE INDEX "idx_attendance_gym" ON "attendance" USING btree ("gym_id");--> statement-breakpoint
CREATE INDEX "idx_attendance_member" ON "attendance" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_attendance_class" ON "attendance" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "idx_attendance_gym_checkin" ON "attendance" USING btree ("gym_id","checkin_time");--> statement-breakpoint
CREATE INDEX "idx_billing_recovery_gym_status" ON "billing_recovery" USING btree ("gym_id","status");--> statement-breakpoint
CREATE INDEX "idx_billing_recovery_subscription_status" ON "billing_recovery" USING btree ("subscription_id","status");--> statement-breakpoint
CREATE INDEX "idx_billing_recovery_member" ON "billing_recovery" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_discount_codes_gym" ON "discount_codes" USING btree ("gym_id");--> statement-breakpoint
CREATE INDEX "idx_discount_codes_gym_code" ON "discount_codes" USING btree ("gym_id","code");--> statement-breakpoint
CREATE INDEX "idx_payment_update_tokens_token" ON "payment_update_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_payment_update_tokens_expires_used" ON "payment_update_tokens" USING btree ("expires_at","used_at");--> statement-breakpoint
CREATE INDEX "idx_scheduled_holds_gym_status" ON "scheduled_holds" USING btree ("gym_id","status");--> statement-breakpoint
CREATE INDEX "idx_scheduled_holds_member" ON "scheduled_holds" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_scheduled_holds_subscription" ON "scheduled_holds" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "idx_subscriptions_gym" ON "subscriptions" USING btree ("gym_id");--> statement-breakpoint
CREATE INDEX "idx_subscriptions_member" ON "subscriptions" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_subscriptions_gym_status" ON "subscriptions" USING btree ("gym_id","status");--> statement-breakpoint
CREATE INDEX "idx_workout_results_workout" ON "workout_results" USING btree ("workout_id");--> statement-breakpoint
CREATE INDEX "idx_workout_results_member" ON "workout_results" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_workout_results_gym" ON "workout_results" USING btree ("gym_id");--> statement-breakpoint
CREATE INDEX "idx_workouts_gym" ON "workouts" USING btree ("gym_id");--> statement-breakpoint
CREATE INDEX "idx_workouts_gym_date" ON "workouts" USING btree ("gym_id","workout_date");--> statement-breakpoint
CREATE INDEX "idx_programming_days_gym" ON "programming_days" USING btree ("gym_id");--> statement-breakpoint
CREATE INDEX "idx_programming_days_gym_date" ON "programming_days" USING btree ("gym_id","date");--> statement-breakpoint
CREATE INDEX "idx_enrollments_gym" ON "member_sequence_enrollments" USING btree ("gym_id");--> statement-breakpoint
CREATE INDEX "idx_enrollments_member" ON "member_sequence_enrollments" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "idx_enrollments_sequence" ON "member_sequence_enrollments" USING btree ("sequence_id");--> statement-breakpoint
CREATE INDEX "idx_enrollments_status" ON "member_sequence_enrollments" USING btree ("gym_id","status");--> statement-breakpoint
CREATE INDEX "idx_enrollments_next_action" ON "member_sequence_enrollments" USING btree ("status","next_action_at");--> statement-breakpoint
CREATE INDEX "idx_retention_events_enrollment" ON "retention_sequence_events" USING btree ("enrollment_id");--> statement-breakpoint
CREATE INDEX "idx_retention_events_gym" ON "retention_sequence_events" USING btree ("gym_id");--> statement-breakpoint
CREATE INDEX "idx_retention_steps_sequence" ON "retention_sequence_steps" USING btree ("sequence_id");--> statement-breakpoint
CREATE INDEX "idx_retention_sequences_gym" ON "retention_sequences" USING btree ("gym_id");--> statement-breakpoint
CREATE INDEX "idx_retention_sequences_gym_enabled" ON "retention_sequences" USING btree ("gym_id","is_enabled");--> statement-breakpoint
CREATE INDEX "idx_sync_runs_gym" ON "sync_runs" USING btree ("gym_id");--> statement-breakpoint
CREATE INDEX "idx_sync_runs_gym_status" ON "sync_runs" USING btree ("gym_id","status");