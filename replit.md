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
│       ├── src/pages/       # All pages (Dashboard, Intelligence, Members, Schedule, Leads, Billing, Workouts, AiOperator)
│       ├── src/components/  # UI components (shadcn/ui + custom)
│       └── src/store/       # GymContext for active gym state
├── lib/
│   ├── api-spec/            # OpenAPI 3.1 spec + Orval codegen config
│   ├── api-client-react/    # Generated React Query hooks
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
- **membership_plans** — Plan definitions with pricing
- **subscriptions** — Active member subscriptions
- **invoices** — Billing invoices
- **products** — Retail inventory
- **sales** — POS transactions (items stored as JSON)
- **workouts** — WOD/strength/hero workouts
- **workout_results** — Member results with Rx/PR tracking
- **announcements** — Gym communications
- **documents** — Waivers, agreements, consent forms
- **ai_tasks** — AI operator task queue
- **ai_generated_content** — AI-drafted outreach, briefs

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
- **AI Tasks**: 2
- **Announcements**: 3, Documents: 3

## Frontend Pages

All pages with real API data (no hardcoded values):
1. **Dashboard** — KPI grid (active members, MRR, weekly attendance, at-risk count), revenue chart, member status breakdown
2. **Intelligence Hub** — RSI score gauge, risk radar table, intervention cards (all computed from DB)
3. **Members** — Searchable member directory with status, risk tier, membership type
4. **Schedule** — Weekly class calendar with enrollment/capacity
5. **Leads** — Pipeline with stage badges, search, counts by stage
6. **Billing** — MRR/ARR cards, plan table with member counts, subscription list
7. **Workouts** — WOD cards with movements, type badges, result counts
8. **AI Operator** — Real task list from DB, dynamic member/risk counts from dashboard API

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
- Billing: Plans, subscriptions, invoices under `/api/gyms/:gymId/`
- Retail: Products + sales POS under `/api/gyms/:gymId/`
- Workouts: `/api/gyms/:gymId/workouts` + results
- Communications: `/api/gyms/:gymId/announcements`
- Documents: `/api/gyms/:gymId/documents`
- Intelligence: RSI score, risk radar, interventions, cohorts, revenue forecast, overview
- AI: Tasks, outreach generation, owner brief generation
- Reports: Dashboard stats, membership, revenue, attendance reports

## Key Patterns

- **Express 5**: All async handlers use `Promise<void>` return type; early returns use `res.status().json(); return;`
- **Numeric fields**: Drizzle stores `numeric()` as strings — always `parseFloat()` before sending JSON
- **Auth**: `req.isAuthenticated()` and `req.user` from auth middleware; `useAuth()` hook on frontend
- **Gym context**: Frontend uses `GymContext` to track `activeGymId`; stored in localStorage
- **Auto-linking**: First login auto-links user to seeded gym as owner
- **Vite proxy**: Frontend proxies `/api` requests to Express on port 8080
- **Tenant isolation**: All member-linked mutations verify `memberId + gymId` match to prevent cross-gym IDOR
- **No hardcoded metrics**: All dashboard/intelligence/AI operator values are computed from actual DB queries
- **Loading states**: All pages handle three states: no gym selected, loading, error/empty

## Running

- API Server: `pnpm --filter @workspace/api-server run dev` (workflow)
- Frontend: `pnpm --filter @workspace/iron-metrics run dev` (workflow)
- DB Push: `pnpm --filter @workspace/db run push`
- Seed: Run `<tsx-path> lib/db/src/seed.ts` from workspace root
- Codegen: `pnpm --filter @workspace/api-spec run codegen`
