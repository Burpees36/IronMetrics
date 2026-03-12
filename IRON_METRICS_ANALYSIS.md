# Iron Metrics: Production Readiness & Competitive Gap Analysis

---

## 1. Production Readiness Issues

### 1A. Data Integrity

| Issue | Severity | Details |
|-------|----------|---------|
| **Tenant isolation gaps** | CRITICAL | Routes for Members, Leads, Attendance, Intelligence, Reports, and Classes verify `gymId` in the database query but **never verify the authenticated user has access to that gym**. Any authenticated user who guesses a `gymId` can read another gym's data. Billing and Programming have proper RBAC; the rest do not. |
| **No capacity enforcement on check-in** | HIGH | The `checkin` endpoint increments `enrolled` but never checks `enrolled >= capacity`. Overbooking is silently allowed. |
| **Date stored as text** | MEDIUM | `programming_days.date`, `leads.next_follow_up_date`, and several other date fields are stored as `text` instead of proper `date`/`timestamp` types. This breaks range queries, sorting, and timezone handling. |
| **Redundant staff tables** | MEDIUM | Both `gym_staff` and `staff` tables exist with overlapping columns. This creates data divergence risk where one table is updated but not the other. |
| **Missing foreign key indexes** | MEDIUM | Tables like `attendance`, `workout_results`, `timeline_events`, and `lead_activities` lack indexes on `member_id`, `gym_id`, and `class_id`. Will cause major performance degradation at scale (100+ members, 1000+ check-ins). |
| **No rate limiting** | HIGH | No rate limiting on any API endpoint. A single bad actor or script can flood the API with requests, impacting all users. |
| **Stale RSI on zero members** | LOW | RSI calculation divides by member count. Edge case with 0 members could produce NaN/Infinity. |

### 1B. Operational Workflow Gaps

| Workflow | Status | Gap |
|----------|--------|-----|
| **New member signup** | Partial | Works via direct add or lead conversion, but no self-service sign-up portal for members. |
| **Billing failure recovery** | Basic | Dunning increments `failedPayments` and moves to `past_due` after 2 failures. No automated email to the member. No "update your card" flow. |
| **Lead follow-up reminders** | Visual only | System shows overdue badges but sends no push notifications, emails, or automated reminders. |
| **Coach class management** | Minimal | Coaches can be assigned to classes but have no dedicated coach portal or "my classes today" view. |
| **Schedule changes/cancellations** | Partial | Staff can delete classes but there's no member notification, no cancellation reason tracking, and no waitlist promotion. |
| **Attendance disputes** | Missing | No way to mark "no-show," "late cancel," or "excused absence." Only "present" is tracked. |
| **Member self-service** | Missing | Members cannot book classes, view their schedule, check in themselves, or update payment info. |
| **Refund workflow** | Basic | Refunds are logged but there's no partial refund UI, credit system, or refund approval workflow. |

### 1C. Onboarding for New Gyms

What's needed for <30 minute onboarding:

| Capability | Status |
|------------|--------|
| Create gym with basic info | EXISTS |
| Add staff/coaches | EXISTS |
| Create membership plans | EXISTS |
| Import members from CSV | MISSING |
| Import billing history from Stripe | PARTIAL (sync exists but not surfaced as onboarding step) |
| Set up class schedule templates | MISSING (must create classes one at a time) |
| Guided setup wizard | MISSING |
| Demo data / sandbox mode | PARTIAL (demo gym exists but is empty) |
| Import from Wodify/Mindbody | MISSING |

### 1D. Billing Reliability

| Feature | Status | Assessment |
|---------|--------|------------|
| Subscription creation | SOLID | Uses `payment_behavior: 'default_incomplete'` correctly. |
| Webhook idempotency | SOLID | Deduplicates via `billing_webhook_events` table with `onConflictDoNothing`. |
| Failed payment tracking | BASIC | Counts failures, transitions to `past_due` after 2. |
| Dunning emails | MISSING | No automated "your payment failed" email to members. |
| Invoice history | EXISTS | Invoices table and UI exist. |
| Refund flow | BASIC | Recorded via webhook, but no staff-initiated refund workflow in UI. |
| Payment retries | DELEGATED | Relies on Stripe's built-in retry schedule. Not configurable. |
| Billing audit logs | STRONG | Every mutation logged with actor, before/after values, source. |
| Update payment method | MISSING | No "update card" flow for members or staff. |
| Proration | MISSING | No plan upgrade/downgrade proration logic. |
| Tax handling | MISSING | No tax configuration or Stripe Tax integration. |

### 1E. CRM Pipeline Robustness

| Feature | Status |
|---------|--------|
| Lead stages (5-column Kanban) | STRONG |
| Activity timeline | STRONG |
| Follow-up scheduling | EXISTS |
| Stale detection | EXISTS |
| Source tracking | EXISTS |
| Conversion to member | SOLID (with idempotency) |
| Sales insights (conversion rates, bottleneck) | EXISTS |
| Lead capture (web form / landing page) | MISSING |
| Referral tracking with attribution | BASIC (source field only, no referrer member link) |
| Intro class scheduling from lead | MISSING (no direct link to Schedule) |
| Automated follow-up sequences | MISSING |
| Email/SMS outreach from CRM | MISSING |
| Lead scoring (AI) | MISSING |

### 1F. Member Lifecycle Gaps

```
lead --> trial --> member --> retention --> churn --> win-back
  OK    MISSING    OK        PARTIAL       BASIC    MISSING
```

| Stage | Issue |
|-------|-------|
| **Trial** | No explicit "trial" member status. Trial members are just "active." No trial expiry tracking, no conversion prompt when trial ends. |
| **Retention** | Risk scoring exists but interventions are informational only. No automated outreach when risk goes critical. |
| **Churn** | Subscription deletion = immediate `cancelled`. No grace period. No "pause before cancel" suggestion. |
| **Win-back** | Cancelled members are listed in a report but there's no reactivation workflow, no win-back campaigns, no "we miss you" automation. |

### 1G. Scheduling System Gaps

| Feature | Status |
|---------|--------|
| Class CRUD | EXISTS |
| Coach assignment | EXISTS |
| Capacity display | EXISTS |
| Repeat/recurring (frontend loop) | EXISTS (new) |
| Check-in | EXISTS |
| Waitlists | MISSING |
| Member self-booking | MISSING |
| Cancellation workflow | MISSING |
| No-show tracking | MISSING |
| Late cancel penalties | MISSING |
| Class series management | MISSING (each occurrence is independent) |
| Substitutions (replace coach) | MISSING |
| Class templates | MISSING |

### 1H. Security & Access Control

| Area | Status | Issue |
|------|--------|-------|
| Authentication (OIDC) | SOLID | Replit Auth properly implemented. |
| Billing RBAC | STRONG | 5 roles, granular permissions. |
| Programming RBAC | STRONG | Role-based with data filtering (strips coach notes). |
| Members/Leads/Reports | CRITICAL GAP | No user-to-gym access check. Any authenticated user can read any gym's data by guessing `gymId`. |
| Staff management | SOLID | Explicit caller checks. |
| CORS | BASIC | `origin: true` is permissive. |
| Rate limiting | MISSING | No protection against abuse. |
| Input sanitization | ADEQUATE | Drizzle ORM prevents SQL injection. Zod validates schemas. |

### 1I. Reliability

| Area | Status |
|------|--------|
| Error handling | BASIC -- global 500 handler catches unhandled errors, but most routes lack try-catch. Stripe/AI routes have proper error handling. |
| Loading states | GOOD -- Loader2 spinners used consistently. Workouts page has skeleton loading. |
| Empty states | GOOD -- Contextual empty states with action buttons. |
| Retry logic | NONE -- No client-side retry on failed API calls (TanStack Query defaults). No server-side retry on DB failures. |
| Audit logs | BILLING ONLY -- Only billing has audit logs. Member changes, schedule changes, and settings changes are not tracked. |
| Error boundaries | MISSING -- No React error boundary. A single component crash takes down the entire page. |

### 1J. Mobile Usability

| Area | Assessment |
|------|------------|
| Responsive layouts | GOOD -- `useIsMobile` hook switches between table/card views. |
| Navigation | DECENT -- Bottom nav on mobile with sheet menu. |
| Touch targets | NEEDS REVIEW -- Some buttons (especially in dialogs) may be too small for touch. |
| Kanban on mobile | POOR -- Horizontal pipeline board is hard to use on mobile. Needs vertical stack or tabs. |
| Schedule on mobile | FAIR -- Day cards work on mobile but creating classes requires scrolling through a long dialog. |
| Offline support | NONE -- No service worker, no offline queue. |

---

## 2. Competitive Gaps vs Wodify

### Where Iron Metrics Already Wins

| Area | Advantage |
|------|-----------|
| **Intelligence/Analytics** | RSI, Risk Radar, intervention engine -- Wodify has nothing comparable. This is the core differentiator. |
| **Sales CRM** | Built-in Kanban pipeline with activity timeline, insights, stale detection. Wodify requires third-party CRM. |
| **UI/UX Design** | Modern, dark-mode premium aesthetic. Wodify looks dated. |
| **Billing Audit Trail** | Comprehensive audit logging with before/after values. |
| **AI Integration** | AI Operator for task generation, content creation. Wodify has none. |
| **Workout Programming** | Structured sections with scaling notes, intended stimulus, and member result tracking. |
| **Decision Engine Philosophy** | Every metric is actionable. Wodify shows data; Iron Metrics tells you what to do about it. |

### Where Wodify Still Wins

| Area | Gap |
|------|-----|
| **Member App** | Wodify has a polished member-facing app for booking, results, and account management. Iron Metrics has no member portal. |
| **Class Booking** | Wodify supports advance booking, waitlists, late cancel fees. Iron Metrics only has staff check-in. |
| **Retail/POS** | Wodify handles merchandise, supplements, and retail sales. Not in Iron Metrics scope. |
| **Kiosk Mode** | Wodify offers a kiosk for self-check-in at the gym entrance. |
| **Multi-location** | Wodify supports multi-location gyms. Iron Metrics is single-location per gym. |
| **Automated Communications** | Wodify sends automated emails for billing, class reminders, birthdays. Iron Metrics has no automated outreach. |
| **Recurring Revenue Forecasting** | Wodify shows projected MRR. Iron Metrics has current MRR but no forward projection. |
| **Onboarding/Import** | Wodify has CSV import and migration tools. |
| **Mobile App (Native)** | Wodify has a native iOS/Android app. Iron Metrics is web-only. |
| **Leaderboards** | Wodify has community leaderboards for WODs. |

---

## 3. 10 Features to Beat Wodify

### 1. Revenue Forecasting Engine
Project MRR 30/60/90 days out based on current subscriptions, churn rate, pipeline conversion rate, and seasonal patterns. Show the gym owner exactly where revenue is heading with confidence intervals.

### 2. Automated Retention Sequences
When a member's risk score crosses "moderate" or "critical," trigger an automated sequence: internal alert to staff, scheduled check-in task, and optional email/SMS to the member. Make the Intelligence Hub prescriptive, not just descriptive.

### 3. Lead-to-Member Automation Pipeline
Connect leads directly to intro class booking. When a lead is moved to "Intro Scheduled," auto-create a class reservation. On conversion, auto-provision membership plan and send welcome email. Reduce the manual steps from 6 to 1.

### 4. Member Self-Service Portal
A lightweight member-facing view: book classes, view upcoming schedule, log workout results, update payment method, view billing history. This is table-stakes for competing with Wodify.

### 5. Smart Class Templates
Define a weekly template (e.g., "Monday 6am CrossFit, Tuesday 6am Olympic Lifting") and auto-generate the week's schedule with one click. Save hours of repetitive scheduling.

### 6. Operational Health Score (OHS)
A single daily score (0-100) combining: RSI, class fill rate, lead pipeline velocity, billing health, and coach utilization. The gym owner opens the app, sees one number, and knows if today needs attention.

### 7. Communication Hub
Centralized messaging: email templates for welcome, payment failure, class cancellation, birthday, win-back. Triggered manually or automatically. Integrates with the CRM and member lifecycle.

### 8. Waitlist & Smart Booking
When a class fills up, members join a waitlist. If someone cancels, the next person is auto-promoted and notified. Late cancel tracking with optional penalty logic.

### 9. Coach Dashboard & Performance
Dedicated coach view: "my classes today," attendance trends for my classes, member notes, quick check-in. Plus coach performance metrics: fill rate, member satisfaction, class growth.

### 10. Gym Owner Morning Briefing
An AI-generated daily digest delivered when the owner opens the app: "3 at-risk members need attention, 2 leads went stale overnight, Tuesday classes are 80% full, MRR is up 3% this month." Replace the dashboard with a decision prompt.

---

## 4. Systems That Already Beat Wodify

1. **Intelligence Hub** -- RSI, Risk Radar, and intervention engine have no equivalent in Wodify or any mainstream gym software. This is category-defining.

2. **Sales Command Center** -- The Kanban CRM with activity timeline, stale detection, and conversion insights is more sophisticated than Wodify's basic lead management.

3. **Billing Audit Logging** -- Full audit trail with actor, action, before/after values, and source tracking. Enterprise-grade transparency.

4. **AI Operator** -- Task generation, content creation, and operational recommendations. No competitor has this.

5. **Decision Engine Philosophy** -- Every screen surfaces "what should I do next" rather than just "here's your data." This is the fundamental product advantage.

6. **Workout Programming** -- Structured sections with warmup/strength/conditioning/cooldown, intended stimulus, scaling notes, and member result tracking. More structured than Wodify's basic WOD posting.

7. **UI/UX Quality** -- The dark premium aesthetic, Framer Motion animations, and glass-panel design are genuinely best-in-class for gym software.

---

## 5. Weekly Operational Simulation

### MONDAY -- Owner Reviews Dashboard

**What works:** Owner opens Dashboard. Sees Active Members, MRR, Attendance Rate, At-Risk count. Revenue trend chart shows the month. RSI gauge shows gym health.

**What breaks:**
- No "morning briefing" -- owner must interpret 4 KPI cards and two charts themselves.
- At-Risk count links to Intelligence page, but there's no inline action. Owner must navigate away.
- No revenue forecast. Owner sees where they ARE but not where they're HEADING.
- No "compared to last week/month" context on KPIs.

### TUESDAY -- Coach Runs Classes

**What works:** Schedule page shows day's classes with times, capacity, and coach name.

**What breaks:**
- Coach has no dedicated view. Must navigate the full staff interface.
- No "my classes today" filter.
- Check-in requires staff to search members by name one at a time. No quick-scan or barcode.
- No-shows are invisible. If 10 people were expected but only 6 showed up, there's no record of who didn't come.
- If a coach is sick, there's no substitution workflow. Must delete and recreate the class.

### WEDNESDAY -- New Lead Comes In

**What works:** Staff adds lead manually. Lead appears in "New" column. Can schedule follow-up, log contact, move through stages, convert to member.

**What breaks:**
- No way for leads to self-submit (web form, landing page).
- Moving to "Intro Scheduled" doesn't create a class booking. Staff must manually coordinate.
- No automated email to the lead ("Thanks for your interest! Here's what to expect...").
- No reminder for tomorrow's follow-up. Staff must check the Leads page proactively.

### THURSDAY -- Member Misses Payment

**What works:** Stripe webhook fires. System increments `failedPayments`. After 2 failures, subscription moves to `past_due`. Billing audit log records it.

**What breaks:**
- Member receives no notification from Iron Metrics. Only Stripe's default emails (if configured).
- Staff has no alert or task created. Must proactively check billing page.
- No "update payment method" link to send the member.
- If the member churns, there's no grace period. Subscription deletion = immediate `cancelled`.

### FRIDAY -- Owner Reviews Retention

**What works:** Intelligence Hub shows RSI, Risk Radar with member-level risk tiers, and suggested interventions.

**What breaks:**
- Interventions are text recommendations only. "Reach out to John" with no "Send Email" or "Schedule Call" action.
- No trend view. Owner sees TODAY's risk landscape but not whether it's improving or worsening.
- No connection between risk alerts and the CRM. A churned member doesn't auto-create a win-back lead.
- The Intelligence page requires its own mental context. Dashboard should surface the top 3 actions.

### SATURDAY -- Gym Runs Classes

**What works:** Classes listed, check-ins work.

**What breaks:** Same as Tuesday plus weekend staff may not have full system familiarity. No simplified "kiosk mode" for reception.

### SUNDAY -- Owner Plans Next Week

**What works:** Can create next week's classes with repeat days.

**What breaks:**
- No class templates. Must recreate the same schedule manually every week.
- No "copy last week's schedule" button.
- No view of next week's pipeline (expected leads, expiring trials, upcoming renewals).

---

## 6. Tier 1 Roadmap -- Required for Production

| # | Item | Effort | Impact |
|---|------|--------|--------|
| 1 | **Fix tenant isolation** -- Add `verifyGymAccess` middleware to Members, Leads, Classes, Attendance, Intelligence, and Reports routes | 1 day | CRITICAL security fix |
| 2 | **Add capacity enforcement** -- Block check-ins when `enrolled >= capacity` | 2 hours | Prevents overbooking |
| 3 | **Add rate limiting** -- `express-rate-limit` on all API routes | 2 hours | Prevents abuse |
| 4 | **React error boundary** -- Wrap main layout in error boundary with recovery | 2 hours | Prevents full-page crashes |
| 5 | **CSV member import** -- Upload CSV, map columns, bulk create members | 1 day | Required for onboarding |
| 6 | **Guided onboarding wizard** -- Step-by-step setup: gym info, plans, staff, first class | 2 days | Required for self-serve onboarding |
| 7 | **Class templates / copy week** -- Save a weekly schedule template and apply it with one click | 1 day | Eliminates #1 operational pain |
| 8 | **Payment failure notifications** -- Email members when payment fails, with "update card" link | 1 day | Required for billing reliability |
| 9 | **Update payment method flow** -- SetupIntent-based card update for staff or members | 1 day | Required for billing recovery |
| 10 | **Consolidate staff tables** -- Merge `gym_staff` and `staff` into one table | 0.5 day | Prevents data integrity issues |
| 11 | **Add DB indexes** -- Indexes on all foreign keys in attendance, timeline_events, lead_activities, workout_results | 2 hours | Required for scale |
| 12 | **Fix date-as-text columns** -- Migrate `next_follow_up_date`, `programming_days.date` to proper date types | 0.5 day | Data integrity |

---

## 7. Tier 2 Roadmap -- Strong Competitive Advantage

| # | Item | Effort | Impact |
|---|------|--------|--------|
| 1 | **Revenue Forecasting** -- Project MRR 30/60/90 days with churn/conversion models | 3 days | Category-defining feature |
| 2 | **Automated Retention Sequences** -- Trigger staff tasks + member emails when risk escalates | 3 days | Makes Intelligence Hub prescriptive |
| 3 | **Member Self-Service Portal** -- Book classes, view schedule, log results, update billing | 5 days | Table-stakes competitor parity |
| 4 | **Communication Hub** -- Email templates, manual + automated sends, billing/lifecycle triggers | 4 days | Eliminates "no outreach" gap |
| 5 | **Operational Health Score** -- Single daily 0-100 score on dashboard | 2 days | Simplifies owner decision-making |
| 6 | **Waitlist System** -- Queue for full classes, auto-promote on cancellation | 2 days | Maximizes class utilization |
| 7 | **Coach Dashboard** -- "My classes today," quick check-in, performance metrics | 3 days | Improves coach experience |
| 8 | **Morning Briefing (AI)** -- Daily digest of actions needed, surfaced on dashboard | 2 days | Leverages AI differentiator |
| 9 | **Lead Capture Form** -- Embeddable web form that creates leads automatically | 1 day | Closes lead-gen gap |
| 10 | **Attendance Marking** -- No-show, late-cancel, excused absence tracking | 1 day | Proper attendance management |

---

## 8. Tier 3 Roadmap -- Future Intelligence Features

| # | Item | Description |
|---|------|-------------|
| 1 | **Churn Prediction Model** | ML model trained on attendance patterns, billing history, and engagement to predict churn probability 30 days out. |
| 2 | **Optimal Pricing Engine** | Analyze conversion rates by plan price, suggest pricing adjustments to maximize revenue without increasing churn. |
| 3 | **Class Demand Forecasting** | Predict which classes will fill up based on historical patterns, suggest adding/removing sessions. |
| 4 | **Automated Win-Back Campaigns** | When members churn, auto-create win-back leads with pre-built email sequences based on churn reason. |
| 5 | **Community Health Index** | Measure social connections between members (shared classes, workout partners) to identify isolation risk. |
| 6 | **Benchmark Dashboard** | Anonymous comparison against aggregate gym metrics. "Your retention is in the top 20% of CrossFit gyms." |
| 7 | **Natural Language Queries** | "How many members joined this month?" "What's my busiest class?" via the AI Operator. |
| 8 | **Coach Effectiveness Scoring** | Correlate coach assignments with member retention, attendance trends, and satisfaction. |
| 9 | **Smart Scheduling** | AI suggests optimal class times based on attendance patterns and member preferences. |
| 10 | **Revenue Attribution** | Track which lead source, coach, or class type generates the most lifetime revenue. |

---

## 9. UI/UX Improvements

### High Priority

| Issue | Recommendation |
|-------|----------------|
| **Dashboard lacks context** | Add week-over-week deltas to KPI cards (e.g., "+3 members," "-$200 MRR"). A number without context is not actionable. |
| **Intelligence page is separate from action** | Surface top 3 risk alerts on Dashboard with inline "Take Action" buttons. Don't force a page navigation. |
| **Kanban on mobile** | Replace horizontal pipeline with vertical tabs (New / Contacted / Scheduled / etc.) on mobile. Horizontal scroll is painful on touch. |
| **Dialog overload on Schedule** | The create-class dialog now has 10+ fields including repeat days. Consider a multi-step flow or collapsible sections. |
| **No breadcrumbs / page context** | When drilling into Member Detail from Intelligence, there's no back-link context. Add breadcrumbs. |
| **Create button discoverability** | The "+" button for creating members/classes/leads should be a floating action button on mobile, not hidden in the header. |

### Medium Priority

| Issue | Recommendation |
|-------|----------------|
| **Inconsistent loading patterns** | Some pages use Loader2 spinners, Workouts uses skeletons. Standardize on skeleton loading for all data-heavy pages. |
| **Settings page depth** | Settings has 6 tabs but no visual hierarchy. Group related settings (e.g., "Business" and "Branding" together). |
| **Empty state quality** | Empty states exist but could be warmer. Add illustrations or quick-setup links specific to the page context. |
| **Typography hierarchy** | Some pages pack too much information at the same visual weight. Use more deliberate size/weight hierarchy. |
| **Color usage** | The amber/gold accent is well-established. Consider a secondary accent for "good" states (green for healthy, growth) vs amber for "attention needed." |

### Low Priority

| Issue | Recommendation |
|-------|----------------|
| **Accessibility warnings** | DialogContent components missing `aria-describedby`. Fix for screen reader support. |
| **Keyboard navigation** | Kanban board and day-picker toggles should be keyboard-navigable. |
| **Print styles** | Reports and billing should have print-friendly layouts for gym owners who print reports. |

---

## 10. Final Strategic Recommendations

### The Core Thesis Is Right
Iron Metrics' positioning as a "decision engine" is the correct strategic angle. Wodify, Mindbody, and Kilo are data-displayers. Iron Metrics tells gym owners what to DO. This is the moat. Protect it.

### The Biggest Risk Is Security
The tenant isolation gap is the single most critical issue. Before any real gym uses this, every route must verify the authenticated user has access to the requested gym. This is a 1-day fix that should be done immediately.

### The Second Biggest Risk Is Operational Completeness
A gym owner will forgive missing analytics. They will NOT forgive:
- Not being able to import their existing members
- Not getting notified when payments fail
- Not being able to copy last week's schedule
These are table-stakes operational needs. Tier 1 items must be completed before launch.

### The Competitive Moat Is Intelligence
Revenue forecasting, automated retention sequences, and the morning briefing will create a product that gym owners literally cannot switch away from. Once an owner relies on Iron Metrics to tell them "3 members need attention today," going back to Wodify's raw data feels like going blind.

### The Growth Unlock Is Member Self-Service
The member portal is the single feature that will unlock word-of-mouth growth. When members book classes, log results, and check leaderboards through Iron Metrics, the gym owner's switching cost becomes infinite. Every member becomes a stakeholder in the platform.

### The Revenue Strategy Should Be Tiered
- **Starter** (free or $29/mo): Dashboard, Schedule, Members, Basic Billing
- **Pro** ($79/mo): Intelligence Hub, CRM Pipeline, Automated Sequences, Revenue Forecasting
- **Enterprise** ($149/mo): AI Operator, Custom Reports, Multi-location, API Access

### What to Build Next (in order)
1. Fix tenant isolation (1 day)
2. CSV import + onboarding wizard (2 days)
3. Class templates / copy week (1 day)
4. Payment failure notifications + update card flow (2 days)
5. Revenue forecasting (3 days)
6. Automated retention sequences (3 days)
7. Member self-service portal (5 days)

**Total to production-ready: ~2 weeks of focused development.**
**Total to category-defining: ~4 weeks.**

---

*Analysis generated from full codebase audit of Iron Metrics platform.*
*Schema: 25+ tables across 10 modules. Frontend: 15+ pages. API: 12+ route files.*
*Evaluated against Wodify, Mindbody, PushPress, and Kilo competitive landscape.*
