import { eq, and, sql } from "drizzle-orm";
import { db, aiTasksTable, membersTable, leadsTable, subscriptionsTable, gymsTable } from "@workspace/db";
import { calculateRiskScore, getRiskTier } from "../routes/intelligence/computations";
import {
  assembleMemberContext,
  assembleLeadContext,
  buildMemberPersonalizationMeta,
  buildLeadPersonalizationMeta,
  type MemberContext,
  type LeadContext,
} from "./personalization-context";
import { processAutopilotTasks } from "./autopilot-sender";
import { assertVoiceCompliance } from "./iron-metrics-voice";

export interface CommunicationStyle {
  tone: string;
  rules: string[];
  samples: string[];
}

const TONE_SIGN_OFFS: Record<string, string[]> = {
  casual_friendly: [
    "See you in the gym!",
    "Looking forward to hearing from you!",
    "Hope to see you soon!",
    "Talk soon!",
  ],
  professional: [
    "Best regards,",
    "Looking forward to connecting,",
    "Thank you for your time,",
    "Sincerely,",
  ],
  motivational_coach: [
    "Let's crush it!",
    "Your best is yet to come!",
    "Let's get after it!",
    "Stay strong!",
  ],
};

const TONE_GREETINGS: Record<string, string[]> = {
  casual_friendly: ["Hi", "Hey", "Hi there"],
  professional: ["Dear", "Hello", "Good day"],
  motivational_coach: ["Hey", "What's up", "Hey there"],
};

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function extractStylePatterns(samples: string[]): { avgSentenceLength: "short" | "medium" | "long"; usesExclamation: boolean; usesEmoji: boolean; commonClosing: string | null } {
  if (samples.length === 0) {
    return { avgSentenceLength: "medium", usesExclamation: false, usesEmoji: false, commonClosing: null };
  }

  let totalSentences = 0;
  let totalWords = 0;
  let exclamationCount = 0;
  let emojiCount = 0;
  const closings: string[] = [];

  for (const sample of samples) {
    const sentences = sample.split(/[.!?]+/).filter(s => s.trim().length > 0);
    totalSentences += sentences.length;
    totalWords += sample.split(/\s+/).length;
    if (sample.includes("!")) exclamationCount++;
    if (/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}]/u.test(sample)) emojiCount++;

    const lines = sample.trim().split("\n").filter(l => l.trim().length > 0);
    if (lines.length > 0) {
      closings.push(lines[lines.length - 1].trim());
    }
  }

  const avgWords = totalSentences > 0 ? totalWords / totalSentences : 10;
  const avgSentenceLength = avgWords < 8 ? "short" : avgWords > 15 ? "long" : "medium";
  const usesExclamation = exclamationCount >= samples.length / 2;
  const usesEmoji = emojiCount >= samples.length / 2;

  const closingCounts: Record<string, number> = {};
  for (const c of closings) {
    closingCounts[c] = (closingCounts[c] || 0) + 1;
  }
  const mostCommonClosing = Object.entries(closingCounts).sort((a, b) => b[1] - a[1])[0];
  const commonClosing = mostCommonClosing && mostCommonClosing[1] >= 2 ? mostCommonClosing[0] : null;

  return { avgSentenceLength, usesExclamation, usesEmoji, commonClosing };
}

export interface VoiceValidationResult {
  bannedPhrasesFound: string[];
  signOffPresent: boolean;
  sampleLeakageDetected: string[];
  isValid: boolean;
}

function detectContradictoryRules(rules: string[]): Array<{ ruleA: string; ruleB: string }> {
  const contradictions: Array<{ ruleA: string; ruleB: string }> = [];
  const parsed: Array<{ find: string; replacement: string; original: string }> = [];

  for (const rule of rules) {
    const match = rule.match(/^(?:never\s+say|replace)\s+['"](.+?)['"]\s*(?:,?\s*(?:say|with)\s+['"](.+?)['"])?$/i);
    if (match) {
      parsed.push({ find: match[1].toLowerCase(), replacement: (match[2] || "").toLowerCase(), original: rule });
    }
  }

  for (let i = 0; i < parsed.length; i++) {
    for (let j = i + 1; j < parsed.length; j++) {
      if (parsed[i].find === parsed[j].replacement && parsed[j].find === parsed[i].replacement) {
        contradictions.push({ ruleA: parsed[i].original, ruleB: parsed[j].original });
      }
    }
  }

  return contradictions;
}

function extractSamplePrivateContent(samples: string[]): string[] {
  const privatePatterns: string[] = [];
  for (const sample of samples) {
    const nameMatches = sample.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g);
    if (nameMatches) {
      for (const name of nameMatches) {
        if (!["Looking forward", "Best regards", "Dear Sir", "Dear Madam", "Good day", "Hi there", "Hey there"].some(common => name === common)) {
          privatePatterns.push(name);
        }
      }
    }
    const phoneMatches = sample.match(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g);
    if (phoneMatches) privatePatterns.push(...phoneMatches);
    const emailMatches = sample.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g);
    if (emailMatches) privatePatterns.push(...emailMatches);
  }
  return [...new Set(privatePatterns)];
}

function applyWordBoundaryReplacement(text: string, find: string, replacement: string): string {
  const escaped = find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`\\b${escaped}\\b`, "gi");
  return text.replace(regex, replacement);
}

function detectSignOffBlock(text: string): { beforeSignOff: string; signOffLine: string } | null {
  const lines = text.trimEnd().split("\n");

  let lastNonEmptyIdx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trim() !== "") {
      lastNonEmptyIdx = i;
      break;
    }
  }
  if (lastNonEmptyIdx < 1) return null;

  let signOffStartIdx = lastNonEmptyIdx;

  for (let i = lastNonEmptyIdx; i >= 0; i--) {
    const line = lines[i].trim();
    if (line === "") {
      signOffStartIdx = i + 1;
      break;
    }
    if (i === 0) {
      return null;
    }
  }

  const signOffLines = lines.slice(signOffStartIdx, lastNonEmptyIdx + 1).map(l => l.trim());
  const signOffText = signOffLines.join("\n");

  if (signOffLines.length > 3) return null;

  const firstSignOffLine = signOffLines[0];
  const isKnownSignOff = Object.values(TONE_SIGN_OFFS).flat().some(s => firstSignOffLine === s) ||
    /^(?:best|regards|sincerely|cheers|thanks|thank you|warm|warmly|kind regards|take care|yours|cordially|respectfully|looking forward|hope to|see you|talk soon|let's|stay|your best|wishing)/i.test(firstSignOffLine);

  const isStructuralSignOff =
    signOffLines.length <= 3 &&
    signOffLines.every(l => l.split(/\s+/).length <= 8) &&
    signOffStartIdx > 0 &&
    lines.slice(0, signOffStartIdx).some(l => l.trim() !== "");

  if (isKnownSignOff || isStructuralSignOff) {
    const beforeLines = lines.slice(0, signOffStartIdx);
    while (beforeLines.length > 0 && beforeLines[beforeLines.length - 1].trim() === "") {
      beforeLines.pop();
    }
    return { beforeSignOff: beforeLines.join("\n"), signOffLine: signOffText };
  }

  return null;
}

export function validateVoiceOutput(
  output: string,
  style: CommunicationStyle,
  bannedPhrases: string[]
): VoiceValidationResult {
  const result: VoiceValidationResult = {
    bannedPhrasesFound: [],
    signOffPresent: false,
    sampleLeakageDetected: [],
    isValid: true,
  };

  for (const phrase of bannedPhrases) {
    const regex = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    if (regex.test(output)) {
      result.bannedPhrasesFound.push(phrase);
    }
  }

  let expectedSignOff: string | null = null;
  for (const rule of style.rules) {
    const signOffMatch = rule.match(/^(?:always\s+)?sign\s+off\s+with\s+['"](.+?)['"]$/i);
    if (signOffMatch) expectedSignOff = signOffMatch[1];
  }
  if (expectedSignOff) {
    result.signOffPresent = output.includes(expectedSignOff);
  } else {
    const allSignOffs = Object.values(TONE_SIGN_OFFS).flat();
    result.signOffPresent = allSignOffs.some(s => output.includes(s));
  }

  const privateContent = extractSamplePrivateContent(style.samples);
  for (const pc of privateContent) {
    if (output.includes(pc)) {
      result.sampleLeakageDetected.push(pc);
    }
  }

  result.isValid = result.bannedPhrasesFound.length === 0 &&
    result.signOffPresent &&
    result.sampleLeakageDetected.length === 0;

  return result;
}

export function applyOwnerVoice(content: string, subject: string, style: CommunicationStyle): { content: string; subject: string; warnings?: string[] } {
  let processed = content;
  let processedSubject = subject;
  const warnings: string[] = [];

  const greetings = TONE_GREETINGS[style.tone] || TONE_GREETINGS.casual_friendly;
  processed = processed.replace(/^Hi /, `${getRandomElement(greetings)} `);

  let customSignOff: string | null = null;
  const bannedPhrases: string[] = [];

  const contradictions = detectContradictoryRules(style.rules);
  for (const c of contradictions) {
    warnings.push(`Contradictory rules detected: "${c.ruleA}" conflicts with "${c.ruleB}"`);
  }

  const contradictoryFinds = new Set(
    contradictions.flatMap(c => {
      const matchA = c.ruleA.match(/^(?:never\s+say|replace)\s+['"](.+?)['"]/i);
      const matchB = c.ruleB.match(/^(?:never\s+say|replace)\s+['"](.+?)['"]/i);
      return [matchA?.[1]?.toLowerCase(), matchB?.[1]?.toLowerCase()].filter(Boolean) as string[];
    })
  );

  for (const rule of style.rules) {
    const match = rule.match(/^(?:never\s+say|replace)\s+['"](.+?)['"]\s*(?:,?\s*(?:say|with)\s+['"](.+?)['"])?$/i);
    if (match) {
      const find = match[1];
      const replacement = match[2] || "";

      if (contradictoryFinds.has(find.toLowerCase())) {
        continue;
      }

      bannedPhrases.push(find);
      processed = applyWordBoundaryReplacement(processed, find, replacement);
      processedSubject = applyWordBoundaryReplacement(processedSubject, find, replacement);
    }

    const signOffMatch = rule.match(/^(?:always\s+)?sign\s+off\s+with\s+['"](.+?)['"]$/i);
    if (signOffMatch) {
      customSignOff = signOffMatch[1];
    }
  }

  const signOff = customSignOff || getRandomElement(TONE_SIGN_OFFS[style.tone] || TONE_SIGN_OFFS.casual_friendly);

  const signOffBlock = detectSignOffBlock(processed);
  if (signOffBlock) {
    processed = signOffBlock.beforeSignOff + "\n\n" + signOff;
  } else {
    const knownSignOffRegex = /\n\n(?:Looking forward to hearing from you!|Hope to see you soon!|Talk soon!|Best regards,|Sincerely,|See you in the gym!|Let me know what works for you!|Let me know what day works best!)$/;
    if (knownSignOffRegex.test(processed)) {
      processed = processed.replace(knownSignOffRegex, `\n\n${signOff}`);
    } else {
      processed = processed.trimEnd() + "\n\n" + signOff;
    }
  }

  const samplePatterns = extractStylePatterns(style.samples);

  if (samplePatterns.commonClosing && !customSignOff) {
    const finalSignOffBlock = detectSignOffBlock(processed);
    if (finalSignOffBlock) {
      processed = finalSignOffBlock.beforeSignOff + "\n\n" + samplePatterns.commonClosing;
    }
  }

  if (samplePatterns.usesExclamation && style.tone === "motivational_coach") {
    processed = processed.replace(/\.\n/g, "!\n");
  }

  const validation = validateVoiceOutput(processed, style, bannedPhrases);
  if (validation.bannedPhrasesFound.length > 0) {
    for (const phrase of validation.bannedPhrasesFound) {
      processed = applyWordBoundaryReplacement(processed, phrase, "");
      processedSubject = applyWordBoundaryReplacement(processedSubject, phrase, "");
    }
    warnings.push(`Post-validation caught banned phrases: ${validation.bannedPhrasesFound.join(", ")}`);
  }
  const sampleClosingUsed = samplePatterns.commonClosing && !customSignOff && processed.includes(samplePatterns.commonClosing);
  if (!validation.signOffPresent && !sampleClosingUsed) {
    const expectedSignOff = customSignOff || signOff;
    if (!processed.trimEnd().endsWith(expectedSignOff)) {
      processed = processed.trimEnd() + "\n\n" + expectedSignOff;
      warnings.push(`Post-validation re-applied missing sign-off: "${expectedSignOff}"`);
    }
  }
  if (validation.sampleLeakageDetected.length > 0) {
    warnings.push(`Sample content leakage detected: ${validation.sampleLeakageDetected.join(", ")}`);
  }

  return { content: processed, subject: processedSubject, ...(warnings.length > 0 ? { warnings } : {}) };
}

async function fetchCommunicationStyle(gymId: number): Promise<CommunicationStyle> {
  const [gym] = await db.select({
    tone: gymsTable.communicationStyleTone,
    rules: gymsTable.communicationStyleRules,
    samples: gymsTable.communicationStyleSamples,
  }).from(gymsTable).where(eq(gymsTable.id, gymId));

  if (!gym) {
    return { tone: "casual_friendly", rules: [], samples: [] };
  }

  return {
    tone: gym.tone || "casual_friendly",
    rules: gym.rules || [],
    samples: gym.samples || [],
  };
}

const MAX_PENDING_TASKS = 5;

const PRIORITY_ORDER: Record<string, number> = {
  critical_outreach: 0,
  high_outreach: 1,
  billing: 2,
  leads: 3,
};

interface GeneratedTask {
  gymId: number;
  type: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  targetId?: number;
  targetType?: string;
  aiContent?: string;
  subject?: string;
  personalizationMeta?: string;
  _sortKey?: number;
}

async function refreshRiskScores(gymId: number): Promise<void> {
  const members = await db.select().from(membersTable).where(
    and(eq(membersTable.gymId, gymId), eq(membersTable.status, "active"))
  );

  for (const m of members) {
    const now = new Date();
    const daysSinceLastVisit = m.lastVisitDate
      ? Math.floor((now.getTime() - new Date(m.lastVisitDate).getTime()) / (1000 * 60 * 60 * 24))
      : (m.daysSinceLastAttendance ?? 999);
    const freshScore = calculateRiskScore(daysSinceLastVisit, m.attendanceCount30d);
    const freshTier = getRiskTier(freshScore);

    const storedScore = m.riskScore ? parseFloat(m.riskScore) : null;
    if (storedScore === null || Math.abs(storedScore - freshScore) >= 1 || m.riskTier !== freshTier) {
      await db.update(membersTable)
        .set({ riskScore: String(Math.round(freshScore)), riskTier: freshTier })
        .where(eq(membersTable.id, m.id));
    }
  }
}

function buildCriticalOutreachContent(ctx: MemberContext): { content: string; subject: string } {
  const variants: ((c: MemberContext) => { content: string; subject: string })[] = [];

  if (ctx.favoriteClassName) {
    variants.push((c) => ({
      subject: `${c.favoriteClassName} isn't the same without you, ${c.firstName}`,
      content: `Hi ${c.firstName},\n\nStraight up — the ${c.favoriteClassName}${c.favoriteTimeSlot ? ` ${c.favoriteTimeSlot}` : ""} crew noticed you've been gone.${c.lastCoachName ? ` Coach ${c.lastCoachName} brought it up.` : ""}\n\nYou've been here ${c.tenureMonths} month${c.tenureMonths !== 1 ? "s" : ""}. That's not nothing. Whatever pulled you away, let's figure it out.\n\n15 minutes. Coffee on me. This week. What day works?`,
    }));
  }

  if (ctx.lastCoachName) {
    variants.push((c) => ({
      subject: `Coach ${c.lastCoachName} asked about you, ${c.firstName}`,
      content: `Hi ${c.firstName},\n\nCoach ${c.lastCoachName} was asking about you. That says something.\n\nYou've been with us ${c.tenureMonths} month${c.tenureMonths !== 1 ? "s" : ""}${c.favoriteClassName ? ` and ${c.favoriteClassName} is still going strong` : ""}. I don't want you to drift away without us at least having a conversation.\n\n15-minute check-in. No pitch, no pressure. Just want to see where you're at and if there's anything we can do differently.\n\nWhat day this week works for you?`,
    }));
  }

  if (ctx.recentPRs.length > 0) {
    variants.push((c) => ({
      subject: `You were making real progress, ${c.firstName}`,
      content: `Hi ${c.firstName},\n\nI pulled up your numbers — ${c.recentPRs.length} PR${c.recentPRs.length !== 1 ? "s" : ""} in the last few months${c.recentPRs[0] ? ` (${c.recentPRs[0].workoutTitle} included)` : ""}. That's real work.\n\nDon't let that momentum die.${c.favoriteClassName ? ` ${c.favoriteClassName} is still running` : ""}${c.lastCoachName ? ` and Coach ${c.lastCoachName} wants to help you build on it.` : "."}\n\n15 minutes this week. We map out your next targets.\n\nWhat day works?`,
    }));
  }

  variants.push((c) => ({
    subject: `Checking in, ${c.firstName}`,
    content: `Hi ${c.firstName},\n\nReaching out.${c.tenureMonths > 0 ? ` You've been here ${c.tenureMonths} month${c.tenureMonths !== 1 ? "s" : ""} — that's real commitment.` : ""}\n\nNew programming just dropped that fits what you've been doing.${c.favoriteClassName ? ` Especially if you liked ${c.favoriteClassName}.` : ""}\n\n15 minutes. We review your goals and adjust the plan.\n\nWhat day this week?`,
  }));

  const idx = Math.floor(Math.random() * variants.length);
  return variants[idx](ctx);
}

function buildHighRiskOutreachContent(ctx: MemberContext): { content: string; subject: string } {
  const variants: ((c: MemberContext) => { content: string; subject: string })[] = [];

  if (ctx.attendanceTrend === "declining" && ctx.attendancePrior30d > 0) {
    variants.push((c) => ({
      subject: `Everything good, ${c.firstName}?`,
      content: `Hi ${c.firstName},\n\nNoticed your visits dropped from ${c.attendancePrior30d}x to ${c.attendanceLast30d}x this month. No judgment — life happens.${c.favoriteClassName ? ` Your ${c.favoriteClassName} crew is still at it and would be glad to see you back.` : ""}\n\nLet's do a quick 10-minute check-in. See where you're at, adjust the plan if needed. No pitch, just a conversation.\n\nWhat day works this week?`,
    }));
  }

  if (ctx.favoriteTimeSlot) {
    variants.push((c) => ({
      subject: `Haven't seen you, ${c.firstName}`,
      content: `Hi ${c.firstName},\n\nIt's been a while since you've been in${c.favoriteTimeSlot ? ` for the ${c.favoriteTimeSlot} sessions` : ""}.${c.tenureMonths > 0 ? ` You've been here ${c.tenureMonths} month${c.tenureMonths !== 1 ? "s" : ""} — I don't want to see that go to waste.` : ""}\n\n10-minute goal review. Quick check-in on where you're at.${c.lastCoachName ? ` Coach ${c.lastCoachName} can help reset your plan.` : ""}\n\nWhat day this week works?`,
    }));
  }

  if (ctx.recentPRs.length > 0) {
    variants.push((c) => ({
      subject: `Don't lose the momentum, ${c.firstName}`,
      content: `Hi ${c.firstName},\n\nThose recent PRs were legit — ${c.recentPRs[0] ? `${c.recentPRs[0].workoutTitle}` : "that progress"} was real work.\n\nThings have slowed down though. I want to make sure we're still helping you move forward.${c.favoriteClassName ? ` ${c.favoriteClassName} is a good way to get back in rhythm.` : ""}\n\n10 minutes this week. Quick goal review, no pressure. Just want to make sure you have a plan.\n\nWhat day works?`,
    }));
  }

  variants.push((c) => ({
    subject: `Checking in, ${c.firstName}`,
    content: `Hi ${c.firstName},\n\nBeen a while.${c.tenureMonths > 0 ? ` You've been here ${c.tenureMonths} month${c.tenureMonths !== 1 ? "s" : ""} — that's not nothing.` : ""}\n\n10-minute check-in. We look at where things stand, make sure the plan still fits your schedule.\n\nWhat day this week works?`,
  }));

  const idx = Math.floor(Math.random() * variants.length);
  return variants[idx](ctx);
}

async function generateAtRiskMemberTasks(gymId: number): Promise<GeneratedTask[]> {
  const atRiskMembers = await db.select().from(membersTable).where(
    and(
      eq(membersTable.gymId, gymId),
      eq(membersTable.status, "active"),
      sql`(${membersTable.riskTier} = 'critical' OR ${membersTable.riskTier} = 'high')`
    )
  );

  const existingTasks = await db.select().from(aiTasksTable).where(
    and(eq(aiTasksTable.gymId, gymId), eq(aiTasksTable.targetType, "member"), sql`${aiTasksTable.status} IN ('pending', 'approved', 'sent', 'completed')`)
  );
  const existingMemberIds = new Set(existingTasks.map(t => t.targetId));

  const tasks: GeneratedTask[] = [];
  for (const member of atRiskMembers) {
    if (existingMemberIds.has(member.id)) continue;

    const isCritical = member.riskTier === "critical";
    const ctx = await assembleMemberContext(member.id, gymId);

    let content: string;
    let subject: string;
    let personalizationMeta: string | undefined;

    if (ctx) {
      const meta = buildMemberPersonalizationMeta(ctx);
      personalizationMeta = JSON.stringify(meta);

      if (isCritical) {
        const generated = buildCriticalOutreachContent(ctx);
        content = generated.content;
        subject = generated.subject;
      } else {
        const generated = buildHighRiskOutreachContent(ctx);
        content = generated.content;
        subject = generated.subject;
      }
    } else {
      content = isCritical
        ? `Hi ${member.firstName},\n\nNew programming just dropped — it fits what you've been doing.\n\n15 minutes. We review your goals and adjust the plan.\n\nWhat day this week works?`
        : `Hi ${member.firstName},\n\nBeen a while. 10-minute check-in — we look at where things stand, make sure the plan still fits.\n\nWhat day this week works?`;
      subject = isCritical
        ? `Let's get back on track, ${member.firstName}`
        : `Checking in, ${member.firstName}`;
    }

    const descParts: string[] = [];
    descParts.push(`${member.firstName} ${member.lastName} has visited ${member.attendanceCount30d} time(s) in the last 30 days and is flagged as ${member.riskTier} risk.`);
    if (ctx) {
      if (ctx.favoriteClassName) descParts.push(`Favorite class: ${ctx.favoriteClassName}.`);
      if (ctx.lastCoachName) descParts.push(`Last coach: ${ctx.lastCoachName}.`);
      if (ctx.tenureMonths > 0) descParts.push(`Member for ${ctx.tenureMonths} month${ctx.tenureMonths !== 1 ? "s" : ""}.`);
    }
    descParts.push(isCritical ? "Call them. Personal outreach — not a mass message." : "Text or call. Quick check-in before they drift further.");

    tasks.push({
      gymId,
      type: "outreach",
      title: isCritical ? `Win back ${member.firstName} ${member.lastName}` : `Re-engage ${member.firstName} ${member.lastName}`,
      description: descParts.join(" "),
      priority: isCritical ? "high" : "medium",
      status: "pending",
      targetId: member.id,
      targetType: "member",
      aiContent: content,
      subject,
      personalizationMeta,
      _sortKey: isCritical ? PRIORITY_ORDER.critical_outreach : PRIORITY_ORDER.high_outreach,
    });
  }
  return tasks;
}

function buildStaleLeadContent(ctx: LeadContext): { content: string; subject: string } {
  const variants: ((c: LeadContext) => { content: string; subject: string })[] = [];

  if (ctx.source) {
    variants.push((c) => ({
      subject: `Following up, ${c.firstName}`,
      content: `Hi ${c.firstName},\n\nYou reached out through ${c.source} ${c.daysSinceCreated} day${c.daysSinceCreated !== 1 ? "s" : ""} ago.${c.notes ? ` You mentioned ${c.notes} — that's exactly what we do well.` : ""}\n\nNo Sweat Intro — 20 minutes. We learn your goals, show you the gym, you decide if it fits.\n\nPick a time this week:\n- [Morning option]\n- [Afternoon option]\n- [Evening option]\n\nLet me know and I'll lock it in.`,
    }));
  }

  if (ctx.notes) {
    variants.push((c) => ({
      subject: `Quick follow-up, ${c.firstName}`,
      content: `Hi ${c.firstName},\n\nYou mentioned ${c.notes} when you reached out${c.source ? ` via ${c.source}` : ""}. It's been ${c.daysSinceCreated} day${c.daysSinceCreated !== 1 ? "s" : ""} — don't let this slip.\n\nNo Sweat Intro. 20 minutes. We talk goals and show you around.\n\nWhat day this week works?`,
    }));
  }

  variants.push((c) => ({
    subject: `Let's connect, ${c.firstName}`,
    content: `Hi ${c.firstName},\n\n${c.source ? `It's been ${c.daysSinceCreated} day${c.daysSinceCreated !== 1 ? "s" : ""} since you reached out through ${c.source}.` : `It's been ${c.daysSinceCreated} day${c.daysSinceCreated !== 1 ? "s" : ""} since you inquired.`} Let's connect.\n\nNo Sweat Intro — 20 minutes. We learn your goals and you see if it fits.\n\nPick a time this week:\n- [Morning option]\n- [Afternoon option]\n- [Evening option]\n\nLet me know and I'll get you on the calendar.`,
  }));

  const idx = Math.floor(Math.random() * variants.length);
  return variants[idx](ctx);
}

async function generateStaleLeadTasks(gymId: number): Promise<GeneratedTask[]> {
  const staleLeads = await db.select().from(leadsTable).where(
    and(eq(leadsTable.gymId, gymId), eq(leadsTable.isStale, true))
  );

  const existingTasks = await db.select().from(aiTasksTable).where(
    and(eq(aiTasksTable.gymId, gymId), eq(aiTasksTable.type, "leads"), eq(aiTasksTable.targetType, "lead"), sql`${aiTasksTable.status} IN ('pending', 'approved', 'sent', 'completed')`)
  );
  const existingLeadIds = new Set(existingTasks.map(t => t.targetId));

  const tasks: GeneratedTask[] = [];
  for (const lead of staleLeads) {
    if (existingLeadIds.has(lead.id)) continue;

    const ctx = await assembleLeadContext(lead.id, gymId);
    let content: string;
    let subject: string;
    let personalizationMeta: string | undefined;
    let description: string;

    if (ctx) {
      const meta = buildLeadPersonalizationMeta(ctx);
      personalizationMeta = JSON.stringify(meta);
      const generated = buildStaleLeadContent(ctx);
      content = generated.content;
      subject = generated.subject;

      const descParts: string[] = [];
      descParts.push(`${lead.firstName} ${lead.lastName}`);
      if (ctx.source) descParts.push(`reached out via ${ctx.source}`);
      descParts.push(`${ctx.daysSinceCreated} day${ctx.daysSinceCreated !== 1 ? "s" : ""} ago`);
      descParts.push(`but hasn't booked yet (stage: ${ctx.stage}).`);
      if (ctx.notes) descParts.push(`Interest: ${ctx.notes}.`);
      descParts.push("Follow up now — every hour you wait drops the close rate.");
      description = descParts.join(" ");
    } else {
      content = `Hi ${lead.firstName},\n\nFollowing up on your inquiry. No Sweat Intro — 20 minutes. We learn your goals and you see if it fits.\n\nPick a time this week:\n- [Morning option]\n- [Afternoon option]\n- [Evening option]\n\nLet me know and I'll lock it in.`;
      subject = `Let's connect, ${lead.firstName}`;
      description = `${lead.firstName} ${lead.lastName} reached out via ${lead.source} but hasn't booked. Follow up now — every hour you wait drops the close rate.`;
    }

    tasks.push({
      gymId,
      type: "leads",
      title: `Schedule No Sweat Intro: ${lead.firstName} ${lead.lastName}`,
      description,
      priority: "medium",
      status: "pending",
      targetId: lead.id,
      targetType: "lead",
      aiContent: content,
      subject,
      personalizationMeta,
      _sortKey: PRIORITY_ORDER.leads,
    });
  }
  return tasks;
}

function buildBillingContent(ctx: MemberContext, sub: { planName: string; amount: string }): { content: string; subject: string } {
  const variants: ((c: MemberContext) => { content: string; subject: string })[] = [];

  if (ctx.tenureMonths >= 6) {
    variants.push((c) => ({
      subject: `Heads up on your account, ${c.firstName}`,
      content: `Hi ${c.firstName},\n\nYou've been here ${c.tenureMonths} months — I appreciate that. Quick heads up: your payment for ${sub.planName} didn't go through.\n\nUsually an expired card. Takes 2 minutes to fix — update online or call us and we'll handle it together.${c.favoriteClassName ? ` Don't want you missing ${c.favoriteClassName}.` : ""}\n\nThanks for taking care of it.`,
    }));
  }

  variants.push((c) => ({
    subject: `Heads up on your account, ${c.firstName}`,
    content: `Hi ${c.firstName},\n\nQuick heads up — your payment for ${sub.planName} didn't go through. Usually just an expired card.\n\nUpdate your info online or give us a call — takes 2 minutes.${c.tenureMonths > 0 ? ` You've been here ${c.tenureMonths} month${c.tenureMonths !== 1 ? "s" : ""} — let's keep it going.` : ""}\n\nThanks for taking care of it.`,
  }));

  const idx = Math.floor(Math.random() * variants.length);
  return variants[idx](ctx);
}

async function generateFailedPaymentTasks(gymId: number): Promise<GeneratedTask[]> {
  const failedSubs = await db.select().from(subscriptionsTable).where(
    and(eq(subscriptionsTable.gymId, gymId), eq(subscriptionsTable.status, "past_due"))
  );

  const existingTasks = await db.select().from(aiTasksTable).where(
    and(eq(aiTasksTable.gymId, gymId), eq(aiTasksTable.type, "billing"), sql`${aiTasksTable.status} IN ('pending', 'approved', 'sent', 'completed')`)
  );
  const existingMemberIds = new Set(existingTasks.map(t => t.targetId));

  const tasks: GeneratedTask[] = [];
  for (const sub of failedSubs) {
    if (existingMemberIds.has(sub.memberId)) continue;
    const [member] = await db.select().from(membersTable).where(eq(membersTable.id, sub.memberId));
    if (!member) continue;

    const ctx = await assembleMemberContext(member.id, gymId);
    let content: string;
    let subject: string;
    let personalizationMeta: string | undefined;

    if (ctx) {
      const meta = buildMemberPersonalizationMeta(ctx);
      meta.dataPoints.push(`Plan: ${sub.planName}`);
      personalizationMeta = JSON.stringify(meta);
      const generated = buildBillingContent(ctx, { planName: sub.planName, amount: sub.amount });
      content = generated.content;
      subject = generated.subject;
    } else {
      content = `Hi ${member.firstName},\n\nQuick heads up — your payment didn't go through. Usually just an expired card.\n\nUpdate your info online or give us a call — takes 2 minutes. Want to make sure you don't miss any sessions.\n\nThanks for taking care of it.`;
      subject = `Heads up on your account, ${member.firstName}`;
    }

    tasks.push({
      gymId,
      type: "billing",
      title: `Payment issue: ${member.firstName} ${member.lastName}`,
      description: `${member.firstName} ${member.lastName}'s ${sub.planName} payment failed.${ctx && ctx.tenureMonths > 0 ? ` Member for ${ctx.tenureMonths} month${ctx.tenureMonths !== 1 ? "s" : ""}.` : ""} Send the update link today — most fix it within 48 hours.`,
      priority: "high",
      status: "pending",
      targetId: member.id,
      targetType: "member",
      aiContent: content,
      subject,
      personalizationMeta,
      _sortKey: PRIORITY_ORDER.billing,
    });
  }
  return tasks;
}

export async function generateAiTasks(gymId: number): Promise<{ created: number; tasks: any[] }> {
  await refreshRiskScores(gymId);

  const [atRiskTasks, leadTasks, billingTasks, commStyle] = await Promise.all([
    generateAtRiskMemberTasks(gymId),
    generateStaleLeadTasks(gymId),
    generateFailedPaymentTasks(gymId),
    fetchCommunicationStyle(gymId),
  ]);

  const allCandidates = [...atRiskTasks, ...leadTasks, ...billingTasks];

  if (commStyle.rules.length > 0 || commStyle.tone !== "casual_friendly") {
    for (const task of allCandidates) {
      if (task.aiContent && task.subject) {
        const voiceApplied = applyOwnerVoice(task.aiContent, task.subject, commStyle);
        task.aiContent = voiceApplied.content;
        task.subject = voiceApplied.subject;
      }
    }
  }

  if (allCandidates.length === 0) {
    const checkedCategories = ["at-risk member outreach", "stale lead follow-up", "failed payment recovery"];
    return {
      created: 0,
      tasks: [],
      reason: `Checked ${checkedCategories.join(", ")} — nothing flagged. Metrics look clean. Use the time to build.`,
    };
  }

  allCandidates.sort((a, b) => (a._sortKey ?? 99) - (b._sortKey ?? 99));

  const [pendingCount] = await db.select({ count: sql<number>`count(*)` })
    .from(aiTasksTable)
    .where(and(eq(aiTasksTable.gymId, gymId), eq(aiTasksTable.status, "pending")));

  const currentPending = Number(pendingCount?.count ?? 0);
  const slotsAvailable = Math.max(0, MAX_PENDING_TASKS - currentPending);

  if (slotsAvailable === 0) {
    return {
      created: 0,
      tasks: [],
      reason: `${currentPending} tasks already pending. Handle those first before generating new ones.`,
    };
  }

  const toInsert = allCandidates.slice(0, slotsAvailable).map(({ _sortKey, ...task }) => task);

  const inserted = await db.insert(aiTasksTable).values(toInsert).returning();

  if (inserted.length > 0) {
    try {
      const autopilotResult = await processAutopilotTasks(gymId, inserted);
      if (autopilotResult.autoSentCount > 0) {
        console.log(
          `[ai-task-generation] Auto-pilot sent ${autopilotResult.autoSentCount} task(s) for gym ${gymId} (${autopilotResult.skippedCount} skipped)`
        );
      }
    } catch (err: any) {
      console.error(`[ai-task-generation] Auto-pilot processing error for gym ${gymId}:`, err.message);
    }
  }

  const finalTasks = await db.select().from(aiTasksTable).where(
    and(
      eq(aiTasksTable.gymId, gymId),
      sql`${aiTasksTable.id} IN (${sql.join(inserted.map(t => sql`${t.id}`), sql`, `)})`
    )
  );

  for (const t of finalTasks) {
    if (t.description) assertVoiceCompliance(t.description);
    if (t.aiContent) assertVoiceCompliance(t.aiContent);
  }

  return { created: inserted.length, tasks: finalTasks };
}
