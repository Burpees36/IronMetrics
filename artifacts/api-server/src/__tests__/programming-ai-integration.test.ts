import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ValidationPreferences } from "../services/programmingValidation";

vi.mock("@workspace/integrations-openai-ai-server", () => ({
  openai: {
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  },
}));

function createQueryChain() {
  const result: any[] = [];
  const chain: any = Object.assign(Promise.resolve(result), {
    orderBy: vi.fn(() => Object.assign(Promise.resolve(result), {
      limit: vi.fn(() => Promise.resolve(result)),
    })),
    then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject),
  });
  return chain;
}

vi.mock("@workspace/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => createQueryChain()),
      })),
    })),
  },
  programmingDaysTable: {},
  programmingSectionsTable: {},
}));

import { openai } from "@workspace/integrations-openai-ai-server";
import { generateDay, generateWeek, buildValidationMeta } from "../services/programmingAI";
import { ProgrammingValidationError } from "../services/programmingValidation";

const mockCreate = vi.mocked(openai.chat.completions.create);

function buildAIResponse(sections: Array<{
  sectionType: string;
  title: string;
  movements: string[];
  intendedStimulus?: string;
  scalingNotes?: string;
  timeCap?: string | null;
  duration?: string | null;
}>) {
  return {
    choices: [{
      message: {
        content: JSON.stringify({
          date: "2026-04-13",
          title: "Test Day",
          publicNotes: "Test",
          coachNotes: "Test",
          sections: sections.map(s => ({
            sectionType: s.sectionType,
            title: s.title,
            instructions: "Complete the workout as prescribed with good form and intensity",
            duration: s.duration ?? "12 min",
            timeCap: s.timeCap ?? "15 min",
            intendedStimulus: s.intendedStimulus ?? "High intensity conditioning workout targeting metabolic capacity and muscular endurance",
            movements: s.movements,
            scalingNotes: s.scalingNotes ?? "Rx: As written. Scaled: Reduce load 50%. Beginner: Bodyweight only with modified reps.",
            coachNotes: "Watch for form breakdown",
            memberNotes: "Push hard today",
            resultTrackingEnabled: true,
          })),
        }),
      },
    }],
  };
}

const basePrefs = {
  methodology: "crossfit",
  structureTemplate: ["warmup", "strength", "conditioning", "cooldown"],
  equipment: ["Barbell", "Pull-up Bar", "Rower", "Dumbbells", "Box"],
  constraints: "",
  defaultTimeDomains: { warmup: "10-15 min", strength: "15-20 min", conditioning: "8-20 min", cooldown: "5-10 min" },
};

describe("Integration: generateDay with mocked OpenAI", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it("passes validation on first attempt with compliant output", async () => {
    mockCreate.mockResolvedValueOnce(buildAIResponse([
      { sectionType: "warmup", title: "Warm-up", movements: ["Jog", "Stretch"], duration: "10 min", timeCap: null },
      { sectionType: "strength", title: "Strength", movements: ["Back Squat"], duration: "15 min", timeCap: null },
      { sectionType: "conditioning", title: "WOD", movements: ["Thruster", "Pull-ups"] },
      { sectionType: "cooldown", title: "Cool-down", movements: [], duration: "5 min", timeCap: null },
    ]) as never);

    const result = await generateDay(1, "2026-04-13", basePrefs);
    expect(result.day.sections.length).toBe(4);
    expect(result.retries).toBe(0);
    expect(result.validation.valid).toBe(true);
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("retries when structure template is violated and succeeds on second attempt", async () => {
    mockCreate.mockResolvedValueOnce(buildAIResponse([
      { sectionType: "warmup", title: "Warm-up", movements: ["Jog"], duration: "10 min", timeCap: null },
      { sectionType: "conditioning", title: "WOD", movements: ["Thruster", "Pull-ups"] },
    ]) as never);

    mockCreate.mockResolvedValueOnce(buildAIResponse([
      { sectionType: "warmup", title: "Warm-up", movements: ["Jog", "Stretch"], duration: "10 min", timeCap: null },
      { sectionType: "strength", title: "Strength", movements: ["Back Squat"], duration: "15 min", timeCap: null },
      { sectionType: "conditioning", title: "WOD", movements: ["Thruster", "Pull-ups"] },
      { sectionType: "cooldown", title: "Cool-down", movements: [], duration: "5 min", timeCap: null },
    ]) as never);

    const result = await generateDay(1, "2026-04-13", basePrefs);
    expect(result.day.sections.length).toBe(4);
    expect(result.retries).toBe(1);
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it("retries on equipment violation and passes correction prompt", async () => {
    const limitedPrefs = {
      ...basePrefs,
      equipment: ["Dumbbells", "Pull-up Bar", "Rower"],
    };

    mockCreate.mockResolvedValueOnce(buildAIResponse([
      { sectionType: "warmup", title: "Warm-up", movements: ["Jog"], duration: "10 min", timeCap: null },
      { sectionType: "strength", title: "Strength", movements: ["Back Squat"], duration: "15 min", timeCap: null },
      { sectionType: "conditioning", title: "WOD", movements: ["Clean and Jerk", "Pull-ups"] },
      { sectionType: "cooldown", title: "Cool-down", movements: [], duration: "5 min", timeCap: null },
    ]) as never);

    mockCreate.mockResolvedValueOnce(buildAIResponse([
      { sectionType: "warmup", title: "Warm-up", movements: ["Jog", "Stretch"], duration: "10 min", timeCap: null },
      { sectionType: "strength", title: "Strength", movements: ["Dumbbell Press"], duration: "15 min", timeCap: null },
      { sectionType: "conditioning", title: "WOD", movements: ["Dumbbell Snatch", "Pull-ups"] },
      { sectionType: "cooldown", title: "Cool-down", movements: [], duration: "5 min", timeCap: null },
    ]) as never);

    const result = await generateDay(1, "2026-04-13", limitedPrefs);
    expect(result.day.sections.length).toBe(4);
    expect(mockCreate).toHaveBeenCalledTimes(2);

    const secondCall = mockCreate.mock.calls[1];
    const messages = secondCall[0].messages as Array<{ role: string; content: string }>;
    const correctionMsg = messages.find(m => m.content.includes("violations"));
    expect(correctionMsg).toBeDefined();
  });

  it("throws ProgrammingValidationError after exhausting all retries", async () => {
    const badResponse = buildAIResponse([
      { sectionType: "warmup", title: "Warm-up", movements: ["Jog"], duration: "10 min", timeCap: null },
      { sectionType: "conditioning", title: "WOD", movements: ["Thruster", "Pull-ups"] },
    ]);

    mockCreate.mockResolvedValue(badResponse as never);

    await expect(generateDay(1, "2026-04-13", basePrefs))
      .rejects.toThrow(ProgrammingValidationError);

    expect(mockCreate).toHaveBeenCalledTimes(3);
  });

  it("throws ProgrammingValidationError with violation details", async () => {
    const badResponse = buildAIResponse([
      { sectionType: "warmup", title: "Warm-up", movements: ["Jog"], duration: "10 min", timeCap: null },
    ]);

    mockCreate.mockResolvedValue(badResponse as never);

    try {
      await generateDay(1, "2026-04-13", basePrefs);
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ProgrammingValidationError);
      const validationErr = err as ProgrammingValidationError;
      expect(validationErr.violations.length).toBeGreaterThan(0);
      expect(validationErr.violations.some(v => v.type === "structure")).toBe(true);
    }
  });

  it("retries on banned movement violation", async () => {
    const prefs = {
      ...basePrefs,
      constraints: "Do NOT include burpees or running.",
    };

    mockCreate.mockResolvedValueOnce(buildAIResponse([
      { sectionType: "warmup", title: "Warm-up", movements: ["Running", "Stretch"], duration: "10 min", timeCap: null },
      { sectionType: "strength", title: "Strength", movements: ["Back Squat"], duration: "15 min", timeCap: null },
      { sectionType: "conditioning", title: "WOD", movements: ["Burpees", "Thruster"] },
      { sectionType: "cooldown", title: "Cool-down", movements: [], duration: "5 min", timeCap: null },
    ]) as never);

    mockCreate.mockResolvedValueOnce(buildAIResponse([
      { sectionType: "warmup", title: "Warm-up", movements: ["Rowing", "Stretch"], duration: "10 min", timeCap: null },
      { sectionType: "strength", title: "Strength", movements: ["Back Squat"], duration: "15 min", timeCap: null },
      { sectionType: "conditioning", title: "WOD", movements: ["Thruster", "Pull-ups"] },
      { sectionType: "cooldown", title: "Cool-down", movements: [], duration: "5 min", timeCap: null },
    ]) as never);

    const result = await generateDay(1, "2026-04-13", prefs);
    expect(result.day.sections.length).toBe(4);
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it("retries on coaching quality violation (missing stimulus)", async () => {
    mockCreate.mockResolvedValueOnce(buildAIResponse([
      { sectionType: "warmup", title: "Warm-up", movements: ["Jog"], duration: "10 min", timeCap: null, intendedStimulus: "" },
      { sectionType: "strength", title: "Strength", movements: ["Back Squat"], duration: "15 min", timeCap: null },
      { sectionType: "conditioning", title: "WOD", movements: ["Thruster", "Pull-ups"] },
      { sectionType: "cooldown", title: "Cool-down", movements: [], duration: "5 min", timeCap: null },
    ]) as never);

    mockCreate.mockResolvedValueOnce(buildAIResponse([
      { sectionType: "warmup", title: "Warm-up", movements: ["Jog", "Stretch"], duration: "10 min", timeCap: null },
      { sectionType: "strength", title: "Strength", movements: ["Back Squat"], duration: "15 min", timeCap: null },
      { sectionType: "conditioning", title: "WOD", movements: ["Thruster", "Pull-ups"] },
      { sectionType: "cooldown", title: "Cool-down", movements: [], duration: "5 min", timeCap: null },
    ]) as never);

    const result = await generateDay(1, "2026-04-13", basePrefs);
    expect(result.day.sections.length).toBe(4);
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });
});

describe("buildValidationMeta", () => {
  it("builds correct metadata from validation result", () => {
    const validation = {
      valid: true,
      violations: [],
      movementCounts: {},
      structureMatch: true,
      equipmentCompliant: true,
      coachingComplete: true,
    };
    const meta = buildValidationMeta(validation, 0);
    expect(meta.valid).toBe(true);
    expect(meta.errorCount).toBe(0);
    expect(meta.warningCount).toBe(0);
    expect(meta.retryCount).toBe(0);
    expect(meta.violations).toEqual([]);
  });

  it("counts errors and warnings separately", () => {
    const validation = {
      valid: false,
      violations: [
        { type: "structure" as const, severity: "error" as const, message: "Missing strength section" },
        { type: "equipment" as const, severity: "warning" as const, message: "Uncommon equipment" },
        { type: "banned_movement" as const, severity: "error" as const, message: "Banned movement used" },
      ],
      movementCounts: {},
      structureMatch: false,
      equipmentCompliant: true,
      coachingComplete: true,
    };
    const meta = buildValidationMeta(validation, 2);
    expect(meta.valid).toBe(false);
    expect(meta.errorCount).toBe(2);
    expect(meta.warningCount).toBe(1);
    expect(meta.retryCount).toBe(2);
    expect(meta.violations.length).toBe(3);
  });
});

describe("generateDay returns validation metadata", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it("includes validation and retry info on successful generation", async () => {
    mockCreate.mockResolvedValueOnce(buildAIResponse([
      { sectionType: "warmup", title: "Warm-up", movements: ["Jog", "Stretch"], duration: "10 min", timeCap: null },
      { sectionType: "strength", title: "Strength", movements: ["Back Squat"], duration: "15 min", timeCap: null },
      { sectionType: "conditioning", title: "WOD", movements: ["Thruster", "Pull-ups"] },
      { sectionType: "cooldown", title: "Cool-down", movements: [], duration: "5 min", timeCap: null },
    ]) as never);

    const result = await generateDay(1, "2026-04-13", basePrefs);
    expect(result.validation).toBeDefined();
    expect(result.validation.valid).toBe(true);
    expect(result.retries).toBe(0);
    expect(result.day).toBeDefined();
    expect(result.day.sections.length).toBe(4);
  });

  it("reports correct retry count after retries", async () => {
    mockCreate.mockResolvedValueOnce(buildAIResponse([
      { sectionType: "warmup", title: "Warm-up", movements: ["Jog"], duration: "10 min", timeCap: null },
      { sectionType: "conditioning", title: "WOD", movements: ["Thruster", "Pull-ups"] },
    ]) as never);

    mockCreate.mockResolvedValueOnce(buildAIResponse([
      { sectionType: "warmup", title: "Warm-up", movements: ["Jog", "Stretch"], duration: "10 min", timeCap: null },
      { sectionType: "strength", title: "Strength", movements: ["Back Squat"], duration: "15 min", timeCap: null },
      { sectionType: "conditioning", title: "WOD", movements: ["Thruster", "Pull-ups"] },
      { sectionType: "cooldown", title: "Cool-down", movements: [], duration: "5 min", timeCap: null },
    ]) as never);

    const result = await generateDay(1, "2026-04-13", basePrefs);
    expect(result.retries).toBe(1);
    expect(result.validation.valid).toBe(true);
  });
});

function buildWeekAIResponse(days: Array<{
  date: string;
  title: string;
  sections: Array<{
    sectionType: string;
    title: string;
    movements: string[];
    intendedStimulus?: string;
    scalingNotes?: string;
    timeCap?: string | null;
    duration?: string | null;
  }>;
}>) {
  return {
    choices: [{
      message: {
        content: JSON.stringify({
          days: days.map(d => ({
            date: d.date,
            title: d.title,
            publicNotes: "Test",
            coachNotes: "Test",
            sections: d.sections.map(s => ({
              sectionType: s.sectionType,
              title: s.title,
              instructions: "Complete the workout as prescribed with good form and intensity",
              duration: s.duration ?? "12 min",
              timeCap: s.timeCap ?? "15 min",
              intendedStimulus: s.intendedStimulus ?? "High intensity conditioning workout targeting metabolic capacity and muscular endurance",
              movements: s.movements,
              scalingNotes: s.scalingNotes ?? "Rx: As written. Scaled: Reduce load 50%. Beginner: Bodyweight only with modified reps.",
              coachNotes: "Watch for form breakdown",
              memberNotes: "Push hard today",
              resultTrackingEnabled: true,
            })),
          })),
        }),
      },
    }],
  };
}

const validSections = [
  { sectionType: "warmup", title: "Warm-up", movements: ["Jog", "Stretch"], duration: "10 min", timeCap: null },
  { sectionType: "strength", title: "Strength", movements: ["Back Squat"], duration: "15 min", timeCap: null },
  { sectionType: "conditioning", title: "WOD", movements: ["Thruster", "Pull-ups"] },
  { sectionType: "cooldown", title: "Cool-down", movements: [], duration: "5 min", timeCap: null },
];

const invalidSections = [
  { sectionType: "warmup", title: "Warm-up", movements: ["Jog"], duration: "10 min", timeCap: null },
  { sectionType: "conditioning", title: "WOD", movements: ["Thruster"] },
];

describe("generateWeek per-day retry", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it("passes validation on first attempt with all compliant days", async () => {
    mockCreate.mockResolvedValueOnce(buildWeekAIResponse([
      { date: "2026-04-06", title: "Monday", sections: validSections },
      { date: "2026-04-07", title: "Tuesday", sections: validSections },
      { date: "2026-04-08", title: "Wednesday", sections: validSections },
      { date: "2026-04-09", title: "Thursday", sections: validSections },
      { date: "2026-04-10", title: "Friday", sections: validSections },
      { date: "2026-04-11", title: "Saturday", sections: validSections },
      { date: "2026-04-12", title: "Sunday", sections: validSections },
    ]) as never);

    const result = await generateWeek(1, "2026-04-06", basePrefs);
    expect(result.generatedDays.length).toBe(7);
    expect(result.generatedDays.every(d => d.validationMeta.valid)).toBe(true);
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("retries only failing days via per-day retry, preserving passing days", async () => {
    mockCreate.mockResolvedValueOnce(buildWeekAIResponse([
      { date: "2026-04-06", title: "Monday", sections: validSections },
      { date: "2026-04-07", title: "Tuesday", sections: invalidSections },
      { date: "2026-04-08", title: "Wednesday", sections: validSections },
    ]) as never);

    mockCreate.mockResolvedValueOnce(buildAIResponse(validSections) as never);

    const result = await generateWeek(1, "2026-04-06", basePrefs);
    expect(result.generatedDays.length).toBe(3);

    const tuesday = result.generatedDays.find(d => d.day.date === "2026-04-07");
    expect(tuesday).toBeDefined();
    expect(tuesday!.validationMeta.valid).toBe(true);
    expect(tuesday!.day.sections.length).toBe(4);

    const monday = result.generatedDays.find(d => d.day.date === "2026-04-06");
    expect(monday).toBeDefined();
    expect(monday!.validationMeta.valid).toBe(true);

    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it("falls back to full-week retry when per-day retry is not applicable", async () => {
    mockCreate.mockResolvedValueOnce(buildWeekAIResponse([
      { date: "2026-04-06", title: "Monday", sections: invalidSections },
      { date: "2026-04-07", title: "Tuesday", sections: invalidSections },
      { date: "2026-04-08", title: "Wednesday", sections: invalidSections },
    ]) as never);

    mockCreate.mockResolvedValueOnce(buildWeekAIResponse([
      { date: "2026-04-06", title: "Monday", sections: validSections },
      { date: "2026-04-07", title: "Tuesday", sections: validSections },
      { date: "2026-04-08", title: "Wednesday", sections: validSections },
    ]) as never);

    const result = await generateWeek(1, "2026-04-06", basePrefs);
    expect(result.generatedDays.length).toBe(3);
    expect(result.generatedDays.every(d => d.validationMeta.valid)).toBe(true);
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it("uses per-day retry when only some days fail, skips full-week retry on success", async () => {
    mockCreate.mockResolvedValueOnce(buildWeekAIResponse([
      { date: "2026-04-06", title: "Monday", sections: validSections },
      { date: "2026-04-07", title: "Tuesday", sections: invalidSections },
      { date: "2026-04-08", title: "Wednesday", sections: validSections },
    ]) as never);

    mockCreate.mockResolvedValueOnce(buildAIResponse(validSections) as never);

    const result = await generateWeek(1, "2026-04-06", basePrefs);
    expect(result.generatedDays.length).toBe(3);

    expect(mockCreate).toHaveBeenCalledTimes(2);

    const monday = result.generatedDays.find(d => d.day.date === "2026-04-06");
    expect(monday!.day.title).toBe("Monday");
    expect(monday!.validationMeta.retryCount).toBe(0);
  });

  it("includes validationMeta on each generated day", async () => {
    mockCreate.mockResolvedValueOnce(buildWeekAIResponse([
      { date: "2026-04-06", title: "Monday", sections: validSections },
      { date: "2026-04-07", title: "Tuesday", sections: validSections },
    ]) as never);

    const result = await generateWeek(1, "2026-04-06", basePrefs);
    for (const dayMeta of result.generatedDays) {
      expect(dayMeta.validationMeta).toBeDefined();
      expect(typeof dayMeta.validationMeta.valid).toBe("boolean");
      expect(typeof dayMeta.validationMeta.errorCount).toBe("number");
      expect(typeof dayMeta.validationMeta.warningCount).toBe("number");
      expect(typeof dayMeta.validationMeta.retryCount).toBe("number");
      expect(Array.isArray(dayMeta.validationMeta.violations)).toBe(true);
    }
  });
});
