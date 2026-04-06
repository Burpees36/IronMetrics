import { openai } from "@workspace/integrations-openai-ai-server";
import { db, programmingDaysTable, programmingSectionsTable } from "@workspace/db";
import { eq, and, gte, lte, desc, asc } from "drizzle-orm";
import {
  validateGeneratedDay,
  validateGeneratedWeek,
  formatViolationsForRetry,
  parseBannedMovements,
  ProgrammingValidationError,
  type ValidationPreferences,
  type ValidationResult,
} from "./programmingValidation";

export interface GenerationPreferences {
  methodology: string;
  structureTemplate: string[];
  equipment: string[];
  constraints: string | null;
  defaultTimeDomains: Record<string, string>;
}

export interface GeneratedSection {
  sectionType: string;
  title: string;
  instructions: string;
  duration: string | null;
  timeCap: string | null;
  intendedStimulus: string;
  movements: string[];
  scalingNotes: string;
  coachNotes: string;
  memberNotes: string;
  resultTrackingEnabled: boolean;
}

export interface GeneratedDay {
  date: string;
  title: string;
  publicNotes: string;
  coachNotes: string;
  sections: GeneratedSection[];
}

const MAX_RETRIES = 2;

async function getRecentProgrammingHistory(gymId: number, days: number = 14): Promise<string> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const recentDays = await db
    .select()
    .from(programmingDaysTable)
    .where(
      and(
        eq(programmingDaysTable.gymId, gymId),
        gte(programmingDaysTable.date, startDate.toISOString().split("T")[0]),
        lte(programmingDaysTable.date, endDate.toISOString().split("T")[0])
      )
    )
    .orderBy(desc(programmingDaysTable.date))
    .limit(14);

  if (recentDays.length === 0) return "No recent programming history available.";

  const history: string[] = [];
  for (const day of recentDays) {
    const sections = await db
      .select()
      .from(programmingSectionsTable)
      .where(eq(programmingSectionsTable.dayId, day.id))
      .orderBy(asc(programmingSectionsTable.orderIndex));

    const movementList = sections.flatMap(s => s.movements || []);
    history.push(`${day.date} - ${day.title}: ${movementList.join(", ") || "no movements listed"}`);
  }

  return history.join("\n");
}

function buildMethodologyRules(methodology: string): string {
  switch (methodology) {
    case "strength-bias":
      return `METHODOLOGY RULES (Strength-Biased):
- Prioritize barbell strength work as the primary focus each day
- Follow classic linear or undulating periodization for main lifts
- Conditioning should complement, not interfere with, strength gains
- Keep metcons shorter (under 15 min) on heavy days
- Include accessory work targeting weaknesses
- Progression should be measurable (weight, reps, sets)`;

    case "powerlifting":
      return `METHODOLOGY RULES (Powerlifting Focus):
- Center programming around squat, bench press, and deadlift
- Use proven periodization (5/3/1, conjugate, linear, etc.)
- Accessory work should directly support the competition lifts
- Conditioning should be minimal and non-interfering
- Include RPE or percentage-based loading
- Focus on progressive overload, not metabolic conditioning`;

    case "olympic-lifting":
      return `METHODOLOGY RULES (Olympic Lifting Focus):
- Prioritize snatch, clean & jerk, and their variations
- Include position work, complexes, and pulls
- Strength work should support the lifts (front squat, overhead squat, pulls)
- Keep conditioning minimal — it should not fatigue the nervous system
- Skill practice before heavy work each session
- Avoid high-rep Olympic lifts in metcons`;

    case "bootcamp":
      return `METHODOLOGY RULES (Bootcamp / HIIT):
- High energy, fast-paced workouts with minimal rest
- Use circuits, AMRAPs, and interval formats
- Keep equipment needs minimal and scalable for large groups
- Include bodyweight-dominant work
- Focus on total body engagement every session
- Make workouts accessible to mixed fitness levels`;

    case "functional-fitness":
      return `METHODOLOGY RULES (Functional Fitness):
- Emphasize real-world movement competence
- Balance all movement patterns: push, pull, squat, hinge, carry, lunge
- Include loaded carries, crawling patterns, and multi-plane work
- Mix time domains across the week
- Prioritize movement quality over intensity`;

    case "hybrid":
      return `METHODOLOGY RULES (Hybrid — Strength + Conditioning):
- Dedicate significant time to strength progression each day
- Follow with purposeful conditioning that varies in duration
- Ensure conditioning doesn't undermine strength development
- Mix monostructural, gymnastics, and weightlifting conditioning
- Track both strength metrics and conditioning performance`;

    default:
      return `METHODOLOGY RULES (CrossFit):
- Mix monostructural, gymnastics, and weightlifting elements
- Constantly varied functional movements at high intensity
- Balance push, pull, squat, hinge, and core across the week
- Vary time domains: short (<8 min), medium (8-15 min), long (15+ min)
- Include skill work and gymnastics progressions
- Ensure adequate recovery between similar movement patterns`;
  }
}

function buildSystemPrompt(prefs: GenerationPreferences, history: string): string {
  const bannedMovements = parseBannedMovements(prefs.constraints);

  const equipmentSection = prefs.equipment.length > 0
    ? `EQUIPMENT RULES (HARD CONSTRAINT — STRICTLY ENFORCED):
You may ONLY program movements that use the following equipment. Do NOT use any equipment not on this list.
Allowed equipment: ${prefs.equipment.join(", ")}
Bodyweight movements are always allowed.
If a movement requires equipment not on this list, you MUST substitute it or remove it. This is non-negotiable.`
    : `EQUIPMENT: Standard gym equipment (full access). No restrictions.`;

  const structureSection = `STRUCTURE TEMPLATE (STRICT — MUST FOLLOW EXACTLY):
Each day MUST contain exactly these sections in this exact order: ${prefs.structureTemplate.join(" -> ")}
- You MUST generate exactly ${prefs.structureTemplate.length} section(s) per day
- The sectionType of section 1 must be "${prefs.structureTemplate[0] || "warmup"}", section 2 must be "${prefs.structureTemplate[1] || "strength"}", etc.
- Do NOT add extra sections. Do NOT skip sections. Do NOT reorder them.`;

  const constraintSection = prefs.constraints
    ? `CONSTRAINTS (HARD RULES — MUST BE FOLLOWED):
${prefs.constraints}
${bannedMovements.length > 0 ? `\nEXPLICITLY BANNED MOVEMENTS (never include these): ${bannedMovements.join(", ")}` : ""}`
    : "";

  return `You are an expert fitness programming coach specializing in ${prefs.methodology} methodology.
You produce coach-quality programming with clear intent, proper scaling, and realistic time budgets.

${buildMethodologyRules(prefs.methodology)}

${structureSection}

${equipmentSection}

${constraintSection}

TIME DOMAINS (target durations for each section type):
${Object.entries(prefs.defaultTimeDomains).map(([k, v]) => `- ${k}: ${v}`).join("\n")}

PERIODIZATION RULES:
- Never program heavy squats on back-to-back days
- Balance push and pull movements across the week
- Vary time domains for conditioning (short/medium/long)
- Include unilateral work at least 2x per week
- Ensure adequate recovery between similar movement patterns
- Vary rep schemes and loading patterns

RECENT PROGRAMMING HISTORY (avoid repeating movements too frequently):
${history}

QUALITY REQUIREMENTS:
- Every section MUST have a meaningful "intendedStimulus" (at least 15 words describing what athletes should feel)
- Every section MUST have detailed "scalingNotes" with at least 2 scaling options (Rx, scaled, beginner)
- Conditioning/WOD sections MUST have a "timeCap" or "duration" set
- "coachNotes" should contain actionable coaching cues, not filler
- Use proper movement names (e.g., "Back Squat" not "squats", "Toes-to-Bar" not "T2B")
- "movements" array must list EVERY movement in the section

FORMATTING RULES:
- Return valid JSON only, no markdown code blocks
- Each section must have: sectionType, title, instructions, duration, timeCap, intendedStimulus, movements (array of strings), scalingNotes, coachNotes, memberNotes, resultTrackingEnabled (boolean)
- The "conditioning" or "wod" section should have resultTrackingEnabled: true`;
}

export interface GenerateDayResult {
  day: GeneratedDay;
  validation: ValidationResult;
  retries: number;
}

async function callGenerateDay(
  prefs: GenerationPreferences,
  history: string,
  date: string,
  dayName: string,
  correctionPrompt?: string,
): Promise<GeneratedDay> {
  const messages: Array<{ role: "system" | "user"; content: string }> = [
    { role: "system", content: buildSystemPrompt(prefs, history) },
    {
      role: "user",
      content: `Generate a complete workout for ${dayName}, ${date}. 

Return a JSON object with this exact structure:
{
  "date": "${date}",
  "title": "Day title (e.g., '${dayName} - Heavy Day')",
  "publicNotes": "Brief note for athletes about today's focus",
  "coachNotes": "Internal coaching notes",
  "sections": [
    {
      "sectionType": "warmup|strength|conditioning|skill|cooldown|wod|accessory|custom",
      "title": "Section Title",
      "instructions": "Detailed instructions",
      "duration": "estimated duration or null",
      "timeCap": "time cap or null",
      "intendedStimulus": "What athletes should feel",
      "movements": ["Movement 1", "Movement 2"],
      "scalingNotes": "Scaling options",
      "coachNotes": "Coach-specific notes",
      "memberNotes": "Notes visible to members",
      "resultTrackingEnabled": false
    }
  ]
}

Follow the structure template EXACTLY: ${prefs.structureTemplate.join(" -> ")}
You MUST generate exactly ${prefs.structureTemplate.length} sections with sectionTypes in that order.
Consider it is ${dayName}, so program accordingly for the weekly cycle.`
    }
  ];

  if (correctionPrompt) {
    messages.push({
      role: "user",
      content: `IMPORTANT: Your previous generation had violations that must be fixed. Regenerate the workout correcting ALL of the following:\n\n${correctionPrompt}`,
    });
  }

  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 4096,
    messages,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from AI");

  const parsed = JSON.parse(content) as GeneratedDay;
  parsed.date = date;
  return parsed;
}

export async function generateDay(
  gymId: number,
  date: string,
  prefs: GenerationPreferences,
  dayOfWeek?: string
): Promise<GeneratedDay> {
  const history = await getRecentProgrammingHistory(gymId);
  const dayName = dayOfWeek || new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long" });

  let bestDay: GeneratedDay | null = null;
  let bestErrorCount = Infinity;
  let lastValidation: ValidationResult | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const correctionPrompt = attempt > 0 && lastValidation
      ? formatViolationsForRetry(lastValidation.violations)
      : undefined;

    const generated = await callGenerateDay(prefs, history, date, dayName, correctionPrompt);
    const validation = validateGeneratedDay(generated, prefs);
    lastValidation = validation;

    const errorCount = validation.violations.filter(v => v.severity === "error").length;

    if (errorCount < bestErrorCount) {
      bestDay = generated;
      bestErrorCount = errorCount;
    }

    if (validation.valid) {
      console.log(`[programmingAI] generateDay ${date}: passed validation on attempt ${attempt + 1}`);
      return generated;
    }

    console.log(`[programmingAI] generateDay ${date}: attempt ${attempt + 1} had ${errorCount} error(s), ${validation.violations.length} total violations`);

    if (attempt === MAX_RETRIES) {
      const bestErrors = lastValidation!.violations.filter(v => v.severity === "error");
      console.warn(`[programmingAI] generateDay ${date}: exhausted ${MAX_RETRIES + 1} attempts with ${bestErrorCount} remaining error(s)`);
      throw new ProgrammingValidationError(
        `AI generation for ${date} failed validation after ${MAX_RETRIES + 1} attempts with ${bestErrorCount} unresolved error(s).`,
        bestErrors,
      );
    }
  }

  return bestDay!;
}

export interface GenerateWeekResult {
  generatedDays: GeneratedDay[];
  skippedDates: string[];
}

async function callGenerateWeek(
  prefs: GenerationPreferences,
  history: string,
  missingDates: Array<{ date: string; dayName: string }>,
  existingContext: string,
  correctionPrompt?: string,
): Promise<GeneratedDay[]> {
  const tokensPerDay = 3500;
  const maxTokens = missingDates.length * tokensPerDay + 1024;

  const messages: Array<{ role: "system" | "user"; content: string }> = [
    { role: "system", content: buildSystemPrompt(prefs, history) },
    {
      role: "user",
      content: `Generate workouts for the following ${missingDates.length} day(s) only. Do NOT generate days that already exist.
${existingContext}

Return a JSON object with a "days" array containing exactly ${missingDates.length} day object(s). Each day should follow this structure:
{
  "days": [
    {
      "date": "YYYY-MM-DD",
      "title": "Day Title",
      "publicNotes": "Brief note for athletes",
      "coachNotes": "Internal coaching notes",
      "sections": [
        {
          "sectionType": "warmup|strength|conditioning|skill|cooldown|wod|accessory|custom",
          "title": "Section Title",
          "instructions": "Detailed instructions",
          "duration": "estimated duration or null",
          "timeCap": "time cap or null",
          "intendedStimulus": "What athletes should feel",
          "movements": ["Movement 1", "Movement 2"],
          "scalingNotes": "Scaling options",
          "coachNotes": "Coach-specific notes",
          "memberNotes": "Notes visible to members",
          "resultTrackingEnabled": false
        }
      ]
    }
  ]
}

Days to generate:
${missingDates.map(d => `- ${d.dayName}: ${d.date}`).join("\n")}

Follow the structure template EXACTLY for each day: ${prefs.structureTemplate.join(" -> ")}
Each day MUST have exactly ${prefs.structureTemplate.length} sections with sectionTypes in that order.

Ensure intelligent periodization across the entire week:
- Monday: typically heavier/strength focus
- Wednesday: moderate intensity, skill work
- Friday: higher intensity conditioning
- Saturday: partner/team workout or longer effort
- Sunday: active recovery or rest day programming
- Vary the patterns across all days for balanced development`
    }
  ];

  if (correctionPrompt) {
    messages.push({
      role: "user",
      content: `IMPORTANT: Your previous generation had violations that must be fixed. Regenerate ALL days correcting the following:\n\n${correctionPrompt}`,
    });
  }

  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: maxTokens,
    messages,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from AI");

  let parsed: { days: GeneratedDay[] };
  try {
    parsed = JSON.parse(content) as { days: GeneratedDay[] };
  } catch (parseErr) {
    console.error("[programmingAI] Failed to parse week JSON response:", content?.slice(0, 500));
    throw new Error("AI returned invalid JSON. The response may have been truncated. Please try again with fewer days or retry.");
  }

  if (!Array.isArray(parsed.days) || parsed.days.length === 0) {
    throw new Error("AI returned no workout days. Please try again.");
  }

  const normalizedDays: GeneratedDay[] = [];
  for (let i = 0; i < Math.min(parsed.days.length, missingDates.length); i++) {
    const aiDay = parsed.days[i];
    if (!aiDay || !Array.isArray(aiDay.sections) || aiDay.sections.length === 0) continue;
    normalizedDays.push({ ...aiDay, date: missingDates[i].date });
  }

  if (normalizedDays.length === 0) {
    throw new Error(`AI generated ${parsed.days.length} day(s) but none had valid sections. Please try again.`);
  }

  return normalizedDays;
}

export async function generateWeek(
  gymId: number,
  startDate: string,
  prefs: GenerationPreferences
): Promise<GenerateWeekResult> {
  const start = new Date(startDate + "T00:00:00");
  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const dayOfWeek = start.getDay();
  const mondayOffset = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
  const monday = new Date(start);
  monday.setDate(start.getDate() + mondayOffset);

  const weekDates: { date: string; dayName: string }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weekDates.push({
      date: d.toISOString().split("T")[0],
      dayName: dayNames[i],
    });
  }

  const existingDays = await db
    .select()
    .from(programmingDaysTable)
    .where(
      and(
        eq(programmingDaysTable.gymId, gymId),
        gte(programmingDaysTable.date, weekDates[0].date),
        lte(programmingDaysTable.date, weekDates[6].date)
      )
    );

  const existingDates = new Set(existingDays.map(d => d.date));
  const missingDates = weekDates.filter(wd => !existingDates.has(wd.date));
  const skippedDates = weekDates.filter(wd => existingDates.has(wd.date)).map(wd => wd.date);

  if (missingDates.length === 0) {
    return { generatedDays: [], skippedDates };
  }

  let existingContext = "";
  if (existingDays.length > 0) {
    const summaries: string[] = [];
    for (const day of existingDays) {
      const sections = await db
        .select()
        .from(programmingSectionsTable)
        .where(eq(programmingSectionsTable.dayId, day.id))
        .orderBy(asc(programmingSectionsTable.orderIndex));
      const movements = sections.flatMap(s => s.movements || []);
      summaries.push(`${day.date} (${dayNames[weekDates.findIndex(wd => wd.date === day.date)] || ""}): ${day.title} — Movements: ${movements.join(", ") || "none listed"}`);
    }
    existingContext = `\n\nALREADY PROGRAMMED (do NOT generate these days — they exist, ensure variety against their movements):\n${summaries.join("\n")}`;
  }

  const history = await getRecentProgrammingHistory(gymId);

  let bestDays: GeneratedDay[] = [];
  let bestErrorCount = Infinity;
  let lastValidation: ValidationResult | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const correctionPrompt = attempt > 0 && lastValidation
      ? formatViolationsForRetry(lastValidation.violations)
      : undefined;

    const generatedDays = await callGenerateWeek(prefs, history, missingDates, existingContext, correctionPrompt);
    const validation = validateGeneratedWeek(generatedDays, prefs);
    lastValidation = validation;

    const errorCount = validation.violations.filter(v => v.severity === "error").length;

    if (errorCount < bestErrorCount) {
      bestDays = generatedDays;
      bestErrorCount = errorCount;
    }

    if (validation.valid) {
      console.log(`[programmingAI] generateWeek: passed validation on attempt ${attempt + 1}`);
      return { generatedDays, skippedDates };
    }

    console.log(`[programmingAI] generateWeek: attempt ${attempt + 1} had ${errorCount} error(s), ${validation.violations.length} total violations`);

    if (attempt === MAX_RETRIES) {
      const bestErrors = lastValidation!.violations.filter(v => v.severity === "error");
      console.warn(`[programmingAI] generateWeek: exhausted ${MAX_RETRIES + 1} attempts with ${bestErrorCount} remaining error(s)`);
      throw new ProgrammingValidationError(
        `AI week generation failed validation after ${MAX_RETRIES + 1} attempts with ${bestErrorCount} unresolved error(s).`,
        bestErrors,
      );
    }
  }

  return { generatedDays: bestDays, skippedDates };
}
