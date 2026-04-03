# Iron Metrics — AI & Intelligence Product Roadmap

> Strategic vision for AI-powered gym intelligence, from unified insights through self-improving automation.

---

## Executive Summary

Iron Metrics' AI strategy is built on a simple premise: **gym owners shouldn't need to dig for insights — the platform should surface them automatically, explain them clearly, and act on them when authorized.**

Today, Iron Metrics already delivers risk scoring, automated outreach, revenue attribution, and industry benchmarking. This roadmap outlines how we extend that foundation into a comprehensive intelligence layer that understands member behavior, predicts outcomes, and continuously improves itself.

---

## Phase 1: Unification — AI Insights Page *(Shipped)*

**Goal:** Consolidate Intelligence Hub and AI Operator into a single, cohesive experience.

### What We Built

| Component | Description |
|-----------|-------------|
| **Unified AI Insights page** | Single entry point at `/ai-insights` replacing separate Intelligence Hub and AI Operator pages |
| **Overview tab** | RSI gauge, stat cards (At-Risk Members, Pending AI Tasks, Revenue Impact, RSI Score), morning briefing, RSI trend chart |
| **Risk & Action tab** | Risk Radar + AI Task Inbox side by side — see the problem and the solution in one view |
| **Impact tab** | Outcome metrics, revenue attribution, success rates, and outcome timeline chart |
| **Benchmarks tab** | Industry comparisons by gym size segment (RSI, churn, ARM, tenure, engagement) |
| **Auto-Pilot modal** | Configure autonomous email outreach with category-level controls |

### Key Design Decisions

- **Retention stays separate.** The Retention page (`/retention`) handles sequence configuration and enrollment management — it's infrastructure, not insights. AI Insights surfaces the *results* of retention work.
- **Automatic data refresh.** All schedulers (RSI snapshots, benchmark computation, AI task generation, outcome detection) run autonomously. The page loads fresh data without manual intervention.
- **Progressive disclosure.** Overview gives the 30-second health check. Deeper tabs provide investigation and action tools for owners who want to dig in.

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
4. Surface explanations on Risk Radar cards and in AI task descriptions

### 2.2 Member Milestone Celebrations

**The problem:** AI Operator is perceived as a "churn prevention tool." Owners only engage when something is wrong. This creates negative association with the feature.

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
3. Surface top 3-5 insights on the Overview tab as "Cohort Insights" cards
4. Allow drill-down into specific cohorts from the Benchmarks tab

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

**Auto-Pilot integration:** Add SMS toggle per category in Auto-Pilot settings. Critical-only SMS is the recommended default.

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

### 4.1 Auto-Pilot Self-Tuning

**The problem:** Auto-Pilot runs the same playbook regardless of results. If outreach emails aren't working for a particular member segment, it keeps sending them.

**The solution:** Closed-loop learning from outcome tracking data.

**Self-tuning capabilities:**

| Capability | How It Works |
|------------|--------------|
| **Category performance monitoring** | Track success rates per task category. If billing recovery emails drop below 10% success, flag for review. |
| **Auto-pause** | Automatically pause auto-pilot for categories with sustained low success rates (< 5% over 30 days). Notify owner with explanation. |
| **Template optimization** | Track which email template variants get the best outcomes. Gradually shift toward higher-performing templates. |
| **Send time optimization** | Analyze which send times correlate with better open/response rates. Adjust auto-pilot scheduling. |
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
- *"ROI on AI Operator: $4,200 in retained revenue over the last 90 days from 12 saved members, against a $297 platform cost."*

**Implementation approach:**
1. Build a Monte Carlo simulation engine using historical churn rates, revenue data, and risk scores
2. Generate 3 scenarios (pessimistic, baseline, optimistic) for 30/60/90-day horizons
3. Surface scenarios on the Impact tab with interactive sliders

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

## Competitive Positioning

### How Iron Metrics Compares

| Capability | Iron Metrics | Wodify | PushPress | Zen Planner |
|------------|:---:|:---:|:---:|:---:|
| **Risk Scoring (RSI)** | Yes | No | No | No |
| **Risk Radar with member detail** | Yes | No | No | No |
| **AI-generated outreach** | Yes | No | No | No |
| **Smart email personalization** | Yes | No | Basic templates | Basic templates |
| **Auto-Pilot (autonomous actions)** | Yes | No | No | No |
| **Outcome tracking & revenue attribution** | Yes | No | No | No |
| **Industry benchmarking** | Yes | No | No | No |
| **Morning briefing** | Yes | No | No | No |
| **Retention sequences** | Yes | Basic | Basic | Basic |
| **Churn explanations** | Phase 2 | No | No | No |
| **Milestone celebrations** | Phase 2 | No | No | No |
| **Cohort intelligence** | Phase 2 | No | No | No |
| **SMS outreach** | Phase 3 | No | Basic | No |
| **Proactive push alerts** | Phase 3 | No | No | No |
| **Schedule optimization** | Phase 3 | No | No | No |
| **Self-tuning AI** | Phase 4 | No | No | No |
| **Predictive revenue modeling** | Phase 4 | No | No | No |
| **Programming intelligence** | Phase 4 | No | No | No |

### Competitive Moat

Iron Metrics' advantage compounds over time:

1. **Data flywheel:** More gyms → better benchmarks → more accurate risk models → better outcomes → more gyms
2. **Outcome learning:** Every AI task that succeeds or fails improves the model. Competitors would need to build this from scratch.
3. **Integration depth:** By syncing with Wodify/other platforms, Iron Metrics has richer member context than any standalone tool.
4. **Owner trust:** Auto-Pilot with transparent outcome tracking builds trust that can't be replicated with "black box" AI claims.

---

## Implementation Priority Matrix

| Phase | Effort | Impact | Priority |
|-------|--------|--------|----------|
| Milestone Celebrations | Low | Medium | High — easy win, changes product perception |
| Churn Explanations | Medium | High | High — direct retention value |
| Morning Briefing Email | Low | Medium | High — drives daily engagement |
| Cohort Intelligence | Medium | High | Medium — powerful but needs critical mass |
| SMS Outreach | Medium | High | Medium — requires Twilio integration |
| Schedule Intelligence | Medium | Medium | Medium — needs schedule change tracking |
| Self-Tuning Auto-Pilot | High | High | Medium — requires outcome volume |
| Revenue Modeling | High | Medium | Lower — nice-to-have for most owners |
| Programming Suggestions | Medium | Medium | Lower — niche value, needs programming data |

---

## Guiding Principles

1. **Insight before automation.** Always explain what's happening and why before offering to act on it. Owners need to understand their gym, not just delegate to AI.
2. **Transparent outcomes.** Every AI action should be trackable back to a measurable result. No "trust us, it's working" — show the numbers.
3. **Progressive autonomy.** Start with suggestions (Scan Now), graduate to semi-autonomous (Auto-Pilot with approval), evolve toward fully autonomous (self-tuning). Each step earns trust.
4. **Data privacy by default.** Benchmarking uses anonymized aggregates. Member data never leaves the gym's scope. Industry comparisons require minimum segment sizes.
5. **Channel-appropriate urgency.** Don't text about a birthday. Don't email about a payment that failed 5 minutes ago. Match the channel to the urgency.

---

*This document supersedes the previous AI Operator roadmap (`.local/ai-operator-roadmap.md`). Last updated: April 2026.*
