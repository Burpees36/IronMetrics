# Iron Metrics — Next-Generation Roadmap

## Vision
Transform Iron Metrics from a gym management dashboard into an autonomous operating system for gym owners. Inspired by the "workflow-based thinking" framework: every repetitive task a gym owner does should be broken into granular steps and automated. The owner's role shifts from doing the work to reviewing what the AI did overnight.

## Phased Rollout

### Phase 1: Communication Foundation
**Goal:** Give the app a real communication backbone beyond email-only.

1. **SMS/Text Messaging Engine** — Integrate Twilio (or similar) so the app can send texts to members and leads. Texts are the #1 communication channel in gyms — 95% open rate vs 20% for email. This unlocks everything else.
2. **Owner Voice Training System** — Let owners define their communication style: tone (casual/professional/motivational), writing rules ("never say cancellation, say taking a break"), and paste example messages they've written. All auto-generated copy adapts to match their voice instead of sounding like generic templates.
3. **Rewrite All Existing Email Copy** — Overhaul every template to sound human, warm, and gym-specific. Remove corporate language ("We were unable to process"), remove threatening tones ("FINAL NOTICE"), and replace with conversational copy that matches how gym owners actually talk to their members.

### Phase 2: Lead Automation
**Goal:** Automate the entire lead-to-member journey.

4. **Multi-Step Lead Nurture Sequences** — When a lead enters the pipeline, trigger an automated sequence: welcome text within 5 minutes → email next day → book No Sweat Intro → reminder before intro → follow-up after intro. Configurable steps, delays, and channels (SMS vs email).
5. **No Sweat Intro Booking Integration** — Connect the leads pipeline to the schedule. Leads can self-book intro appointments. Auto-send reminders. After the intro, auto-create a membership proposal based on goals discussed.
6. **Lead Source Attribution & ROI** — Track where leads come from (Instagram, referral, walk-in, website) and show which sources actually convert to paying members, with cost-per-acquisition if ad spend is entered.

### Phase 3: Programming & Operations Automation
**Goal:** Remove daily manual work from the owner's plate.

7. **AI-Generated Workout Programming** — Based on the gym's methodology, past programming history, and periodization principles, auto-generate weekly workouts. Owner reviews and publishes (or sets to auto-publish). Supports CrossFit, strength-bias, hybrid, and custom methodologies.
8. **Personal Training & Appointment Scheduling** — Add 1-on-1 session booking: PT, nutrition consults, goal reviews, workshops. Members can self-book from available coach slots. Integrates with the existing class schedule.
9. **Conversational Metric Insights** — Replace data labels with actionable advice. Instead of "Churn: 8.2% (above median)," say "You lost 6 members this month — that's $1,200/mo. Three hadn't visited in 20+ days. If auto-pilot had caught them, you'd likely have saved 2." Every metric should tell the owner what to DO.

### Phase 4: Financial Intelligence
**Goal:** Answer "How much can I pay myself?" and "Can I afford that new rower?"

10. **Owner Pay & Expense Tracking** — Track monthly expenses (rent, utilities, coach pay, equipment, software). Calculate owner take-home automatically. Show trends over time.
11. **Payroll Planning** — Track coach compensation as a percentage of revenue. Flag when payroll ratio gets unhealthy. Suggest adjustments.
12. **Equipment & Facility Budgeting** — Based on revenue stability, recommend what the gym can afford to invest this quarter. Flag when revenue supports expansion or when it's time to tighten.

### Phase 5: Autonomous Operations
**Goal:** The app runs the gym overnight. The owner wakes up to a summary.

13. **Morning Summary Overhaul** — "Here's what I did overnight: sent 3 win-back texts, followed up with 2 leads, collected $450 in past-due, published tomorrow's workout. You have 1 thing that needs you: a member wants to discuss downgrading."
14. **Full Auto-Pilot Expansion** — Extend auto-pilot beyond retention/billing/leads to cover: new member welcome sequences, birthday/anniversary messages, milestone celebrations (100th class, 1-year anniversary), re-engagement for members who haven't logged a workout result.
15. **Smart Scheduling Suggestions** — Analyze class attendance patterns and suggest schedule changes: "Your 5 AM class averages 4 people. Your 6 AM averages 18 with a waitlist. Consider adding a 5:30 AM or moving 5 AM to 5:30."

---

## Guiding Principles (from Hormozi framework)
- **Workflow over role:** Every feature should automate a specific task, not a vague responsibility.
- **Train the AI like an employee:** Give it rules, examples, and feedback loops. Never accept generic output.
- **The owner reviews, not executes:** The default should be "AI did it, owner approves" — not "owner does it, AI assists."
- **Revenue per hour:** Every automation should be measurable in time saved or revenue protected/generated.
- **Never worse than now:** Ship incrementally. Each phase makes the app better without breaking what exists.
