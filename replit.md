# Iron Metrics — Gym Management SaaS

## Overview

Iron Metrics is a comprehensive gym management SaaS platform designed for CrossFit and functional fitness gyms. It provides essential tools for member management, billing, scheduling, programming, and lead management. The platform also features an AI-powered assistant to streamline administrative tasks, enhance member engagement, and offer actionable insights for gym owners to optimize operations and improve member retention.

## User Preferences

I prefer concise and direct communication. When making changes, please prioritize the most impactful modifications first. For any significant architectural or design decisions, ask for confirmation before proceeding. Ensure all code is well-documented and follows modern TypeScript practices. I prefer an iterative development approach, delivering functional pieces frequently.

## System Architecture

Iron Metrics is built as a pnpm workspace monorepo using TypeScript, designed for scalability and maintainability, leveraging Node.js 24, TypeScript 5.9, and pnpm.

**Monorepo Structure:**
- `artifacts/api-server/`: Express 5 API server.
- `artifacts/iron-metrics/`: React + Vite frontend.
- `lib/`: Shared libraries (OpenAPI spec, generated API clients, Drizzle ORM schema, Replit Auth hooks).

**Technology Stack:**
- **API:** Express 5.
- **Frontend:** React, Vite, TailwindCSS v4, shadcn/ui.
- **Database:** PostgreSQL with Drizzle ORM.
- **Validation:** Zod (`zod/v4`).
- **API Codegen:** Orval (from OpenAPI spec).
- **Authentication:** Replit Auth (OIDC with PKCE).

**UI/UX Design:**
A premium SaaS theme with light/dark mode, 2xl rounded corners, and a glass-panel effect. The primary accent color is emerald green, with violet for the Pro tier and amber/yellow for warnings. The theme context (`ThemeProvider`) persists to `localStorage` and respects `prefers-color-scheme`.

**Core Features & Technical Implementations:**

- **Subscription Tiers & Feature Gating:** Three tiers (Insights, Growth, Pro) with beta access. Backend uses `requireTierAccess` middleware, frontend uses `useGymTier` hook and `TierGate` component.
- **Multi-tenancy:** `gyms` table provides isolated workspaces with `requireGymAccess` middleware.
- **Member Management:** CRM with risk scoring, notes, lifecycle events, CSV/Wodify import with deduplication. Members list has server-side pagination (50/page with prev/next controls). At-risk filter view (`/members?filter=at-risk`) shows risk tier badges, risk score bars, days since last visit, and monthly revenue at stake with total revenue summary in banner.
- **Lead Management:** Kanban-style pipeline, activity timelines, follow-up scheduling, and public lead capture form.
- **Class Scheduling:** Weekly calendar with RBAC-aware UI, capacity tracking, check-ins, templates, and Google Calendar-style overlap rendering.
- **Personal Training & Appointments:** 1-on-1 appointment booking alongside group classes. Features appointment type configuration, coach availability management, appointment booking (from Schedule page, lead cards, or member profiles), automatic lead stage updates on NSI booking, appointment history on member profiles, and automated reminders (24h and 1h before). Database tables: `appointment_types`, `coach_availability`, `appointments`.
- **Billing:** Comprehensive command center with plans, subscriptions, payments, refunds, and Stripe integration. Includes audit logs, recovery flows, payment method management, linked billing, plan changes, scheduled holds, discount codes, account credits, and tax configuration.
- **Programming Hub:** Daily programming interface with section-based workout builder, result logging, and AI-generated programming capabilities (full week or individual day) using OpenAI. AI generation considers gym methodology, structure templates, equipment, and periodization rules, creating drafts for review. Supports regeneration of existing days with overwrite confirmation. Generate Week checks for existing days first, passes them as context to avoid duplication, only generates missing days, and scales token limits dynamically (~3000 per missing day). Post-generation validation layer (`programmingValidation.ts`) checks equipment compliance, banned movements, structure template adherence, frequency caps, time budgets, coaching quality, and movement pattern balance. Includes a movement alias resolver (90+ CrossFit abbreviations like C&J, T2B, HSPU, DU → canonical names) integrated into `normalizeMovement` so all validators automatically resolve aliases. Movement pattern categorization maps movements to push/pull/squat/hinge/carry/core/monostructural patterns with `patternDistribution` in `ValidationResult`. Pattern balance warnings fire when any category is <15% or >40% of total volume (carry exempt from underrepresentation). Retry/correction flow (up to 2 retries with violation feedback) selects the best-of-N attempts. Per-day retry: when week generation fails validation, only failing days are individually regenerated (preserving passing days), then week-level cross-day checks are re-validated. Validation metadata (`validationMeta` JSONB column on `programming_days`) stores pass/fail, error/warning counts, retry count, and violation summaries. API responses include a `validation` field with pass/fail, warningCount, and retryCount. Unit tests in `programming-ai-stress-test.test.ts` (34 tests), `movement-intelligence.test.ts` (29 tests), live stress test script in `stress-test-programming.ts` (12 scenarios).
- **AI Insights (Strategic Ops Board at `/ai-insights`):** Single-scroll layout with AI-generated interventions sorted by urgency/score on the left, and key metrics (RSI gauge, mini stat cards, Risk Radar, RSI Trend chart, AI Impact Summary) on the right. Includes a full AI Task Inbox. "Auto-Pilot" renamed to "Smart Actions". AI task cards have both "Email" and "Text" send buttons. Dynamic intervention engine (`intervention-engine.ts`) uses a builder pattern — each intervention type is a self-contained function that queries its own data, computes relevance, and returns null when irrelevant. Supports 9 intervention types: retention, billing, onboarding, leads, campaign/referral, pricing/ARM opportunity, engagement decline, new member ramp-up, and win-back. Scores are dynamic based on data severity and blended with recommendation-learning stats when available. Frontend handles 0–10 cards with an "all clear" empty state.
    - **AI Task Queue:** Manages AI-generated content (outreach, owner briefs) with approval/dismissal and email sending. Features autonomous daily scheduling, personalization using member/lead context, outcome tracking, and revenue attribution.
    - **Auto-Pilot Mode:** Allows owners to enable per-category auto-send for AI-generated tasks with safety guardrails (valid email, cooldowns) and a configurable digest.
- **SMS / Text Messaging:** Twilio-based SMS sending via REST API (no SDK). Gym-level Twilio config (Account SID, Auth Token, Phone Number) stored in gyms table with `smsEnabled` toggle. Settings UI in `SmsSettings.tsx`. Manual SMS from member profiles and lead cards via compose dialogs. Auto-pilot supports per-category channel preferences (email/sms/both) with cross-channel cooldown. Timeline/activity logging for sent texts. API routes: `POST /gyms/:gymId/members/:memberId/send-sms`, `POST /gyms/:gymId/leads/:leadId/send-sms`, `POST /gyms/:gymId/ai/tasks/:taskId/send-sms`. Services: `sms-service.ts`, `member-sms.ts`.
- **Retention Automations:** Automated retention sequences with built-in templates (Miss You, Check-In, Win Back, Onboarding Journey). Scheduler engine evaluates triggers, advances steps, and handles re-engagement.
- **Lead Nurture Sequences:** Automated multi-step lead nurture flows triggered by pipeline stage changes (new, contacted, scheduled). Features a sequence builder UI, execution engine with 15-minute scheduler, 3 default templates (New Lead Welcome, Post-Intro Follow-up, Stale Lead Re-engagement), enrollment tracking, and performance metrics dashboard. Schema: `lead_sequences`, `lead_sequence_steps`, `lead_sequence_enrollments`, `lead_sequence_events`. Routes: `/api/gyms/:gymId/lead-sequences/*`. Frontend: `/lead-sequences` page accessible from Leads page header.
- **Financial Intelligence & Owner Pay:** Expense tracking (recurring/one-time with frequency normalization), payroll ratio monitoring, owner take-home calculation (remainder/percentage/fixed methods), monthly trend charts, and rule-based financial insights. Includes a financial summary card on the main dashboard. Routes use billing RBAC (`requireBillingPermission`/`requireBillingRead`) and cross-tenant category validation. Settings use local form state with explicit save.
- **Intelligence Hub:** KPI dashboards, RSI scores, risk radar, and intervention recommendations. Includes "Action-First Command" dashboard, RSI historical tracking, member engagement rate, and industry benchmarking.
- **Blended Metrics:** Service (`blendedMetrics.ts`) combines subscription data with Wodify-imported member data for accurate MRR, active members, ARM, and engagement rate calculations.
- **MRR Snapshots:** `mrr_snapshots` table stores daily MRR snapshots for historical reporting and trend analysis, prioritizing actual data over estimates.
- **Owner Console Dashboard (Action-First Command):** Action-queue-first layout featuring onboarding/sync banners, a header with critical counts and MRR growth, a two-column grid for action items, and a KPI sidebar.
- **Communication Style (Owner Voice):** A settings section where gym owners configure their communication tone (Casual & Friendly, Professional, Motivational Coach), define custom word-replacement rules, and paste writing samples. The AI task generation system applies these voice settings to all outreach templates. Includes a live preview feature. Schema fields: `communication_style_tone`, `communication_style_rules`, `communication_style_samples` on the gyms table.
- **Settings:** Full administration panel for gym identity, staff/access management (RBAC), programming preferences, email/notifications, billing, security, branding, communication style, and integrations.
- **Onboarding Wizard:** A streamlined 3-step guided setup for new gyms: Connect Data, Gym Details, and Launch.
- **Error Handling:** Centralized error handling with structured responses, logging, and React `ErrorBoundary`.
- **Rate Limiting:** `express-rate-limit` for API protection.
- **Data Integrity:** Drizzle numeric fields handled as strings, PostgreSQL `COUNT(*)` wrapped with `Number()`, tenure calculations fallback.
- **Database Indexes:** B-tree indexes on foreign key and composite indexes for performance.
- **Date Columns:** All date-only fields use PostgreSQL `date` type.
- **Object Storage:** GCS-backed via Replit App Storage for file uploads.

## External Dependencies

-   **Stripe:** For billing, subscription management, payment processing, billing portal, and webhooks.
-   **Twilio:** For SMS/text messaging via REST API (`api.twilio.com/2010-04-01/Accounts/{SID}/Messages.json`), no SDK dependency.
-   **Wodify API (api.wodify.com/v1):** For syncing client and membership data.
-   **Google Cloud Storage:** Object storage for file uploads (profile photos, etc.) via Replit App Storage.
-   **Google Calendar:** For class scheduling integration.
-   **OpenAI (via Replit AI Integrations):** For AI-generated workout programming using GPT-5.2.
-   **PostgreSQL:** Relational database for all application data.
