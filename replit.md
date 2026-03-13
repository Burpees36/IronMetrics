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
- **UI/UX Design:** Calm, premium dark professional SaaS theme. Features `hsl(220 20% 8%)` background, `hsl(220 20% 11%)` cards with 2xl rounded corners and a glass-panel effect. Primary accent is amber/gold (`#FBBF24`). Font uses Inter for body text.

**Key Features & Implementation:**

- **Multi-tenancy:** `gyms` table for isolated workspaces.
- **Member Management:** Full CRM, risk scoring, notes, lifecycle events, and CSV import.
- **Lead Management:** Kanban-style pipeline with activity timelines, follow-up scheduling, and conversion flows.
- **Class Scheduling:** Weekly calendar with RBAC-aware UI, capacity tracking, occupancy badges, check-ins with status management (reserved/checked_in/no_show/cancelled/waitlisted), edit class with notes fields, duplicate action, roster status dropdowns, templates with selective apply and usage tracking, copy-week, filter bar (type + coach), and Google Calendar-style overlap rendering.
- **Billing:** Comprehensive billing command center with plans, subscriptions, payments, refunds, and full Stripe integration. Billing audit logs and webhook idempotency are implemented.
- **Programming Hub:** Daily programming interface with section-based workout builder and result logging.
- **AI Operator:** Task queue for AI-generated content (outreach, owner briefs), with approval/dismissal workflows and email sending capabilities.
- **Intelligence Hub:** Provides KPI dashboards, RSI scores, risk radar, and intervention recommendations.
- **Settings:** Full administration panel for gym identity, staff/access management (RBAC), email/notifications, billing, security, branding, and integrations.
- **Onboarding Wizard:** A 6-step guided setup process for new gyms, with progress persistence and auto-detection of completeness.
- **Tenant Isolation:** Global `requireGymAccess` middleware enforces secure access to gym-scoped data.
- **Rate Limiting:** Implemented using `express-rate-limit` for API protection.
- **Error Handling:** React `ErrorBoundary` for graceful UI recovery.
- **Data Integrity:** Drizzle numeric fields are handled as strings and parsed to floats. Backend returns parsed decimal dollars for subscription amounts.

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