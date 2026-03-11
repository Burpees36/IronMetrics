import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  UserPlus,
  Apple,
  Megaphone,
  Users,
  Handshake,
  ClipboardCheck,
  Target,
  Heart,
} from "lucide-react";

interface ResourcePhase {
  title: string;
  summary: string;
  details: string[];
}

interface Resource {
  id: string;
  title: string;
  subtitle: string;
  icon: typeof BookOpen;
  category: string;
  phases: ResourcePhase[];
}

const RESOURCES: Resource[] = [
  {
    id: "onboarding",
    title: "New Member Onboarding Process",
    subtitle: "A structured 5-phase system to take leads from first contact through their 90-day goal review — and turn them into long-term members.",
    icon: UserPlus,
    category: "Retention",
    phases: [
      {
        title: "Phase 1 — Assess",
        summary: "First contact with a lead has one goal: get them to schedule a No Sweat Intro.",
        details: [
          "When a lead fills out your form, the only objective of that first call or text is to book a No Sweat Intro (NSI). Don't go over pricing or programs — just get them in the door.",
          "The NSI is a motivational interview. Ask 3-4 questions to understand why they want to work out, what they've tried before, and what their goals are.",
          "From there, the coach creates a prescription — the fastest path to results. That might be personal training, semi-private, group classes, nutrition coaching, or a combination.",
          "Each member gets their own goal sheet filled out during the NSI. If available, do an InBody scan to establish a baseline.",
        ],
      },
      {
        title: "Phase 2 — Admit & Affirm",
        summary: "Present the prescription, handle objections with empathy, and get them signed up for OnRamp before they leave.",
        details: [
          "Present the prescription: 'Based on what you told me, the fastest way to get you where you want is...' — show them the path.",
          "If they say it's too expensive: 'Given your budget, we can do it this way. It won't be as fast, but it will get you there.' Always have a Plan B.",
          "The goal of the NSI is to get them signed up for OnRamp (done 1-on-1). OnRamp is often seen as a barrier to entry — but when done right, it's a barrier to exiting.",
          "They should not leave the NSI without scheduling their first OnRamp appointment. Momentum matters — the gap between NSI and first session should be under 48 hours.",
          "Consider a Healthy Habits appointment early on to go over nutrition habits that will help long-term. This can be in-person, phone, or Zoom.",
          "A Client Success Manager (CSM) oversees each member's journey for the first 90 days — handling touchpoints, check-ins, and making sure nobody slips through the cracks.",
        ],
      },
      {
        title: "Phase 3 — Activate & Acclimate",
        summary: "OnRamp sessions teach foundational movements, build confidence, and create a sense of belonging before they ever hit a group class.",
        details: [
          "Start with the Healthy Habits appointment: discuss nutrition's role in their goals, provide first steps for habit change, and give them a habits tracking sheet to fill out until their goal review.",
          "Send the Sickness-Wellness-Fitness video with a short script — share foundational CrossFit knowledge early.",
          "Provide a Client Bill of Rights and Code of Conduct. This answers 'What do we do here?' and 'How are we different?' Most people quit because they don't feel like they fit in — this helps them belong from day one.",
          "During OnRamp, teach the 9 foundational movements. Coach the person, not just the movement — learn how they respond to cues, what motivates them, what they're nervous about.",
          "Before their first group class, walk them through: what to expect, how to scale, where things are. Introduce them to at least one other member by name.",
        ],
      },
      {
        title: "Phase 4 — Anchor",
        summary: "The first few group classes are make-or-break. Coach touchpoints and community connections keep them from disappearing.",
        details: [
          "After their first group class, send a text or call within 24 hours: 'How was your first class? Anything I can help with?'",
          "CSM checks attendance at day 7, 14, and 30. If they miss a week, proactive outreach happens automatically.",
          "Introduce them to 2-3 regular members who attend the same class time. Social connections are the strongest anchor.",
          "At day 14, schedule a quick check-in (5 min before/after class): 'How are you feeling? Any questions? Still tracking your habits?'",
        ],
      },
      {
        title: "Phase 5 — Ascend (90-Day Goal Review)",
        summary: "The 90-day goal review is the moment that turns a new member into a long-term member. It's the most important appointment after the NSI.",
        details: [
          "Schedule the goal review at the time of sign-up. Put it on the calendar immediately.",
          "Review their original goals from the NSI. Show them their progress — InBody scan comparison, workout improvements, habits tracked.",
          "This is the emotional peak: 'Look what you've done in 90 days.' Members who feel progress stay.",
          "Set new goals for the next 90 days. Prescribe the next phase — this might include upsells like nutrition coaching, personal training, or competition prep.",
          "Ask for a referral: 'Who in your life would benefit from what you've experienced here?' The 90-day mark is the highest-referral moment.",
        ],
      },
    ],
  },
  {
    id: "nutrition-challenge",
    title: "Running a Nutrition Challenge",
    subtitle: "A proven framework for running nutrition challenges that drive engagement, results, and revenue expansion.",
    icon: Apple,
    category: "Revenue Expansion",
    phases: [
      {
        title: "Phase 1 — Plan & Promote",
        summary: "Design the challenge structure and build excitement 3-4 weeks before launch.",
        details: [
          "Decide on challenge length (21 days or 6 weeks are most effective), format (points-based, habit-tracking, or meal-plan adherence), and pricing.",
          "Create a landing page or sign-up form. Include testimonials from past participants if available.",
          "Promote in classes, social media, and email. Use countdown posts and early-bird pricing to create urgency.",
          "Prepare materials: habit tracker sheets, meal prep guides, grocery lists, and the scoring rubric.",
        ],
      },
      {
        title: "Phase 2 — Kick Off & Onboard",
        summary: "Launch with energy and set expectations for accountability and communication.",
        details: [
          "Host a kick-off event: in-person or Zoom. Cover the rules, scoring, and what success looks like.",
          "Do baseline measurements: weight, body composition, photos (optional), and a short lifestyle questionnaire.",
          "Set up a communication channel (private Facebook group, Slack, or app chat) for daily check-ins.",
          "Assign accountability partners or small groups within the challenge for peer support.",
        ],
      },
      {
        title: "Phase 3 — Execute & Engage",
        summary: "Keep energy high throughout with daily touchpoints and weekly milestones.",
        details: [
          "Post daily prompts in the group: meal ideas, hydration reminders, mindset tips, and member shout-outs.",
          "Coaches check in weekly with each participant — a quick text or DM asking how they're doing.",
          "Host a mid-challenge event: cooking class, grocery store tour, or Q&A with a nutrition coach.",
          "Share weekly leaderboards or progress highlights to maintain competitive motivation.",
        ],
      },
      {
        title: "Phase 4 — Celebrate & Convert",
        summary: "End strong with results, recognition, and the path forward.",
        details: [
          "Do final measurements and compare to baseline. Create before/after summaries for willing participants.",
          "Host a closing celebration: awards for most improved, most consistent, best transformation.",
          "Present the next step: ongoing nutrition coaching, a follow-up challenge, or a membership upsell.",
          "Collect testimonials and social proof content. Ask top performers if they'd be willing to share their story.",
        ],
      },
    ],
  },
  {
    id: "referral-system",
    title: "Building a Referral System",
    subtitle: "A systematic approach to turning your happiest members into your best source of new leads.",
    icon: Megaphone,
    category: "Acquisition",
    phases: [
      {
        title: "Phase 1 — Identify Advocates",
        summary: "Find your happiest, most engaged members who are natural referral candidates.",
        details: [
          "Look for members who attend 4+ times per week, have been members for 3+ months, and actively participate in community events.",
          "Track who's already referring informally — these are your best advocates.",
          "Create an 'advocate profile' — these members love the gym, talk about it outside, and have achieved visible results.",
        ],
      },
      {
        title: "Phase 2 — Create the Incentive",
        summary: "Design a referral reward that motivates action without devaluing your service.",
        details: [
          "Best incentives: free month for referrer, free trial week for the friend, gym merchandise, or special experiences (e.g., dinner with the coach).",
          "Avoid discounting your membership — it trains people to wait for deals. Instead, add value.",
          "Make the referral process simple: a card, a link, or a text they can forward. Remove all friction.",
          "Track every referral. Know who referred whom, when they signed up, and how long they stayed.",
        ],
      },
      {
        title: "Phase 3 — Activate & Sustain",
        summary: "Launch the program, celebrate referrals publicly, and keep it top of mind.",
        details: [
          "Announce the program in a special event or class. Make it exciting, not transactional.",
          "Celebrate every referral publicly: 'Shout out to Sarah for bringing in her friend Mike!' Social recognition is powerful.",
          "Run quarterly referral sprints with bonus incentives to create urgency.",
          "Review referral data monthly: how many referrals, conversion rate, and retention of referred members.",
        ],
      },
    ],
  },
  {
    id: "community-events",
    title: "Community Event Playbook",
    subtitle: "How to plan and execute community events that strengthen member bonds and reduce churn.",
    icon: Users,
    category: "Community Depth",
    phases: [
      {
        title: "Phase 1 — Monthly Event Cadence",
        summary: "Establish a predictable rhythm of events that members can look forward to.",
        details: [
          "Plan one social event per month: potlucks, partner workouts, movie nights, or outdoor adventures.",
          "Alternate between fitness-focused events (throwdowns, team competitions) and purely social events (BBQs, game nights).",
          "Assign an event coordinator — this can be a coach, a member volunteer, or a staff member. Don't let it fall on the owner every time.",
          "Create an annual event calendar and share it with members. Predictability builds anticipation.",
        ],
      },
      {
        title: "Phase 2 — Competition Events",
        summary: "In-house competitions and CrossFit Open celebrations create peak community moments.",
        details: [
          "Host quarterly in-house throwdowns. Keep them fun and inclusive — scale everything and add team divisions.",
          "For the CrossFit Open: run Friday Night Lights with music, judges, and a spectator-friendly setup. This is your Super Bowl.",
          "Create divisions that let everyone participate: Rx, Scaled, Masters, and Teens. Celebrate effort, not just performance.",
          "Use events as referral opportunities: 'Bring a friend to cheer you on' or 'Sign up a team with a non-member friend.'",
        ],
      },
      {
        title: "Phase 3 — Measure & Iterate",
        summary: "Track attendance and member feedback to improve future events.",
        details: [
          "Record attendance at every event. Track which members attend which types of events.",
          "Send a quick post-event survey (3 questions max): 'How was it? What would you change? What should we do next?'",
          "Correlate event attendance with retention: members who attend social events have significantly lower churn rates.",
          "Share event photos and recaps on social media. Tag members. Build the FOMO for those who missed it.",
        ],
      },
    ],
  },
  {
    id: "coaching-development",
    title: "Coaching Quality & Development",
    subtitle: "A framework for ensuring consistent, high-quality coaching that builds trust and keeps members progressing.",
    icon: ClipboardCheck,
    category: "Coaching & Programming",
    phases: [
      {
        title: "Phase 1 — Shadow & Assess",
        summary: "Regularly observe coaching sessions to identify strengths and areas for growth.",
        details: [
          "Shadow each coach at least once per quarter. Use a standardized evaluation form covering: warmup quality, movement demos, scaling options, member interaction, and class energy.",
          "Look for consistency: are all coaches delivering the same standard of experience? Members shouldn't feel like they're at a different gym depending on who's coaching.",
          "Check that coaches know every member's name and at least one personal detail. Personalization is the difference between a class and a community.",
          "Review how coaches handle scaling: are they proactively offering modifications, or waiting for members to ask?",
        ],
      },
      {
        title: "Phase 2 — Develop & Train",
        summary: "Invest in ongoing education and create a culture of coaching excellence.",
        details: [
          "Hold monthly coach meetings: review programming, discuss member concerns, share coaching wins, and practice difficult conversations.",
          "Send coaches to at least one seminar or certification per year. CrossFit L2, specialty courses, or nutrition certifications.",
          "Create a coaching playbook: standard operating procedures for class flow, warmup structure, cooldown, and member communication.",
          "Pair experienced coaches with newer ones for mentorship. Shadowing goes both ways.",
        ],
      },
      {
        title: "Phase 3 — Feedback Loop",
        summary: "Create systems for continuous improvement through member and peer feedback.",
        details: [
          "Run quarterly member surveys that include coaching quality questions. Keep it anonymous.",
          "Implement peer coaching reviews — coaches observe each other and share constructive feedback.",
          "Track coaching-related metrics: class attendance by coach, member retention by coach, and class rating scores.",
          "Celebrate coaching wins publicly: 'Coach Alex helped 5 members get their first pull-up this month!'",
        ],
      },
    ],
  },
  {
    id: "goal-review",
    title: "Goal Review System",
    subtitle: "A structured system for regular goal setting and progress reviews that increase member lifetime value.",
    icon: Target,
    category: "Retention",
    phases: [
      {
        title: "Phase 1 — Initial Goal Setting",
        summary: "Every member starts with clear, measurable goals established during onboarding.",
        details: [
          "During the No Sweat Intro, identify 2-3 specific goals. Make them measurable: 'lose 15 pounds' not 'get in shape.'",
          "Document goals in the member's profile. Include baseline measurements, timeline, and the prescription to get there.",
          "Share the goal sheet with the member — they should have a copy they can reference.",
          "Set the 90-day goal review appointment before they leave the NSI.",
        ],
      },
      {
        title: "Phase 2 — Quarterly Reviews",
        summary: "Every 90 days, sit down with each member to review progress and set new goals.",
        details: [
          "Schedule reviews proactively — don't wait for members to ask. Put them on the calendar automatically.",
          "Review progress against original goals. Show data: attendance trends, workout improvements, body composition changes.",
          "Celebrate wins, no matter how small. 'You went from 3 visits a week to 4 — that's a 33% increase in consistency.'",
          "Set new goals for the next quarter. This is also the time to prescribe additional services: nutrition coaching, personal training, or specialty programs.",
        ],
      },
      {
        title: "Phase 3 — Retention Through Progress",
        summary: "Use goal reviews as a retention tool — members who see progress stay.",
        details: [
          "Track which members have had a goal review in the last 90 days. Flag those who haven't for outreach.",
          "Members who complete goal reviews have 40-60% higher retention rates. This is your most powerful retention tool.",
          "Use goal review data to identify at-risk members: if they're not making progress, something needs to change.",
          "Ask for referrals during goal reviews — members who just saw their progress are in the best mindset to refer friends.",
        ],
      },
    ],
  },
  {
    id: "social-proof",
    title: "Social Proof & Content Engine",
    subtitle: "A systematic approach to collecting and sharing member stories, testimonials, and results that attract new leads.",
    icon: Heart,
    category: "Acquisition",
    phases: [
      {
        title: "Phase 1 — Collect Stories",
        summary: "Build a pipeline of member success stories and testimonials.",
        details: [
          "After every goal review, ask: 'Would you be willing to share your experience? It could inspire someone who's on the fence.'",
          "Create a simple template: before photo, after photo, 3-4 sentences about their journey, and a quote.",
          "Film short video testimonials (30-60 seconds). Ask three questions: 'What were you doing before? What's changed? What would you tell someone thinking about joining?'",
          "Keep a running list of potential stories. Not everyone will say yes right away — follow up quarterly.",
        ],
      },
      {
        title: "Phase 2 — Share Strategically",
        summary: "Distribute content across channels with intention, not randomness.",
        details: [
          "Post 2-3 member stories per week on social media. Alternate between transformations, milestones, and community moments.",
          "Feature a 'Member of the Month' on your website and in-gym display.",
          "Use testimonials in your sales process: during No Sweat Intros, show prospects stories of members who started just like them.",
          "Create a testimonial wall in your gym — physical or digital. New members see it every day.",
        ],
      },
      {
        title: "Phase 3 — Amplify & Repurpose",
        summary: "Turn one piece of content into many, and measure what resonates.",
        details: [
          "Turn video testimonials into written posts, quote graphics, and email content. One interview = 5-10 pieces of content.",
          "Track engagement: which stories get the most likes, shares, and comments? Double down on those themes.",
          "Ask members to share their own posts and tag the gym. User-generated content is the most trusted form of marketing.",
          "Review content performance monthly: which channels drive the most leads? Focus your energy there.",
        ],
      },
    ],
  },
  {
    id: "local-partnerships",
    title: "Local Partnership Activation",
    subtitle: "How to build strategic partnerships with local businesses that drive qualified leads and deepen community roots.",
    icon: Handshake,
    category: "Acquisition",
    phases: [
      {
        title: "Phase 1 — Identify Partners",
        summary: "Find local businesses whose customers overlap with your ideal member profile.",
        details: [
          "Target businesses within a 5-mile radius: chiropractors, physical therapists, massage therapists, healthy restaurants, juice bars, and corporate offices.",
          "Look for businesses that share your values: health, wellness, community, and personal development.",
          "Start with businesses your members already patronize — warm introductions are more effective than cold outreach.",
          "Create a partnership one-pager: what you offer, what you're looking for, and how it benefits both parties.",
        ],
      },
      {
        title: "Phase 2 — Structure the Partnership",
        summary: "Design partnerships that create mutual value without overcomplicating things.",
        details: [
          "Simple structures work best: cross-promotional flyers, shared social media posts, or co-hosted events.",
          "Offer a 'corporate rate' or 'partner discount' — 10-15% off membership for employees of partner businesses.",
          "Host a free workout for partner business employees. This is the highest-converting partnership activity.",
          "Create a co-branded piece of content: a blog post, a video, or a social media collaboration.",
        ],
      },
      {
        title: "Phase 3 — Nurture & Grow",
        summary: "Keep partnerships active with regular touchpoints and results tracking.",
        details: [
          "Check in with partners quarterly. Share results: 'We've had 5 members join from your referrals — here's the impact.'",
          "Invite partners to gym events. They become advocates when they experience your community firsthand.",
          "Rotate partner spotlights on your social media and in-gym displays.",
          "Track ROI: how many leads and members came from each partnership? Double down on what works.",
        ],
      },
    ],
  },
];

function ResourceCard({ resource }: { resource: Resource }) {
  const [isOpen, setIsOpen] = useState(false);
  const [openPhases, setOpenPhases] = useState<Set<number>>(new Set());

  const togglePhase = (index: number) => {
    setOpenPhases((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const Icon = resource.icon;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden transition-colors hover:border-primary/30">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-5 flex items-start gap-4 text-left"
      >
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-foreground">{resource.title}</h3>
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
              {resource.category}
            </span>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">{resource.subtitle}</p>
        </div>
        <div className="shrink-0 mt-1">
          {isOpen ? (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 space-y-3">
              {resource.phases.map((phase, index) => (
                <div key={index} className="border border-border/50 rounded-xl overflow-hidden bg-background/50">
                  <button
                    onClick={() => togglePhase(index)}
                    className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-white/5 transition-colors"
                  >
                    <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary">{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-foreground">{phase.title}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{phase.summary}</p>
                    </div>
                    {openPhases.has(index) ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                  </button>

                  <AnimatePresence>
                    {openPhases.has(index) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 space-y-2">
                          {phase.details.map((detail, di) => (
                            <div key={di} className="flex items-start gap-2.5 text-sm text-foreground/80">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary/50 shrink-0 mt-2" />
                              <span>{detail}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Resources() {
  const [filter, setFilter] = useState<string | null>(null);

  const categories = Array.from(new Set(RESOURCES.map((r) => r.category)));
  const filtered = filter ? RESOURCES.filter((r) => r.category === filter) : RESOURCES;

  return (
    <div className="space-y-8 pb-10">
      <header>
        <div className="flex items-center gap-3 mb-1">
          <div className="h-8 w-8 bg-primary/20 rounded-lg flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground">Resources</h1>
        </div>
        <p className="text-muted-foreground mt-1">
          Playbooks and guides for running a stronger gym — from onboarding to coaching development. Reference these anytime to build or refine your systems.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter(null)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filter === null
              ? "bg-primary text-primary-foreground"
              : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground border border-border"
          }`}
        >
          All ({RESOURCES.length})
        </button>
        {categories.map((cat) => {
          const count = RESOURCES.filter((r) => r.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setFilter(filter === cat ? null : cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground border border-border"
              }`}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        {filtered.map((resource) => (
          <ResourceCard key={resource.id} resource={resource} />
        ))}
      </div>
    </div>
  );
}
