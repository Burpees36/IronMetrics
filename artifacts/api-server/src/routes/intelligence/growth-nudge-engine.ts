import { eq, and, gte, desc } from "drizzle-orm";
import { db, nudgeHistoryTable } from "@workspace/db";
import { assertVoiceCompliance, fmtDollars, fmtPercent } from "../../services/iron-metrics-voice";
import { searchKnowledge } from "../../services/knowledge-retrieval";

export interface GrowthNudge {
  id: string;
  icon: string;
  title: string;
  message: string;
  actionLabel: string;
  actionLink: string;
  source?: string;
}

interface NudgeMetrics {
  activeMembers: number;
  mrr: number;
  engagementRate: number;
  classFillRate: number;
  retentionRate?: number;
  atRiskCount: number;
  activeLeads: number;
  staleLeads: number;
  arm: number;
  rsiScore: number | null;
  rsiBand: string;
  churnRate?: number;
}

interface NudgeCandidate {
  id: string;
  icon: string;
  title: string;
  message: string;
  actionLabel: string;
  actionLink: string;
  relevanceScore: number;
  knowledgeQuery: string;
  knowledgeTags: string[];
}

const HISTORY_WINDOW_DAYS = 7;

async function getRecentNudgeIds(gymId: number): Promise<Set<string>> {
  const cutoff = new Date(Date.now() - HISTORY_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ nudgeId: nudgeHistoryTable.nudgeId })
    .from(nudgeHistoryTable)
    .where(and(eq(nudgeHistoryTable.gymId, gymId), gte(nudgeHistoryTable.shownAt, cutoff)));
  return new Set(rows.map(r => r.nudgeId));
}

async function recordShownNudges(gymId: number, nudgeIds: string[]): Promise<void> {
  if (nudgeIds.length === 0) return;
  await db.insert(nudgeHistoryTable).values(
    nudgeIds.map(nudgeId => ({ gymId, nudgeId }))
  );
}

function buildCandidates(metrics: NudgeMetrics): NudgeCandidate[] {
  const candidates: NudgeCandidate[] = [];

  if (metrics.classFillRate < 70) {
    candidates.push({
      id: "bring_a_friend",
      icon: "community",
      title: "Run a Bring-a-Friend day",
      message: `Classes are at ${metrics.classFillRate}% capacity. Empty spots are wasted overhead. Pick your lowest-attended class this week and make it a free "bring a friend" session. One guest per member. It fills your floor and seeds your pipeline.`,
      actionLabel: "View schedule",
      actionLink: "/schedule",
      relevanceScore: 80 - metrics.classFillRate,
      knowledgeQuery: "bring a friend day guest conversion community workout",
      knowledgeTags: ["community", "marketing", "sales"],
    });
  }

  if (metrics.classFillRate < 60) {
    candidates.push({
      id: "fill_rate_social",
      icon: "marketing",
      title: "Post open spots on social",
      message: `${metrics.classFillRate}% fill rate means empty spots every day. Post "3 spots open in today's 5:30 PM" on your story right now. Members share it, friends sign up. Free marketing that takes 30 seconds.`,
      actionLabel: "View schedule",
      actionLink: "/schedule",
      relevanceScore: 70 - metrics.classFillRate,
      knowledgeQuery: "social proof testimonials member stories content marketing",
      knowledgeTags: ["marketing"],
    });
  }

  if (metrics.engagementRate > 60 && metrics.activeLeads < 3) {
    candidates.push({
      id: "referral_sprint",
      icon: "growth",
      title: "Launch a referral sprint",
      message: `${fmtPercent(metrics.engagementRate)} engagement but only ${metrics.activeLeads} leads in the pipeline. Your members are showing up — now ask them to bring people. Run a 2-week referral sprint: every member who brings a guest gets entered in a draw. Costs you nothing.`,
      actionLabel: "View leads",
      actionLink: "/leads",
      relevanceScore: 65,
      knowledgeQuery: "member referral program sprint incentives word of mouth growth",
      knowledgeTags: ["marketing", "community", "sales"],
    });
  }

  if (metrics.arm > 0 && metrics.arm < 175) {
    candidates.push({
      id: "nutrition_challenge",
      icon: "revenue",
      title: "Run a nutrition challenge",
      message: `ARM is ${fmtDollars(metrics.arm)}. A 6-week nutrition challenge at $99-149/head lifts that number and deepens member investment. Members who do nutrition coaching stay 40% longer. It's retention disguised as revenue.`,
      actionLabel: "View resources",
      actionLink: "/resources",
      relevanceScore: 60,
      knowledgeQuery: "nutrition challenge coaching revenue expansion ARM upsell accountability",
      knowledgeTags: ["pricing", "coaching", "retention"],
    });
  }

  if (metrics.engagementRate < 50 && metrics.activeMembers > 10) {
    candidates.push({
      id: "community_event",
      icon: "community",
      title: "Schedule a community event",
      message: `${fmtPercent(metrics.engagementRate)} engagement means too many members are drifting. Plan a Friday Night Lights, potluck, or partner workout this month. Community events pull people back in — belonging beats programming every time.`,
      actionLabel: "View resources",
      actionLink: "/resources",
      relevanceScore: 55 - (metrics.engagementRate * 0.5),
      knowledgeQuery: "community events social belonging potluck partner workout retention",
      knowledgeTags: ["community", "retention"],
    });
  }

  if (metrics.activeMembers > 20) {
    candidates.push({
      id: "social_proof",
      icon: "marketing",
      title: "Collect a member story this week",
      message: `You have ${metrics.activeMembers} members. At least one has a story worth sharing — a first pull-up, a PR, showing up after a hard week. Ask them. Film 60 seconds on your phone. Post it. Social proof converts better than any ad you'll ever run.`,
      actionLabel: "View members",
      actionLink: "/members",
      relevanceScore: 40,
      knowledgeQuery: "social proof testimonials member stories transformation content marketing",
      knowledgeTags: ["marketing", "community"],
    });
  }

  if (metrics.activeMembers >= 30) {
    candidates.push({
      id: "coaching_audit",
      icon: "coaching",
      title: "Shadow a class this week",
      message: `With ${metrics.activeMembers} members, coaching quality is your moat. Sit in on a class you don't normally attend. Watch the warmup, the scaling, the cooldown. Are coaches greeting everyone by name? Small fixes here compound into retention.`,
      actionLabel: "View schedule",
      actionLink: "/schedule",
      relevanceScore: 35,
      knowledgeQuery: "coaching quality consistency class experience shadow audit trust",
      knowledgeTags: ["coaching", "leadership"],
    });
  }

  if (metrics.activeLeads > 5 && metrics.staleLeads === 0) {
    candidates.push({
      id: "lead_speed",
      icon: "leads",
      title: "Audit your lead response time",
      message: `${metrics.activeLeads} active leads, none stale — good discipline. Now check speed. Leads contacted within 5 minutes close 21x more often. Set a phone alarm for new lead notifications. First response wins.`,
      actionLabel: "Open pipeline",
      actionLink: "/leads",
      relevanceScore: 30,
      knowledgeQuery: "lead follow up speed response time close rate sales",
      knowledgeTags: ["sales"],
    });
  }

  if (metrics.mrr > 5000) {
    candidates.push({
      id: "local_partnership",
      icon: "growth",
      title: "Reach out to a local business",
      message: `At ${fmtDollars(metrics.mrr)} MRR, you have proof your product works. Pick one local business this week — a physio clinic, a coffee shop, a chiropractor — and propose a cross-referral. You send them clients, they send you members. Zero ad spend.`,
      actionLabel: "View resources",
      actionLink: "/resources",
      relevanceScore: 25,
      knowledgeQuery: "local business partnerships community outreach corporate rate",
      knowledgeTags: ["marketing", "community", "sales"],
    });
  }

  if (metrics.rsiScore !== null && metrics.rsiScore >= 70) {
    candidates.push({
      id: "growth_mode",
      icon: "positive",
      title: "You're stable — time to grow",
      message: `RSI ${metrics.rsiScore.toFixed(1)} (${metrics.rsiBand}). Your retention engine is solid. This is when most owners coast — don't. Stable gyms that invest in growth during strong months compound. Pick one growth lever this week and push it.`,
      actionLabel: "View intelligence",
      actionLink: "/intelligence",
      relevanceScore: 20,
      knowledgeQuery: "growth strategy stable gym expansion new members",
      knowledgeTags: ["marketing", "sales"],
    });
  }

  if (candidates.length === 0) {
    candidates.push(
      {
        id: "fallback_member_check",
        icon: "community",
        title: "Check in with 3 members today",
        message: `Everything looks clean. Use this window to strengthen relationships. Pick 3 members you haven't talked to in a while. A quick "how's it going?" text builds loyalty that no program can replace. Retention is built in conversations, not spreadsheets.`,
        actionLabel: "View members",
        actionLink: "/members",
        relevanceScore: 15,
        knowledgeQuery: "member retention personal outreach check-in relationship building",
        knowledgeTags: ["retention", "community"],
      },
      {
        id: "fallback_content",
        icon: "marketing",
        title: "Create one piece of content today",
        message: `No fires to fight. Perfect day to build your brand. Take a photo of the gym, a quick video of a class, or write a post about why you do this. Consistency compounds — gyms that post 3x/week get 2x the inbound leads.`,
        actionLabel: "View resources",
        actionLink: "/resources",
        relevanceScore: 12,
        knowledgeQuery: "content marketing social media gym branding consistency",
        knowledgeTags: ["marketing"],
      },
      {
        id: "fallback_systems",
        icon: "coaching",
        title: "Review one system this week",
        message: `Quiet days are for systems. Pick one thing — your intake process, your billing flow, your class schedule — and ask: "Is this the best it can be?" One small improvement per week adds up to a completely different gym in 6 months.`,
        actionLabel: "View intelligence",
        actionLink: "/intelligence",
        relevanceScore: 10,
        knowledgeQuery: "gym operations systems process improvement audit",
        knowledgeTags: ["operations", "leadership"],
      },
    );
  }

  return candidates;
}

function selectAndRotate(
  candidates: NudgeCandidate[],
  recentIds: Set<string>,
  maxNudges: number = 3,
): NudgeCandidate[] {
  if (candidates.length === 0) return [];

  const fresh = candidates.filter(c => !recentIds.has(c.id));
  const pool = fresh.length > 0 ? fresh : candidates;

  pool.sort((a, b) => b.relevanceScore - a.relevanceScore);

  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  );
  const topCount = Math.min(pool.length, maxNudges + 2);
  const topCandidates = pool.slice(0, topCount);

  const rotationSeed = dayOfYear % topCount;
  const selected: NudgeCandidate[] = [];
  const usedIds = new Set<string>();

  for (let i = 0; i < Math.min(maxNudges, topCandidates.length); i++) {
    const idx = (rotationSeed + i) % topCandidates.length;
    const candidate = topCandidates[idx];
    if (!usedIds.has(candidate.id)) {
      selected.push(candidate);
      usedIds.add(candidate.id);
    }
  }

  if (selected.length < maxNudges) {
    for (const c of topCandidates) {
      if (!usedIds.has(c.id)) {
        selected.push(c);
        usedIds.add(c.id);
        if (selected.length >= maxNudges) break;
      }
    }
  }

  return selected;
}

async function groundWithKnowledge(
  candidate: NudgeCandidate,
): Promise<{ message: string; source?: string }> {
  const kbResults = await searchKnowledge(candidate.knowledgeQuery, candidate.knowledgeTags, 3);

  if (kbResults.length === 0) {
    return { message: candidate.message };
  }

  const source = kbResults[0].docTitle;

  const actionableSentences = kbResults
    .flatMap(r => {
      const sentences = r.content.match(/[^.!?]+[.!?]+/g) || [];
      return sentences.filter(s => {
        const lower = s.toLowerCase().trim();
        return (
          lower.length > 20 &&
          lower.length < 200 &&
          (lower.includes("member") || lower.includes("coach") || lower.includes("owner") ||
           lower.includes("should") || lower.includes("must") || lower.includes("start"))
        );
      });
    })
    .slice(0, 1);

  if (actionableSentences.length > 0) {
    const kbInsight = actionableSentences[0].trim();
    const enrichedMessage = `${candidate.message} From the playbook: "${kbInsight}"`;
    return { message: enrichedMessage, source };
  }

  return { message: candidate.message, source };
}

export async function generateGrowthNudges(
  metrics: NudgeMetrics,
  gymId?: number,
): Promise<GrowthNudge[]> {
  const candidates = buildCandidates(metrics);
  if (candidates.length === 0) return [];

  let recentIds = new Set<string>();
  if (gymId) {
    try {
      recentIds = await getRecentNudgeIds(gymId);
    } catch (err: any) {
      console.error("[growth-nudges] Failed to fetch nudge history:", err.message);
    }
  }

  const selected = selectAndRotate(candidates, recentIds, 3);
  const nudges: GrowthNudge[] = [];

  for (const candidate of selected) {
    let message = candidate.message;
    let source: string | undefined;

    try {
      const grounded = await groundWithKnowledge(candidate);
      message = grounded.message;
      source = grounded.source;
    } catch (err: any) {
      console.error("[growth-nudges] Knowledge grounding failed for", candidate.id, ":", err.message);
    }

    try {
      assertVoiceCompliance(message);
    } catch {
    }

    nudges.push({
      id: candidate.id,
      icon: candidate.icon,
      title: candidate.title,
      message,
      actionLabel: candidate.actionLabel,
      actionLink: candidate.actionLink,
      source,
    });
  }

  if (gymId && nudges.length > 0) {
    try {
      await recordShownNudges(gymId, nudges.map(n => n.id));
    } catch (err: any) {
      console.error("[growth-nudges] Failed to record nudge history:", err.message);
    }
  }

  return nudges;
}

export { buildCandidates, selectAndRotate, getRecentNudgeIds, recordShownNudges, groundWithKnowledge };
