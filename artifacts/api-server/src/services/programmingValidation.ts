export class ProgrammingValidationError extends Error {
  violations: Violation[];
  constructor(message: string, violations: Violation[]) {
    super(message);
    this.name = "ProgrammingValidationError";
    this.violations = violations;
  }
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

export interface ValidationPreferences {
  methodology: string;
  structureTemplate: string[];
  equipment: string[];
  constraints: string | null;
  defaultTimeDomains: Record<string, string>;
}

export interface Violation {
  type: "banned_movement" | "equipment" | "frequency" | "structure" | "time_budget" | "coaching_quality" | "constraint" | "generation" | "pattern_balance";
  severity: "error" | "warning";
  message: string;
  details?: Record<string, unknown>;
}

export type MovementPattern = "push" | "pull" | "squat" | "hinge" | "carry" | "core" | "monostructural";

export interface PatternDistribution {
  push: number;
  pull: number;
  squat: number;
  hinge: number;
  carry: number;
  core: number;
  monostructural: number;
}

export interface ValidationResult {
  valid: boolean;
  violations: Violation[];
  movementCounts: Record<string, number>;
  structureMatch: boolean;
  equipmentCompliant: boolean;
  coachingComplete: boolean;
  patternDistribution?: PatternDistribution;
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

const MOVEMENT_ALIASES: Record<string, string> = {
  "c&j": "clean and jerk",
  "cnj": "clean and jerk",
  "cj": "clean and jerk",
  "t2b": "toes-to-bar",
  "ttb": "toes-to-bar",
  "k2e": "knees-to-elbow",
  "kte": "knees-to-elbow",
  "c2b": "chest-to-bar pull-up",
  "ctb": "chest-to-bar pull-up",
  "hspu": "handstand push-up",
  "hsp": "handstand push-up",
  "mu": "muscle-up",
  "rmu": "ring muscle-up",
  "bmu": "bar muscle-up",
  "du": "double under",
  "dus": "double unders",
  "su": "single under",
  "sus": "single unders",
  "s2oh": "shoulder to overhead",
  "s2o": "shoulder to overhead",
  "g2oh": "ground to overhead",
  "g2o": "ground to overhead",
  "gto": "ground to overhead",
  "ghd": "ghd sit-up",
  "kb": "kettlebell swing",
  "kbs": "kettlebell swing",
  "db": "dumbbell",
  "bb": "barbell",
  "dl": "deadlift",
  "bs": "back squat",
  "fs": "front squat",
  "ohs": "overhead squat",
  "pp": "push press",
  "pj": "push jerk",
  "sj": "split jerk",
  "sp": "strict press",
  "bp": "bench press",
  "pc": "power clean",
  "hc": "hang clean",
  "hpc": "hang power clean",
  "sqcl": "squat clean",
  "sc": "squat clean",
  "ps": "power snatch",
  "hs": "hang snatch",
  "hps": "hang power snatch",
  "sqsn": "squat snatch",
  "ms": "muscle snatch",
  "rdl": "romanian deadlift",
  "sdl": "sumo deadlift",
  "sdhp": "sumo deadlift high pull",
  "tgu": "turkish get-up",
  "wb": "wall ball",
  "wbs": "wall ball shots",
  "mbc": "medicine ball clean",
  "bj": "box jump",
  "bjo": "box jump over",
  "bsu": "box step-up",
  "rc": "rope climb",
  "lrc": "legless rope climb",
  "pu": "push-up",
  "pus": "push-ups",
  "hr pu": "hand release push-up",
  "hrpu": "hand release push-up",
  "cal row": "calorie row",
  "cal bike": "calorie bike",
  "cal ski": "calorie ski",
  "abmat": "sit-up",
  "abmat sit-up": "sit-up",
  "abmat sit-ups": "sit-ups",
  "ghr": "ghd hip extension",
  "emom": "emom",
  "amrap": "amrap",
  "rft": "rft",
  "hsk": "handstand walk",
  "hsw": "handstand walk",
  "fc": "farmer carry",
  "oh carry": "overhead carry",
  "oh walk": "overhead carry",
  "devil's press": "devil press",
  "devils press": "devil press",
  "man makers": "man maker",
  "burpee bjo": "burpee box jump over",
  "burpee pullup": "burpee pull-up",
  "burpee pull up": "burpee pull-up",
  "ring mu": "ring muscle-up",
  "bar mu": "bar muscle-up",
  "strict pu": "strict pull-up",
  "kipping pu": "kipping pull-up",
  "ctb pull-up": "chest-to-bar pull-up",
  "ctb pull-ups": "chest-to-bar pull-ups",
  "hang pwr clean": "hang power clean",
  "hang pwr snatch": "hang power snatch",
  "pwr clean": "power clean",
  "pwr snatch": "power snatch",
};

const MOVEMENT_PATTERN_MAP: Record<string, MovementPattern> = {
  "strict press": "push",
  "push press": "push",
  "push jerk": "push",
  "split jerk": "push",
  "overhead press": "push",
  "shoulder press": "push",
  "shoulder to overhead": "push",
  "bench press": "push",
  "incline bench press": "push",
  "decline bench press": "push",
  "dumbbell press": "push",
  "dumbbell bench press": "push",
  "dumbbell floor press": "push",
  "push-up": "push",
  "push-ups": "push",
  "ring push-up": "push",
  "handstand push-up": "push",
  "handstand push-ups": "push",
  "hspu": "push",
  "parallette push-up": "push",
  "parallette handstand push-up": "push",
  "kettlebell press": "push",
  "ring dip": "push",
  "ring dips": "push",
  "strict ring dip": "push",
  "kipping ring dip": "push",
  "dip": "push",
  "dips": "push",
  "tricep pushdown": "push",
  "banded push-up": "push",
  "seated press": "push",
  "pin press": "push",

  "pull-up": "pull",
  "pull-ups": "pull",
  "chin-up": "pull",
  "chin-ups": "pull",
  "chest-to-bar pull-up": "pull",
  "chest-to-bar pull-ups": "pull",
  "kipping pull-up": "pull",
  "strict pull-up": "pull",
  "ring row": "pull",
  "ring rows": "pull",
  "barbell row": "pull",
  "pendlay row": "pull",
  "dumbbell row": "pull",
  "cable row": "pull",
  "lat pulldown": "pull",
  "face pull": "pull",
  "band pull-apart": "pull",
  "barbell curl": "pull",
  "dumbbell curl": "pull",
  "rope climb": "pull",
  "rope climbs": "pull",
  "legless rope climb": "pull",
  "ring muscle-up": "pull",
  "ring muscle-ups": "pull",
  "bar muscle-up": "pull",
  "bar muscle-ups": "pull",
  "muscle-up": "pull",
  "banded pull-up": "pull",
  "toes-to-bar": "pull",
  "knees-to-elbow": "pull",
  "hanging knee raise": "pull",
  "sled pull": "pull",
  "sled drag": "pull",
  "rack pull": "pull",
  "sumo deadlift high pull": "pull",
  "kettlebell row": "pull",
  "trap bar shrug": "pull",

  "back squat": "squat",
  "front squat": "squat",
  "overhead squat": "squat",
  "air squat": "squat",
  "air squats": "squat",
  "goblet squat": "squat",
  "pistol": "squat",
  "pistols": "squat",
  "pistol squat": "squat",
  "pistol squats": "squat",
  "squat clean": "squat",
  "squat snatch": "squat",
  "dumbbell overhead squat": "squat",
  "banded squat": "squat",
  "box squat": "squat",
  "pin squat": "squat",
  "sandbag squat": "squat",
  "thruster": "squat",
  "cluster": "squat",
  "dumbbell thruster": "squat",
  "kettlebell thruster": "squat",
  "wall ball": "squat",
  "wall ball shots": "squat",
  "wall ball clean": "squat",

  "deadlift": "hinge",
  "sumo deadlift": "hinge",
  "romanian deadlift": "hinge",
  "clean": "hinge",
  "power clean": "hinge",
  "hang clean": "hinge",
  "hang power clean": "hinge",
  "clean and jerk": "hinge",
  "snatch": "hinge",
  "power snatch": "hinge",
  "hang snatch": "hinge",
  "hang power snatch": "hinge",
  "muscle snatch": "hinge",
  "kettlebell swing": "hinge",
  "dumbbell swing": "hinge",
  "kettlebell snatch": "hinge",
  "kettlebell clean": "hinge",
  "kettlebell deadlift": "hinge",
  "dumbbell snatch": "hinge",
  "dumbbell clean": "hinge",
  "dumbbell deadlift": "hinge",
  "hip thrust": "hinge",
  "good morning": "hinge",
  "ghd hip extension": "hinge",
  "ghd back extension": "hinge",
  "ghd raise": "hinge",
  "kettlebell windmill": "hinge",
  "cable pull-through": "hinge",
  "trap bar deadlift": "hinge",
  "banded deadlift": "hinge",
  "ground to overhead": "hinge",
  "sandbag clean": "hinge",
  "sandbag over shoulder": "hinge",
  "sandbag ground to overhead": "hinge",
  "plate ground to overhead": "hinge",
  "medicine ball clean": "hinge",
  "devil press": "hinge",
  "man maker": "hinge",
  "turkish get-up": "hinge",

  "farmer carry": "carry",
  "dumbbell farmer carry": "carry",
  "kettlebell farmer carry": "carry",
  "sandbag carry": "carry",
  "overhead carry": "carry",
  "trap bar carry": "carry",
  "sled push": "carry",
  "prowler push": "carry",
  "bear crawl": "carry",
  "plate hold": "carry",

  "sit-up": "core",
  "sit-ups": "core",
  "v-up": "core",
  "v-ups": "core",
  "ghd sit-up": "core",
  "ghd sit-ups": "core",
  "med ball sit-up": "core",
  "l-sit": "core",
  "l-sit hold": "core",
  "parallette l-sit": "core",
  "hollow hold": "core",
  "hollow rock": "core",
  "hollow rocks": "core",
  "superman": "core",
  "superman hold": "core",
  "plank": "core",
  "plank hold": "core",
  "side plank": "core",
  "tuck-up": "core",
  "tuck-ups": "core",
  "leg raise": "core",
  "mountain climber": "core",
  "mountain climbers": "core",
  "plate pinch": "core",

  "row": "monostructural",
  "rowing": "monostructural",
  "calorie row": "monostructural",
  "assault bike": "monostructural",
  "air bike": "monostructural",
  "calorie bike": "monostructural",
  "echo bike": "monostructural",
  "ski erg": "monostructural",
  "calorie ski": "monostructural",
  "single under": "monostructural",
  "single unders": "monostructural",
  "double under": "monostructural",
  "double unders": "monostructural",
  "triple under": "monostructural",
  "triple unders": "monostructural",
  "crossover": "monostructural",
  "sprint": "monostructural",
  "run": "monostructural",
  "running": "monostructural",
  "jog": "monostructural",
  "jogging": "monostructural",
  "shuttle run": "monostructural",
  "400m run": "monostructural",
  "800m run": "monostructural",
  "200m run": "monostructural",
  "100m run": "monostructural",
  "1 mile run": "monostructural",
  "1-mile run": "monostructural",
  "broad jump": "monostructural",
  "broad jumps": "monostructural",
  "lateral shuffle": "monostructural",
  "box jump": "monostructural",
  "box jumps": "monostructural",
  "box jump over": "monostructural",
  "box step-up": "monostructural",
  "box step-ups": "monostructural",
  "seated box jump": "monostructural",
  "depth jump": "monostructural",
  "burpee": "monostructural",
  "burpees": "monostructural",
  "duck walk": "monostructural",
  "crab walk": "monostructural",
  "inch worm": "monostructural",
  "inchworm": "monostructural",
  "step-up": "monostructural",

  "lunge": "squat",
  "lunges": "squat",
  "walking lunge": "squat",
  "walking lunges": "squat",
  "barbell lunge": "squat",
  "dumbbell lunge": "squat",
  "dumbbell step-up": "squat",
  "medicine ball slam": "hinge",
  "ball slam": "hinge",
  "ring support hold": "push",
  "ring swing": "pull",
  "scale": "core",
  "scales": "core",
  "handstand walk": "push",
  "handstand hold": "push",
  "cable fly": "push",
  "parallette pass-through": "core",
};

const TOKEN_ALIASES: Record<string, string> = {
  "db": "dumbbell",
  "kb": "kettlebell",
  "bb": "barbell",
};

export function resolveAlias(normalized: string): string {
  if (MOVEMENT_ALIASES[normalized]) return MOVEMENT_ALIASES[normalized];

  const parts = normalized.split(" ");
  if (parts.length >= 2 && TOKEN_ALIASES[parts[0]]) {
    const expanded = [TOKEN_ALIASES[parts[0]], ...parts.slice(1)].join(" ");
    return MOVEMENT_ALIASES[expanded] || expanded;
  }

  return normalized;
}

function normalizeMovement(movement: string): string {
  const basic = movement.toLowerCase().trim().replace(/\s+/g, " ");
  return resolveAlias(basic);
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

  return [...new Set(banned.map(b => resolveAlias(b)))];
}

export interface FrequencyRule {
  movement: string;
  max: number;
  exact?: boolean;
}

export function parseFrequencyRules(constraints: string | null): FrequencyRule[] {
  if (!constraints) return [];
  const rules: FrequencyRule[] = [];

  const exactPattern = /(\w[\w\s-]+?)\s+(?:must\s+)?appear\s+(?:EXACTLY|exactly)\s+(\d+)\s+time/gi;
  let match;
  while ((match = exactPattern.exec(constraints)) !== null) {
    rules.push({ movement: normalizeMovement(match[1]), max: parseInt(match[2]), exact: true });
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

function checkFrequencyRules(days: GeneratedDay[], rules: FrequencyRule[]): Violation[] {
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

      if (rule.exact) {
        if (totalCount !== rule.max) {
          violations.push({
            type: "frequency",
            severity: "error",
            message: `Movement pattern "${rule.movement}" appears ${totalCount} times, expected exactly ${rule.max}.`,
            details: { movement: rule.movement, count: totalCount, expected: rule.max, exact: true },
          });
        }
      } else if (totalCount > rule.max) {
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

function parseDomainRange(domain: string): { min: number; max: number } | null {
  const rangeMatch = domain.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (rangeMatch) return { min: parseInt(rangeMatch[1]), max: parseInt(rangeMatch[2]) };
  const single = parseMinutes(domain);
  if (single) return { min: single, max: single };
  return null;
}

function checkTimeBudget(days: GeneratedDay[], timeDomains: Record<string, string>): Violation[] {
  const violations: Violation[] = [];

  for (const day of days) {
    let totalMin = 0;
    let totalMax = 0;

    for (const section of day.sections) {
      const domain = timeDomains[section.sectionType];
      const domainRange = domain ? parseDomainRange(domain) : null;

      if (domainRange) {
        totalMin += domainRange.min;
        totalMax += domainRange.max;
      }

      const sectionDuration = parseMinutes(section.duration);
      const sectionTimeCap = parseMinutes(section.timeCap);

      const effectiveTime = sectionTimeCap || sectionDuration;

      if (effectiveTime && domainRange) {
        if (effectiveTime > domainRange.max * 1.5) {
          violations.push({
            type: "time_budget",
            severity: "error",
            message: `${day.date} / ${section.title}: Time ${effectiveTime} min exceeds domain ${domain} for ${section.sectionType}.`,
            details: { day: day.date, section: section.title, time: effectiveTime, domain },
          });
        }
      }

      if (sectionTimeCap && sectionDuration && sectionTimeCap < sectionDuration) {
        violations.push({
          type: "time_budget",
          severity: "error",
          message: `${day.date} / ${section.title}: Time cap (${section.timeCap}) is less than stated duration (${section.duration}).`,
          details: { day: day.date, section: section.title, timeCap: section.timeCap, duration: section.duration },
        });
      }
    }

    if (totalMax > 0 && totalMax > 90) {
      violations.push({
        type: "time_budget",
        severity: "error",
        message: `${day.date}: Estimated total time ${totalMin}-${totalMax} min exceeds typical class length.`,
        details: { day: day.date, minTime: totalMin, maxTime: totalMax },
      });
    }
  }

  return violations;
}

export function categorizeMovements(days: GeneratedDay[]): PatternDistribution {
  const dist: PatternDistribution = { push: 0, pull: 0, squat: 0, hinge: 0, carry: 0, core: 0, monostructural: 0 };
  for (const day of days) {
    for (const section of day.sections) {
      if (!Array.isArray(section.movements)) continue;
      for (const m of section.movements) {
        const norm = normalizeMovement(m);
        const pattern = MOVEMENT_PATTERN_MAP[norm];
        if (pattern) {
          dist[pattern]++;
        }
      }
    }
  }
  return dist;
}

function checkPatternBalanceFromDist(dist: PatternDistribution): Violation[] {
  const violations: Violation[] = [];
  const total = dist.push + dist.pull + dist.squat + dist.hinge + dist.carry + dist.core + dist.monostructural;

  if (total < 6) return violations;

  const patterns: MovementPattern[] = ["push", "pull", "squat", "hinge", "carry", "core", "monostructural"];
  for (const p of patterns) {
    const pct = (dist[p] / total) * 100;
    if (pct < 15 && p !== "carry") {
      violations.push({
        type: "pattern_balance",
        severity: "warning",
        message: `Movement pattern "${p}" is underrepresented at ${pct.toFixed(1)}% (${dist[p]}/${total}). Consider adding more ${p} movements.`,
        details: { pattern: p, count: dist[p], total, percentage: pct },
      });
    }
    if (pct > 40) {
      violations.push({
        type: "pattern_balance",
        severity: "warning",
        message: `Movement pattern "${p}" is overrepresented at ${pct.toFixed(1)}% (${dist[p]}/${total}). Consider diversifying movement selection.`,
        details: { pattern: p, count: dist[p], total, percentage: pct },
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
          severity: "error",
          message: `${day.date} / ${section.title}: Missing or inadequate intended stimulus.`,
          details: { day: day.date, section: section.title, field: "intendedStimulus" },
        });
      }
      if (!section.scalingNotes || section.scalingNotes.trim().length < 10) {
        violations.push({
          type: "coaching_quality",
          severity: "error",
          message: `${day.date} / ${section.title}: Missing or inadequate scaling notes.`,
          details: { day: day.date, section: section.title, field: "scalingNotes" },
        });
      }

      const isCondWod = section.sectionType === "conditioning" || section.sectionType === "wod";
      if (isCondWod && !section.timeCap && !section.duration) {
        violations.push({
          type: "coaching_quality",
          severity: "error",
          message: `${day.date} / ${section.title}: Conditioning/WOD section missing both time cap and duration.`,
          details: { day: day.date, section: section.title },
        });
      }

      if (!section.movements || section.movements.length === 0) {
        if (section.sectionType !== "cooldown" && section.sectionType !== "custom") {
          violations.push({
            type: "coaching_quality",
            severity: "error",
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

  const patternDistribution = categorizeMovements(days);
  violations.push(...checkPatternBalanceFromDist(patternDistribution));

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
    patternDistribution,
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
