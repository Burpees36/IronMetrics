import { openai } from "@workspace/integrations-openai-ai-server";
import { db, programmingDaysTable, programmingSectionsTable } from "@workspace/db";
import { eq, and, gte, lte, desc, asc } from "drizzle-orm";

interface GenerationPreferences {
  methodology: string;
  structureTemplate: string[];
  equipment: string[];
  constraints: string | null;
  defaultTimeDomains: Record<string, string>;
}

interface GeneratedSection {
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

interface GeneratedDay {
  date: string;
  title: string;
  publicNotes: string;
  coachNotes: string;
  sections: GeneratedSection[];
}

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

function buildSystemPrompt(prefs: GenerationPreferences, history: string): string {
  const sectionTypes = prefs.structureTemplate.join(", ");
  const equipmentList = prefs.equipment.length > 0 ? prefs.equipment.join(", ") : "standard gym equipment";

  return `You are an expert fitness programming coach specializing in ${prefs.methodology} methodology.

Your task is to generate daily workout programming that follows intelligent periodization principles.

METHODOLOGY: ${prefs.methodology}
STRUCTURE: Each day should follow this section order: ${sectionTypes}
AVAILABLE EQUIPMENT: ${equipmentList}
${prefs.constraints ? `CONSTRAINTS: ${prefs.constraints}` : ""}

TIME DOMAINS:
${Object.entries(prefs.defaultTimeDomains).map(([k, v]) => `- ${k}: ${v}`).join("\n")}

PERIODIZATION RULES:
- Never program heavy squats on back-to-back days
- Balance push and pull movements across the week
- Vary time domains for conditioning (short/medium/long)
- Include unilateral work at least 2x per week
- Ensure adequate recovery between similar movement patterns
- Mix monostructural, gymnastics, and weightlifting elements
- Vary rep schemes and loading patterns

RECENT PROGRAMMING HISTORY (avoid repeating movements too frequently):
${history}

IMPORTANT FORMATTING RULES:
- Return valid JSON only, no markdown code blocks
- Each section must have: sectionType, title, instructions, duration, timeCap, intendedStimulus, movements (array of strings), scalingNotes, coachNotes, memberNotes, resultTrackingEnabled (boolean)
- The "conditioning" or "wod" section should have resultTrackingEnabled: true
- Instructions should be detailed and ready for athletes to follow
- Include scaling options for different fitness levels
- Use proper movement names (e.g., "Back Squat" not "squats")`;
}

export async function generateDay(
  gymId: number,
  date: string,
  prefs: GenerationPreferences,
  dayOfWeek?: string
): Promise<GeneratedDay> {
  const history = await getRecentProgrammingHistory(gymId);

  const dayName = dayOfWeek || new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long" });

  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: 4096,
    messages: [
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

Follow the structure template: ${prefs.structureTemplate.join(" -> ")}
Consider it is ${dayName}, so program accordingly for the weekly cycle.`
      }
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from AI");

  const parsed = JSON.parse(content) as GeneratedDay;

  parsed.date = date;

  return parsed;
}

export async function generateWeek(
  gymId: number,
  startDate: string,
  prefs: GenerationPreferences
): Promise<GeneratedDay[]> {
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

  if (missingDates.length === 0) {
    return [];
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
    existingContext = `\n\nALREADY PROGRAMMED (do NOT generate these days — they exist, ensure variety against their movements):
${summaries.join("\n")}`;
  }

  const history = await getRecentProgrammingHistory(gymId);

  const tokensPerDay = 3000;
  const maxTokens = Math.max(4096, missingDates.length * tokensPerDay);

  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    max_completion_tokens: maxTokens,
    messages: [
      { role: "system", content: buildSystemPrompt(prefs, history) },
      {
        role: "user",
        content: `Generate workouts for the following ${missingDates.length} day(s) only. Do NOT generate days that already exist.

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
${existingContext}

Follow the structure template for each day: ${prefs.structureTemplate.join(" -> ")}

Ensure intelligent periodization across the entire week:
- Monday: typically heavier/strength focus
- Wednesday: moderate intensity, skill work
- Friday: higher intensity conditioning
- Saturday: partner/team workout or longer effort
- Sunday: active recovery or rest day programming
- Vary the patterns across all days for balanced development`
      }
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No response from AI");

  let parsed: { days: GeneratedDay[] };
  try {
    parsed = JSON.parse(content) as { days: GeneratedDay[] };
  } catch (parseErr) {
    console.error("[programmingAI] Failed to parse week JSON response:", content?.slice(0, 500));
    throw new Error("AI returned an invalid response. Please try again.");
  }

  if (!Array.isArray(parsed.days) || parsed.days.length === 0) {
    throw new Error("AI returned no workout days. Please try again.");
  }

  for (let i = 0; i < parsed.days.length; i++) {
    if (missingDates[i]) {
      parsed.days[i].date = missingDates[i].date;
    }
  }

  return parsed.days.filter(d => !existingDates.has(d.date));
}
