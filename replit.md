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
- **Auth:** Replit Auth (OIDC with PKCE).

**UI/UX Design:**
A premium SaaS theme with light/dark mode, 2xl rounded corners, and a glass-panel effect. The primary accent color is emerald green, with violet for the Pro tier and amber/yellow for warnings. The theme context (`ThemeProvider`) persists to `localStorage` and respects `prefers-color-scheme`.

**Technical Implementations & Feature Specifications:**

- **Subscription Tiers & Feature Gating:** Three tiers (Insights, Growth, Pro) with beta access. Backend uses `requireTierAccess` middleware, frontend uses `useGymTier` hook and `TierGate` component.
- **Multi-tenancy:** `gyms` table provides isolated workspaces with `requireGymAccess` middleware.
- **Member Management:** CRM with risk scoring, notes, lifecycle events, CSV/Wodify import with deduplication.
- **Lead Management:** Kanban-style pipeline, activity timelines, follow-up scheduling, and public lead capture form.
- **Class Scheduling:** Weekly calendar with RBAC-aware UI, capacity tracking, check-ins, templates, and Google Calendar-style overlap rendering.
- **Billing:** Comprehensive command center with plans, subscriptions, payments, refunds, and Stripe integration. Includes audit logs, recovery flows, payment method management, linked billing, plan changes, scheduled holds, discount codes, account credits, and tax configuration.
- **Programming Hub:** Daily programming interface with section-based workout builder, result logging, and AI-generated programming capabilities (full week or individual day) using OpenAI. AI generation considers gym methodology, structure templates, equipment, and periodization rules, creating drafts for review. Supports regeneration of existing days with overwrite confirmation.
- **AI Insights (Strategic Ops Board at `/ai-insights`):** Single-scroll layout with AI-generated interventions sorted by urgency/score on the left, and key metrics (RSI gauge, mini stat cards, Risk Radar, RSI Trend chart, AI Impact Summary) on the right. Includes a full AI Task Inbox. "Auto-Pilot" renamed to "Smart Actions".
    - **AI Task Queue:** Manages AI-generated content (outreach, owner briefs) with approval/dismissal and email sending. Features autonomous daily scheduling, personalization using member/lead context, outcome tracking, and revenue attribution.
    - **Auto-Pilot Mode:** Allows owners to enable per-category auto-send for AI-generated tasks with safety guardrails (valid email, cooldowns) and a configurable digest.
- **Retention Automations:** Automated retention sequences with built-in templates (Miss You, Check-In, Win Back, Onboarding Journey). Scheduler engine evaluates triggers, advances steps, and handles re-engagement.
- **Lead Nurture Sequences:** Automated multi-step lead nurture flows triggered by pipeline stage changes (new, contacted, scheduled). Features a sequence builder UI, execution engine with 15-minute scheduler, 3 default templates (New Lead Welcome, Post-Intro Follow-up, Stale Lead Re-engagement), enrollment tracking, and performance metrics dashboard. Schema: `lead_sequences`, `lead_sequence_steps`, `lead_sequence_enrollments`, `lead_sequence_events`. Routes: `/api/gyms/:gymId/lead-sequences/*`. Frontend: `/lead-sequences` page accessible from Leads page header.
- **Intelligence Hub:** KPI dashboards, RSI scores, risk radar, and intervention recommendations. Includes "Action-First Command" dashboard, RSI historical tracking, member engagement rate, and industry benchmarking.
- **Blended Metrics:** Service (`blendedMetrics.ts`) combines subscription data with Wodify-imported member data for accurate MRR, active members, ARM, and engagement rate calculations.
- **MRR Snapshots:** `mrr_snapshots` table stores daily MRR snapshots for historical reporting and trend analysis, prioritizing actual data over estimates.
- **Owner Console Dashboard (Action-First Command):** Action-queue-first layout featuring onboarding/sync banners, a header with critical counts and MRR growth, a two-column grid for action items, and a KPI sidebar.
- **Settings:** Full administration panel for gym identity, staff/access management (RBAC), programming preferences, email/notifications, billing, security, branding, and integrations.
- **Onboarding Wizard:** A streamlined 3-step guided setup for new gyms: Connect Data, Gym Details, and Launch.
- **Error Handling:** Centralized error handling with structured responses, logging, and React `ErrorBoundary`.
- **Rate Limiting:** `express-rate-limit` for API protection.
- **Data Integrity:** Drizzle numeric fields handled as strings, PostgreSQL `COUNT(*)` wrapped with `Number()`, tenure calculations fallback.
- **Database Indexes:** B-tree indexes on foreign key and composite indexes for performance.
- **Date Columns:** All date-only fields use PostgreSQL `date` type.
- **Object Storage:** GCS-backed via Replit App Storage for file uploads.

## External Dependencies

-   **Stripe:** For billing, subscription management, payment processing, billing portal, and webhooks.
-   **Wodify API (api.wodify.com/v1):** For syncing client and membership data.
-   **Google Cloud Storage:** Object storage for file uploads (profile photos, etc.) via Replit App Storage.
-   **Google Calendar:** For class scheduling integration.
-   **OpenAI (via Replit AI Integrations):** For AI-generated workout programming using GPT-5.2.
-   **PostgreSQL:** Relational database for all application data.
