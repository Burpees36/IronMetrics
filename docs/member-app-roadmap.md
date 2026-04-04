# Iron Metrics — Member Mobile App

## For Members: Your Gym, Smarter

Imagine opening one app and knowing exactly what your workout is today, what weight you should be targeting based on your history, where you rank against your gym, and how much you've improved this quarter — all without asking your coach or digging through old notebooks.

Iron Metrics is building the member app that your gym deserves. Not another generic fitness tracker. Not another social media clone. A private, AI-powered training companion built specifically for your gym community.

**What you'll get:**

- **Today's workout, personalized for you.** See the WOD with AI-powered targets based on your training history. Know what to aim for before you walk in the door.
- **Your progress, actually explained.** Not just charts — real insight. "Your conditioning improved 22% this quarter. Your overhead strength has been flat — here's what members who broke through did differently."
- **A leaderboard that motivates everyone.** Not just who's strongest — who's improving fastest, who's on a streak, who just hit a milestone. Whether you're chasing the top spot or competing with yourself from 6 months ago, you'll see exactly where you stand.
- **Your gym community in your pocket.** Celebrate PRs together, see who's signed up for class, follow gym challenges, and feel connected to the people who show up and grind alongside you — even on your rest days.
- **Your coach, amplified.** Your coaches put thought into every workout. Now you'll see the intended stimulus, scaling guidance, and strategy notes — so you get the most out of every session.

This isn't a replacement for showing up. It's the thing that makes showing up even better.

---

## Strategic Overview

### Vision

Transform the Iron Metrics member experience from a gym-owner-only management platform into a two-sided ecosystem where the member app and the owner's AI intelligence layer feed each other. Every member interaction — logging a result, checking in, engaging with the community — makes the owner's intelligence smarter. Every insight the AI generates — risk detection, milestone celebrations, personalized outreach — flows back to the member as a better experience.

This is the flywheel that no competitor can replicate. Wodify has a member app but no intelligence layer. PushPress has notifications but no AI brain. Iron Metrics will have both sides connected by a shared understanding of every member.

### Why Mobile, Why Now

The gym owner platform is mature: retention intelligence, intervention engine, Smart Actions, billing recovery, lead pipeline, programming hub, scheduling — all shipped. But every one of those features is better with member engagement data flowing in. The mobile app isn't a separate product. It's the other half of the product that already exists.

From the member's perspective: they currently interact with their gym through a patchwork of group texts, Instagram posts, whiteboard photos, and maybe a basic Wodify login. Iron Metrics replaces all of that with a single, intelligent app that knows their gym, their training history, and their goals.

### Competitive Landscape

| Capability | Iron Metrics (Planned) | Wodify Member App | PushPress | SugarWOD | BTWB |
|---|:---:|:---:|:---:|:---:|:---:|
| AI-personalized workout targets | Yes | No | No | No | No |
| AI progress analysis & recommendations | Yes | No | No | No | No |
| Percentile & cohort-based leaderboards | Yes | Basic rank | No | Basic rank | Basic rank |
| Improvement-rate leaderboard | Yes | No | No | No | No |
| Rivalry tracking | Yes | No | No | No | No |
| Private gym community feed | Yes | No | No | Partial | No |
| Auto-posted PR celebrations | Yes | No | No | Manual | No |
| AI-powered milestone badges | Yes | No | No | No | No |
| Gym challenges & gamification | Yes | No | No | Partial | No |
| Two-way communication with gym | Yes | No | Push only | No | No |
| Feeds owner-side AI intelligence | Yes | No | No | No | No |
| Connected to retention/risk scoring | Yes | No | No | No | No |
| Scaling & strategy guidance per workout | Yes | No | No | No | No |
| Smart check-in | Yes | Basic | Basic | No | No |

### The Hormozi Principle Applied

Alex Hormozi's framework says: stop thinking in roles, start thinking in workflows. For the gym member, the daily workflows are:

1. **"What's the workout today?"** — Currently answered by whiteboard photos, Instagram stories, or logging into Wodify. Fragmented and dumb.
2. **"How am I doing?"** — Currently answered by memory, a notebook, or not answered at all.
3. **"Where do I stand?"** — Currently answered by glancing at the whiteboard after a WOD, then forgotten.
4. **"Am I part of something?"** — Currently answered by group texts, Instagram comments, and showing up.
5. **"Is my gym talking to me?"** — Currently answered by occasional emails that land in spam.

Each of these workflows should be automated, intelligent, and better than any human could deliver manually. That's what AI-first means — not "we added AI to our app," but "the app couldn't exist without AI."

---

## Phase 1: Foundation (MVP)

**Goal:** Ship a functional member app that covers the four essentials — gym connection, workouts, progress tracking, and leaderboard. Get it into members' hands fast.

### 1.1 — Gym Connection & Member Authentication

Members download the app and connect to their gym using an invite code or link shared by the owner. Authentication ties the app user to their existing member record in Iron Metrics.

**Key details:**
- Invite link or code generated by the gym owner from the Iron Metrics dashboard
- Member creates an account (email + password) or signs in if they already have one
- Links to their existing member profile (matching by email or manual owner approval)
- Multiple gym support — a member who belongs to two affiliated gyms can switch between them
- Gym branding (name, colors, logo) displayed throughout the app

**What this enables on the owner side:**
- The owner sees which members have connected the app (new engagement signal for risk scoring)
- App-connected members can receive push notifications (new outreach channel)

### 1.2 — Today's Workout & Weekly Programming

The core daily use case. Members open the app and see what's programmed.

**What members see:**
- **Today's workout** prominently displayed — title, sections (warmup, strength, WOD, cooldown), movements, rep schemes, time caps
- **Intended stimulus** — what the coach wants them to feel (e.g., "This should be a sprint. If it takes longer than 8 minutes, scale the weight.")
- **Scaling guidance** — Rx, Rx+, and scaled options per section
- **Weekly view** — Swipe through the full week of programming, including past days and upcoming days
- **Previous weeks** — Scroll back to see what was programmed in prior weeks

**Data source:** Pulls directly from the Programming Hub (programming days + sections) already built on the owner side.

### 1.3 — Workout Result Logging & Progress Tracking

Members log their results after each workout and track their progress over time.

**Logging experience:**
- After viewing today's workout, tap "Log Result"
- Enter result (time, rounds+reps, weight, reps — format adapts to workout type)
- Mark Rx / Scaled
- Mark PR (auto-detected when possible based on history)
- Optional notes field
- Quick and frictionless — should take under 15 seconds

**Progress views:**
- **PR board** — All-time personal records for benchmark workouts and major lifts, organized by category
- **History** — Chronological log of every workout with results, filterable by type
- **Trend charts** — Visual progression for key lifts and benchmarks over time (e.g., back squat 1RM trend, Fran time trend)
- **Stats summary** — Total classes attended, total PRs, current streak, attendance this month vs. last month

**Data source:** Reads and writes to the existing `workoutResultsTable`. PRs stored via `isPr` flag. Attendance tracked via existing attendance fields on the member record.

### 1.4 — Leaderboard

Members see where they stand on each workout.

**Leaderboard features:**
- **Per-workout leaderboard** — After logging a result, see the full gym ranking for that workout
- **Rx vs. Scaled separation** — Rx results ranked separately from scaled
- **Highlight position** — Member's own rank highlighted in the list
- **Benchmark leaderboard** — Persistent leaderboards for classic benchmarks (Fran, Grace, Murph, etc.) and major lifts
- **Time filters** — Today, this week, this month, all-time

**Data source:** Queries `workoutResultsTable` grouped by workout, ordered by result (ascending for time-based, descending for weight/reps-based).

---

## Phase 2: Intelligence Layer

**Goal:** This is where Iron Metrics separates from every competitor. Layer AI intelligence on top of the foundation so the app doesn't just show data — it interprets it.

### 2.1 — AI-Personalized Workout Targets

Before the member even walks into the gym, the app tells them what to aim for.

**How it works:**
- Analyzes the member's historical results for similar movements and workout types
- Generates a target range (e.g., "Your target: 7:30–8:15" for a chipper, or "Work at 205–215 lbs" for a squat session)
- Accounts for recent training load — if they've done heavy legs three days in a row, the target adjusts
- Shows comparison to their last attempt at the same or similar workout

**Example displays:**
- *"Today's WOD is Fran. Your last time: 5:15 Rx. Target: 4:45–5:00. Focus on keeping thrusters unbroken in rounds 1 and 2."*
- *"Back squat 5x3 at 80%. Your estimated 1RM: 315 lbs. Working weight: 250 lbs."*
- *"This is a long chipper — pace the first half. Members who improved on workouts like this went out at 70% effort."*

**Why this matters:** No gym app does this. SugarWOD shows history. BTWB tracks benchmarks. Neither tells you what to do with that information today. This turns data into coaching.

### 2.2 — Smart Competitive Intelligence

Go far beyond a basic leaderboard to feed the competitive drive in a way that motivates everyone, not just the top athletes.

**Features:**

**Rivalry Tracking**
- Pick 1-3 members to "follow" as training rivals
- See how your results compare to theirs on every workout
- Track the gap over time: "You've closed the gap on Jake by 12 seconds on benchmark WODs over the past 3 months"
- Optional — rivals can be mutual (both see the comparison) or one-way (private)

**Percentile Rankings**
- For every workout and major lift, show the member their percentile within their gym
- "Your back squat puts you in the 74th percentile at your gym"
- Percentiles update as more results come in

**Improvement-Rate Leaderboard**
- Not who's strongest — who's improving fastest
- Calculated from rate of improvement on benchmark WODs and key lifts over trailing 90 days
- This keeps newer or less experienced members engaged — they can "win" at getting better even if they're not the strongest in the room

**Cohort Comparison**
- "Compared to members who joined around the same time as you, you're progressing 20% faster on conditioning WODs and 5% slower on strength movements"
- Normalizes competition by experience level

### 2.3 — AI Progress Analysis

Replace static charts with intelligent analysis that tells members what their data means and what to do about it.

**Analysis types:**

| Insight | Example |
|---------|---------|
| **Trend detection** | "Your overhead pressing strength has improved 18% over the past 12 weeks. Your pulling strength is flat — consider adding extra pull-up work." |
| **Plateau identification** | "Your back squat has been between 275-285 for 8 weeks. Members who broke through similar plateaus typically added one dedicated heavy single session per week." |
| **Consistency correlation** | "In weeks where you attend 4+ classes, your benchmark scores improve an average of 3%. Your current average is 3.1 classes/week." |
| **Strength balance** | "Your front squat is 72% of your back squat. The typical ratio is 80-85%. This suggests quad strength may be a limiter." |
| **Conditioning trends** | "Your performance on workouts under 10 minutes has improved 15%, but workouts over 15 minutes have declined 8%. You may benefit from longer conditioning pieces." |

**Delivery:** Surfaced as a "Your Training Report" section that updates weekly, plus contextual tips on relevant workout days.

### 2.4 — Smart Check-In

One-tap class check-in that replaces clipboard sign-ins and feeds data back to the owner.

**Options (gym owner configures):**
- **Geofenced** — App detects when the member is at the gym and prompts check-in
- **QR code** — Scan a code posted at the gym entrance
- **Manual** — Tap to check in from the class schedule view
- **Auto** — If the member logs a workout result, check-in is recorded automatically

**Why it matters for the ecosystem:** Every check-in flows back to the owner's dashboard. Attendance data feeds risk scoring, RSI calculation, retention sequences, and AI interventions. The more members use the app, the smarter the owner's AI gets.

---

## Phase 3: Community & Engagement

**Goal:** Make the app a place members want to open even on rest days. Feed the community and belonging instincts.

### 3.1 — Gym Community Feed

A private social feed for each gym — not public, not connected to external social media. Just your gym family.

**Content types:**
- **Auto-posted PRs** — When a member logs a PR, it appears in the feed with the option to celebrate (reactions, comments)
- **Workout completions** — "Sarah completed today's WOD: 8:42 Rx" — visible to the gym community
- **Coach posts** — Coaches can post programming notes, tips, motivation, announcements
- **Owner announcements** — Gym news, schedule changes, events
- **Photo/video sharing** — Members can share training clips and photos within the gym feed
- **Milestone auto-posts** — "Mike just hit his 200th class!" or "Lisa has a 30-day attendance streak!"

**Privacy controls:**
- Members can choose what auto-posts (all results, PRs only, nothing)
- Members can hide their results from the leaderboard if they prefer
- Feed is private to gym members only — never public

**Reactions & comments:**
- Simple reaction system (fire emoji for PRs, fist bump for completions, heart for milestones)
- Comment threads on posts
- @mentions for shoutouts

### 3.2 — Gamification & Challenges

Structured competition that drives the behaviors correlated with retention.

**Always-on gamification:**
- **Attendance streaks** — Track consecutive weeks of 3+ classes. Visible streak badge on profile.
- **Milestone badges** — 50th class, 100th class, 250th, 500th, 1000th. 6-month member, 1-year, 2-year. First PR, 10 PRs, 50 PRs.
- **Level system** — Members "level up" based on a composite of consistency, improvement rate, and community engagement. Not based on raw strength — a dedicated beginner levels up just as fast as an elite athlete.

**Gym challenges (owner-created or template-based):**
- **Attendance challenges** — "20 classes in January." Leaderboard and completion badge.
- **Benchmark challenges** — "Retest Fran this month. Biggest improvement wins."
- **Team challenges** — Gym splits into teams. Combined attendance or results determine the winner.
- **Seasonal challenges** — "Summer Shred: log 50 workouts between June and August."
- **Custom** — Owner creates any challenge with a name, description, metric, and duration.

**Challenge leaderboard** — Real-time standings visible in the app.

### 3.3 — Milestone Celebrations

Automated recognition that makes members feel seen — powered by data the platform already has.

**Milestone types:**

| Milestone | Trigger | In-App Experience |
|-----------|---------|-------------------|
| Membership anniversary | Join date | Animated celebration screen + badge + auto-post to feed |
| Attendance milestones | 50th, 100th, 200th, 500th class | Badge + leaderboard callout + push notification |
| PR celebrations | New personal record | Animated PR screen + auto-post to feed |
| Streak milestones | 4, 8, 12, 26, 52 consecutive weeks | Badge + streak counter on profile |
| Birthday | Birthday field | Birthday message from gym + badge |
| Comeback | Return after 30+ day absence | Welcome back message + "fresh start" badge |

**Connection to owner side:** Every milestone also generates a celebration task in the owner's AI Task Inbox — giving the owner the prompt to send a personal message, post a social media shoutout, or give a small reward. This feeds the "positive touchpoint" strategy from the AI roadmap (Phase 2.2 — Member Milestone Celebrations).

---

## Phase 4: Communication & Retention Loop

**Goal:** Close the communication loop between the gym and its members. Turn one-directional outreach into a conversation.

### 4.1 — Two-Way Messaging

Members receive gym communications in-app and can respond directly.

**What members receive:**
- AI-generated outreach from Smart Actions (retention check-ins, win-back messages, billing reminders)
- Coach messages (programming notes, class announcements)
- Owner announcements
- Sequence-driven messages (onboarding, re-engagement)

**What members can do:**
- Read messages in a unified inbox
- Reply directly — response is visible to the owner/coach in the member's profile timeline
- Mark messages as read
- Receive push notifications for new messages

**What this enables on the owner side:**
- Member responses appear in the member profile timeline alongside notes, emails, and AI tasks
- Response rate becomes a new data signal for risk scoring (members who stop reading messages may be disengaging)
- The AI can factor in message engagement when generating interventions

### 4.2 — Push Notifications

Smart, respectful push notifications that drive engagement without being annoying.

**Notification types:**

| Type | Trigger | Frequency Cap |
|------|---------|---------------|
| Workout posted | Today's programming is published | 1x/day max |
| Class reminder | 1 hour before a class they usually attend | 1x/day max |
| PR celebration | They logged a PR | Unlimited (always positive) |
| Milestone achieved | They hit a milestone | Unlimited |
| Challenge update | Standing changed or challenge ending soon | 2x/week max |
| Message from gym | New message in inbox | Unlimited |
| Streak at risk | Haven't attended this week, streak in danger | 1x/week max |
| Comeback nudge | Haven't visited in 14+ days | 1x/2 weeks max |

**Member controls:**
- Granular notification preferences (toggle each type)
- Quiet hours setting
- Can mute everything temporarily ("vacation mode")

### 4.3 — Class Schedule & Booking

Members can view the class schedule and signal their attendance.

**Features:**
- Weekly class schedule view matching the owner's schedule page
- See which classes have availability vs. waitlisted
- "I'm going" button — signals intent to attend (not a hard reservation unless the owner enables that)
- See who else is going (optional, gym-owner-configurable)
- Integrates with Smart Check-In — if they said they're going, check-in is one tap

---

## Phase 5: Advanced Intelligence & Autonomy

**Goal:** The app becomes a genuine AI training partner — not just a mirror of data, but a source of guidance that gets smarter over time.

### 5.1 — Weekly Training Report

Every Monday, the member receives a personalized AI-generated training summary.

**Report contents:**
- Classes attended last week vs. their average
- Results summary with highlights (any PRs, notable performances)
- Improvement trends (what's going up, what's flat, what's declining)
- One actionable recommendation ("Based on your recent training, focus on mobility work before overhead movements this week")
- Upcoming benchmark opportunities ("Murph is programmed for Thursday — your last time was 42:30")

### 5.2 — Goal Setting & Tracking

Members set personal goals and the AI tracks progress toward them.

**Goal types:**
- **Attendance** — "Attend 4x/week for the next 3 months"
- **Benchmark** — "Get Fran under 4 minutes by June"
- **Strength** — "Back squat 315 by end of year"
- **Consistency** — "Don't miss more than 1 week for 6 months"
- **Custom** — Free-form goal with a deadline

**AI tracking:**
- Progress percentage updated automatically from logged data
- Pace analysis — "At your current rate of improvement, you'll hit your Fran goal by May — 1 month ahead of schedule"
- Adjustment suggestions — "Your squat goal may need more time. Consider adding a second squat day or adjusting the target to 300."

### 5.3 — Movement Library & Coaching Tips

An in-app resource for learning and improving movements.

**Content:**
- Video demonstrations for common movements (owner can upload their own or use defaults)
- Scaling progressions ("Can't do muscle-ups yet? Here's the path: ring rows → strict pull-ups → kipping pull-ups → transition drills → muscle-ups")
- Coach tips linked to specific movements in today's workout
- Common fault corrections

### 5.4 — Body Composition & Health Tracking (Optional)

For members who want to track beyond performance.

- Weight logging with trend smoothing (7-day average)
- Body measurement tracking
- Progress photo timeline (private, encrypted)
- Integrations with wearables (Apple Health, Google Fit) for sleep, heart rate, steps
- AI correlations: "Your performance improves an average of 8% on days following 7+ hours of sleep"

---

## Technical Architecture Notes

### Platform
- Built with Expo (React Native) for iOS and Android from a single codebase
- Lives within the existing Iron Metrics monorepo as a new artifact
- Shares the existing API server — no backend duplication

### API Strategy
- Member-facing API endpoints added to the existing Express API server
- Member authentication is separate from owner/staff authentication (members don't access the management dashboard)
- All member data reads/writes go through the same database — workout results, attendance, member profiles
- Rate limiting and security appropriate for a public-facing mobile app

### Data Flow (The Flywheel)
```
Member uses app → Logs results, checks in, engages with community
        ↓
Data flows to shared database
        ↓
Owner's AI processes data → RSI updates, risk scores recalculate, interventions generate
        ↓
AI generates outreach/celebrations → Delivered to member via app push notifications + in-app messages
        ↓
Member engages with messages → Response data feeds back to AI
        ↓
AI gets smarter → Better interventions, better predictions, better recommendations
        ↓
Member gets better experience → More engagement → More data → Smarter AI
```

### Offline Capability
- Today's workout cached for offline viewing
- Result logging works offline — syncs when connection restores
- PR board and recent history available offline
- Community feed requires connection

---

## Implementation Sequence

| Order | Scope | What Ships | Est. Effort |
|-------|-------|------------|-------------|
| 1 | Phase 1.1–1.2 | Gym connection + today's workout + weekly view | Medium |
| 2 | Phase 1.3–1.4 | Result logging + progress tracking + leaderboard | Medium |
| 3 | Phase 2.4 | Smart check-in | Small |
| 4 | Phase 2.1 | AI workout targets | Medium |
| 5 | Phase 2.2 | Smart competitive intelligence (rivalries, percentiles, improvement board) | Medium |
| 6 | Phase 3.1 | Community feed | Large |
| 7 | Phase 3.2–3.3 | Gamification, challenges, milestones | Medium |
| 8 | Phase 2.3 | AI progress analysis | Medium |
| 9 | Phase 4.1–4.2 | Two-way messaging + push notifications | Medium |
| 10 | Phase 4.3 | Class schedule & booking | Small |
| 11 | Phase 5.1–5.2 | Weekly training report + goal setting | Medium |
| 12 | Phase 5.3–5.4 | Movement library + health tracking | Medium |

### MVP Definition (Steps 1–2)
The minimum viable product that goes into members' hands includes:
- Connect to gym via invite link
- View today's workout and the full week
- Log workout results
- View personal PR board and history
- See per-workout leaderboard

Everything after that is additive — each phase makes the app more valuable without breaking what's already there. Ship fast, layer intelligence.

---

## Success Metrics

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| **App adoption rate** | 60%+ of active members within 3 months | Validates demand and drives data flywheel |
| **Daily active users** | 40%+ of app users open it daily | Proves the app is a habit, not a novelty |
| **Result logging rate** | 50%+ of attended classes have a logged result | Core engagement metric and data quality indicator |
| **Retention lift** | 10%+ improvement in 6-month member retention for app-connected members | The business case — does the app help keep members |
| **Owner RSI improvement** | Measurable RSI increase for gyms with high app adoption | Proves the flywheel — member engagement improves owner intelligence |
| **Community engagement** | 30%+ of members interact with the feed weekly | Validates the community feature investment |
| **Check-in rate** | 80%+ of attended classes have a digital check-in | Data completeness for the AI layer |

---

*This document is a living plan. Phases and priorities will be refined as we build and learn from early member feedback.*
