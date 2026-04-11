# Iron Metrics — AI & Intelligence Product Roadmap

> Strategic vision for AI-powered gym intelligence, from unified insights through self-improving automation.

---

## Executive Summary

Iron Metrics' AI strategy is built on a simple premise: **gym owners shouldn't need to dig for insights — the platform should surface them automatically, explain them clearly, and act on them when authorized.**

Today, Iron Metrics already delivers risk scoring, automated outreach, revenue attribution, industry benchmarking, an intervention engine, and a strategic ops board that puts actionable intelligence front and center. This roadmap outlines how we extend that foundation into a comprehensive intelligence layer that understands member behavior, predicts outcomes, and continuously improves itself.

---

## Phase 1: Unification & Strategic Ops Board *(Shipped)*

**Goal:** Consolidate Intelligence Hub and AI Operator into a single, cohesive experience — then redesign it as an action-first strategic command center.

### What We Built

#### 1.1 — Unified AI Insights Page *(v1 — Shipped)*

Replaced separate Intelligence Hub and AI Operator pages with a single entry point at `/ai-insights`.

#### 1.2 — Strategic Ops Board Redesign *(v2 — Shipped)*

Redesigned the AI Insights page from a 4-tab layout into a single-scroll Strategic Ops Board that eliminates tab-switching and puts interventions front and center.

| Component | Description | Status |
|-----------|-------------|--------|
| **Strategic Ops Board layout** | Single-scroll, two-column layout replacing 4 tabs (Overview/Risk/Impact/Benchmarks) | Shipped |
| **Intervention Engine (left column, ~60%)** | AI-generated intervention cards sorted by urgency/score, with category icons, urgency badges (Immediate/This Week/This Month), AI confidence scores, revenue-at-stake, affected member counts, and expandable recommended action steps | Shipped |
| **"Execute Smart Action" navigation** | Each intervention card has a primary CTA that routes to the relevant page (retention→`/retention`, billing→`/billing`, leads→`/leads`, members→`/members`) | Shipped |
| **Dismissable interventions** | "Not now" dismiss with animated exit + undo toast. Dismissed items collapsible tray with "Restore" option. Local-only dismiss (interventions regenerate on next scan) | Shipped |
| **RSI Gauge (right column, ~40%)** | Compact Retention Stability Index circular gauge with band badge and 30-day trend indicator | Shipped |
| **Mini stat cards** | Revenue Protected, AI Tasks queued, At-Risk members, Success Rate — compact 2x2 grid | Shipped |
| **Risk Radar (compact)** | Top 5 at-risk members with risk score bars, tier badges, and revenue-at-risk — links to `/retention` | Shipped |
| **Collapsible RSI Trend** | Area chart with 30D/90D/All toggles, collapsed by default to save space | Shipped |
| **AI Impact Summary** | Tasks actioned, members saved, revenue recovered — appears when outcome data exists | Shipped |
| **AI Task Inbox** | Full pending/history toggle with type filters, status filters, Smart Actions filter, email sending, task editing, and approval flows | Shipped |
| **Smart Actions (formerly Auto-Pilot)** | Category-level autonomous email controls with cooldown period and digest frequency settings — renamed from "Auto-Pilot" to "Smart Actions" throughout | Shipped |
| **Generation frequency disclosure** | "Refreshed with each AI scan" label + last scan timestamp in header | Shipped |
| **Owner Brief generation** | On-demand AI-generated strategic overview in a modal dialog | Shipped |

### Key Design Decisions

- **No tabs.** The Strategic Ops Board is a single-scroll experience. Interventions (what to do) are primary. Context (RSI, stats, risk radar) is secondary in the right column. The AI Task Inbox (granular actions) is below.
- **Action-first hierarchy.** Interventions → Execute Smart Action → Navigate to the right page. The goal is to minimize time between seeing an insight and taking action.
- **Retention stays separate.** The Retention page (`/retention`) handles sequence configuration and enrollment management — it's infrastructure, not insights. AI Insights surfaces the *results* of retention work.
- **Light mode first.** The entire page uses semantic design tokens (`bg-card`, `text-foreground`, `border-border`) for full light/dark compatibility.
- **Local dismiss by design.** Interventions are ephemeral — they regenerate on each scan. Dismissing is "not now, I've seen this" rather than "never show again."
- **Smart Actions rename.** "Auto-Pilot" implied hands-off flying. "Smart Actions" better communicates intelligent automation with human oversight.

---

## Current Feature Inventory — What's Built Today

### Core Platform

| Feature | Description | Page/Route | Status |
|---------|-------------|------------|--------|
| **Multi-gym workspaces** | Each gym is an isolated tenant with its own data, billing, and settings | `/select-gym` | Shipped |
| **Onboarding wizard** | 3-step guided setup: Connect Data → Gym Details → Launch | `/onboarding` | Shipped |
| **Staff & RBAC** | Owner/Admin/Coach roles with permission-gated UI and API middleware | Settings > Staff | Shipped |
| **Subscription tiers** | Insights / Growth / Pro with Stripe-powered billing and feature gating | Settings > Billing | Shipped |

### Member Management & CRM

| Feature | Description | Page/Route | Status |
|---------|-------------|------------|--------|
| **Member directory** | Filterable, searchable member list with risk badges and status indicators | `/members` | Shipped |
| **Member profiles** | Full detail view: attendance, billing, notes, risk score, lifecycle events, timeline | `/members/:id` | Shipped |
| **CSV import** | Preview, dedup, and bulk import with progress tracking | Import wizard | Shipped |
| **Wodify sync** | Deep integration syncing clients, memberships, attendance from Wodify API | Settings > Integrations | Shipped |
| **Lead pipeline** | Kanban-style board with stages, activity timelines, follow-up scheduling | `/leads` | Shipped |
| **Lead capture form** | Public form (`/join/:gymSlug`) with configurable fields and source attribution | Public route | Shipped |

### Intelligence & AI

| Feature | Description | Page/Route | Status |
|---------|-------------|------------|--------|
| **Retention Stability Index (RSI)** | Proprietary 0-100 metric from churn rate, revenue, net growth, tenure | AI Insights | Shipped |
| **RSI historical tracking** | Daily snapshots, trend analysis (30d/90d), area chart visualization | AI Insights | Shipped |
| **Risk Radar** | Members categorized by risk tier (Critical/High/Medium/Low) with risk scores and revenue-at-risk | AI Insights + Dashboard | Shipped |
| **Intervention engine** | AI-generated strategic recommendations with urgency, impact, and actionable steps | AI Insights | Shipped |
| **AI Task generation** | Automated daily task creation for at-risk outreach, billing recovery, lead follow-up | AI Insights | Shipped |
| **Smart email personalization** | Member context assembly (attendance, classes, coaches, PRs, tenure) for AI-written emails | AI Task Inbox | Shipped |
| **Smart Actions (Auto-Pilot)** | Autonomous email sending per category with cooldown and digest controls | AI Insights | Shipped |
| **Outcome tracking** | 30-day observation window detecting won_back, reactivated, converted outcomes | AI Insights | Shipped |
| **Revenue attribution** | Revenue retained/recovered calculation tied to AI actions | AI Insights | Shipped |
| **Industry benchmarking** | Percentile rankings vs. similar-size gyms for RSI, churn, ARM, tenure, engagement | AI Insights | Shipped |
| **Morning briefing** | Daily actionable summary: at-risk members, stale leads, failed payments, class stats | Dashboard | Shipped |
| **Owner brief generation** | On-demand AI-generated strategic overview document | AI Insights | Shipped |
| **Revenue forecast** | 6-month predictive MRR model based on churn and growth trends | Intelligence API | Shipped |
| **Blended metrics** | Combined subscription + Wodify-imported revenue for accurate MRR/ARM | Platform-wide | Shipped |
| **MRR snapshots** | Daily MRR history with subscription/Wodify breakdown | Dashboard | Shipped |

### Retention Automations

| Feature | Description | Page/Route | Status |
|---------|-------------|------------|--------|
| **Retention sequences** | Automated multi-step journeys (Miss You, Check-In, Win Back, Onboarding) | `/retention` | Shipped |
| **Trigger engine** | Enrollment triggers: no_attendance, risk_score, new_member_join, new_member_decline | Background scheduler | Shipped |
| **Sequence builder** | Create/edit sequences with email and task steps, timing controls, re-engagement exits | `/retention` | Shipped |
| **Enrollment management** | Manual and automatic enrollment with cooldown and activity logging | `/retention` | Shipped |

### Billing & Revenue

| Feature | Description | Page/Route | Status |
|---------|-------------|------------|--------|
| **Plan management** | Create/edit membership plans with Stripe price sync | `/billing` | Shipped |
| **Subscription lifecycle** | Create, upgrade, downgrade, cancel, hold, resume subscriptions | `/billing` | Shipped |
| **Payment processing** | Stripe Checkout, billing portal, refunds, credits, discount codes | `/billing` | Shipped |
| **Billing recovery** | Grace periods, auto-suspension, card update flows, past-due enforcement | Background scheduler | Shipped |
| **Financial dashboards** | MRR trend, collection rate, plan distribution, revenue forecasting | `/billing` + Dashboard | Shipped |

### Programming & Scheduling

| Feature | Description | Page/Route | Status |
|---------|-------------|------------|--------|
| **Class scheduling** | Weekly calendar with capacity tracking, check-ins, overlap rendering | `/schedule` | Shipped |
| **Workout programming** | Section-based workout builder with result logging | `/workouts` | Shipped |
| **Class templates** | Reusable class configurations (Pro tier) | `/schedule` | Shipped |

### Dashboard

| Feature | Description | Page/Route | Status |
|---------|-------------|------------|--------|
| **Action-First Command** | Time-based greeting, action queue from morning briefing, KPI sidebar | `/dashboard` | Shipped |
| **At-Risk Members card** | Quick view of highest-risk members with direct action links | Dashboard | Shipped |
| **Retention Activity card** | Recent retention sequence events and outcomes | Dashboard | Shipped |
| **Benchmark highlights** | Compact industry comparison card in sidebar | Dashboard | Shipped |

---

## Competitive Gap Analysis

### How Iron Metrics Compares Today

| Capability | Iron Metrics | Wodify | PushPress | Zen Planner | Gym Master |
|------------|:---:|:---:|:---:|:---:|:---:|
| **Retention risk scoring (RSI)** | Yes | No | No | No | No |
| **Intervention engine with urgency ranking** | Yes | No | No | No | No |
| **Risk Radar with revenue-at-risk** | Yes | No | No | No | No |
| **AI-generated outreach emails** | Yes | No | No | No | No |
| **Smart email personalization (context-aware)** | Yes | No | Basic templates | Basic templates | No |
| **Smart Actions (autonomous email sending)** | Yes | No | No | No | No |
| **Outcome tracking & revenue attribution** | Yes | No | No | No | No |
| **Industry benchmarking by gym size** | Yes | No | No | No | No |
| **Retention automation sequences** | Yes | Basic | Basic | Basic | Basic |
| **Morning briefing / daily action summary** | Yes | No | No | No | No |
| **AI owner brief generation** | Yes | No | No | No | No |
| **Revenue forecasting** | Yes | No | Basic | No | No |
| **Blended metrics (multi-source MRR)** | Yes | N/A | No | No | No |
| **Lead pipeline with AI follow-up** | Yes | No | Basic | Basic | No |
| **Workout programming hub** | Yes | Yes | No | No | No |
| **Class scheduling with capacity** | Yes | Yes | Yes | Yes | Yes |
| **Stripe billing integration** | Yes | Yes | Yes | Yes | Yes |
| **Wodify data sync** | Yes | N/A | No | No | No |
| **Multi-gym support** | Yes | Yes | Yes | Yes | Yes |
| **Staff RBAC** | Yes | Yes | Yes | Yes | Yes |

### Unique Differentiators (No Competitor Has These)

1. **Intervention Engine** — AI-generated, urgency-ranked strategic recommendations with confidence scores, revenue impact, and one-click navigation to action pages. No gym platform offers this.
2. **Smart Actions with Outcome Loop** — Autonomous email sending → outcome detection → revenue attribution. The system proves its own ROI.
3. **Retention Stability Index** — A proprietary composite metric that distills retention health into a single trackable number with historical trends.
4. **Industry Benchmarking** — Anonymous, aggregated cross-gym comparisons that improve as the platform grows. Network effect moat.
5. **Strategic Ops Board** — Single-scroll command center that puts AI recommendations front and center, eliminating the dashboard-then-dig pattern common in gym software.

### Where Competitors Still Lead

| Area | Competitor Advantage | Iron Metrics Status | Priority |
|------|---------------------|---------------------|----------|
| **Mobile app** | Wodify, PushPress have native member-facing apps | No member app yet | Phase 3 |
| **Check-in hardware** | PushPress, Zen Planner have kiosk/tablet check-in | No hardware integration | Low |
| **SMS/text outreach** | PushPress has basic SMS | Email only | Phase 3 |
| **Group messaging** | Wodify has in-app messaging | No messaging system | Phase 3 |
| **Marketplace/community** | Wodify has workout marketplace | No marketplace | Low |
| **Payroll/staff scheduling** | Some platforms offer staff management | Basic RBAC only | Low |

---

## Phase 2: Deeper Intelligence *(Near-term)*

**Goal:** Move from "what's happening" to "why it's happening" and "how to celebrate wins."

### 2.1 Predictive Churn Explanations

**The problem:** Today, the Risk Radar tells owners *who* is at risk and *how severe* it is. It doesn't explain *why*.

**The solution:** Correlate risk score changes with schedule modifications, programming shifts, and coach assignments to generate natural-language explanations.

**Example outputs:**
- *"Sarah's attendance dropped 60% after the 6:30 AM class was removed on March 15. She hasn't attended any other time slots. Suggested action: reach out about alternate class times or the new 7:00 AM slot."*
- *"Mike's risk jumped from low to high over 3 weeks. His attendance pattern correlates with Coach Alex's schedule change — he only attended classes taught by Alex. Suggested action: personal outreach from Coach Alex."*

**Data requirements:** Attendance history, class schedule change log, coach assignment history, member class preferences (already tracked via personalization context).

**Implementation approach:**
1. Track schedule/programming change events in a `schedule_changes` table
2. Build a correlation engine that matches member attendance drops with concurrent schedule changes
3. Generate explanation text using templated patterns with member-specific data
4. Surface explanations on intervention cards and in AI task descriptions

### 2.2 Member Milestone Celebrations

**The problem:** AI features are perceived as a "churn prevention tool." Owners only engage when something is wrong. This creates negative association.

**The solution:** Auto-generate celebration and recognition tasks that create positive member touchpoints.

**Milestone types:**

| Milestone | Trigger | Example Task |
|-----------|---------|--------------|
| Membership anniversary | Join date anniversary | "Congratulations on 1 year, Sarah! You've attended 156 classes." |
| Attendance milestones | 50th, 100th, 200th, 500th class | "Mike just hit his 100th class! Consider a social media shoutout." |
| Personal records | New PR logged in workouts | "Jane set a new Fran PR today — 4:32, down from 5:15!" |
| Streak recognition | 4+ weeks of 3x/week attendance | "Alex has maintained a 6-week streak. A quick 'keep it up' goes a long way." |
| Birthday outreach | Birthday date field | "Happy birthday to 3 members this week. Send a quick message?" |

**Why this matters:**
- Shifts perception from "churn tool" to "relationship platform"
- Creates positive engagement moments that reinforce the value of Iron Metrics
- Uses data already in the system (join dates, attendance counts, workout results, birthday fields)
- High engagement, low effort — pre-written celebration templates

### 2.3 Cohort Intelligence

**The problem:** Owners see individual member data but miss systemic patterns. They can't answer "what do my best-retaining members have in common?"

**The solution:** Automated pattern recognition across member groups.

**Cohort analyses:**

| Analysis | Insight Example |
|----------|-----------------|
| **Join month vs. churn** | "Members who joined in January have 40% higher 6-month retention than summer joiners. Consider stronger onboarding for summer cohorts." |
| **First-week attendance vs. retention** | "Members who attend 3+ classes in their first week have 85% 12-month retention vs. 45% for those who attend once." |
| **Class-level retention** | "Members who primarily attend Olympic Lifting have 25% lower churn than the gym average." |
| **Referral source** | "Members from Instagram ads churn 2x faster than member referrals. Consider adjusting ad spend." |
| **Time-of-day patterns** | "Morning members (before 9 AM) have 30% better retention than evening members." |

**Implementation approach:**
1. Build a cohort segmentation engine using existing member, attendance, and subscription data
2. Compute retention curves per cohort segment
3. Surface top 3-5 insights on the Strategic Ops Board as intervention cards with category "cohort_insight"
4. Allow drill-down from intervention cards to a cohort detail view

---

## Phase 3: Multi-Channel & Proactive *(Medium-term)*

**Goal:** Reach members where they actually respond, and push insights to owners instead of waiting for them to check.

### 3.1 SMS/Text Outreach

**The problem:** Email open rates in fitness average ~20%. For critical interventions (about-to-cancel members, failed payments), that's not good enough.

**The solution:** Add SMS as a delivery channel via Twilio, with intelligent channel selection.

**Channel strategy:**

| Priority | Channel | Use Case |
|----------|---------|----------|
| Critical | SMS | Member hasn't visited in 30+ days, payment failed, about to cancel |
| High | SMS or Email | Attendance declining, risk score rising |
| Medium | Email | Re-engagement, milestone celebrations |
| Low | Email | General check-ins, programming updates |

**Compliance requirements:**
- TCPA opt-in tracking per member
- Configurable per-category (owner can disable SMS for celebrations but keep it for critical)
- Opt-out handling with automatic suppression
- Message frequency caps (no more than 2 SMS per member per week)

**Smart Actions integration:** Add SMS toggle per category in Smart Actions settings. Critical-only SMS is the recommended default.

### 3.2 Proactive Alerts & Briefing Delivery

**The problem:** The morning briefing exists on the dashboard, but owners have to log in to see it. By the time they check, the day is half over.

**The solution:** Push the morning briefing to the owner's preferred channel.

**Delivery options:**
- **Email digest:** Daily at configured time (default 6:00 AM)
- **Push notification:** Mobile app notification with summary + deep link to AI Insights
- **SMS summary:** For owners who prefer text (short version: "3 critical, 1 payment failed, 2 leads. Tap to review.")

**Additional alerts:**
- **Real-time critical alerts:** Immediate notification when a high-value member goes critical
- **Weekly gym health report:** Summarizing wins (members saved, revenue retained), risks (trending concerns), and trends (RSI movement, engagement changes)

### 3.3 Class & Schedule Intelligence

**The problem:** Owners make schedule decisions based on gut feel. They don't have data on which classes drive retention vs. which are underperforming.

**The solution:** Turn attendance data into actionable schedule optimization recommendations.

**Recommendation types:**

| Type | Example |
|------|---------|
| **Underperforming classes** | "Thursday 5 PM averages 4 members — consider combining with 6 PM (avg 8) to save coaching costs." |
| **Capacity optimization** | "Saturday 9 AM has been waitlisted 3 weeks running. Add a second session to capture that demand." |
| **Coach utilization** | "Coach Alex's classes average 12 members vs. gym average of 8. Consider giving Alex a prime-time slot." |
| **Schedule change impact** | "When you moved the 6 AM class to 6:30, 3 members stopped attending within 2 weeks." |
| **Optimal timing** | "Based on member check-in patterns, your members prefer 5:30-6:30 PM and 8:30-9:30 AM windows." |

**Data requirements:** Attendance records (already tracked), class schedule history (new), coach assignments (existing), waitlist data (if available from Wodify).

---

## Phase 4: Self-Improving AI *(Long-term)*

**Goal:** The system learns from its own outcomes and gets smarter over time — less human tuning, better results.

### 4.1 Smart Actions Self-Tuning

**The problem:** Smart Actions runs the same playbook regardless of results. If outreach emails aren't working for a particular member segment, it keeps sending them.

**The solution:** Closed-loop learning from outcome tracking data.

**Self-tuning capabilities:**

| Capability | How It Works |
|------------|--------------|
| **Category performance monitoring** | Track success rates per task category. If billing recovery emails drop below 10% success, flag for review. |
| **Auto-pause** | Automatically pause Smart Actions for categories with sustained low success rates (< 5% over 30 days). Notify owner with explanation. |
| **Template optimization** | Track which email template variants get the best outcomes. Gradually shift toward higher-performing templates. |
| **Send time optimization** | Analyze which send times correlate with better open/response rates. Adjust Smart Actions scheduling. |
| **A/B testing** | Automatically split-test subject lines, email hooks, and CTAs. Converge on winners after statistical significance. |

**Guardrails:**
- Owner always has override control
- Auto-pause sends a notification explaining why and asking for confirmation
- Maximum 3 active A/B tests at once to avoid noise
- Minimum 30-day observation window before making changes

### 4.2 Predictive Revenue Modeling

**The problem:** Owners can see current MRR and at-risk revenue, but they can't model "what if" scenarios.

**The solution:** Scenario-based revenue projections.

**Scenario examples:**
- *"If you lose these 5 critical-risk members, MRR drops by $750/mo (6% decrease). Expected timeline: 2-4 weeks without intervention."*
- *"Adding a second Saturday class could generate $1,200/mo in new memberships based on your waitlist conversion rate."*
- *"Your current retention trajectory projects $145,000 annual revenue. Improving first-month retention by 15% would add $18,000/year."*
- *"ROI on Smart Actions: $4,200 in retained revenue over the last 90 days from 12 saved members, against a $297 platform cost."*

**Implementation approach:**
1. Build a Monte Carlo simulation engine using historical churn rates, revenue data, and risk scores
2. Generate 3 scenarios (pessimistic, baseline, optimistic) for 30/60/90-day horizons
3. Surface scenarios on the Strategic Ops Board as a dedicated section

### 4.3 AI Programming Suggestions

**The problem:** Owners design programming based on coaching philosophy, not data. They don't know which workout types correlate with member engagement.

**The solution:** Correlate programming data with attendance and retention metrics.

**Insight examples:**
- *"Weeks with Olympic lifting programming see 15% higher attendance than bodyweight-only weeks."*
- *"Members who do partner workouts attend 20% more frequently in the following week."*
- *"Hero WODs on Fridays have 30% lower attendance than Mondays — consider swapping."*
- *"Your newest members (< 3 months) attend 40% more when workouts include scaling options in the description."*

**Data requirements:** Workout programming data (from Programming Hub), attendance records, member tenure, result logging data.

---

## Implementation Priority Matrix

| Feature | Phase | Effort | Impact | Priority |
|---------|-------|--------|--------|----------|
| Milestone Celebrations | 2 | Low | Medium | **High** — easy win, changes product perception |
| Churn Explanations | 2 | Medium | High | **High** — direct retention value |
| Morning Briefing Email Delivery | 3 | Low | Medium | **High** — drives daily engagement |
| Cohort Intelligence | 2 | Medium | High | Medium — powerful but needs critical mass |
| SMS Outreach | 3 | Medium | High | Medium — requires Twilio integration |
| Schedule Intelligence | 3 | Medium | Medium | Medium — needs schedule change tracking |
| Self-Tuning Smart Actions | 4 | High | High | Medium — requires outcome volume |
| Revenue Modeling | 4 | High | Medium | Lower — nice-to-have for most owners |
| Programming Suggestions | 4 | Medium | Medium | Lower — niche value, needs programming data |

---

## Competitive Moat

Iron Metrics' advantage compounds over time:

1. **Data flywheel:** More gyms → better benchmarks → more accurate risk models → better outcomes → more gyms
2. **Outcome learning:** Every AI task that succeeds or fails improves the model. Competitors would need to build this from scratch.
3. **Integration depth:** By syncing with Wodify and other platforms, Iron Metrics has richer member context than any standalone tool.
4. **Owner trust:** Smart Actions with transparent outcome tracking builds trust that can't be replicated with "black box" AI claims.
5. **Strategic Ops Board:** The intervention-first UX pattern (see problem → understand impact → take action in one click) creates stickiness that competitors' dashboard-heavy designs can't match.

---

## Guiding Principles

1. **Insight before automation.** Always explain what's happening and why before offering to act on it. Owners need to understand their gym, not just delegate to AI.
2. **Transparent outcomes.** Every AI action should be trackable back to a measurable result. No "trust us, it's working" — show the numbers.
3. **Progressive autonomy.** Start with suggestions (Scan Now), graduate to semi-autonomous (Smart Actions with approval), evolve toward fully autonomous (self-tuning). Each step earns trust.
4. **Data privacy by default.** Benchmarking uses anonymized aggregates. Member data never leaves the gym's scope. Industry comparisons require minimum segment sizes.
5. **Channel-appropriate urgency.** Don't text about a birthday. Don't email about a payment that failed 5 minutes ago. Match the channel to the urgency.

---

*Last updated: April 2026. This document supersedes the previous AI Operator roadmap (`.local/ai-operator-roadmap.md`).*
