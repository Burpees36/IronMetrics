# Iron Metrics — Gym Management SaaS

## Overview

Iron Metrics is a full production-grade gym management SaaS platform designed for CrossFit and functional fitness gyms. It provides comprehensive tools for gym operations, including member management, billing, scheduling, programming, lead management, and an AI-powered assistant. The platform aims to streamline administrative tasks, enhance member engagement, and provide actionable intelligence for gym owners.

## User Preferences

I prefer concise and direct communication. When making changes, please prioritize the most impactful modifications first. For any significant architectural or design decisions, ask for confirmation before proceeding. Ensure all code is well-documented and follows modern TypeScript practices. I prefer an iterative development approach, delivering functional pieces frequently.

## System Architecture

Iron Metrics is built as a pnpm workspace monorepo using TypeScript.

**Monorepo Structure:**
- `artifacts/api-server/`: Express 5 API server.
- `artifacts/iron-metrics/`: React + Vite frontend.
- `lib/`: Shared libraries including OpenAPI spec, generated API clients, Drizzle ORM schema, and Replit Auth hooks.

**Technology Stack:**
- **Node.js:** 24, with pnpm as the package manager.
- **TypeScript:** 5.9.
- **API:** Express 5.
- **Frontend:** React, Vite, TailwindCSS v4, shadcn/ui.
- **Database:** PostgreSQL with Drizzle ORM.
- **Validation:** Zod (`zod/v4`).
- **API Codegen:** Orval (from OpenAPI spec).
- **Auth:** Replit Auth (OIDC with PKCE).
- **UI/UX Design:** Premium SaaS theme with light/dark mode toggle. Dark mode uses `hsl(224 35% 6%)` background, `hsl(224 35% 9%)` cards; light mode uses `hsl(210 20% 98%)` background with white cards. Both modes use 2xl rounded corners and a glass-panel effect. Primary accent is amber/gold. Theme is managed by `ThemeProvider` context (`src/store/ThemeContext.tsx`), persisted to `localStorage` key `iron-metrics-theme`, and respects `prefers-color-scheme` on first visit. An inline script in `index.html` prevents flash on load. Toggle is in the landing page navbar (desktop + mobile) and the authenticated sidebar.

**Key Features & Implementation:**

- **Multi-tenancy:** `gyms` table for isolated workspaces.
- **Member Management:** Full CRM, risk scoring, notes, lifecycle events, and CSV import.
- **Lead Management:** Kanban-style pipeline with activity timelines, follow-up scheduling, and conversion flows.
- **Class Scheduling:** Weekly calendar with RBAC-aware UI, capacity tracking, occupancy badges, check-ins with status management (reserved/checked_in/no_show/cancelled/waitlisted), edit class with notes fields, duplicate action, roster status dropdowns, templates with selective apply and usage tracking, copy-week, filter bar (type + coach), and Google Calendar-style overlap rendering.
- **Billing:** Comprehensive billing command center with plans, subscriptions, payments, refunds, and full Stripe integration. Billing audit logs and webhook idempotency are implemented. Includes billing recovery flow: automated failure emails on payment failures, secure card-update flow with Stripe SetupIntent (72h expiring tokens, single-use), staff recovery UI with send/copy link actions on Billing and MemberDetail pages, standalone UpdatePayment page for members, and webhook reconciliation that clears recovery state on successful payment. Grace period enforcement (14-day default) escalates to `grace_expired` status with final warning email. Maintenance endpoint handles token cleanup (30-day expired), recovery archival (90-day resolved), and grace evaluation. Public payment-update endpoints have dedicated rate limiting (15 req/15min) and structured security logging. Recovery endpoints are fully documented in the OpenAPI spec.
- **Programming Hub:** Daily programming interface with section-based workout builder and result logging.
- **AI Operator:** Task queue for AI-generated content (outreach, owner briefs), with approval/dismissal workflows and email sending capabilities.
- **Intelligence Hub:** Provides KPI dashboards, RSI scores, risk radar, and intervention recommendations. Dashboard KPI card shows Member Engagement Rate (unique members with check-ins / active members × 100) with week-over-week change in percentage points.
- **Settings:** Full administration panel for gym identity, staff/access management (RBAC), email/notifications, billing, security, branding, and integrations.
- **Onboarding Wizard:** A 6-step guided setup process for new gyms, with progress persistence and auto-detection of completeness.
- **Tenant Isolation:** Global `requireGymAccess` middleware enforces secure access to gym-scoped data. Express Request interface is extended in `src/types/express.d.ts` via declaration merging for type-safe `req.gymRole`, `req.gymId`, `req.billingRole`, `req.billingPermissions`, and `req.programmingRole` — no unsafe `(req as any)` casts.
- **CORS:** Configurable origin whitelist via `ALLOWED_ORIGINS` env var (comma-separated). Defaults to `*.replit.dev` and `localhost` patterns for development.
- **Error Handling (Intelligence):** All 6 intelligence route handlers wrapped in try-catch with structured error responses and console error logging.
- **Rate Limiting:** Implemented using `express-rate-limit` for API protection. Dedicated stricter limiters for auth routes (30/15min) and public payment-update routes (15/15min).
- **Testing:** Vitest for API server unit tests (`pnpm --filter @workspace/api-server run test`). Tests cover billing email builders, recovery config, and token generation/validation.
- **Error Handling:** React `ErrorBoundary` for graceful UI recovery.
- **Data Integrity:** Drizzle numeric fields are handled as strings and parsed to floats. Backend returns parsed decimal dollars for subscription amounts.
- **Database Indexes:** Foreign key columns across all tables have B-tree indexes for query performance (attendance, members, member_notes, timeline_events, leads, lead_activities, workouts, workout_results, programming_days, subscriptions). Composite indexes on common query patterns (e.g., gym+status, gym+date, member+date).
- **Date Columns:** All date-only fields use PostgreSQL `date` type with `mode: "string"` in Drizzle, returning/accepting YYYY-MM-DD strings in the API (joinDate, birthDate, workoutDate, nextFollowUpDate, currentPeriodStart/End, dueDate, programming date).

## External Dependencies

- **Replit Auth:** For user authentication and authorization.
- **Stripe:** For payment processing, subscriptions, invoices, and refunds. Integrated via Replit integration, uses `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_ACCOUNT_ID`. Webhooks are managed.
- **Resend/SendGrid:** For outbound email services (platform-wide key, gym-configured sender details).
- **PostgreSQL:** Primary database.
- **Vite:** Frontend build tool.
- **TailwindCSS:** CSS framework.
- **shadcn/ui:** UI component library.
- **Recharts:** For charting and data visualization.
- **Framer Motion:** For animations.
- **Orval:** For API client code generation from OpenAPI spec.
- **Zod:** For schema validation.
- **PapaParse:** Client-side CSV parsing.
- **express-rate-limit:** For API rate limiting.