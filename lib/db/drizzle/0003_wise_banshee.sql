ALTER TABLE "gym_onboarding" ALTER COLUMN "current_step" SET DEFAULT 'gym_details';--> statement-breakpoint
ALTER TABLE "ai_operator_settings" ADD COLUMN "autopilot_celebrations" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_operator_settings" ADD COLUMN "channel_celebrations" text DEFAULT 'email' NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_operator_settings" ADD COLUMN "cooldown_celebrations" integer DEFAULT 90 NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_operator_settings" ADD COLUMN "briefing_email_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_operator_settings" ADD COLUMN "briefing_delivery_hour" integer DEFAULT 6 NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_operator_settings" ADD COLUMN "briefing_sms_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_tasks" ADD COLUMN "subtype" text;