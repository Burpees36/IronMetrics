import {
  validateGeneratedWeek,
  type ValidationPreferences,
  type ValidationResult,
  type Violation,
} from "../services/programmingValidation";
import { buildSystemPrompt } from "../services/programmingAI";

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

interface TestConfig {
  id: number;
  name: string;
  category: string;
  description: string;
  prefs: ValidationPreferences;
  dayCount: number;
  customChecks?: (days: GeneratedDay[]) => Violation[];
}

interface TestResult {
  id: number;
  name: string;
  category: string;
  passed: boolean;
  errorCount: number;
  warningCount: number;
  violations: Violation[];
  generatedDayCount: number;
}

function buildTestConfigs(): TestConfig[] {
  return [
    {
      id: 1, name: "Strict Frequency Rules", category: "CONSTRAINT ENFORCEMENT",
      description: "Exact weekly frequency limits.",
      prefs: {
        methodology: "crossfit",
        structureTemplate: ["warmup", "strength", "conditioning", "cooldown"],
        equipment: ["Barbell", "Pull-up Bar", "Rower", "Jump Rope", "Box", "Dumbbells", "Kettlebells"],
        constraints: "Pull-ups must appear EXACTLY 1 time this week. Do NOT repeat pull-ups more than once.",
        defaultTimeDomains: { warmup: "10-15 min", strength: "15-20 min", conditioning: "8-20 min", cooldown: "5-10 min" },
      },
      dayCount: 6,
    },
    {
      id: 2, name: "Movement Blacklist", category: "CONSTRAINT ENFORCEMENT",
      description: "Negative constraints — exclude movements.",
      prefs: {
        methodology: "crossfit",
        structureTemplate: ["warmup", "strength", "conditioning", "cooldown"],
        equipment: ["Barbell", "Pull-up Bar", "Rower", "Kettlebells", "Dumbbells", "Box"],
        constraints: "Do NOT include burpees, double unders, or running anywhere in the week.",
        defaultTimeDomains: { warmup: "10-15 min", strength: "15-20 min", conditioning: "8-20 min", cooldown: "5-10 min" },
      },
      dayCount: 5,
    },
    {
      id: 3, name: "Max Frequency Cap", category: "CONSTRAINT ENFORCEMENT",
      description: "No movement more than 2 times.",
      prefs: {
        methodology: "crossfit",
        structureTemplate: ["warmup", "strength", "conditioning", "cooldown"],
        equipment: ["Barbell", "Pull-up Bar", "Rower", "Jump Rope", "Box", "Dumbbells", "Kettlebells", "Rings"],
        constraints: "No movement can appear more than 2 times total across the week.",
        defaultTimeDomains: { warmup: "10-15 min", strength: "15-20 min", conditioning: "8-20 min", cooldown: "5-10 min" },
      },
      dayCount: 7,
    },
    {
      id: 4, name: "Movement Pattern Balance", category: "DISTRIBUTION & BALANCE",
      description: "Push/pull/squat/hinge/core balance.",
      prefs: {
        methodology: "crossfit",
        structureTemplate: ["warmup", "strength", "conditioning", "cooldown"],
        equipment: ["Barbell", "Pull-up Bar", "Rower", "Jump Rope", "Box", "Dumbbells", "Kettlebells", "Rings"],
        constraints: "Ensure push, pull, squat, hinge, and core are balanced across the week.",
        defaultTimeDomains: { warmup: "10-15 min", strength: "15-20 min", conditioning: "8-20 min", cooldown: "5-10 min" },
      },
      dayCount: 7,
    },
    {
      id: 5, name: "Intensity Wave", category: "DISTRIBUTION & BALANCE",
      description: "Fatigue management — Thursday recovery.",
      prefs: {
        methodology: "crossfit",
        structureTemplate: ["warmup", "strength", "conditioning", "cooldown"],
        equipment: ["Barbell", "Pull-up Bar", "Rower", "Jump Rope", "Box", "Dumbbells", "Kettlebells", "Assault Bike"],
        constraints: "Alternate high, moderate, and low intensity days. Thursday = full recovery.",
        defaultTimeDomains: { warmup: "10-15 min", strength: "15-20 min", conditioning: "8-20 min", cooldown: "5-10 min" },
      },
      dayCount: 6,
    },
    {
      id: 6, name: "Real Coach Mode", category: "COACHING REALISM",
      description: "Professional coaching quality — stimulus, scaling, time caps.",
      prefs: {
        methodology: "crossfit",
        structureTemplate: ["warmup", "strength", "conditioning", "cooldown"],
        equipment: ["Barbell", "Pull-up Bar", "Rower", "Jump Rope", "Box", "Dumbbells", "Kettlebells", "Rings"],
        constraints: "Include detailed intended stimulus for every section. Include Rx, Scaled, and Beginner scaling options. Include time caps on all conditioning.",
        defaultTimeDomains: { warmup: "10-15 min", strength: "15-20 min", conditioning: "8-20 min", cooldown: "5-10 min" },
      },
      dayCount: 5,
    },
    {
      id: 7, name: "Gym Identity Lock", category: "COACHING REALISM",
      description: "Methodology and gym identity preserved.",
      prefs: {
        methodology: "strength-bias",
        structureTemplate: ["warmup", "strength", "conditioning", "cooldown"],
        equipment: ["Barbell", "Dumbbells", "Pull-up Bar", "Rower", "Bench", "Rack"],
        constraints: "Prioritize strength progression. Monday: squat focus. Tuesday: press focus. Wednesday: Olympic lifting focus. Friday: deadlift focus.",
        defaultTimeDomains: { warmup: "10-15 min", strength: "15-20 min", conditioning: "8-15 min", cooldown: "5-10 min" },
      },
      dayCount: 5,
    },
    {
      id: 8, name: "Limited Equipment Gym", category: "EQUIPMENT & LOGISTICS",
      description: "Only dumbbells, pull-up bar, rower, jump rope.",
      prefs: {
        methodology: "functional-fitness",
        structureTemplate: ["warmup", "conditioning", "cooldown"],
        equipment: ["Dumbbells", "Pull-up Bar", "Rower", "Jump Rope"],
        constraints: "Do NOT use barbells, machines, or specialty equipment.",
        defaultTimeDomains: { warmup: "10-15 min", conditioning: "15-25 min", cooldown: "5-10 min" },
      },
      dayCount: 5,
    },
    {
      id: 9, name: "Overloaded Gym Scenario", category: "EQUIPMENT & LOGISTICS",
      description: "20 athletes, 5 barbells — logistics constraint.",
      prefs: {
        methodology: "crossfit",
        structureTemplate: ["warmup", "strength", "conditioning", "cooldown"],
        equipment: ["Barbell", "Dumbbells", "Pull-up Bar", "Rower", "Jump Rope", "Box"],
        constraints: "Class of 20 athletes with only 5 barbells. Avoid movements where 20 athletes need barbells simultaneously.",
        defaultTimeDomains: { warmup: "10-15 min", strength: "15-20 min", conditioning: "12-20 min", cooldown: "5-10 min" },
      },
      dayCount: 3,
    },
    {
      id: 10, name: "Time-Constrained Classes", category: "EDGE CASES",
      description: "45-minute class with specific segment durations.",
      prefs: {
        methodology: "crossfit",
        structureTemplate: ["warmup", "strength", "conditioning", "cooldown"],
        equipment: ["Barbell", "Dumbbells", "Pull-up Bar", "Rower", "Jump Rope"],
        constraints: "45-minute class. Warmup: 10 min. Strength: 15 min. Metcon: 12 min. Cooldown: 5 min.",
        defaultTimeDomains: { warmup: "10 min", strength: "15 min", conditioning: "12 min", cooldown: "5 min" },
      },
      dayCount: 3,
    },
    {
      id: 11, name: "Beginner Gym", category: "EDGE CASES",
      description: "No advanced gymnastics or Olympic lifts from the floor.",
      prefs: {
        methodology: "functional-fitness",
        structureTemplate: ["warmup", "strength", "conditioning", "cooldown"],
        equipment: ["Dumbbells", "Kettlebells", "Pull-up Bar", "Rower", "Jump Rope", "Box", "Resistance Bands"],
        constraints: "Do NOT include muscle-ups, handstand walks, butterfly pull-ups. Do NOT include snatch or clean and jerk. Focus on movement quality for beginners.",
        defaultTimeDomains: { warmup: "10-15 min", strength: "12-15 min", conditioning: "10-15 min", cooldown: "5-10 min" },
      },
      dayCount: 5,
    },
    {
      id: 12, name: "Competitor Track", category: "EDGE CASES",
      description: "Games-level programming — advanced gymnastics, barbell cycling.",
      prefs: {
        methodology: "crossfit",
        structureTemplate: ["warmup", "skill", "strength", "conditioning", "accessory", "cooldown"],
        equipment: ["Barbell", "Dumbbells", "Kettlebells", "Pull-up Bar", "Rings", "Rower", "Assault Bike", "Ski Erg", "Jump Rope", "Box", "GHD Machine", "Rope", "Wall Ball"],
        constraints: "Competitive CrossFit program. Include high-skill gymnastics. Include barbell cycling. Include 20+ min conditioning pieces 2x/week.",
        defaultTimeDomains: { warmup: "10-15 min", skill: "10-15 min", strength: "15-20 min", conditioning: "15-30 min", accessory: "10-15 min", cooldown: "5-10 min" },
      },
      dayCount: 5,
    },
  ];
}

async function generateDaysViaAI(config: TestConfig): Promise<GeneratedDay[]> {
  const { openai } = await import("@workspace/integrations-openai-ai-server");

  const systemPrompt = buildSystemPrompt({
    methodology: config.prefs.methodology,
    structureTemplate: config.prefs.structureTemplate,
    equipment: config.prefs.equipment,
    constraints: config.prefs.constraints || "",
    defaultTimeDomains: config.prefs.defaultTimeDomains,
  }, []);

  const days: GeneratedDay[] = [];
  const baseDate = new Date("2026-04-13");

  for (let i = 0; i < config.dayCount; i++) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    const dayName = d.toLocaleDateString("en-US", { weekday: "long" });

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate programming for ${dayName}, ${dateStr}. Return JSON with date, title, publicNotes, coachNotes, and sections array.` },
        ],
        response_format: { type: "json_object" },
        max_tokens: 3000,
        temperature: 0.7,
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        days.push({
          date: parsed.date || dateStr,
          title: parsed.title || `Workout – ${dateStr}`,
          publicNotes: parsed.publicNotes || "",
          coachNotes: parsed.coachNotes || "",
          sections: Array.isArray(parsed.sections) ? parsed.sections : [],
        });
      }
    } catch (err) {
      console.error(`  Day ${dateStr} failed:`, err instanceof Error ? err.message : err);
    }
  }

  return days;
}

async function runTest(config: TestConfig): Promise<TestResult> {
  console.log(`\nTest ${config.id}: ${config.name} (${config.category})`);

  const days = await generateDaysViaAI(config);
  console.log(`  Generated ${days.length}/${config.dayCount} days`);

  if (days.length === 0) {
    return {
      id: config.id, name: config.name, category: config.category,
      passed: false, errorCount: 1, warningCount: 0,
      violations: [{ type: "generation", severity: "error", message: "No days generated — AI call failed completely." }],
      generatedDayCount: 0,
    };
  }

  if (days.length < config.dayCount) {
    const missingViolation: Violation = {
      type: "generation",
      severity: "error",
      message: `Only ${days.length}/${config.dayCount} days generated — ${config.dayCount - days.length} day(s) failed.`,
    };
    const validation = validateGeneratedWeek(days, config.prefs);
    const customViolations = config.customChecks ? config.customChecks(days) : [];
    const allViolations = [missingViolation, ...validation.violations, ...customViolations];
    const errors = allViolations.filter(v => v.severity === "error");

    return {
      id: config.id, name: config.name, category: config.category,
      passed: false, errorCount: errors.length, warningCount: allViolations.length - errors.length,
      violations: allViolations, generatedDayCount: days.length,
    };
  }

  const validation = validateGeneratedWeek(days, config.prefs);
  const customViolations = config.customChecks ? config.customChecks(days) : [];
  const allViolations = [...validation.violations, ...customViolations];
  const errors = allViolations.filter(v => v.severity === "error");

  console.log(`  Errors: ${errors.length}, Warnings: ${allViolations.length - errors.length}`);
  if (errors.length > 0) {
    for (const e of errors.slice(0, 3)) console.log(`    - ${e.message}`);
  }

  return {
    id: config.id, name: config.name, category: config.category,
    passed: errors.length === 0,
    errorCount: errors.length, warningCount: allViolations.length - errors.length,
    violations: allViolations, generatedDayCount: days.length,
  };
}

async function main() {
  const configs = buildTestConfigs();
  const testFilter = process.argv[2] ? parseInt(process.argv[2]) : null;
  const toRun = testFilter ? configs.filter(c => c.id === testFilter) : configs;

  console.log(`Running ${toRun.length} stress test(s) directly via AI (bypassing HTTP auth)...\n`);

  const results: TestResult[] = [];
  for (const config of toRun) {
    try {
      results.push(await runTest(config));
    } catch (err) {
      console.error(`Test ${config.id} crashed:`, err);
      results.push({
        id: config.id, name: config.name, category: config.category,
        passed: false, errorCount: 1, warningCount: 0,
        violations: [{ type: "generation", severity: "error", message: `Crashed: ${err instanceof Error ? err.message : String(err)}` }],
        generatedDayCount: 0,
      });
    }
  }

  const passed = results.filter(r => r.passed).length;
  console.log(`\n${"=".repeat(60)}`);
  console.log(`RESULTS: ${passed}/${results.length} passed`);
  for (const r of results) {
    console.log(`  ${r.passed ? "PASS" : "FAIL"} — Test ${r.id}: ${r.name} (${r.errorCount} errors, ${r.warningCount} warnings)`);
  }

  const fs = await import("fs");
  fs.writeFileSync("stress-test-results.json", JSON.stringify(results, null, 2));
  console.log("\nResults saved to stress-test-results.json");
}

main().catch(console.error);
