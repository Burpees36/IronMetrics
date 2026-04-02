# Iron Metrics — Gym Management SaaS

## Overview

Iron Metrics is a comprehensive gym management SaaS platform for CrossFit and functional fitness gyms. It provides tools for member management, billing, scheduling, programming, lead management, and an AI-powered assistant. The platform aims to streamline administrative tasks, enhance member engagement, and offer actionable insights for gym owners to optimize operations and improve member retention.

## User Preferences

I prefer concise and direct communication. When making changes, please prioritize the most impactful modifications first. For any significant architectural or design decisions, ask for confirmation before proceeding. Ensure all code is well-documented and follows modern TypeScript practices. I prefer an iterative development approach, delivering functional pieces frequently.

## System Architecture

Iron Metrics is built as a pnpm workspace monorepo using TypeScript, designed for scalability and maintainability.

**Monorepo Structure:**
- `artifacts/api-server/`: Express 5 API server.
- `artifacts/iron-metrics/`: React + Vite frontend.
- `lib/`: Shared libraries including OpenAPI spec, generated API clients, Drizzle ORM schema, and Replit Auth hooks.

**Technology Stack:**
- **Node.js:** 24, with pnpm.
- **TypeScript:** 5.9.
- **API:** Express 5.
- **Frontend:** React, Vite, TailwindCSS v4, shadcn/ui.
- **Database:** PostgreSQL with Drizzle ORM.
- **Validation:** Zod (`zod/v4`).
- **API Codegen:** Orval (from OpenAPI spec).
- **Auth:** Replit Auth (OIDC with PKCE).

**UI/UX Design:**
A premium SaaS theme with light/dark mode, 2xl rounded corners, and a glass-panel effect. Primary accent is emerald green; violet for Pro tier; amber/yellow for warnings. Theme context `ThemeProvider` persists to `localStorage` and respects `prefers-color-scheme`.

**Technical Implementations & Feature Specifications:**

- **Subscription Tiers & Feature Gating:** Three tiers (Insights, Growth, Pro) with beta access flag. Configured in `tierConfig.ts`. Backend uses `requireTierAccess` middleware, frontend uses `useGymTier` hook and `TierGate` component. Stripe integration for product/price creation and subscription management via Checkout and Billing Portal. Webhook handlers update `subscriptionTier`.
- **Multi-tenancy:** `gyms` table provides isolated workspaces. `requireGymAccess` middleware enforces access.
- **Member Management:** CRM with risk scoring, notes, lifecycle events, CSV/Wodify import. Import process includes preview, deduplication, and progress tracking via `sync_runs` table. Wodify API integration for syncing clients and memberships, handling pagination, data normalization, and async background processing with real-time progress updates.
- **Lead Management:** Kanban-style pipeline, activity timelines, follow-up scheduling, and public lead capture form (`/join/:gymSlug`) with configurable fields and attribution.
- **Class Scheduling:** Weekly calendar with RBAC-aware UI, capacity tracking, check-ins, templates, and Google Calendar-style overlap rendering.
- **Billing:** Comprehensive billing command center with plans, subscriptions, payments, refunds, and Stripe integration. Includes billing audit logs, recovery flows (card updates, grace periods), payment method management, couples/linked billing, plan upgrade/downgrade, scheduled holds, past-due check-in enforcement, discount codes, account credits, invoice access, and tax configuration.
- **Programming Hub:** Daily programming interface with section-based workout builder and result logging.
- **AI Operator:** Task queue for AI-generated content (outreach, owner briefs), with approval/dismissal and email sending.
- **Retention Automations:** Automated retention sequences with built-in templates, scheduler engine evaluating triggers, and managing member enrollments.
- **Intelligence Hub:** KPI dashboards, RSI scores, risk radar, and intervention recommendations. Includes "Action-First Command" dashboard redesign prioritizing actionable items from morning briefings, alongside KPI cards for MRR, active members, RSI, retention rate, and quick stats.
- **Blended Metrics:** Combines subscription data with Wodify-imported member data for accurate MRR, ARM, active members, and engagement rates, providing `revenueSource` and `attendanceSource` metadata.
- **Settings:** Full administration panel for gym identity, staff/access management (RBAC), email/notifications, billing, security, branding, and integrations.
- **Onboarding Wizard:** A 6-step guided setup process for new gyms.
- **Error Handling:** Centralized error handling with structured responses, console logging, and React `ErrorBoundary`.
- **Rate Limiting:** `express-rate-limit` for API protection, with stricter limits on auth and public payment-update routes.
- **Testing:** Vitest with comprehensive backend (402 tests) and frontend (42 tests) coverage, including webhook handlers, AI task generation, member import validation, billing metrics, RBAC, intelligence computations, and UI components.
- **Data Integrity:** Drizzle numeric fields handled as strings and parsed to floats, PostgreSQL `COUNT(*)` wrapped with `Number()`. Tenure calculations fallback to `createdAt`.
- **Database Indexes:** B-tree indexes on foreign key columns and composite indexes on common query patterns for performance.
- **Date Columns:** All date-only fields use PostgreSQL `date` type, accepting/returning YYYY-MM-DD strings.
- **Dev Preview Bypass:** Development-only feature to inject mock user sessions for authenticated dashboard content screenshots.

## External Dependencies

- **Stripe:** For billing, subscription management, payment processing, billing portal, and webhooks.
- **Wodify API (api.wodify.com/v1):** For syncing client and membership data.
- **Google Calendar:** For class scheduling integration.