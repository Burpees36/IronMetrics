import { describe, it, expect } from "vitest";
import {
  validateGeneratedDay,
  validateGeneratedWeek,
  resolveAlias,
  categorizeMovements,
  type ValidationPreferences,
  type PatternDistribution,
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
    instructions: "Complete as fast as possible",
    duration: "12 min",
    timeCap: "15 min",
    intendedStimulus: "High intensity sprint workout targeting full body power and conditioning capacity",
    movements: ["Thruster", "Pull-ups"],
    scalingNotes: "Rx: 95/65 lb. Scaled: 65/45 lb with ring rows. Beginner: 45/35 lb with banded pull-ups.",
    coachNotes: "Watch for form",
    memberNotes: "Push hard",
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

const basePrefs: ValidationPreferences = {
  methodology: "crossfit",
  structureTemplate: ["conditioning"],
  equipment: [],
  constraints: null,
  defaultTimeDomains: { conditioning: "8-20 min" },
};

describe("Movement Alias Resolution", () => {
  it("resolves common CrossFit abbreviations", () => {
    expect(resolveAlias("c&j")).toBe("clean and jerk");
    expect(resolveAlias("t2b")).toBe("toes-to-bar");
    expect(resolveAlias("c2b")).toBe("chest-to-bar pull-up");
    expect(resolveAlias("hspu")).toBe("handstand push-up");
    expect(resolveAlias("mu")).toBe("muscle-up");
    expect(resolveAlias("du")).toBe("double under");
    expect(resolveAlias("dus")).toBe("double unders");
    expect(resolveAlias("s2oh")).toBe("shoulder to overhead");
    expect(resolveAlias("g2oh")).toBe("ground to overhead");
    expect(resolveAlias("ghd")).toBe("ghd sit-up");
    expect(resolveAlias("rmu")).toBe("ring muscle-up");
    expect(resolveAlias("bmu")).toBe("bar muscle-up");
  });

  it("resolves barbell lift abbreviations", () => {
    expect(resolveAlias("dl")).toBe("deadlift");
    expect(resolveAlias("bs")).toBe("back squat");
    expect(resolveAlias("fs")).toBe("front squat");
    expect(resolveAlias("ohs")).toBe("overhead squat");
    expect(resolveAlias("pp")).toBe("push press");
    expect(resolveAlias("bp")).toBe("bench press");
    expect(resolveAlias("pc")).toBe("power clean");
    expect(resolveAlias("hc")).toBe("hang clean");
    expect(resolveAlias("ps")).toBe("power snatch");
    expect(resolveAlias("rdl")).toBe("romanian deadlift");
    expect(resolveAlias("sdhp")).toBe("sumo deadlift high pull");
  });

  it("resolves equipment abbreviations", () => {
    expect(resolveAlias("kb")).toBe("kettlebell swing");
    expect(resolveAlias("kbs")).toBe("kettlebell swing");
    expect(resolveAlias("wb")).toBe("wall ball");
    expect(resolveAlias("wbs")).toBe("wall ball shots");
    expect(resolveAlias("tgu")).toBe("turkish get-up");
    expect(resolveAlias("bj")).toBe("box jump");
    expect(resolveAlias("rc")).toBe("rope climb");
  });

  it("returns original string for unknown movements", () => {
    expect(resolveAlias("some weird movement")).toBe("some weird movement");
    expect(resolveAlias("")).toBe("");
  });

  it("resolves token-level abbreviations (DB/KB/BB prefix)", () => {
    expect(resolveAlias("db snatch")).toBe("dumbbell snatch");
    expect(resolveAlias("db thruster")).toBe("dumbbell thruster");
    expect(resolveAlias("kb clean")).toBe("kettlebell clean");
    expect(resolveAlias("kb swing")).toBe("kettlebell swing");
    expect(resolveAlias("bb row")).toBe("barbell row");
    expect(resolveAlias("db press")).toBe("dumbbell press");
  });

  it("flags equipment correctly for token-aliased movements", () => {
    const day = makeDay("2026-04-07", [
      makeSection({ movements: ["DB Snatch", "KB Swing"] }),
    ]);
    const prefs: ValidationPreferences = {
      ...basePrefs,
      equipment: ["Barbell", "Pull-up Bar"],
    };
    const result = validateGeneratedDay(day, prefs);
    const equipViolations = result.violations.filter(v => v.type === "equipment");
    expect(equipViolations.length).toBeGreaterThan(0);
  });

  it("detects banned token-aliased movements", () => {
    const day = makeDay("2026-04-07", [
      makeSection({ movements: ["DB Snatch", "Pull-ups"] }),
    ]);
    const prefs: ValidationPreferences = {
      ...basePrefs,
      constraints: "Do NOT include dumbbell snatch anywhere in the week.",
    };
    const result = validateGeneratedDay(day, prefs);
    const banned = result.violations.filter(v => v.type === "banned_movement");
    expect(banned.length).toBeGreaterThan(0);
  });

  it("is case insensitive when used through normalizeMovement", () => {
    const day = makeDay("2026-04-07", [
      makeSection({ movements: ["C&J", "T2B", "HSPU"] }),
    ]);
    const prefs: ValidationPreferences = {
      ...basePrefs,
      equipment: ["Barbell", "Pull-up Bar"],
      constraints: "Do NOT include clean and jerk.",
    };
    const result = validateGeneratedDay(day, prefs);
    const banned = result.violations.filter(v => v.type === "banned_movement");
    expect(banned.length).toBeGreaterThan(0);
    expect(banned[0].message).toContain("clean and jerk");
  });

  it("resolves aliases for equipment compliance checking", () => {
    const day = makeDay("2026-04-07", [
      makeSection({ movements: ["C&J", "BS", "DL"] }),
    ]);
    const prefs: ValidationPreferences = {
      ...basePrefs,
      equipment: ["Dumbbells", "Pull-up Bar"],
    };
    const result = validateGeneratedDay(day, prefs);
    const equipViolations = result.violations.filter(v => v.type === "equipment");
    expect(equipViolations.length).toBeGreaterThan(0);
  });

  it("resolves aliases for banned movement checking", () => {
    const day = makeDay("2026-04-07", [
      makeSection({ movements: ["T2B", "HSPU", "DU"] }),
    ]);
    const prefs: ValidationPreferences = {
      ...basePrefs,
      constraints: "Do NOT include toes-to-bar or double under.",
    };
    const result = validateGeneratedDay(day, prefs);
    const banned = result.violations.filter(v => v.type === "banned_movement");
    expect(banned.length).toBeGreaterThanOrEqual(2);
  });

  it("resolves aliases in movement counts", () => {
    const days = [
      makeDay("2026-04-07", [makeSection({ movements: ["C&J", "T2B"] })]),
      makeDay("2026-04-08", [makeSection({ movements: ["Clean and Jerk", "Toes-to-bar"] })]),
    ];
    const result = validateGeneratedWeek(days, basePrefs);
    expect(result.movementCounts["clean and jerk"]).toBe(2);
    expect(result.movementCounts["toes-to-bar"]).toBe(2);
  });
});

describe("Movement Pattern Categorization", () => {
  it("categorizes push movements correctly", () => {
    const days = [makeDay("2026-04-07", [
      makeSection({ movements: ["Push Press", "Handstand Push-up", "Ring Dip"] }),
    ])];
    const dist = categorizeMovements(days);
    expect(dist.push).toBe(3);
  });

  it("categorizes pull movements correctly", () => {
    const days = [makeDay("2026-04-07", [
      makeSection({ movements: ["Pull-ups", "Rope Climb", "Ring Muscle-up"] }),
    ])];
    const dist = categorizeMovements(days);
    expect(dist.pull).toBe(3);
  });

  it("categorizes squat movements correctly", () => {
    const days = [makeDay("2026-04-07", [
      makeSection({ movements: ["Back Squat", "Front Squat", "Thruster", "Wall Ball"] }),
    ])];
    const dist = categorizeMovements(days);
    expect(dist.squat).toBe(4);
  });

  it("categorizes hinge movements correctly", () => {
    const days = [makeDay("2026-04-07", [
      makeSection({ movements: ["Deadlift", "Power Clean", "Kettlebell Swing"] }),
    ])];
    const dist = categorizeMovements(days);
    expect(dist.hinge).toBe(3);
  });

  it("categorizes monostructural movements correctly", () => {
    const days = [makeDay("2026-04-07", [
      makeSection({ movements: ["Row", "Double Under", "Box Jump", "Running"] }),
    ])];
    const dist = categorizeMovements(days);
    expect(dist.monostructural).toBe(4);
  });

  it("categorizes core movements correctly", () => {
    const days = [makeDay("2026-04-07", [
      makeSection({ movements: ["Sit-up", "V-up", "GHD Sit-up", "Hollow Hold"] }),
    ])];
    const dist = categorizeMovements(days);
    expect(dist.core).toBe(4);
  });

  it("categorizes carry movements correctly", () => {
    const days = [makeDay("2026-04-07", [
      makeSection({ movements: ["Farmer Carry", "Sled Push", "Overhead Carry"] }),
    ])];
    const dist = categorizeMovements(days);
    expect(dist.carry).toBe(3);
  });

  it("handles unknown movements gracefully (counts as 0)", () => {
    const days = [makeDay("2026-04-07", [
      makeSection({ movements: ["Some Unknown Exercise"] }),
    ])];
    const dist = categorizeMovements(days);
    const total = dist.push + dist.pull + dist.squat + dist.hinge + dist.carry + dist.core + dist.monostructural;
    expect(total).toBe(0);
  });

  it("categorizes aliased movements via their resolved name", () => {
    const days = [makeDay("2026-04-07", [
      makeSection({ movements: ["C&J", "T2B", "HSPU", "DL", "DU", "KB"] }),
    ])];
    const dist = categorizeMovements(days);
    expect(dist.hinge).toBeGreaterThanOrEqual(2);
    expect(dist.pull).toBeGreaterThanOrEqual(1);
    expect(dist.push).toBeGreaterThanOrEqual(1);
    expect(dist.monostructural).toBeGreaterThanOrEqual(1);
  });

  it("returns all zeros for empty days", () => {
    const days: GeneratedDay[] = [];
    const dist = categorizeMovements(days);
    expect(dist).toEqual({ push: 0, pull: 0, squat: 0, hinge: 0, carry: 0, core: 0, monostructural: 0 });
  });
});

describe("Pattern Balance Warnings", () => {
  it("fires warning when a pattern is underrepresented (<15%)", () => {
    const days = [
      makeDay("2026-04-07", [makeSection({ movements: ["Back Squat", "Front Squat", "Thruster", "Wall Ball", "Air Squat", "Goblet Squat"] })]),
      makeDay("2026-04-08", [makeSection({ movements: ["Back Squat", "Front Squat", "Overhead Squat", "Deadlift"] })]),
    ];
    const result = validateGeneratedWeek(days, basePrefs);
    const balanceWarnings = result.violations.filter(v => v.type === "pattern_balance");
    expect(balanceWarnings.length).toBeGreaterThan(0);
    const underrep = balanceWarnings.filter(v => v.message.includes("underrepresented"));
    expect(underrep.length).toBeGreaterThan(0);
  });

  it("fires warning when a pattern is overrepresented (>40%)", () => {
    const movements = ["Back Squat", "Front Squat", "Thruster", "Wall Ball", "Overhead Squat", "Goblet Squat", "Air Squat", "Deadlift", "Pull-ups"];
    const days = [
      makeDay("2026-04-07", [makeSection({ movements })]),
    ];
    const result = validateGeneratedWeek(days, basePrefs);
    const balanceWarnings = result.violations.filter(v => v.type === "pattern_balance");
    const overrep = balanceWarnings.filter(v => v.message.includes("overrepresented"));
    expect(overrep.length).toBeGreaterThan(0);
  });

  it("does not fire pattern_balance warnings for well-balanced programming", () => {
    const days = [
      makeDay("2026-04-07", [makeSection({ movements: ["Push Press", "Pull-ups", "Back Squat", "Deadlift", "Sit-up", "Row"] })]),
      makeDay("2026-04-08", [makeSection({ movements: ["Strict Press", "Rope Climb", "Front Squat", "Power Clean", "Hollow Hold", "Double Under"] })]),
      makeDay("2026-04-09", [makeSection({ movements: ["Ring Dip", "Barbell Row", "Thruster", "Kettlebell Swing", "V-up", "Running"] })]),
    ];
    const result = validateGeneratedWeek(days, basePrefs);
    const balanceWarnings = result.violations.filter(v => v.type === "pattern_balance");
    expect(balanceWarnings.length).toBe(0);
  });

  it("includes patternDistribution in the validation result", () => {
    const days = [
      makeDay("2026-04-07", [makeSection({ movements: ["Push Press", "Pull-ups", "Back Squat", "Deadlift"] })]),
    ];
    const result = validateGeneratedWeek(days, basePrefs);
    expect(result.patternDistribution).toBeDefined();
    expect(result.patternDistribution!.push).toBe(1);
    expect(result.patternDistribution!.pull).toBe(1);
    expect(result.patternDistribution!.squat).toBe(1);
    expect(result.patternDistribution!.hinge).toBe(1);
  });

  it("pattern balance warnings are warnings not errors (don't block generation)", () => {
    const days = [
      makeDay("2026-04-07", [makeSection({ movements: ["Back Squat", "Front Squat", "Thruster", "Wall Ball", "Air Squat", "Overhead Squat", "Deadlift"] })]),
    ];
    const result = validateGeneratedWeek(days, basePrefs);
    const balanceWarnings = result.violations.filter(v => v.type === "pattern_balance");
    for (const w of balanceWarnings) {
      expect(w.severity).toBe("warning");
    }
  });

  it("does not fire carry underrepresentation warning", () => {
    const days = [
      makeDay("2026-04-07", [makeSection({ movements: ["Push Press", "Pull-ups", "Back Squat", "Deadlift", "Sit-up", "Row"] })]),
    ];
    const result = validateGeneratedWeek(days, basePrefs);
    const carryWarning = result.violations.find(v =>
      v.type === "pattern_balance" && v.message.includes('"carry"') && v.message.includes("underrepresented")
    );
    expect(carryWarning).toBeUndefined();
  });
});

describe("Alias + Equipment Integration", () => {
  it("C&J resolved to clean and jerk flags barbell equipment requirement", () => {
    const day = makeDay("2026-04-07", [
      makeSection({ movements: ["C&J"] }),
    ]);
    const prefs: ValidationPreferences = {
      ...basePrefs,
      equipment: ["Dumbbells", "Pull-up Bar"],
    };
    const result = validateGeneratedDay(day, prefs);
    const equipViolations = result.violations.filter(v => v.type === "equipment");
    expect(equipViolations.length).toBeGreaterThan(0);
  });

  it("C&J with barbell in equipment passes compliance", () => {
    const day = makeDay("2026-04-07", [
      makeSection({ movements: ["C&J"] }),
    ]);
    const prefs: ValidationPreferences = {
      ...basePrefs,
      equipment: ["Barbell", "Pull-up Bar"],
    };
    const result = validateGeneratedDay(day, prefs);
    const equipViolations = result.violations.filter(v => v.type === "equipment");
    expect(equipViolations.length).toBe(0);
  });

  it("HSPU passes as bodyweight movement", () => {
    const day = makeDay("2026-04-07", [
      makeSection({ movements: ["HSPU"] }),
    ]);
    const prefs: ValidationPreferences = {
      ...basePrefs,
      equipment: ["Dumbbells"],
    };
    const result = validateGeneratedDay(day, prefs);
    const equipViolations = result.violations.filter(v => v.type === "equipment");
    expect(equipViolations.length).toBe(0);
  });

  it("DU requires jump rope equipment", () => {
    const day = makeDay("2026-04-07", [
      makeSection({ movements: ["DU"] }),
    ]);
    const prefs: ValidationPreferences = {
      ...basePrefs,
      equipment: ["Barbell"],
    };
    const result = validateGeneratedDay(day, prefs);
    const equipViolations = result.violations.filter(v => v.type === "equipment");
    expect(equipViolations.length).toBeGreaterThan(0);
  });
});

describe("Alias in Constraints", () => {
  it("resolves aliases in banned movement constraints", () => {
    const day = makeDay("2026-04-07", [
      makeSection({ movements: ["Clean and Jerk", "Pull-ups"] }),
    ]);
    const prefs: ValidationPreferences = {
      ...basePrefs,
      equipment: ["Barbell", "Pull-up Bar"],
      constraints: "Do NOT include C&J or T2B.",
    };
    const result = validateGeneratedDay(day, prefs);
    const banned = result.violations.filter(v => v.type === "banned_movement");
    expect(banned.length).toBeGreaterThan(0);
    expect(banned[0].message).toContain("clean and jerk");
  });

  it("resolves aliases in banned constraints even when movement uses full name", () => {
    const day = makeDay("2026-04-07", [
      makeSection({ movements: ["Toes-to-bar", "Handstand Push-up"] }),
    ]);
    const prefs: ValidationPreferences = {
      ...basePrefs,
      constraints: "Do NOT include T2B or HSPU anywhere in the week.",
    };
    const result = validateGeneratedDay(day, prefs);
    const banned = result.violations.filter(v => v.type === "banned_movement");
    expect(banned.length).toBe(2);
  });
});

describe("Alias + Frequency Integration", () => {
  it("counts aliased and full-name as same movement for frequency rules", () => {
    const days = [
      makeDay("2026-04-07", [makeSection({ movements: ["C&J", "Pull-ups"] })]),
      makeDay("2026-04-08", [makeSection({ movements: ["Clean and Jerk", "Deadlift"] })]),
      makeDay("2026-04-09", [makeSection({ movements: ["Clean and Jerk", "Row"] })]),
    ];
    const prefs: ValidationPreferences = {
      ...basePrefs,
      constraints: "No movement can appear more than 2 times total across the week",
    };
    const result = validateGeneratedWeek(days, prefs);
    const freqViolations = result.violations.filter(v => v.type === "frequency");
    expect(freqViolations.length).toBeGreaterThan(0);
    expect(freqViolations[0].message).toContain("clean and jerk");
  });
});
