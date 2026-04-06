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

vi.mock("@workspace/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([])),
          })),
        })),
      })),
    })),
  },
  programmingDaysTable: {},
  programmingSectionsTable: {},
}));

import { openai } from "@workspace/integrations-openai-ai-server";
import { generateDay } from "../services/programmingAI";
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
    expect(result.sections.length).toBe(4);
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
    expect(result.sections.length).toBe(4);
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
    expect(result.sections.length).toBe(4);
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
    expect(result.sections.length).toBe(4);
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
    expect(result.sections.length).toBe(4);
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });
});
