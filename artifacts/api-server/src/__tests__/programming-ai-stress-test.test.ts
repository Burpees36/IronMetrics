import { describe, it, expect, vi, beforeAll } from "vitest";
import {
  validateGeneratedDay,
  validateGeneratedWeek,
  parseBannedMovements,
  parseFrequencyRules,
  type ValidationPreferences,
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

function makeSection(overrides: Partial<GeneratedSection> = {}): GeneratedSection {
  return {
    sectionType: "conditioning",
    title: "Test WOD",
    instructions: "Complete as fast as possible: 21-15-9 Thrusters and Pull-ups",
    duration: "12 min",
    timeCap: "15 min",
    intendedStimulus: "High intensity sprint workout targeting full body power and gymnastics pulling strength",
    movements: ["Thruster", "Pull-ups"],
    scalingNotes: "Rx: 95/65 lb. Scaled: 65/45 lb with ring rows. Beginner: 45/35 lb with banded pull-ups.",
    coachNotes: "Watch for hip extension on thrusters and kipping rhythm on pull-ups",
    memberNotes: "Fast and spicy — aim for unbroken sets early",
    resultTrackingEnabled: true,
    ...overrides,
  };
}

function makeDay(date: string, sections: GeneratedSection[], title?: string): GeneratedDay {
  return {
    date,
    title: title || `Workout – ${date}`,
    publicNotes: "Test day",
    coachNotes: "Test coach notes",
    sections,
  };
}

describe("Validation Module — Unit Tests", () => {
  describe("parseBannedMovements", () => {
    it("parses 'Do NOT include X, Y, or Z'", () => {
      const banned = parseBannedMovements("Do NOT include burpees, double unders, or running anywhere in the week.");
      expect(banned).toContain("burpees");
      expect(banned).toContain("double unders");
      expect(banned).toContain("running");
    });

    it("parses 'no X'", () => {
      const banned = parseBannedMovements("No overhead movements. No kipping pull-ups.");
      expect(banned.length).toBeGreaterThan(0);
    });

    it("returns empty for no constraints", () => {
      expect(parseBannedMovements(null)).toEqual([]);
      expect(parseBannedMovements("")).toEqual([]);
    });
  });

  describe("parseFrequencyRules", () => {
    it("parses global max rule", () => {
      const rules = parseFrequencyRules("No movement can appear more than 2 times total across the week");
      expect(rules).toContainEqual({ movement: "__global__", max: 2 });
    });
  });

  describe("checkBannedMovements", () => {
    it("detects banned movements in sections", () => {
      const day = makeDay("2026-04-07", [
        makeSection({ movements: ["Burpees", "Air Squats"] }),
      ]);
      const prefs: ValidationPreferences = {
        methodology: "crossfit",
        structureTemplate: ["conditioning"],
        equipment: [],
        constraints: "Do NOT include burpees, double unders, or running anywhere in the week.",
        defaultTimeDomains: { conditioning: "8-20 min" },
      };

      const result = validateGeneratedDay(day, prefs);
      const bannedViolations = result.violations.filter(v => v.type === "banned_movement");
      expect(bannedViolations.length).toBeGreaterThan(0);
      expect(bannedViolations[0].message).toContain("burpee");
    });

    it("passes when no banned movements present", () => {
      const day = makeDay("2026-04-07", [
        makeSection({ movements: ["Air Squats", "Push-ups"] }),
      ]);
      const prefs: ValidationPreferences = {
        methodology: "crossfit",
        structureTemplate: ["conditioning"],
        equipment: [],
        constraints: "Do NOT include burpees, double unders, or running anywhere in the week.",
        defaultTimeDomains: { conditioning: "8-20 min" },
      };

      const result = validateGeneratedDay(day, prefs);
      const bannedViolations = result.violations.filter(v => v.type === "banned_movement");
      expect(bannedViolations.length).toBe(0);
    });
  });

  describe("checkEquipmentCompliance", () => {
    it("flags movements requiring unlisted equipment", () => {
      const day = makeDay("2026-04-07", [
        makeSection({ movements: ["Back Squat", "Barbell Row"] }),
      ]);
      const prefs: ValidationPreferences = {
        methodology: "crossfit",
        structureTemplate: ["conditioning"],
        equipment: ["Dumbbells", "Pull-up Bar", "Rower", "Jump Rope"],
        constraints: null,
        defaultTimeDomains: { conditioning: "8-20 min" },
      };

      const result = validateGeneratedDay(day, prefs);
      const equipViolations = result.violations.filter(v => v.type === "equipment");
      expect(equipViolations.length).toBeGreaterThan(0);
    });

    it("allows bodyweight movements regardless of equipment list", () => {
      const day = makeDay("2026-04-07", [
        makeSection({ movements: ["Push-ups", "Air Squats", "Burpees"] }),
      ]);
      const prefs: ValidationPreferences = {
        methodology: "crossfit",
        structureTemplate: ["conditioning"],
        equipment: ["Dumbbells"],
        constraints: null,
        defaultTimeDomains: { conditioning: "8-20 min" },
      };

      const result = validateGeneratedDay(day, prefs);
      const equipViolations = result.violations.filter(v => v.type === "equipment");
      expect(equipViolations.length).toBe(0);
    });

    it("skips equipment check when no equipment listed", () => {
      const day = makeDay("2026-04-07", [
        makeSection({ movements: ["Back Squat", "Barbell Row"] }),
      ]);
      const prefs: ValidationPreferences = {
        methodology: "crossfit",
        structureTemplate: ["conditioning"],
        equipment: [],
        constraints: null,
        defaultTimeDomains: { conditioning: "8-20 min" },
      };

      const result = validateGeneratedDay(day, prefs);
      const equipViolations = result.violations.filter(v => v.type === "equipment");
      expect(equipViolations.length).toBe(0);
    });
  });

  describe("checkStructureCompliance", () => {
    it("passes when sections match template exactly", () => {
      const day = makeDay("2026-04-07", [
        makeSection({ sectionType: "warmup" }),
        makeSection({ sectionType: "strength" }),
        makeSection({ sectionType: "conditioning" }),
        makeSection({ sectionType: "cooldown" }),
      ]);
      const prefs: ValidationPreferences = {
        methodology: "crossfit",
        structureTemplate: ["warmup", "strength", "conditioning", "cooldown"],
        equipment: [],
        constraints: null,
        defaultTimeDomains: {},
      };

      const result = validateGeneratedDay(day, prefs);
      const structViolations = result.violations.filter(v => v.type === "structure");
      expect(structViolations.length).toBe(0);
      expect(result.structureMatch).toBe(true);
    });

    it("flags missing sections", () => {
      const day = makeDay("2026-04-07", [
        makeSection({ sectionType: "warmup" }),
        makeSection({ sectionType: "conditioning" }),
      ]);
      const prefs: ValidationPreferences = {
        methodology: "crossfit",
        structureTemplate: ["warmup", "strength", "conditioning", "cooldown"],
        equipment: [],
        constraints: null,
        defaultTimeDomains: {},
      };

      const result = validateGeneratedDay(day, prefs);
      const structViolations = result.violations.filter(v => v.type === "structure");
      expect(structViolations.length).toBeGreaterThan(0);
    });

    it("treats conditioning and wod as equivalent", () => {
      const day = makeDay("2026-04-07", [
        makeSection({ sectionType: "warmup" }),
        makeSection({ sectionType: "strength" }),
        makeSection({ sectionType: "wod" }),
        makeSection({ sectionType: "cooldown" }),
      ]);
      const prefs: ValidationPreferences = {
        methodology: "crossfit",
        structureTemplate: ["warmup", "strength", "conditioning", "cooldown"],
        equipment: [],
        constraints: null,
        defaultTimeDomains: {},
      };

      const result = validateGeneratedDay(day, prefs);
      const structErrors = result.violations.filter(v => v.type === "structure" && v.severity === "error");
      expect(structErrors.length).toBe(0);
    });
  });

  describe("checkCoachingQuality", () => {
    it("flags missing intended stimulus", () => {
      const day = makeDay("2026-04-07", [
        makeSection({ intendedStimulus: "" }),
      ]);
      const prefs: ValidationPreferences = {
        methodology: "crossfit",
        structureTemplate: ["conditioning"],
        equipment: [],
        constraints: null,
        defaultTimeDomains: {},
      };

      const result = validateGeneratedDay(day, prefs);
      const qualityViolations = result.violations.filter(v => v.type === "coaching_quality");
      expect(qualityViolations.some(v => v.message.includes("stimulus"))).toBe(true);
    });

    it("flags missing scaling notes", () => {
      const day = makeDay("2026-04-07", [
        makeSection({ scalingNotes: "" }),
      ]);
      const prefs: ValidationPreferences = {
        methodology: "crossfit",
        structureTemplate: ["conditioning"],
        equipment: [],
        constraints: null,
        defaultTimeDomains: {},
      };

      const result = validateGeneratedDay(day, prefs);
      const qualityViolations = result.violations.filter(v => v.type === "coaching_quality");
      expect(qualityViolations.some(v => v.message.includes("scaling"))).toBe(true);
    });

    it("flags conditioning without time cap", () => {
      const day = makeDay("2026-04-07", [
        makeSection({ sectionType: "conditioning", timeCap: null, duration: null }),
      ]);
      const prefs: ValidationPreferences = {
        methodology: "crossfit",
        structureTemplate: ["conditioning"],
        equipment: [],
        constraints: null,
        defaultTimeDomains: {},
      };

      const result = validateGeneratedDay(day, prefs);
      const qualityViolations = result.violations.filter(v => v.type === "coaching_quality");
      expect(qualityViolations.some(v => v.message.includes("time cap"))).toBe(true);
    });
  });

  describe("checkFrequencyRules — week level", () => {
    it("detects global frequency violations across a week", () => {
      const days = [
        makeDay("2026-04-07", [makeSection({ movements: ["Back Squat", "Pull-ups"] })]),
        makeDay("2026-04-08", [makeSection({ movements: ["Back Squat", "Deadlift"] })]),
        makeDay("2026-04-09", [makeSection({ movements: ["Back Squat", "Bench Press"] })]),
      ];
      const prefs: ValidationPreferences = {
        methodology: "crossfit",
        structureTemplate: ["conditioning"],
        equipment: [],
        constraints: "No movement can appear more than 2 times total across the week",
        defaultTimeDomains: {},
      };

      const result = validateGeneratedWeek(days, prefs);
      const freqViolations = result.violations.filter(v => v.type === "frequency");
      expect(freqViolations.length).toBeGreaterThan(0);
      expect(freqViolations[0].message).toContain("back squat");
    });
  });
});
