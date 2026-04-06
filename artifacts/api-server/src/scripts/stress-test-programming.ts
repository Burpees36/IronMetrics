import {
  validateGeneratedDay,
  validateGeneratedWeek,
  parseBannedMovements,
  type ValidationPreferences,
  type ValidationResult,
  type Violation,
} from "../services/programmingValidation";

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

function buildTestConfigs(): TestConfig[] {
  return [
    {
      id: 1,
      name: "Strict Frequency Rules",
      category: "CONSTRAINT ENFORCEMENT",
      description: "Hard constraint adherence — exact weekly frequency limits. Tests whether 'exactly once' is respected.",
      prefs: {
        methodology: "crossfit",
        structureTemplate: ["warmup", "strength", "conditioning", "cooldown"],
        equipment: ["Barbell", "Pull-up Bar", "Rower", "Jump Rope", "Box", "Dumbbells", "Kettlebells"],
        constraints: "Each of the following movements must appear EXACTLY once this week: pull-ups, toes-to-bar, burpees, barbell cycling. Do NOT repeat any of those movements more than once.",
        defaultTimeDomains: { warmup: "10-15 min", strength: "15-20 min", conditioning: "8-20 min", cooldown: "5-10 min" },
      },
      dayCount: 6,
      customChecks: (days) => {
        const violations: Violation[] = [];
        const tracked = ["pull-ups", "toes-to-bar", "burpees", "barbell cycling"];
        const allMovements = days.flatMap(d => d.sections.flatMap(s => s.movements.map(m => m.toLowerCase())));

        for (const t of tracked) {
          const count = allMovements.filter(m => m.includes(t) || t.includes(m)).length;
          if (count !== 1) {
            violations.push({
              type: "constraint",
              severity: "error",
              message: `"${t}" appears ${count} time(s) — expected exactly 1.`,
              details: { movement: t, count },
            });
          }
        }
        return violations;
      },
    },
    {
      id: 2,
      name: "Movement Blacklist",
      category: "CONSTRAINT ENFORCEMENT",
      description: "Negative constraints — ability to exclude movements completely.",
      prefs: {
        methodology: "crossfit",
        structureTemplate: ["warmup", "strength", "conditioning", "cooldown"],
        equipment: ["Barbell", "Pull-up Bar", "Rower", "Kettlebells", "Dumbbells", "Box"],
        constraints: "Do NOT include burpees, double unders, or running anywhere in the week. If any appear, the program is invalid.",
        defaultTimeDomains: { warmup: "10-15 min", strength: "15-20 min", conditioning: "8-20 min", cooldown: "5-10 min" },
      },
      dayCount: 5,
    },
    {
      id: 3,
      name: "Max Frequency Cap",
      category: "CONSTRAINT ENFORCEMENT",
      description: "Weekly movement counting — no movement more than 2 times. Global constraint tracking.",
      prefs: {
        methodology: "crossfit",
        structureTemplate: ["warmup", "strength", "conditioning", "cooldown"],
        equipment: ["Barbell", "Pull-up Bar", "Rower", "Jump Rope", "Box", "Dumbbells", "Kettlebells", "Rings"],
        constraints: "No movement can appear more than 2 times total across the week. Core movements (toes-to-bar, sit-ups, GHD) max 2 appearances. Squatting patterns max 3 total exposures.",
        defaultTimeDomains: { warmup: "10-15 min", strength: "15-20 min", conditioning: "8-20 min", cooldown: "5-10 min" },
      },
      dayCount: 7,
      customChecks: (days) => {
        const violations: Violation[] = [];
        const counts: Record<string, number> = {};
        for (const d of days) {
          for (const s of d.sections) {
            for (const m of s.movements) {
              const norm = m.toLowerCase().trim();
              counts[norm] = (counts[norm] || 0) + 1;
            }
          }
        }
        for (const [mov, count] of Object.entries(counts)) {
          if (count > 2) {
            violations.push({
              type: "frequency",
              severity: "error",
              message: `Movement "${mov}" appears ${count} times (max 2 allowed).`,
              details: { movement: mov, count, max: 2 },
            });
          }
        }
        return violations;
      },
    },
    {
      id: 4,
      name: "Movement Pattern Balance",
      category: "DISTRIBUTION & BALANCE",
      description: "Whether the generator understands patterns (push/pull/squat/hinge/core), balances across the week, and avoids overloading consecutive days.",
      prefs: {
        methodology: "crossfit",
        structureTemplate: ["warmup", "strength", "conditioning", "cooldown"],
        equipment: ["Barbell", "Pull-up Bar", "Rower", "Jump Rope", "Box", "Dumbbells", "Kettlebells", "Rings"],
        constraints: "Ensure push, pull, squat, hinge, and core are all balanced across the week. No consecutive days should overload the same movement pattern. At least 2 aerobic-focused workouts.",
        defaultTimeDomains: { warmup: "10-15 min", strength: "15-20 min", conditioning: "8-20 min", cooldown: "5-10 min" },
      },
      dayCount: 7,
    },
    {
      id: 5,
      name: "Intensity Wave",
      category: "DISTRIBUTION & BALANCE",
      description: "Fatigue management — intensity wave across the week. Thursday = full recovery. Saturday = long aerobic EMOM.",
      prefs: {
        methodology: "crossfit",
        structureTemplate: ["warmup", "strength", "conditioning", "cooldown"],
        equipment: ["Barbell", "Pull-up Bar", "Rower", "Jump Rope", "Box", "Dumbbells", "Kettlebells", "Assault Bike"],
        constraints: "Alternate high, moderate, and low intensity days. Thursday = full recovery (zone 2 only). Saturday = long aerobic EMOM (40 min). Ensure athletes are not fatigued for Olympic lifting day.",
        defaultTimeDomains: { warmup: "10-15 min", strength: "15-20 min", conditioning: "8-20 min", cooldown: "5-10 min" },
      },
      dayCount: 6,
    },
    {
      id: 6,
      name: "Real Coach Mode",
      category: "COACHING REALISM",
      description: "Professional programming quality — intended stimulus, scaling options, time caps, coaching notes. Workouts must feel purposeful.",
      prefs: {
        methodology: "crossfit",
        structureTemplate: ["warmup", "strength", "conditioning", "cooldown"],
        equipment: ["Barbell", "Pull-up Bar", "Rower", "Jump Rope", "Box", "Dumbbells", "Kettlebells", "Rings"],
        constraints: "Generate programming like an experienced coach. Include detailed intended stimulus for every section. Include scaling options with at least Rx, Scaled, and Beginner options. Include time caps. Include coaching notes that are actionable, not generic.",
        defaultTimeDomains: { warmup: "10-15 min", strength: "15-20 min", conditioning: "8-20 min", cooldown: "5-10 min" },
      },
      dayCount: 5,
    },
    {
      id: 7,
      name: "Gym Identity Lock",
      category: "COACHING REALISM",
      description: "Whether methodology and gym identity are preserved. Strength + metcon structure. No gimmicky workouts.",
      prefs: {
        methodology: "strength-bias",
        structureTemplate: ["warmup", "strength", "conditioning", "cooldown"],
        equipment: ["Barbell", "Dumbbells", "Pull-up Bar", "Rower", "Bench", "Rack"],
        constraints: "Prioritize strength progression. Use classic CrossFit structure (strength + metcon). Avoid gimmicky workouts. Monday: squat focus. Tuesday: press focus. Wednesday: Olympic lifting focus. Friday: deadlift focus. Do NOT deviate from this identity.",
        defaultTimeDomains: { warmup: "10-15 min", strength: "15-20 min", conditioning: "8-15 min", cooldown: "5-10 min" },
      },
      dayCount: 5,
    },
    {
      id: 8,
      name: "Limited Equipment Gym",
      category: "EQUIPMENT & LOGISTICS",
      description: "Equipment enforcement — only dumbbells, pull-up bar, rower, jump rope. No barbells, machines, or specialty equipment.",
      prefs: {
        methodology: "functional-fitness",
        structureTemplate: ["warmup", "conditioning", "cooldown"],
        equipment: ["Dumbbells", "Pull-up Bar", "Rower", "Jump Rope"],
        constraints: "Do NOT use barbells, machines, or specialty equipment. Only use: Dumbbells, Pull-up Bar, Rower, Jump Rope. Bodyweight movements are allowed.",
        defaultTimeDomains: { warmup: "10-15 min", conditioning: "15-25 min", cooldown: "5-10 min" },
      },
      dayCount: 5,
    },
    {
      id: 9,
      name: "Overloaded Gym Scenario",
      category: "EQUIPMENT & LOGISTICS",
      description: "Real-world class logistics — 20 athletes with only 5 barbells and limited space.",
      prefs: {
        methodology: "crossfit",
        structureTemplate: ["warmup", "strength", "conditioning", "cooldown"],
        equipment: ["Barbell", "Dumbbells", "Pull-up Bar", "Rower", "Jump Rope", "Box"],
        constraints: "Programming for a class of 20 athletes with only 5 barbells and limited space. Ensure workouts are scalable and avoid bottlenecks. Use stations/rotations where possible. Avoid movements where 20 athletes would need barbells simultaneously.",
        defaultTimeDomains: { warmup: "10-15 min", strength: "15-20 min", conditioning: "12-20 min", cooldown: "5-10 min" },
      },
      dayCount: 3,
    },
    {
      id: 10,
      name: "Time-Constrained Classes",
      category: "EDGE CASES",
      description: "Time budgeting — 45 minute class with specific segment durations. Must fit cleanly.",
      prefs: {
        methodology: "crossfit",
        structureTemplate: ["warmup", "strength", "conditioning", "cooldown"],
        equipment: ["Barbell", "Dumbbells", "Pull-up Bar", "Rower", "Jump Rope"],
        constraints: "This is a 45-minute class. Warmup: 10 min. Strength: 15 min. Metcon: 12 min. Cooldown: 5 min. Must fit cleanly within class time. Do not exceed time allocations.",
        defaultTimeDomains: { warmup: "10 min", strength: "15 min", conditioning: "12 min", cooldown: "5 min" },
      },
      dayCount: 3,
    },
    {
      id: 11,
      name: "Beginner Gym",
      category: "EDGE CASES",
      description: "Skill-level adaptation — no advanced gymnastics, no Olympic lifts from the floor, focus on movement quality.",
      prefs: {
        methodology: "functional-fitness",
        structureTemplate: ["warmup", "strength", "conditioning", "cooldown"],
        equipment: ["Dumbbells", "Kettlebells", "Pull-up Bar", "Rower", "Jump Rope", "Box", "Resistance Bands"],
        constraints: "Do NOT include advanced gymnastics (muscle-ups, handstand walks, butterfly pull-ups). Do NOT include Olympic lifts from the floor (snatch, clean and jerk). Focus on movement quality, not intensity. Keep workouts simple and approachable for beginners.",
        defaultTimeDomains: { warmup: "10-15 min", strength: "12-15 min", conditioning: "10-15 min", cooldown: "5-10 min" },
      },
      dayCount: 5,
      customChecks: (days) => {
        const violations: Violation[] = [];
        const banned = ["muscle-up", "muscle-ups", "handstand walk", "butterfly pull-up", "butterfly pull-ups", "snatch", "clean and jerk", "squat snatch", "squat clean"];
        const allMovements = days.flatMap(d => d.sections.flatMap(s => s.movements.map(m => m.toLowerCase())));

        for (const m of allMovements) {
          for (const b of banned) {
            if (m.includes(b) || b.includes(m)) {
              violations.push({
                type: "constraint",
                severity: "error",
                message: `Advanced movement "${m}" found — not appropriate for beginner gym.`,
                details: { movement: m, bannedTerm: b },
              });
            }
          }
        }
        return violations;
      },
    },
    {
      id: 12,
      name: "Competitor Track",
      category: "EDGE CASES",
      description: "High-skill programming mode — advanced gymnastics, barbell cycling, aerobic capacity testing. Must feel like Games prep.",
      prefs: {
        methodology: "crossfit",
        structureTemplate: ["warmup", "skill", "strength", "conditioning", "accessory", "cooldown"],
        equipment: ["Barbell", "Dumbbells", "Kettlebells", "Pull-up Bar", "Rings", "Rower", "Assault Bike", "Ski Erg", "Jump Rope", "Box", "GHD Machine", "Rope", "Wall Ball"],
        constraints: "This is a competitive CrossFit program. Include high-skill gymnastics (muscle-ups, handstand walks, ring work). Include barbell cycling. Test aerobic capacity. Must feel like Games prep. Include longer conditioning pieces (20+ min) at least 2x per week.",
        defaultTimeDomains: { warmup: "10-15 min", skill: "10-15 min", strength: "15-20 min", conditioning: "15-30 min", accessory: "10-15 min", cooldown: "5-10 min" },
      },
      dayCount: 5,
      customChecks: (days) => {
        const violations: Violation[] = [];
        const allMovements = days.flatMap(d => d.sections.flatMap(s => s.movements.map(m => m.toLowerCase())));

        const hasGymnastics = allMovements.some(m =>
          m.includes("muscle-up") || m.includes("handstand") || m.includes("ring")
        );
        if (!hasGymnastics) {
          violations.push({
            type: "constraint",
            severity: "error",
            message: "Competitor track missing high-skill gymnastics (expected muscle-ups, handstand walks, or ring work).",
          });
        }

        const hasBarbellCycling = allMovements.some(m =>
          m.includes("barbell cycling") || m.includes("clean and jerk") || m.includes("snatch")
        );
        if (!hasBarbellCycling) {
          violations.push({
            type: "constraint",
            severity: "warning",
            message: "Competitor track may lack barbell cycling element.",
          });
        }

        return violations;
      },
    },
  ];
}

interface TestResult {
  id: number;
  name: string;
  category: string;
  description: string;
  passed: boolean;
  errorCount: number;
  warningCount: number;
  totalViolations: number;
  violations: Violation[];
  movementCounts: Record<string, number>;
  structureMatch: boolean;
  equipmentCompliant: boolean;
  coachingComplete: boolean;
  generatedDayCount: number;
  allMovements: string[];
}

async function generateTestDays(config: TestConfig): Promise<GeneratedDay[]> {
  const baseUrl = `http://localhost:${process.env.PORT || 8080}`;
  const gymId = 1;

  const prefsResp = await fetch(`${baseUrl}/gyms/${gymId}/programming/preferences`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      methodology: config.prefs.methodology,
      structureTemplate: config.prefs.structureTemplate,
      equipment: config.prefs.equipment,
      constraints: config.prefs.constraints,
      defaultTimeDomains: config.prefs.defaultTimeDomains,
    }),
  });

  if (!prefsResp.ok) {
    console.error(`Failed to set preferences for test ${config.id}: ${prefsResp.status}`);
  }

  const days: GeneratedDay[] = [];
  const baseDate = new Date("2026-04-13");

  for (let i = 0; i < config.dayCount; i++) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];

    try {
      const resp = await fetch(`${baseUrl}/gyms/${gymId}/programming/generate-day`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateStr, overwrite: true }),
      });

      if (!resp.ok) {
        console.error(`  Day ${dateStr}: HTTP ${resp.status}`);
        continue;
      }

      const data = await resp.json() as GeneratedDay & { sections: GeneratedSection[] };
      days.push(data);
    } catch (err) {
      console.error(`  Day ${dateStr}: Error:`, err instanceof Error ? err.message : err);
    }
  }

  return days;
}

async function runTest(config: TestConfig): Promise<TestResult> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`TEST ${config.id}: ${config.name}`);
  console.log(`Category: ${config.category}`);
  console.log(`Description: ${config.description}`);
  console.log(`${"=".repeat(60)}`);

  const days = await generateTestDays(config);
  console.log(`  Generated ${days.length} / ${config.dayCount} days`);

  const validation = validateGeneratedWeek(days, config.prefs);
  const customViolations = config.customChecks ? config.customChecks(days) : [];
  const allViolations = [...validation.violations, ...customViolations];

  const errors = allViolations.filter(v => v.severity === "error");
  const warnings = allViolations.filter(v => v.severity === "warning");

  const allMovements = days.flatMap(d => d.sections.flatMap(s => s.movements));

  console.log(`  Errors: ${errors.length}, Warnings: ${warnings.length}`);
  if (errors.length > 0) {
    console.log(`  ERROR VIOLATIONS:`);
    for (const e of errors.slice(0, 5)) {
      console.log(`    - ${e.message}`);
    }
    if (errors.length > 5) console.log(`    ... and ${errors.length - 5} more`);
  }

  return {
    id: config.id,
    name: config.name,
    category: config.category,
    description: config.description,
    passed: errors.length === 0,
    errorCount: errors.length,
    warningCount: warnings.length,
    totalViolations: allViolations.length,
    violations: allViolations,
    movementCounts: validation.movementCounts,
    structureMatch: validation.structureMatch,
    equipmentCompliant: validation.equipmentCompliant,
    coachingComplete: validation.coachingComplete,
    generatedDayCount: days.length,
    allMovements,
  };
}

function generateReport(results: TestResult[]): string {
  const lines: string[] = [];

  lines.push("=" .repeat(80));
  lines.push("AI PROGRAMMING STRESS TEST REPORT");
  lines.push(new Date().toISOString());
  lines.push("=".repeat(80));
  lines.push("");

  lines.push("## 1. Architecture Findings");
  lines.push("");
  lines.push("### Generation Flow");
  lines.push("1. User configures settings in ProgrammingSettings.tsx (methodology, structure, equipment, constraints, time domains)");
  lines.push("2. Settings stored via PUT /gyms/:gymId/programming/preferences");
  lines.push("3. Generate-day or generate-week route loads preferences, calls programmingAI.ts");
  lines.push("4. buildSystemPrompt() constructs system prompt from prefs + 14-day history");
  lines.push("5. AI call (GPT-5.2) with response_format: json_object");
  lines.push("6. Response parsed, sections sanitized, saved to DB as draft");
  lines.push("");
  lines.push("### Files Involved");
  lines.push("- artifacts/api-server/src/services/programmingAI.ts — Core AI service");
  lines.push("- artifacts/api-server/src/services/programmingValidation.ts — NEW: Validation layer");
  lines.push("- artifacts/api-server/src/routes/programming/generate.ts — Route handler");
  lines.push("- artifacts/api-server/src/routes/programming/preferences.ts — Settings API");
  lines.push("- lib/db/src/schema/programming.ts — DB schema");
  lines.push("");
  lines.push("### Where Rules Are Enforced (Post-Fix)");
  lines.push("- Equipment: Hard constraint in system prompt + post-generation validation");
  lines.push("- Structure template: Strict instruction in prompt + section-count validation");
  lines.push("- Banned movements: Parsed from constraints text + scanned post-generation");
  lines.push("- Frequency caps: Parsed from constraints + counted post-generation");
  lines.push("- Coaching quality: Time caps, scaling, stimulus checked post-generation");
  lines.push("- Retry loop: Up to 2 retries with violation feedback if errors found");
  lines.push("");

  lines.push("## 2. Test Harness");
  lines.push("");
  lines.push("### Unit Tests");
  lines.push("- File: artifacts/api-server/src/__tests__/programming-ai-stress-test.test.ts");
  lines.push("- Run: cd artifacts/api-server && npx vitest run src/__tests__/programming-ai-stress-test.test.ts");
  lines.push("- Tests: 16 unit tests for validation module (parseBannedMovements, equipment compliance, structure, coaching quality, frequency rules)");
  lines.push("");
  lines.push("### Live Stress Test");
  lines.push("- File: artifacts/api-server/src/scripts/stress-test-programming.ts");
  lines.push("- Run: cd artifacts/api-server && npx tsx src/scripts/stress-test-programming.ts");
  lines.push("- Tests: 12 live tests against AI API with structured validators");
  lines.push("");

  lines.push("## 3. Test Results");
  lines.push("");

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  lines.push(`Overall: ${passed}/${results.length} PASSED, ${failed}/${results.length} FAILED`);
  lines.push("");

  const byCategory: Record<string, TestResult[]> = {};
  for (const r of results) {
    if (!byCategory[r.category]) byCategory[r.category] = [];
    byCategory[r.category].push(r);
  }

  for (const [cat, catResults] of Object.entries(byCategory)) {
    lines.push(`### ${cat}`);
    lines.push("");
    for (const r of catResults) {
      const status = r.passed ? "PASS" : "FAIL";
      lines.push(`#### Test ${r.id}: ${r.name} — ${status}`);
      lines.push(`- Description: ${r.description}`);
      lines.push(`- Generated: ${r.generatedDayCount}/${r.id <= 3 ? (r.id === 1 ? 6 : r.id === 2 ? 5 : 7) : "varies"} days`);
      lines.push(`- Errors: ${r.errorCount}, Warnings: ${r.warningCount}`);
      lines.push(`- Structure Match: ${r.structureMatch ? "Yes" : "No"}`);
      lines.push(`- Equipment Compliant: ${r.equipmentCompliant ? "Yes" : "N/A or No"}`);
      lines.push(`- Coaching Complete: ${r.coachingComplete ? "Yes" : "No"}`);

      if (!r.passed) {
        lines.push(`- Key Violations:`);
        for (const v of r.violations.filter(v => v.severity === "error").slice(0, 5)) {
          lines.push(`  - [${v.type}] ${v.message}`);
        }
      }
      lines.push("");
    }
  }

  lines.push("## 4. Root Cause Analysis");
  lines.push("");

  const failedResults = results.filter(r => !r.passed);
  const byType: Record<string, Violation[]> = {};
  for (const r of failedResults) {
    for (const v of r.violations.filter(v => v.severity === "error")) {
      if (!byType[v.type]) byType[v.type] = [];
      byType[v.type].push(v);
    }
  }

  if (Object.keys(byType).length === 0) {
    lines.push("No failures to analyze — all tests passed.");
  } else {
    for (const [type, violations] of Object.entries(byType)) {
      lines.push(`### ${type} (${violations.length} violation(s))`);
      for (const v of violations.slice(0, 3)) {
        lines.push(`- ${v.message}`);
      }
      lines.push("");
    }
  }

  lines.push("## 5. Improvements Implemented");
  lines.push("");
  lines.push("### Prompt Construction (programmingAI.ts)");
  lines.push("1. **Methodology-specific rules** — Each methodology (crossfit, powerlifting, olympic-lifting, etc.) now has dedicated periodization rules that override generic CrossFit defaults");
  lines.push("2. **Equipment as hard boundary** — Prompt now says 'ONLY use these, nothing else' with explicit 'non-negotiable' language");
  lines.push("3. **Structure template as strict contract** — Prompt specifies exact section count and order, not just a suggestion");
  lines.push("4. **Banned movement extraction** — Constraints are parsed to extract banned movements and inject them explicitly into the prompt");
  lines.push("5. **Quality requirements** — Added minimum bar for intendedStimulus (15+ words), scalingNotes (3 levels), and mandatory time caps on conditioning");
  lines.push("");
  lines.push("### Validation Layer (programmingValidation.ts — NEW)");
  lines.push("1. **Banned movement detection** — Parses 'Do NOT include X' constraints, scans all movements and instructions");
  lines.push("2. **Equipment compliance** — Maps movements to required equipment via 300+ movement-equipment mappings, flags unlisted equipment");
  lines.push("3. **Frequency counting** — Counts movements across the week, enforces global and per-movement caps");
  lines.push("4. **Structure compliance** — Checks section count and order against template");
  lines.push("5. **Time budget** — Validates section durations against configured time domains");
  lines.push("6. **Coaching quality** — Checks for meaningful stimulus, scaling notes, time caps on conditioning");
  lines.push("");
  lines.push("### Retry/Correction Flow (programmingAI.ts)");
  lines.push("1. Generate → Validate → If errors, regenerate with violation feedback → Validate → Accept or return best");
  lines.push("2. Max 2 retries, logged with violation counts per attempt");
  lines.push("3. Correction prompt lists exact violations from previous attempt");
  lines.push("4. Applied to both generateDay and generateWeek flows");
  lines.push("");

  lines.push("## 6. Summary");
  lines.push("");
  lines.push(`- Tests passed: ${passed}/${results.length}`);
  lines.push(`- Tests failed: ${failed}/${results.length}`);
  lines.push("");
  lines.push("### Top Risks");
  lines.push("1. AI nondeterminism means some tests may be flaky (pass sometimes, fail others)");
  lines.push("2. Equipment mapping coverage — novel or unusual movement names may not be caught");
  lines.push("3. Frequency rules depend on NLP parsing of free-text constraints — complex rules may be misinterpreted");
  lines.push("4. Week-level generation is a single AI call; retry re-generates all days, not just violating ones");
  lines.push("");
  lines.push("### Recommended Next Engineering Steps");
  lines.push("1. Add movement synonyms/alias resolution (e.g., 'C&J' = 'Clean and Jerk', 'T2B' = 'Toes-to-Bar')");
  lines.push("2. Add per-day retry in generateWeek (only regenerate days with violations)");
  lines.push("3. Store validation results alongside generated days for coach review (show violations in UI)");
  lines.push("");
  lines.push("### Recommended Next Product/UX Steps");
  lines.push("1. Show validation badges on generated programming (green checkmark vs yellow warning)");
  lines.push("2. Let coaches mark constraints as 'hard' vs 'soft' in settings UI");
  lines.push("3. Add a 'regenerate with fixes' button when violations are detected");
  lines.push("");

  lines.push("## 7. Changed Files");
  lines.push("");
  lines.push("- `artifacts/api-server/src/services/programmingAI.ts` — Improved prompts, added validation-retry loop, methodology-specific rules");
  lines.push("- `artifacts/api-server/src/services/programmingValidation.ts` — NEW: Full validation module (banned movements, equipment, structure, frequency, coaching quality)");
  lines.push("- `artifacts/api-server/src/__tests__/programming-ai-stress-test.test.ts` — NEW: 16 unit tests for validation module");
  lines.push("- `artifacts/api-server/src/scripts/stress-test-programming.ts` — NEW: 12-test live stress test script");
  lines.push("");

  return lines.join("\n");
}

async function main() {
  const configs = buildTestConfigs();
  const results: TestResult[] = [];

  const testFilter = process.argv[2] ? parseInt(process.argv[2]) : null;
  const toRun = testFilter ? configs.filter(c => c.id === testFilter) : configs;

  console.log(`Running ${toRun.length} stress test(s)...`);
  console.log("Each test generates AI workouts and validates against pass/fail criteria.\n");

  for (const config of toRun) {
    try {
      const result = await runTest(config);
      results.push(result);
    } catch (err) {
      console.error(`Test ${config.id} crashed:`, err);
      results.push({
        id: config.id,
        name: config.name,
        category: config.category,
        description: config.description,
        passed: false,
        errorCount: 1,
        warningCount: 0,
        totalViolations: 1,
        violations: [{
          type: "constraint",
          severity: "error",
          message: `Test crashed: ${err instanceof Error ? err.message : String(err)}`,
        }],
        movementCounts: {},
        structureMatch: false,
        equipmentCompliant: false,
        coachingComplete: false,
        generatedDayCount: 0,
        allMovements: [],
      });
    }
  }

  const report = generateReport(results);
  console.log("\n\n" + report);

  const fs = await import("fs");
  const reportPath = "stress-test-report.md";
  fs.writeFileSync(reportPath, report);
  console.log(`\nReport saved to: ${reportPath}`);
}

main().catch(console.error);
