# Iron Metrics — Gym Management SaaS

## Overview

**Iron Metrics** is a full production-grade gym management SaaS platform for CrossFit/functional fitness gyms. Built as a pnpm workspace monorepo using TypeScript.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Frontend**: React + Vite + TailwindCSS v4 + shadcn/ui
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Auth**: Replit Auth (OIDC with PKCE)
- **Payments**: Stripe (via Replit integration)
- **Charts**: Recharts
- **Routing**: wouter
- **Animations**: Framer Motion
- **Build**: esbuild (CJS bundle for API server), Vite (frontend)

## Design System

- **Theme**: Calm premium dark professional enterprise SaaS
- **Background**: `hsl(220 20% 8%)`, Cards: `hsl(220 20% 11%)`
- **Primary accent**: Amber/gold (#FBBF24)
- **Font**: Inter (body), system display font
- **Corners**: 2xl rounded (16px), glass-panel effect on cards

## Structure

```text
├── artifacts/
│   ├── api-server/          # Express 5 API server (port 8080)
│   │   ├── src/routes/      # All API route handlers
│   │   ├── src/middlewares/  # Auth middleware
│   │   └── src/lib/         # Auth session management
│   └── iron-metrics/        # React + Vite frontend (previewPath: /)
│       ├── src/pages/       # All pages (Dashboard, Intelligence, Members, MemberDetail, Schedule, Leads, Billing, Workouts, AiOperator, Settings, Resources)
│       ├── src/components/  # UI components (shadcn/ui + custom)
│       └── src/store/       # GymContext for active gym state
├── lib/
│   ├── api-spec/            # OpenAPI 3.1 spec + Orval codegen config
│   ├── api-client-react/    # Generated React Query hooks (queries + mutations)
│   ├── api-zod/             # Generated Zod schemas from OpenAPI
│   ├── db/                  # Drizzle ORM schema + DB connection + seed
│   └── replit-auth-web/     # useAuth() hook for Replit Auth
└── scripts/                 # Utility scripts
```

## Database Schema

All tables in `lib/db/src/schema/`:
- **gyms** — Multi-tenant gym workspaces
- **gym_staff** — Staff/coaches per gym with roles
- **members** — Full member CRM with risk scoring (risk_tier, risk_score, attendance_count_30d)
- **member_notes** — Notes on members by staff
- **timeline_events** — Member lifecycle events
- **leads** — Lead pipeline (new → contacted → trial → negotiating → converted/lost)
- **classes** — Class schedule with capacity tracking
- **attendance** — Check-in records linked to members/classes
- **membership_plans** — Plan definitions with pricing (stripeProductId, stripePriceId)
- **subscriptions** — Active member subscriptions (stripeSubscriptionId, cancelledAt, cancelReason)
- **invoices** — Billing invoices (stripeInvoiceId, stripePaymentIntentId)
- **payments** — Payment transactions with Stripe payment intent tracking
- **refunds** — Refund records with Stripe refund ID
- **billing_events** — Billing lifecycle events audit trail
- **billing_audit_logs** — Production audit trail (actorUserId, action, entityType, beforeValue/afterValue, amount, source)
- **billing_webhook_events** — Webhook event dedup + idempotency (stripeEventId UNIQUE, status, processingError)
- **products** — Retail inventory
- **sales** — POS transactions (items stored as JSON)
- **workouts** — WOD/strength/hero workouts (field is `title`, NOT `name`)
- **workout_results** — Member results with Rx/PR tracking
- **announcements** — Gym communications
- **documents** — Waivers, agreements, consent forms
- **ai_tasks** — AI operator task queue
- **ai_generated_content** — AI-drafted outreach, briefs
- **recommendation_cards** — Strategic recommendation cards with checklists per gym/period
- **checklist_item_completions** — Checked/unchecked state for recommendation checklist items
- **recommendation_learning_stats** — Learning loop stats (expected impact, confidence, sample size)
- **recommendation_learning_events** — Individual learning events per recommendation execution
- **outcome_snapshots** — Periodic snapshots of gym metrics for learning comparison
- **owner_additional_actions** — Owner-logged actions classified against recommendation types
- **knowledge_sources** — Knowledge base sources (YouTube channels, etc.)
- **knowledge_documents** — Individual documents within a knowledge source
- **knowledge_chunks** — Chunked content from documents with taxonomy tags
- **knowledge_ingest_jobs** — Tracks ingestion job progress
- **recommendation_chunk_audit** — Audit trail linking recommendations to knowledge chunks used

## Seeded Demo Data (Source of Truth)

- **Members**: 20 (17 active, 2 cancelled, 1 hold)
- **MRR**: $2,470 (from 17 active subscriptions)
- **Leads**: 8
- **Classes**: 50
- **Attendance**: 350 records
- **Staff**: 5
- **Plans**: 4 (Unlimited, 3x/Week, Open Gym, Drop-In)
- **Products**: 6
- **Workouts**: 4
- **AI Tasks**: 11 (10 pending across outreach/onboarding/leads/billing/campaign/retention, 1 completed analysis)
- **Announcements**: 3, Documents: 3

## Frontend Pages

All pages with real API data (no hardcoded values), fully interactive:
1. **Dashboard** — KPI grid (active members, MRR, weekly attendance, at-risk count), revenue chart, member status breakdown
2. **Intelligence Hub** — RSI score gauge, risk radar table, intervention cards + recommendation execution tracker with interactive checklists
3. **Members** — Searchable member directory with status/risk filters, Add Member dialog, row actions (view profile, edit, add note, change status), clickable rows to member detail
4. **Member Detail** — Full profile page with tabs (Overview, Billing, Notes, Timeline), edit dialog, status management (hold/cancel/reactivate), add notes, attendance history, subscription info. Billing tab: subscription management (start/pause/resume/cancel), payment methods, payment history, one-time charges
5. **Schedule** — Weekly class calendar with create class dialog, class detail sheet with roster, check-in flow (member search + check-in), delete class with confirmation
6. **Leads** — Pipeline with create/edit lead dialogs, stage filter badges, move stage, convert to member, mark as lost
7. **Billing** — 5-tab billing command center (Plans, Subscriptions, Payments, Refunds, Cancelled). MRR/Active/ARM/Failed/Collected summary cards. Subscription actions (pause/resume/cancel with reason). Cancelled members view with month picker and lost revenue tracking. Full Stripe integration
8. **Workouts** — WOD cards with create workout dialog (title, type, movements, date)
9. **AI Operator** — Fully functional: approve/dismiss/edit AI tasks, type filter tabs, edit modal for draft content, owner brief generation with rendered display modal, task count badges, error states, gym-branded email sending (Send Email button visible only when platform + gym email configured, contextual banner for missing config)
10. **Settings** — General gym info, email settings (fromName/fromEmail for branded sending), staff management table with invite staff dialog
11. **Resources** — Operational playbooks for gym owners with expandable phases

## Generated API Hooks (Mutations)

All available mutation hooks from `@workspace/api-client-react`:
- `useCreateMember`, `useUpdateMember`, `useAddMemberNote`
- `useCreateLead`, `useUpdateLead`, `useConvertLeadToMember`
- `useCreateClass`, `useUpdateClass`, `useDeleteClass`, `useCheckInToClass`
- `useCreateMembershipPlan`, `useCreateSubscription`, `useUpdateSubscription`
- `useCancelSubscription`, `usePauseSubscription`, `useResumeSubscription`
- `useGetBillingSummary`, `useGetCancelledMembers`, `useListPayments`, `useListRefunds`
- `useCreateSetupIntent`, `useListPaymentMethods`, `useCreateStripeSubscription`
- `useCreateOneTimeCharge`, `useRefundPayment`, `useGetMemberBillingHistory`
- `useCreateWorkout`, `useLogWorkoutResult`
- `useInviteStaff`, `useUpdateStaff`, `useRemoveStaff`
- `useCreateGym`, `useUpdateGym`
- `useCreateProduct`, `useCreateSale`
- `useCreateAnnouncement`, `useCreateDocument`
- `useGenerateMemberOutreach`, `useGenerateOwnerBrief`, `useCreateAiTask`, `useUpdateAiTask`

All mutations accept `{ gymId: number; data: BodyType<...> }` as mutate args.
Use `getListMembersQueryKey(gymId)` etc. for cache invalidation.

## API Routes

All mounted at `/api` prefix:
- `GET /api/healthz` — Health check
- Auth: `/api/login`, `/api/callback`, `/api/logout`, `/api/auth/user`
- Gyms: CRUD at `/api/gyms`, `/api/gyms/:gymId`
- Members: `/api/gyms/:gymId/members` (list, create, get, update, notes, timeline)
- Leads: `/api/gyms/:gymId/leads` (CRUD + convert to member)
- Staff: `/api/gyms/:gymId/staff` (CRUD)
- Classes: `/api/gyms/:gymId/classes` (CRUD + checkin)
- Attendance: `/api/gyms/:gymId/attendance`
- Billing: Plans, subscriptions, invoices, payments, refunds, billing-summary, cancelled-members under `/api/gyms/:gymId/`
- Stripe: setup-intent, payment-methods, stripe-subscription, charge, refund, billing-history under `/api/gyms/:gymId/members/:memberId/`
- Stripe Webhook: `/api/stripe/webhook` (raw body, registered before express.json())
- Retail: Products + sales POS under `/api/gyms/:gymId/`
- Workouts: `/api/gyms/:gymId/workouts` + results
- Communications: `/api/gyms/:gymId/announcements`
- Documents: `/api/gyms/:gymId/documents`
- Intelligence: RSI score, risk radar, interventions, cohorts, revenue forecast, overview
- Recommendations: Execution state, checklist toggle, owner actions (CRUD)
- Knowledge: Sources CRUD, documents, chunks, search, taxonomy, stats, ingest jobs, audit trail
- AI: Tasks, outreach generation, owner brief generation, email-status, send-email (gym-branded)
- Email: Platform holds single RESEND_API_KEY or SENDGRID_API_KEY; each gym configures fromEmail/fromName in Settings for branded sending. AI routes enforce gym access (owner or staff).
- Reports: Dashboard stats, membership, revenue, attendance reports

## Key Patterns

- **Express 5**: All async handlers use `Promise<void>` return type; early returns use `res.status().json(); return;`
- **Numeric fields**: Drizzle stores `numeric()` as strings — always `parseFloat()` before sending JSON
- **Auth**: `req.isAuthenticated()` and `req.user` from auth middleware; `useAuth()` hook on frontend
- **Gym context**: Frontend uses `GymContext` to track `activeGymId`; stored in localStorage
- **Auto-linking**: First login auto-links user to seeded gym as owner
- **Vite proxy**: Frontend proxies `/api` requests to Express on port 8080
- **Stripe**: Connected via Replit integration. Env vars: STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_ACCOUNT_ID. Webhook route registered before express.json() in app.ts. Stripe init on startup: runMigrations → getStripeSync → findOrCreateManagedWebhook → syncBackfill. Service in stripeService.ts, client in stripeClient.ts
- **Billing audit**: All billing mutations log to `billing_audit_logs` via `billingAuditLogger.ts` (actor, action, before/after, amount, source)
- **Webhook idempotency**: Webhooks deduped via `billing_webhook_events.stripe_event_id` UNIQUE constraint; duplicate events skipped
- **Billing RBAC**: `billingRbac.ts` middleware checks gym_staff role. Permissions: owner/admin = full, front_desk = read+charge+subscribe, coach = none, analyst = read-only
- **Billing metrics**: Centralized in `billingMetrics.ts` (computeBillingSummary, computeMRR, computeARM, getMonthWindow)
- **Billing audit script**: `pnpm --filter @workspace/scripts run audit:billing` — prints MRR, ARM, data integrity warnings, webhook health
- **Tenant isolation**: All member-linked mutations verify `memberId + gymId` match to prevent cross-gym IDOR
- **No hardcoded metrics**: All dashboard/intelligence/AI operator values are computed from actual DB queries
- **Loading states**: All pages handle three states: no gym selected, loading, error/empty
- **Routing**: wouter with base path `import.meta.env.BASE_URL`; use relative paths in Links/navigate (e.g., `/members/${id}` not `${BASE_URL}members/${id}`)
- **Subscription amounts**: Backend returns parsed decimal dollars (not cents) — do NOT divide by 100

## Running

- API Server: `pnpm --filter @workspace/api-server run dev` (workflow)
- Frontend: `pnpm --filter @workspace/iron-metrics run dev` (workflow)
- DB Push: `pnpm --filter @workspace/db run push`
- Seed: Run `<tsx-path> lib/db/src/seed.ts` from workspace root
- Codegen: `pnpm --filter @workspace/api-spec run codegen`
