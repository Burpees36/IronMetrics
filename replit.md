# ForgeOS — Gym Management Platform

## Overview

ForgeOS is a comprehensive gym management platform for CrossFit and functional fitness businesses. It streamlines operations with tools for member management, billing, scheduling, programming, and lead management. The platform features an embedded AI intelligence engine, **Iron Metrics**, which provides retention scoring, risk radar, revenue insights, and automated interventions to enhance member engagement and provide actionable business insights. ForgeOS handles the core operating system functions, while Iron Metrics provides the AI-driven intelligence.

## User Preferences

I prefer concise and direct communication. When making changes, please prioritize the most impactful modifications first. For any significant architectural or design decisions, ask for confirmation before proceeding. Ensure all code is well-documented and follows modern TypeScript practices. I prefer an iterative development approach, delivering functional pieces frequently.

## System Architecture

ForgeOS is a pnpm workspace monorepo built with TypeScript, Node.js 24, and TypeScript 5.9, prioritizing scalability and maintainability.

**Monorepo Structure:**
- `artifacts/api-server/`: Express 5 API server.
- `artifacts/iron-metrics/`: React + Vite frontend.
- `lib/`: Shared libraries for OpenAPI spec, generated API clients, Drizzle ORM schema, and Replit Auth hooks.

**Technology Stack:**
- **API:** Express 5.
- **Frontend:** React, Vite, TailwindCSS v4, shadcn/ui.
- **Database:** PostgreSQL with Drizzle ORM.
- **Validation:** Zod.
- **API Codegen:** Orval (from OpenAPI spec).
- **Authentication:** Replit Auth (OIDC with PKCE).

**UI/UX Design:**
A premium SaaS theme featuring light/dark mode, 2xl rounded corners, and a glass-panel effect. The primary accent color is emerald green, with violet for Pro tier features and amber/yellow for warnings. The theme context persists to `localStorage` and respects `prefers-color-scheme`.

**Core Features & Technical Implementations:**

-   **Subscription Tiers & Feature Gating:** Implemented with backend middleware (`requireTierAccess`) and frontend hooks/components (`useGymTier`, `TierGate`).
-   **Multi-tenancy:** Isolated workspaces using a `gyms` table and `requireGymAccess` middleware.
-   **Member Management:** CRM with risk scoring, lifecycle events, and CSV/Wodify import. Includes server-side paginated member lists and an "at-risk" filter view.
-   **Lead Management:** Kanban-style pipeline with activity timelines, follow-up scheduling, and a public lead capture form.
-   **Class Scheduling:** Weekly calendar with RBAC, capacity tracking, check-ins, and Google Calendar-style overlap rendering.
-   **Personal Training & Appointments:** Booking system for 1-on-1 appointments with coach availability, appointment type configuration, and automated reminders.
-   **Billing:** Comprehensive command center for plans, subscriptions, payments, refunds, and Stripe integration. Includes audit logs, payment method management, and discount codes.
-   **Programming Hub:** Daily workout builder with section-based programming, result logging, and AI-generated workout capabilities using OpenAI. AI generation considers gym methodology, equipment, and periodization, producing drafts for review with a post-generation validation layer and movement alias resolution.
-   **AI Insights (Strategic Ops Board):** Displays AI-generated interventions sorted by urgency/score, key metrics (RSI gauge, Risk Radar), and a full AI Task Inbox. Features a dynamic intervention engine and "Smart Actions" for automated task execution. Includes Milestone Celebrations Auto-Pilot (birthday, anniversary, attendance milestone, streak, comeback detection with personalized messages and cooldown dedup) and Morning Briefing delivery (configurable daily email/SMS with gym snapshot, overnight autopilot report, and milestone celebrations).
-   **SMS / Text Messaging:** Twilio-based SMS sending for manual messages from member/lead profiles and automated tasks, with gym-level configuration.
-   **Retention Automations:** Automated retention sequences (e.g., "Miss You", "Win Back") with built-in templates and a scheduler engine.
-   **Lead Nurture Sequences:** Automated multi-step lead nurture flows triggered by pipeline stage changes, with a sequence builder UI, execution engine, and templates.
-   **Financial Intelligence & Owner Pay:** Expense tracking, payroll ratio monitoring, owner take-home calculation, and monthly trend charts.
-   **Intelligence Hub:** KPI dashboards, RSI scores, risk radar, and intervention recommendations.
-   **Blended Metrics:** Service combining subscription data with Wodify imports for accurate MRR, active members, and engagement rate.
-   **MRR Snapshots:** Daily snapshots stored for historical reporting and trend analysis.
-   **Owner Console Dashboard:** Action-queue-first layout with critical counts, MRR growth, action items, and a KPI sidebar.
-   **Communication Style (Owner Voice):** Settings for gym owners to configure communication tone (e.g., Casual & Friendly, Professional), define custom word-replacement rules, and provide writing samples for AI task generation.
-   **Danger Zone (Deactivate & Delete):** Settings Danger Zone allows gym owners to deactivate (temporarily disable, blocking staff/member access) or permanently delete a business and all associated data. Includes owner-only authorization enforcement, deactivated-gym middleware guard, and a frontend deactivation banner.
-   **Onboarding Wizard:** A streamlined 3-step guided setup for new gyms.
-   **Error Handling:** Centralized error handling with structured responses and logging.
-   **Rate Limiting:** `express-rate-limit` for API protection.
-   **Data Integrity:** Drizzle numeric fields handled as strings, PostgreSQL `COUNT(*)` wrapped with `Number()`, and robust tenure calculations.
-   **Database Indexes:** B-tree indexes on foreign keys and composite indexes for performance.
-   **Object Storage:** GCS-backed via Replit App Storage for file uploads.

## External Dependencies

-   **Stripe:** For billing, subscription management, payment processing, billing portal, and webhooks.
-   **Twilio:** For SMS/text messaging via REST API.
-   **Wodify API:** For syncing client and membership data.
-   **Google Cloud Storage:** Object storage for file uploads (via Replit App Storage).
-   **Google Calendar:** For class scheduling integration.
-   **OpenAI (via Replit AI Integrations):** For AI-generated workout programming.
-   **PostgreSQL:** Relational database.