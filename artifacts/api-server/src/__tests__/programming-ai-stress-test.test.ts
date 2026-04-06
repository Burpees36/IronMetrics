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

    it("enforces EXACTLY N frequency constraints", () => {
      const days = [
        makeDay("2026-04-07", [makeSection({ movements: ["Thruster", "Pull-ups"] })]),
        makeDay("2026-04-08", [makeSection({ movements: ["Deadlift", "Box Jump"] })]),
      ];
      const prefs: ValidationPreferences = {
        methodology: "crossfit",
        structureTemplate: ["conditioning"],
        equipment: [],
        constraints: "Pull-ups must appear EXACTLY 2 times this week. Thruster must appear EXACTLY 1 time this week.",
        defaultTimeDomains: {},
      };

      const result = validateGeneratedWeek(days, prefs);
      const freqViolations = result.violations.filter(v => v.type === "frequency");
      const pullUpViolation = freqViolations.find(v => v.message.includes("pull-ups"));
      expect(pullUpViolation).toBeDefined();
      expect(pullUpViolation!.message).toContain("expected exactly 2");
    });

    it("passes exact frequency when count matches", () => {
      const days = [
        makeDay("2026-04-07", [makeSection({ movements: ["Pull-ups", "Thruster"] })]),
        makeDay("2026-04-08", [makeSection({ movements: ["Pull-ups", "Deadlift"] })]),
      ];
      const prefs: ValidationPreferences = {
        methodology: "crossfit",
        structureTemplate: ["conditioning"],
        equipment: [],
        constraints: "Pull-ups must appear EXACTLY 2 times this week.",
        defaultTimeDomains: {},
      };

      const result = validateGeneratedWeek(days, prefs);
      const freqViolations = result.violations.filter(v => v.type === "frequency" && v.message.includes("pull-ups"));
      expect(freqViolations.length).toBe(0);
    });
  });

  describe("coaching quality checks are errors (block generation)", () => {
    it("coaching quality violations mark result as invalid", () => {
      const day = makeDay("2026-04-07", [
        makeSection({ intendedStimulus: "", scalingNotes: "", timeCap: null, duration: null }),
      ]);
      const prefs: ValidationPreferences = {
        methodology: "crossfit",
        structureTemplate: ["conditioning"],
        equipment: [],
        constraints: null,
        defaultTimeDomains: {},
      };

      const result = validateGeneratedDay(day, prefs);
      expect(result.valid).toBe(false);
      const errors = result.violations.filter(v => v.severity === "error" && v.type === "coaching_quality");
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("ProgrammingValidationError export", () => {
    it("is importable and throwable with violations", async () => {
      const { ProgrammingValidationError } = await import("../services/programmingValidation");
      const err = new ProgrammingValidationError("test", [
        { type: "equipment", severity: "error", message: "test violation" },
      ]);
      expect(err.name).toBe("ProgrammingValidationError");
      expect(err.violations.length).toBe(1);
    });
  });

  describe("time budget — timeCap vs duration mismatch", () => {
    it("flags timeCap less than duration", () => {
      const day = makeDay("2026-04-07", [
        makeSection({ duration: "20 min", timeCap: "10 min" }),
      ]);
      const prefs: ValidationPreferences = {
        methodology: "crossfit",
        structureTemplate: ["conditioning"],
        equipment: [],
        constraints: null,
        defaultTimeDomains: { conditioning: "8-20 min" },
      };
      const result = validateGeneratedDay(day, prefs);
      const timeBudget = result.violations.filter(v => v.type === "time_budget");
      expect(timeBudget.some(v => v.message.includes("less than"))).toBe(true);
    });

    it("flags timeCap exceeding domain by 1.5x", () => {
      const day = makeDay("2026-04-07", [
        makeSection({ duration: null, timeCap: "45 min" }),
      ]);
      const prefs: ValidationPreferences = {
        methodology: "crossfit",
        structureTemplate: ["conditioning"],
        equipment: [],
        constraints: null,
        defaultTimeDomains: { conditioning: "8-20 min" },
      };
      const result = validateGeneratedDay(day, prefs);
      const timeBudget = result.violations.filter(v => v.type === "time_budget");
      expect(timeBudget.some(v => v.message.includes("exceeds domain"))).toBe(true);
    });
  });
});

describe("12-Scenario Stress Test — Validation Pipeline", () => {
  function makeFullSection(overrides: Partial<GeneratedSection> = {}): GeneratedSection {
    return {
      sectionType: "conditioning",
      title: "WOD",
      instructions: "Complete the following workout as prescribed",
      duration: "12 min",
      timeCap: "15 min",
      intendedStimulus: "High intensity sprint workout targeting full body power and conditioning capacity",
      movements: ["Thruster", "Pull-ups"],
      scalingNotes: "Rx: 95/65 lb. Scaled: 65/45 lb with ring rows. Beginner: 45/35 lb with banded pull-ups.",
      coachNotes: "Watch for hip extension",
      memberNotes: "Push hard",
      resultTrackingEnabled: true,
      ...overrides,
    };
  }

  function makeFullDay(date: string, sections: GeneratedSection[]): GeneratedDay {
    return {
      date,
      title: `Workout – ${date}`,
      publicNotes: "Today's training",
      coachNotes: "Coaching emphasis",
      sections,
    };
  }

  it("Scenario 1: Strict Frequency Rules — flags movement appearing more than once when exactly once required", () => {
    const days = [
      makeFullDay("2026-04-13", [
        makeFullSection({ sectionType: "warmup", movements: ["Air Squat", "Inchworm"], duration: "10 min", timeCap: null }),
        makeFullSection({ sectionType: "strength", movements: ["Back Squat"], duration: "15 min", timeCap: null }),
        makeFullSection({ movements: ["Pull-ups", "Box Jump"] }),
        makeFullSection({ sectionType: "cooldown", movements: [], duration: "5 min", timeCap: null }),
      ]),
      makeFullDay("2026-04-14", [
        makeFullSection({ sectionType: "warmup", movements: ["Jog", "Stretch"], duration: "10 min", timeCap: null }),
        makeFullSection({ sectionType: "strength", movements: ["Deadlift"], duration: "15 min", timeCap: null }),
        makeFullSection({ movements: ["Pull-ups", "Thruster"] }),
        makeFullSection({ sectionType: "cooldown", movements: [], duration: "5 min", timeCap: null }),
      ]),
    ];
    const prefs: ValidationPreferences = {
      methodology: "crossfit",
      structureTemplate: ["warmup", "strength", "conditioning", "cooldown"],
      equipment: ["Barbell", "Pull-up Bar", "Box"],
      constraints: "Pull-ups must appear EXACTLY 1 time this week.",
      defaultTimeDomains: { warmup: "10-15 min", strength: "15-20 min", conditioning: "8-20 min", cooldown: "5-10 min" },
    };
    const result = validateGeneratedWeek(days, prefs);
    const freqErrors = result.violations.filter(v => v.type === "frequency");
    expect(freqErrors.length).toBeGreaterThan(0);
    expect(freqErrors[0].message).toContain("expected exactly 1");
  });

  it("Scenario 2: Movement Blacklist — flags banned movements", () => {
    const days = [
      makeFullDay("2026-04-13", [
        makeFullSection({ sectionType: "warmup", movements: ["Jog", "Stretch"], duration: "10 min", timeCap: null }),
        makeFullSection({ sectionType: "strength", movements: ["Back Squat"], duration: "15 min", timeCap: null }),
        makeFullSection({ movements: ["Burpees", "Thruster"] }),
        makeFullSection({ sectionType: "cooldown", movements: [], duration: "5 min", timeCap: null }),
      ]),
    ];
    const prefs: ValidationPreferences = {
      methodology: "crossfit",
      structureTemplate: ["warmup", "strength", "conditioning", "cooldown"],
      equipment: ["Barbell", "Pull-up Bar"],
      constraints: "Do NOT include burpees, double unders, or running anywhere in the week.",
      defaultTimeDomains: { warmup: "10-15 min", strength: "15-20 min", conditioning: "8-20 min", cooldown: "5-10 min" },
    };
    const result = validateGeneratedWeek(days, prefs);
    const banned = result.violations.filter(v => v.type === "banned_movement");
    expect(banned.length).toBeGreaterThan(0);
    expect(result.valid).toBe(false);
  });

  it("Scenario 3: Max Frequency Cap — flags movement exceeding global max", () => {
    const days = Array.from({ length: 3 }, (_, i) =>
      makeFullDay(`2026-04-${13 + i}`, [
        makeFullSection({ sectionType: "warmup", movements: ["Air Squat", "Jog"], duration: "10 min", timeCap: null }),
        makeFullSection({ sectionType: "strength", movements: ["Back Squat"], duration: "15 min", timeCap: null }),
        makeFullSection({ movements: ["Thruster", "Pull-ups"] }),
        makeFullSection({ sectionType: "cooldown", movements: [], duration: "5 min", timeCap: null }),
      ])
    );
    const prefs: ValidationPreferences = {
      methodology: "crossfit",
      structureTemplate: ["warmup", "strength", "conditioning", "cooldown"],
      equipment: ["Barbell", "Pull-up Bar"],
      constraints: "No movement can appear more than 2 times total across the week.",
      defaultTimeDomains: { warmup: "10-15 min", strength: "15-20 min", conditioning: "8-20 min", cooldown: "5-10 min" },
    };
    const result = validateGeneratedWeek(days, prefs);
    const freq = result.violations.filter(v => v.type === "frequency");
    expect(freq.length).toBeGreaterThan(0);
  });

  it("Scenario 4: Movement Pattern Balance — passes with varied programming", () => {
    const days = [
      makeFullDay("2026-04-13", [
        makeFullSection({ sectionType: "warmup", movements: ["Jog", "Stretch"], duration: "10 min", timeCap: null }),
        makeFullSection({ sectionType: "strength", movements: ["Back Squat"], duration: "15 min", timeCap: null }),
        makeFullSection({ movements: ["Thruster", "Pull-ups"] }),
        makeFullSection({ sectionType: "cooldown", movements: [], duration: "5 min", timeCap: null }),
      ]),
      makeFullDay("2026-04-14", [
        makeFullSection({ sectionType: "warmup", movements: ["Bear Crawl", "Plank"], duration: "10 min", timeCap: null }),
        makeFullSection({ sectionType: "strength", movements: ["Deadlift"], duration: "15 min", timeCap: null }),
        makeFullSection({ movements: ["Kettlebell Swing", "Box Jump"] }),
        makeFullSection({ sectionType: "cooldown", movements: [], duration: "5 min", timeCap: null }),
      ]),
    ];
    const prefs: ValidationPreferences = {
      methodology: "crossfit",
      structureTemplate: ["warmup", "strength", "conditioning", "cooldown"],
      equipment: ["Barbell", "Pull-up Bar", "Kettlebells", "Box"],
      constraints: null,
      defaultTimeDomains: { warmup: "10-15 min", strength: "15-20 min", conditioning: "8-20 min", cooldown: "5-10 min" },
    };
    const result = validateGeneratedWeek(days, prefs);
    expect(result.structureMatch).toBe(true);
    expect(result.equipmentCompliant).toBe(true);
  });

  it("Scenario 5: Intensity Wave — validates structure compliance for recovery day", () => {
    const recoveryDay = makeFullDay("2026-04-16", [
      makeFullSection({ sectionType: "warmup", movements: ["Jog"], duration: "10 min", timeCap: null }),
      makeFullSection({ sectionType: "strength", movements: ["Light Deadlift"], duration: "15 min", timeCap: null }),
      makeFullSection({ movements: ["Rowing"] }),
      makeFullSection({ sectionType: "cooldown", movements: ["Stretch"], duration: "5 min", timeCap: null }),
    ]);
    const prefs: ValidationPreferences = {
      methodology: "crossfit",
      structureTemplate: ["warmup", "strength", "conditioning", "cooldown"],
      equipment: ["Barbell", "Rower"],
      constraints: null,
      defaultTimeDomains: { warmup: "10-15 min", strength: "15-20 min", conditioning: "8-20 min", cooldown: "5-10 min" },
    };
    const result = validateGeneratedDay(recoveryDay, prefs);
    expect(result.structureMatch).toBe(true);
  });

  it("Scenario 6: Real Coach Mode — flags missing coaching quality", () => {
    const day = makeFullDay("2026-04-13", [
      makeFullSection({ sectionType: "warmup", intendedStimulus: "", scalingNotes: "", duration: "10 min", timeCap: null }),
      makeFullSection({ sectionType: "strength", movements: ["Back Squat"], duration: "15 min", timeCap: null }),
      makeFullSection({ movements: ["Thruster", "Pull-ups"] }),
      makeFullSection({ sectionType: "cooldown", movements: [], duration: "5 min", timeCap: null }),
    ]);
    const prefs: ValidationPreferences = {
      methodology: "crossfit",
      structureTemplate: ["warmup", "strength", "conditioning", "cooldown"],
      equipment: ["Barbell", "Pull-up Bar"],
      constraints: null,
      defaultTimeDomains: { warmup: "10-15 min", strength: "15-20 min", conditioning: "8-20 min", cooldown: "5-10 min" },
    };
    const result = validateGeneratedDay(day, prefs);
    expect(result.coachingComplete).toBe(false);
    expect(result.valid).toBe(false);
  });

  it("Scenario 7: Gym Identity Lock — validates structure for strength-bias methodology", () => {
    const day = makeFullDay("2026-04-13", [
      makeFullSection({ sectionType: "warmup", movements: ["Jog"], duration: "10 min", timeCap: null }),
      makeFullSection({ sectionType: "strength", movements: ["Back Squat"], duration: "15 min", timeCap: null }),
      makeFullSection({ movements: ["Row", "Thruster"] }),
      makeFullSection({ sectionType: "cooldown", movements: ["Stretch"], duration: "5 min", timeCap: null }),
    ]);
    const prefs: ValidationPreferences = {
      methodology: "strength-bias",
      structureTemplate: ["warmup", "strength", "conditioning", "cooldown"],
      equipment: ["Barbell", "Rower"],
      constraints: null,
      defaultTimeDomains: { warmup: "10-15 min", strength: "15-20 min", conditioning: "8-15 min", cooldown: "5-10 min" },
    };
    const result = validateGeneratedDay(day, prefs);
    expect(result.structureMatch).toBe(true);
  });

  it("Scenario 8: Limited Equipment Gym — flags barbell movements when only dumbbells available", () => {
    const day = makeFullDay("2026-04-13", [
      makeFullSection({ sectionType: "warmup", movements: ["Jog"], duration: "10 min", timeCap: null }),
      makeFullSection({ movements: ["Back Squat", "Clean and Jerk"] }),
      makeFullSection({ sectionType: "cooldown", movements: ["Stretch"], duration: "5 min", timeCap: null }),
    ]);
    const prefs: ValidationPreferences = {
      methodology: "functional-fitness",
      structureTemplate: ["warmup", "conditioning", "cooldown"],
      equipment: ["Dumbbells", "Pull-up Bar", "Rower", "Jump Rope"],
      constraints: null,
      defaultTimeDomains: { warmup: "10-15 min", conditioning: "15-25 min", cooldown: "5-10 min" },
    };
    const result = validateGeneratedDay(day, prefs);
    expect(result.equipmentCompliant).toBe(false);
    const equipViolations = result.violations.filter(v => v.type === "equipment");
    expect(equipViolations.length).toBeGreaterThan(0);
  });

  it("Scenario 9: Overloaded Gym — validates structure and equipment", () => {
    const day = makeFullDay("2026-04-13", [
      makeFullSection({ sectionType: "warmup", movements: ["Bear Crawl", "Plank"], duration: "10 min", timeCap: null }),
      makeFullSection({ sectionType: "strength", movements: ["Dumbbell Press"], duration: "15 min", timeCap: null }),
      makeFullSection({ movements: ["Rowing", "Box Jump"] }),
      makeFullSection({ sectionType: "cooldown", movements: ["Stretch"], duration: "5 min", timeCap: null }),
    ]);
    const prefs: ValidationPreferences = {
      methodology: "crossfit",
      structureTemplate: ["warmup", "strength", "conditioning", "cooldown"],
      equipment: ["Barbell", "Dumbbells", "Pull-up Bar", "Rower", "Jump Rope", "Box"],
      constraints: null,
      defaultTimeDomains: { warmup: "10-15 min", strength: "15-20 min", conditioning: "12-20 min", cooldown: "5-10 min" },
    };
    const result = validateGeneratedDay(day, prefs);
    expect(result.structureMatch).toBe(true);
    expect(result.equipmentCompliant).toBe(true);
  });

  it("Scenario 10: Time-Constrained Classes — flags excessive time budget", () => {
    const day = makeFullDay("2026-04-13", [
      makeFullSection({ sectionType: "warmup", movements: ["Jog"], duration: "15 min", timeCap: null }),
      makeFullSection({ sectionType: "strength", movements: ["Back Squat"], duration: "25 min", timeCap: null }),
      makeFullSection({ duration: "20 min", timeCap: "25 min" }),
      makeFullSection({ sectionType: "cooldown", movements: ["Stretch"], duration: "10 min", timeCap: null }),
    ]);
    const prefs: ValidationPreferences = {
      methodology: "crossfit",
      structureTemplate: ["warmup", "strength", "conditioning", "cooldown"],
      equipment: ["Barbell", "Pull-up Bar"],
      constraints: null,
      defaultTimeDomains: { warmup: "10 min", strength: "15 min", conditioning: "12 min", cooldown: "5 min" },
    };
    const result = validateGeneratedDay(day, prefs);
    const timeViolations = result.violations.filter(v => v.type === "time_budget");
    expect(timeViolations.length).toBeGreaterThan(0);
  });

  it("Scenario 11: Beginner Gym — flags advanced movements via constraints", () => {
    const days = [
      makeFullDay("2026-04-13", [
        makeFullSection({ sectionType: "warmup", movements: ["Jog"], duration: "10 min", timeCap: null }),
        makeFullSection({ sectionType: "strength", movements: ["Goblet Squat"], duration: "12 min", timeCap: null }),
        makeFullSection({ movements: ["Muscle-ups", "Handstand Walk"] }),
        makeFullSection({ sectionType: "cooldown", movements: ["Stretch"], duration: "5 min", timeCap: null }),
      ]),
    ];
    const prefs: ValidationPreferences = {
      methodology: "functional-fitness",
      structureTemplate: ["warmup", "strength", "conditioning", "cooldown"],
      equipment: ["Dumbbells", "Kettlebells", "Pull-up Bar", "Rower"],
      constraints: "Do NOT include muscle-ups, handstand walks, or butterfly pull-ups.",
      defaultTimeDomains: { warmup: "10-15 min", strength: "12-15 min", conditioning: "10-15 min", cooldown: "5-10 min" },
    };
    const result = validateGeneratedWeek(days, prefs);
    const banned = result.violations.filter(v => v.type === "banned_movement");
    expect(banned.length).toBeGreaterThan(0);
    expect(result.valid).toBe(false);
  });

  it("Scenario 12: Competitor Track — validates 6-section structure", () => {
    const day = makeFullDay("2026-04-13", [
      makeFullSection({ sectionType: "warmup", movements: ["Jog", "PVC Pass-throughs"], duration: "10 min", timeCap: null }),
      makeFullSection({ sectionType: "skill", movements: ["Muscle-ups"], duration: "12 min", timeCap: null }),
      makeFullSection({ sectionType: "strength", movements: ["Back Squat"], duration: "18 min", timeCap: null }),
      makeFullSection({ movements: ["Clean and Jerk", "Burpees", "Row"] }),
      makeFullSection({ sectionType: "accessory", movements: ["GHD Sit-ups", "Hip Extension"], duration: "10 min", timeCap: null }),
      makeFullSection({ sectionType: "cooldown", movements: ["Stretch", "Foam Rolling"], duration: "8 min", timeCap: null }),
    ]);
    const prefs: ValidationPreferences = {
      methodology: "crossfit",
      structureTemplate: ["warmup", "skill", "strength", "conditioning", "accessory", "cooldown"],
      equipment: ["Barbell", "Dumbbells", "Pull-up Bar", "Rings", "Rower", "GHD Machine", "Wall Ball"],
      constraints: null,
      defaultTimeDomains: { warmup: "10-15 min", skill: "10-15 min", strength: "15-20 min", conditioning: "15-30 min", accessory: "10-15 min", cooldown: "5-10 min" },
    };
    const result = validateGeneratedDay(day, prefs);
    expect(result.structureMatch).toBe(true);
    expect(result.equipmentCompliant).toBe(true);
  });
});
