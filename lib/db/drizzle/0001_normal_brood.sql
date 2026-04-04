CREATE TABLE "ai_operator_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"gym_id" integer NOT NULL,
	"autopilot_outreach" boolean DEFAULT false NOT NULL,
	"autopilot_billing" boolean DEFAULT false NOT NULL,
	"autopilot_leads" boolean DEFAULT false NOT NULL,
	"channel_outreach" text DEFAULT 'email' NOT NULL,
	"channel_billing" text DEFAULT 'email' NOT NULL,
	"channel_leads" text DEFAULT 'email' NOT NULL,
	"cooldown_days" integer DEFAULT 14 NOT NULL,
	"digest_frequency" text DEFAULT 'daily' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_operator_settings_gym_id_unique" UNIQUE("gym_id")
);
--> statement-breakpoint
CREATE TABLE "rsi_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"gym_id" integer NOT NULL,
	"score" numeric(5, 1) NOT NULL,
	"band" text NOT NULL,
	"churn_norm" numeric(5, 1),
	"rev_norm" numeric(5, 1),
	"growth_norm" numeric(5, 1),
	"tenure_norm" numeric(5, 1),
	"recorded_at" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "benchmarks" (
	"id" serial PRIMARY KEY NOT NULL,
	"metric" text NOT NULL,
	"size_segment" text NOT NULL,
	"p25" numeric(10, 2),
	"p50" numeric(10, 2),
	"p75" numeric(10, 2),
	"p90" numeric(10, 2),
	"sample_count" integer DEFAULT 0 NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mrr_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"gym_id" integer NOT NULL,
	"snapshot_date" date NOT NULL,
	"total_mrr" numeric DEFAULT '0' NOT NULL,
	"subscription_mrr" numeric DEFAULT '0' NOT NULL,
	"wodify_mrr" numeric DEFAULT '0' NOT NULL,
	"active_member_count" integer DEFAULT 0 NOT NULL,
	"arm" numeric DEFAULT '0' NOT NULL,
	"revenue_source" text DEFAULT 'wodify_only' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gyms" ADD COLUMN "sms_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "gyms" ADD COLUMN "twilio_account_sid" text;--> statement-breakpoint
ALTER TABLE "gyms" ADD COLUMN "twilio_auth_token" text;--> statement-breakpoint
ALTER TABLE "gyms" ADD COLUMN "twilio_phone_number" text;--> statement-breakpoint
ALTER TABLE "ai_tasks" ADD COLUMN "subject" text;--> statement-breakpoint
ALTER TABLE "ai_tasks" ADD COLUMN "personalization_meta" text;--> statement-breakpoint
ALTER TABLE "ai_tasks" ADD COLUMN "outcome" text DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "ai_tasks" ADD COLUMN "outcome_detected_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ai_tasks" ADD COLUMN "revenue_impact" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "ai_tasks" ADD COLUMN "actioned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ai_tasks" ADD COLUMN "channel" text DEFAULT 'email' NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_tasks" ADD COLUMN "auto_sent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_operator_settings" ADD CONSTRAINT "ai_operator_settings_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsi_snapshots" ADD CONSTRAINT "rsi_snapshots_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mrr_snapshots" ADD CONSTRAINT "mrr_snapshots_gym_id_gyms_id_fk" FOREIGN KEY ("gym_id") REFERENCES "public"."gyms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_rsi_snapshots_gym_date" ON "rsi_snapshots" USING btree ("gym_id","recorded_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_rsi_snapshots_gym_date_unique" ON "rsi_snapshots" USING btree ("gym_id","recorded_at");--> statement-breakpoint
CREATE INDEX "idx_benchmarks_metric_segment" ON "benchmarks" USING btree ("metric","size_segment");--> statement-breakpoint
CREATE INDEX "idx_benchmarks_computed_at" ON "benchmarks" USING btree ("computed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_mrr_snapshots_gym_date" ON "mrr_snapshots" USING btree ("gym_id","snapshot_date");