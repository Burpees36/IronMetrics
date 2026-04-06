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

export interface ValidationPreferences {
  methodology: string;
  structureTemplate: string[];
  equipment: string[];
  constraints: string | null;
  defaultTimeDomains: Record<string, string>;
}

export interface Violation {
  type: "banned_movement" | "equipment" | "frequency" | "structure" | "time_budget" | "coaching_quality" | "constraint";
  severity: "error" | "warning";
  message: string;
  details?: Record<string, unknown>;
}

export interface ValidationResult {
  valid: boolean;
  violations: Violation[];
  movementCounts: Record<string, number>;
  structureMatch: boolean;
  equipmentCompliant: boolean;
  coachingComplete: boolean;
}

const EQUIPMENT_MOVEMENT_MAP: Record<string, string[]> = {
  "barbell": [
    "back squat", "front squat", "overhead squat", "squat clean", "squat snatch",
    "deadlift", "sumo deadlift", "romanian deadlift", "clean", "power clean",
    "hang clean", "squat clean", "clean and jerk", "snatch", "power snatch",
    "hang snatch", "muscle snatch", "bench press", "strict press", "push press",
    "push jerk", "split jerk", "thruster", "cluster", "barbell row",
    "pendlay row", "barbell curl", "barbell lunge", "hip thrust",
    "good morning", "overhead press", "shoulder press", "barbell cycling",
  ],
  "dumbbells": [
    "dumbbell snatch", "dumbbell clean", "dumbbell thruster", "dumbbell press",
    "dumbbell row", "dumbbell deadlift", "dumbbell lunge", "dumbbell curl",
    "dumbbell swing", "dumbbell bench press", "dumbbell floor press",
    "dumbbell overhead squat", "dumbbell step-up", "devil press",
    "man maker", "turkish get-up", "dumbbell farmer carry",
  ],
  "kettlebells": [
    "kettlebell swing", "kettlebell snatch", "kettlebell clean",
    "kettlebell press", "turkish get-up", "goblet squat",
    "kettlebell deadlift", "kettlebell row", "kettlebell farmer carry",
    "kettlebell windmill", "kettlebell thruster",
  ],
  "pull-up bar": [
    "pull-up", "pull-ups", "chin-up", "chin-ups", "chest-to-bar pull-up",
    "chest-to-bar pull-ups", "kipping pull-up", "strict pull-up",
    "toes-to-bar", "knees-to-elbow", "hanging knee raise",
    "bar muscle-up", "bar muscle-ups", "leg raise",
  ],
  "rings": [
    "ring dip", "ring dips", "ring row", "ring rows", "ring muscle-up",
    "ring muscle-ups", "ring push-up", "ring support hold",
    "ring swing", "strict ring dip", "kipping ring dip",
  ],
  "rower": [
    "row", "rowing", "calorie row",
  ],
  "assault bike": [
    "assault bike", "air bike", "calorie bike", "echo bike",
  ],
  "ski erg": [
    "ski erg", "calorie ski",
  ],
  "jump rope": [
    "single under", "single unders", "double under", "double unders",
    "triple under", "triple unders", "crossover",
  ],
  "box": [
    "box jump", "box jumps", "box jump over", "box step-up", "box step-ups",
    "box squat", "seated box jump", "depth jump",
  ],
  "medicine ball": [
    "medicine ball clean", "medicine ball slam", "wall ball",
    "wall ball shots", "med ball sit-up", "ball slam",
  ],
  "wall ball": [
    "wall ball", "wall ball shots", "wall ball clean",
  ],
  "resistance bands": [
    "banded pull-up", "banded squat", "banded deadlift",
    "band pull-apart", "banded push-up",
  ],
  "parallettes": [
    "parallette pass-through", "parallette handstand push-up",
    "parallette l-sit", "parallette push-up",
  ],
  "ghd machine": [
    "ghd sit-up", "ghd sit-ups", "ghd hip extension",
    "ghd back extension", "ghd raise",
  ],
  "sled": [
    "sled push", "sled pull", "sled drag", "prowler push",
  ],
  "rope": [
    "rope climb", "rope climbs", "legless rope climb",
  ],
  "sandbag": [
    "sandbag clean", "sandbag carry", "sandbag over shoulder",
    "sandbag squat", "sandbag ground to overhead",
  ],
  "plate": [
    "plate pinch", "overhead carry", "plate ground to overhead",
    "plate hold",
  ],
  "bench": [
    "bench press", "dumbbell bench press", "incline bench press",
    "decline bench press", "seated press", "step-up",
  ],
  "rack": [
    "rack pull", "pin squat", "pin press",
  ],
  "cable machine": [
    "cable row", "cable fly", "cable pull-through",
    "face pull", "lat pulldown", "tricep pushdown",
  ],
  "trap bar": [
    "trap bar deadlift", "trap bar carry", "trap bar shrug",
  ],
};

const BODYWEIGHT_MOVEMENTS = new Set([
  "push-up", "push-ups", "air squat", "air squats",
  "burpee", "burpees",
  "sit-up", "sit-ups", "v-up", "v-ups",
  "lunge", "lunges", "walking lunge", "walking lunges",
  "plank", "plank hold", "side plank",
  "handstand push-up", "handstand push-ups", "hspu",
  "handstand walk", "handstand hold",
  "pistol", "pistols", "pistol squat", "pistol squats",
  "l-sit", "l-sit hold",
  "hollow hold", "hollow rock", "hollow rocks",
  "superman", "superman hold",
  "mountain climber", "mountain climbers",
  "bear crawl", "crab walk", "inch worm", "inchworm",
  "sprint", "run", "running", "jog", "jogging",
  "shuttle run", "400m run", "800m run", "200m run", "100m run",
  "1 mile run", "1-mile run",
  "broad jump", "broad jumps",
  "lateral shuffle",
  "duck walk",
  "tuck-up", "tuck-ups",
  "scale", "scales",
  "rest", "active recovery",
  "mobility", "stretching", "foam rolling",
]);

function normalizeMovement(movement: string): string {
  return movement.toLowerCase().trim().replace(/\s+/g, " ");
}

function getAllMovements(days: GeneratedDay[]): string[] {
  const movements: string[] = [];
  for (const day of days) {
    for (const section of day.sections) {
      if (Array.isArray(section.movements)) {
        for (const m of section.movements) {
          movements.push(normalizeMovement(m));
        }
      }
      if (section.instructions) {
        const instrLower = section.instructions.toLowerCase();
        movements.push(...extractMovementsFromText(instrLower));
      }
    }
  }
  return movements;
}

function extractMovementsFromText(text: string): string[] {
  return [];
}

function countMovements(days: GeneratedDay[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const day of days) {
    for (const section of day.sections) {
      if (!Array.isArray(section.movements)) continue;
      for (const m of section.movements) {
        const norm = normalizeMovement(m);
        counts[norm] = (counts[norm] || 0) + 1;
      }
    }
  }
  return counts;
}

export function parseBannedMovements(constraints: string | null): string[] {
  if (!constraints) return [];
  const banned: string[] = [];

  const patterns = [
    /(?:do\s+not|don'?t|never)\s+(?:include|use|program)\s+(.+?)(?:\.\s|$)/gi,
    /(?:banned|excluded|blacklisted|prohibited)\s*(?:movements?)?[:\s]+(.+?)(?:\.\s|$)/gi,
  ];

  for (const pat of patterns) {
    let match;
    while ((match = pat.exec(constraints)) !== null) {
      const segment = match[1].replace(/\s+anywhere.*$/, "").replace(/\s+in the\s.*$/, "");
      const items = segment.split(/,\s*(?:or\s+)?|\s+or\s+/);
      for (const item of items) {
        const cleaned = item.trim().toLowerCase()
          .replace(/^(any|all|the)\s+/, "")
          .replace(/\s+$/, "");
        if (cleaned.length > 1 && cleaned.length < 60) {
          banned.push(cleaned);
        }
      }
    }
  }

  const noPattern = /\bno\s+([\w][\w\s-]+?)(?:\s+anywhere|\s+in\s+the\b|\.\s|$)/gi;
  let noMatch;
  while ((noMatch = noPattern.exec(constraints)) !== null) {
    const segment = noMatch[1];
    const items = segment.split(/,\s*(?:or\s+)?|\s+or\s+/);
    for (const item of items) {
      const cleaned = item.trim().toLowerCase()
        .replace(/^(any|all|the)\s+/, "")
        .replace(/\s+$/, "");
      if (cleaned.length > 1 && cleaned.length < 60 &&
          !["movement", "movements"].includes(cleaned)) {
        banned.push(cleaned);
      }
    }
  }

  return [...new Set(banned)];
}

export function parseFrequencyRules(constraints: string | null): Array<{ movement: string; max: number }> {
  if (!constraints) return [];
  const rules: Array<{ movement: string; max: number }> = [];

  const exactPattern = /(\w[\w\s-]+?)\s+(?:must\s+)?appear\s+(?:EXACTLY|exactly)\s+(\d+)\s+time/gi;
  let match;
  while ((match = exactPattern.exec(constraints)) !== null) {
    rules.push({ movement: normalizeMovement(match[1]), max: parseInt(match[2]) });
  }

  const maxPattern = /(?:max(?:imum)?|no\s+more\s+than|at\s+most)\s+(\d+)\s+(?:appearances?|times?|exposures?)/gi;
  while ((match = maxPattern.exec(constraints)) !== null) {
    const contextStart = Math.max(0, match.index - 100);
    const context = constraints.slice(contextStart, match.index).toLowerCase();
    const movementMatch = context.match(/(\w[\w\s-]+?)\s*(?:\(.*?\))?\s*$/);
    if (movementMatch) {
      rules.push({ movement: normalizeMovement(movementMatch[1]), max: parseInt(match[1]) });
    }
  }

  const noMoreThanPattern = /no\s+movement\s+(?:can|should|may)\s+appear\s+more\s+than\s+(\d+)\s+time/gi;
  while ((match = noMoreThanPattern.exec(constraints)) !== null) {
    rules.push({ movement: "__global__", max: parseInt(match[1]) });
  }

  return rules;
}

function checkBannedMovements(days: GeneratedDay[], banned: string[]): Violation[] {
  if (banned.length === 0) return [];
  const violations: Violation[] = [];

  for (const day of days) {
    for (const section of day.sections) {
      if (!Array.isArray(section.movements)) continue;
      for (const m of section.movements) {
        const norm = normalizeMovement(m);
        for (const b of banned) {
          if (norm.includes(b) || b.includes(norm)) {
            violations.push({
              type: "banned_movement",
              severity: "error",
              message: `Banned movement "${m}" found in ${day.date} / ${section.title}. Constraint prohibits "${b}".`,
              details: { day: day.date, section: section.title, movement: m, bannedTerm: b },
            });
          }
        }
      }
      if (section.instructions) {
        const instrLower = section.instructions.toLowerCase();
        for (const b of banned) {
          if (instrLower.includes(b)) {
            violations.push({
              type: "banned_movement",
              severity: "warning",
              message: `Banned term "${b}" found in instructions for ${day.date} / ${section.title}.`,
              details: { day: day.date, section: section.title, bannedTerm: b },
            });
          }
        }
      }
    }
  }

  return violations;
}

function checkFrequencyRules(days: GeneratedDay[], rules: Array<{ movement: string; max: number }>): Violation[] {
  if (rules.length === 0) return [];
  const counts = countMovements(days);
  const violations: Violation[] = [];

  for (const rule of rules) {
    if (rule.movement === "__global__") {
      for (const [mov, count] of Object.entries(counts)) {
        if (count > rule.max) {
          violations.push({
            type: "frequency",
            severity: "error",
            message: `Movement "${mov}" appears ${count} times, exceeding global max of ${rule.max}.`,
            details: { movement: mov, count, max: rule.max },
          });
        }
      }
    } else {
      const matchingMovements = Object.entries(counts).filter(([mov]) =>
        mov.includes(rule.movement) || rule.movement.includes(mov)
      );
      const totalCount = matchingMovements.reduce((sum, [, c]) => sum + c, 0);
      if (totalCount > rule.max) {
        violations.push({
          type: "frequency",
          severity: "error",
          message: `Movement pattern "${rule.movement}" appears ${totalCount} times, exceeding max of ${rule.max}.`,
          details: { movement: rule.movement, count: totalCount, max: rule.max },
        });
      }
    }
  }

  return violations;
}

function checkEquipmentCompliance(days: GeneratedDay[], allowedEquipment: string[]): Violation[] {
  if (allowedEquipment.length === 0) return [];
  const violations: Violation[] = [];

  const allowedNorm = new Set(allowedEquipment.map(e => e.toLowerCase().trim()));

  const allowedMovements = new Set<string>();
  for (const equip of allowedNorm) {
    const mapped = EQUIPMENT_MOVEMENT_MAP[equip];
    if (mapped) {
      for (const m of mapped) {
        allowedMovements.add(m);
      }
    }
  }

  for (const day of days) {
    for (const section of day.sections) {
      if (!Array.isArray(section.movements)) continue;
      for (const m of section.movements) {
        const norm = normalizeMovement(m);

        if (BODYWEIGHT_MOVEMENTS.has(norm)) continue;
        if (allowedMovements.has(norm)) continue;

        let matchesAllowedEquipMovement = false;
        for (const am of allowedMovements) {
          if (am.length > 4 && (norm.includes(am) || am.includes(norm))) {
            matchesAllowedEquipMovement = true;
            break;
          }
        }
        if (matchesAllowedEquipMovement) continue;

        const needsEquipment = identifyRequiredEquipment(norm);
        if (needsEquipment && !allowedNorm.has(needsEquipment)) {
          violations.push({
            type: "equipment",
            severity: "error",
            message: `Movement "${m}" in ${day.date} / ${section.title} requires "${needsEquipment}" which is not in allowed equipment.`,
            details: { day: day.date, section: section.title, movement: m, requiredEquipment: needsEquipment },
          });
        }
      }
    }
  }

  return violations;
}

function identifyRequiredEquipment(movement: string): string | null {
  for (const [equip, movements] of Object.entries(EQUIPMENT_MOVEMENT_MAP)) {
    for (const m of movements) {
      if (movement === m || movement.includes(m) || m.includes(movement)) {
        return equip;
      }
    }
  }

  if (movement.includes("barbell") || movement.includes("clean and jerk") || movement.includes("snatch")) return "barbell";
  if (movement.includes("dumbbell") || movement.includes("db ")) return "dumbbells";
  if (movement.includes("kettlebell") || movement.includes("kb ")) return "kettlebells";
  if (movement.includes("bike")) return "assault bike";
  if (movement.includes("ski")) return "ski erg";
  if (movement.includes("rope climb")) return "rope";
  if (movement.includes("ghd")) return "ghd machine";
  if (movement.includes("sled") || movement.includes("prowler")) return "sled";
  if (movement.includes("cable")) return "cable machine";
  if (movement.includes("bench press")) return "bench";
  if (movement.includes("ring")) return "rings";
  if (movement.includes("box jump") || movement.includes("step-up")) return "box";
  if (movement.includes("wall ball")) return "wall ball";
  if (movement.includes("pull-up") || movement.includes("toes-to-bar") || movement.includes("knees-to")) return "pull-up bar";

  const barbellIndicators = ["squat", "deadlift", "press", "jerk", "thruster", "cluster", "clean", "snatch", "hip thrust", "good morning", "lunge"];
  for (const indicator of barbellIndicators) {
    if (movement.includes(indicator) && !movement.includes("dumbbell") && !movement.includes("kettlebell") && !movement.includes("goblet") && !movement.includes("air")) {
      return "barbell";
    }
  }

  if ((movement.includes("row") || movement.includes("rowing")) && !movement.includes("ring row") && !movement.includes("dumbbell") && !movement.includes("barbell") && !movement.includes("pendlay")) return "rower";

  return null;
}

function checkStructureCompliance(days: GeneratedDay[], template: string[]): Violation[] {
  if (template.length === 0) return [];
  const violations: Violation[] = [];

  for (const day of days) {
    const sectionTypes = day.sections.map(s => s.sectionType);

    if (sectionTypes.length !== template.length) {
      violations.push({
        type: "structure",
        severity: "error",
        message: `${day.date}: Expected ${template.length} sections (${template.join(" -> ")}), got ${sectionTypes.length} (${sectionTypes.join(" -> ")}).`,
        details: { day: day.date, expected: template, actual: sectionTypes },
      });
    }

    for (let i = 0; i < template.length; i++) {
      if (i >= sectionTypes.length) {
        violations.push({
          type: "structure",
          severity: "error",
          message: `${day.date}: Missing section "${template[i]}" at position ${i + 1}.`,
          details: { day: day.date, position: i, expected: template[i] },
        });
      } else if (sectionTypes[i] !== template[i]) {
        const conditioningWod = (template[i] === "conditioning" && sectionTypes[i] === "wod") ||
          (template[i] === "wod" && sectionTypes[i] === "conditioning");
        if (!conditioningWod) {
          violations.push({
            type: "structure",
            severity: "error",
            message: `${day.date}: Section ${i + 1} is "${sectionTypes[i]}", expected "${template[i]}".`,
            details: { day: day.date, position: i, expected: template[i], actual: sectionTypes[i] },
          });
        }
      }
    }
  }

  return violations;
}

function parseMinutes(timeStr: string | null): number | null {
  if (!timeStr) return null;
  const match = timeStr.match(/(\d+)/);
  if (!match) return null;
  return parseInt(match[1]);
}

function checkTimeBudget(days: GeneratedDay[], timeDomains: Record<string, string>): Violation[] {
  const violations: Violation[] = [];

  for (const day of days) {
    let totalMin = 0;
    let totalMax = 0;

    for (const section of day.sections) {
      const domain = timeDomains[section.sectionType];
      if (domain) {
        const rangeMatch = domain.match(/(\d+)\s*[-–]\s*(\d+)/);
        if (rangeMatch) {
          totalMin += parseInt(rangeMatch[1]);
          totalMax += parseInt(rangeMatch[2]);
        } else {
          const single = parseMinutes(domain);
          if (single) {
            totalMin += single;
            totalMax += single;
          }
        }
      }

      const sectionDuration = parseMinutes(section.duration);
      if (sectionDuration && domain) {
        const rangeMatch = domain.match(/(\d+)\s*[-–]\s*(\d+)/);
        if (rangeMatch) {
          const max = parseInt(rangeMatch[2]);
          if (sectionDuration > max * 1.5) {
            violations.push({
              type: "time_budget",
              severity: "warning",
              message: `${day.date} / ${section.title}: Duration ${section.duration} exceeds time domain ${domain} for ${section.sectionType}.`,
              details: { day: day.date, section: section.title, duration: section.duration, domain },
            });
          }
        }
      }
    }

    if (totalMax > 0 && totalMax > 90) {
      violations.push({
        type: "time_budget",
        severity: "warning",
        message: `${day.date}: Estimated total time ${totalMin}-${totalMax} min may exceed typical class length.`,
        details: { day: day.date, minTime: totalMin, maxTime: totalMax },
      });
    }
  }

  return violations;
}

function checkCoachingQuality(days: GeneratedDay[]): Violation[] {
  const violations: Violation[] = [];

  for (const day of days) {
    for (const section of day.sections) {
      if (!section.intendedStimulus || section.intendedStimulus.trim().length < 10) {
        violations.push({
          type: "coaching_quality",
          severity: "warning",
          message: `${day.date} / ${section.title}: Missing or inadequate intended stimulus.`,
          details: { day: day.date, section: section.title, field: "intendedStimulus" },
        });
      }
      if (!section.scalingNotes || section.scalingNotes.trim().length < 10) {
        violations.push({
          type: "coaching_quality",
          severity: "warning",
          message: `${day.date} / ${section.title}: Missing or inadequate scaling notes.`,
          details: { day: day.date, section: section.title, field: "scalingNotes" },
        });
      }

      const isCondWod = section.sectionType === "conditioning" || section.sectionType === "wod";
      if (isCondWod && !section.timeCap && !section.duration) {
        violations.push({
          type: "coaching_quality",
          severity: "warning",
          message: `${day.date} / ${section.title}: Conditioning/WOD section missing both time cap and duration.`,
          details: { day: day.date, section: section.title },
        });
      }

      if (!section.movements || section.movements.length === 0) {
        if (section.sectionType !== "cooldown" && section.sectionType !== "custom") {
          violations.push({
            type: "coaching_quality",
            severity: "warning",
            message: `${day.date} / ${section.title}: Section has no movements listed.`,
            details: { day: day.date, section: section.title },
          });
        }
      }
    }
  }

  return violations;
}

export function validateGeneratedDay(day: GeneratedDay, prefs: ValidationPreferences): ValidationResult {
  return validateGeneratedWeek([day], prefs);
}

export function validateGeneratedWeek(days: GeneratedDay[], prefs: ValidationPreferences): ValidationResult {
  const violations: Violation[] = [];

  const bannedMovements = parseBannedMovements(prefs.constraints);
  violations.push(...checkBannedMovements(days, bannedMovements));

  const frequencyRules = parseFrequencyRules(prefs.constraints);
  violations.push(...checkFrequencyRules(days, frequencyRules));

  violations.push(...checkEquipmentCompliance(days, prefs.equipment));

  violations.push(...checkStructureCompliance(days, prefs.structureTemplate));

  violations.push(...checkTimeBudget(days, prefs.defaultTimeDomains));

  violations.push(...checkCoachingQuality(days));

  const movementCounts = countMovements(days);
  const hasErrors = violations.some(v => v.severity === "error");
  const structureMatch = !violations.some(v => v.type === "structure" && v.severity === "error");
  const equipmentCompliant = !violations.some(v => v.type === "equipment");
  const coachingComplete = !violations.some(v => v.type === "coaching_quality");

  return {
    valid: !hasErrors,
    violations,
    movementCounts,
    structureMatch,
    equipmentCompliant,
    coachingComplete,
  };
}

export function formatViolationsForRetry(violations: Violation[]): string {
  const errors = violations.filter(v => v.severity === "error");
  const warnings = violations.filter(v => v.severity === "warning");

  const lines: string[] = [];

  if (errors.length > 0) {
    lines.push("CRITICAL VIOLATIONS (must fix):");
    for (const v of errors) {
      lines.push(`- ${v.message}`);
    }
  }

  if (warnings.length > 0) {
    lines.push("");
    lines.push("WARNINGS (should fix):");
    for (const w of warnings.slice(0, 10)) {
      lines.push(`- ${w.message}`);
    }
    if (warnings.length > 10) {
      lines.push(`  ... and ${warnings.length - 10} more warnings`);
    }
  }

  return lines.join("\n");
}
