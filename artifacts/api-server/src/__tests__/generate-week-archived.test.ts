import { describe, it, expect, vi, beforeEach } from "vitest";

interface MockRow {
  id: number;
  gymId: number;
  date: string;
  title: string;
  status: string;
  [key: string]: unknown;
}

interface MockCondition {
  _type: string;
  left?: { _field: string };
  right?: unknown;
  conditions?: MockCondition[];
}

let mockDays: MockRow[] = [];

function createQueryChain(data: MockRow[]) {
  function resolveField(colRef: { _field?: string }): string {
    return colRef?._field || "id";
  }
  function matchesCondition(row: MockRow, cond: MockCondition | null): boolean {
    if (!cond) return true;
    if (cond._type === "eq") return row[resolveField(cond.left!)] === cond.right;
    if (cond._type === "ne") return row[resolveField(cond.left!)] !== cond.right;
    if (cond._type === "gte") return row[resolveField(cond.left!)] >= (cond.right as string);
    if (cond._type === "lte") return row[resolveField(cond.left!)] <= (cond.right as string);
    if (cond._type === "and") return cond.conditions!.every((c) => matchesCondition(row, c));
    return true;
  }

  let cond: MockCondition | null = null;
  const result = data;
  const chain = Object.assign(Promise.resolve(result), {
    where(c: MockCondition) { cond = c; return Object.assign(Promise.resolve(result.filter(r => matchesCondition(r, cond))), {
      orderBy: vi.fn(() => Object.assign(Promise.resolve(result.filter(r => matchesCondition(r, cond!))), {
        limit: vi.fn(() => Promise.resolve(result.filter(r => matchesCondition(r, cond!)))),
      })),
      limit: vi.fn(() => Promise.resolve(result.filter(r => matchesCondition(r, cond!)))),
      then: (resolve: (v: MockRow[]) => void, reject?: (e: unknown) => void) => Promise.resolve(result.filter(r => matchesCondition(r, cond!))).then(resolve, reject),
    }); },
    orderBy: vi.fn(() => Object.assign(Promise.resolve(result), {
      limit: vi.fn(() => Promise.resolve(result)),
    })),
    then: (resolve: (v: MockRow[]) => void, reject?: (e: unknown) => void) => Promise.resolve(result).then(resolve, reject),
  });
  return chain;
}

vi.mock("drizzle-orm", () => ({
  eq: (left: { _field: string }, right: unknown) => ({ _type: "eq", left, right }),
  and: (...conditions: Array<{ _type: string }>) => ({ _type: "and", conditions }),
  gte: (left: { _field: string }, right: unknown) => ({ _type: "gte", left, right }),
  lte: (left: { _field: string }, right: unknown) => ({ _type: "lte", left, right }),
  ne: (left: { _field: string }, right: unknown) => ({ _type: "ne", left, right }),
  desc: () => ({}),
  asc: () => ({}),
  sql: Object.assign((() => ({})) as (...args: unknown[]) => unknown, { raw: () => ({}) }),
}));

vi.mock("@workspace/integrations-openai-ai-server", () => ({
  openai: {
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  },
}));

vi.mock("@workspace/db", () => {
  function makeTable(name: string) {
    return new Proxy({ _name: name } as Record<string, unknown>, {
      get(_, prop: string) {
        if (prop === "_name") return name;
        return { _col: true, _table: name, _field: prop };
      },
    });
  }
  const db = {
    select() {
      return {
        from(table: { _name: string }) {
          if (table._name === "programming_days") {
            return createQueryChain(mockDays);
          }
          return createQueryChain([]);
        },
      };
    },
    insert() {
      return {
        values(val: Record<string, unknown>) {
          return {
            returning() {
              return { then(resolve: (v: MockRow[]) => void) { resolve([{ id: 99, ...val } as MockRow]); } };
            },
            then(resolve: (v: undefined) => void) { resolve(undefined); },
          };
        },
      };
    },
    delete() {
      return { where() { return { then(resolve: (v: undefined) => void) { resolve(undefined); } }; } };
    },
  };
  return {
    db,
    programmingDaysTable: makeTable("programming_days"),
    programmingSectionsTable: makeTable("programming_sections"),
  };
});

import { openai } from "@workspace/integrations-openai-ai-server";
import { generateWeek } from "../services/programmingAI";

const mockCreate = vi.mocked(openai.chat.completions.create);

function buildWeekAIResponse(days: Array<{ date: string; title: string; sections: Array<Record<string, unknown>> }>) {
  return {
    choices: [{
      message: {
        content: JSON.stringify({
          days: days.map(d => ({
            date: d.date,
            title: d.title,
            publicNotes: "Test notes",
            coachNotes: "Coach notes",
            sections: d.sections.map(s => ({
              sectionType: s.sectionType || "warmup",
              title: s.title || "Section",
              movements: s.movements || ["Movement A"],
              instructions: "Do it",
              intendedStimulus: s.intendedStimulus || "Moderate effort",
              scalingNotes: s.scalingNotes || "Scale as needed",
              duration: s.duration || "10 min",
              timeCap: s.timeCap ?? null,
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

const basePrefs = {
  methodology: "crossfit",
  structureTemplate: ["warmup", "strength", "conditioning", "cooldown"],
  equipment: ["barbell", "pull-up bar"],
  constraints: null,
  defaultTimeDomains: {
    warmup: "10-15 min",
    strength: "15-20 min",
    conditioning: "8-20 min",
    cooldown: "5-10 min",
  },
};

describe("generateWeek: archived day exclusion", () => {
  beforeEach(() => {
    mockDays = [];
    mockCreate.mockReset();
  });

  it("treats archived days as missing and generates for those dates", async () => {
    mockDays = [
      { id: 1, gymId: 1, date: "2026-04-06", title: "Monday", status: "archived" },
      { id: 2, gymId: 1, date: "2026-04-07", title: "Tuesday", status: "archived" },
      { id: 3, gymId: 1, date: "2026-04-08", title: "Wednesday", status: "archived" },
      { id: 4, gymId: 1, date: "2026-04-09", title: "Thursday", status: "archived" },
      { id: 5, gymId: 1, date: "2026-04-10", title: "Friday", status: "archived" },
      { id: 6, gymId: 1, date: "2026-04-11", title: "Saturday", status: "archived" },
      { id: 7, gymId: 1, date: "2026-04-12", title: "Sunday", status: "archived" },
    ];

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

    expect(result.generatedDays).toHaveLength(7);
    expect(result.skippedDates).toHaveLength(0);
  });

  it("skips non-archived days and generates only for missing and archived dates", async () => {
    mockDays = [
      { id: 1, gymId: 1, date: "2026-04-06", title: "Monday", status: "draft" },
      { id: 2, gymId: 1, date: "2026-04-07", title: "Tuesday", status: "archived" },
      { id: 3, gymId: 1, date: "2026-04-08", title: "Wednesday", status: "published" },
    ];

    mockCreate.mockResolvedValueOnce(buildWeekAIResponse([
      { date: "2026-04-07", title: "Tuesday", sections: validSections },
      { date: "2026-04-09", title: "Thursday", sections: validSections },
      { date: "2026-04-10", title: "Friday", sections: validSections },
      { date: "2026-04-11", title: "Saturday", sections: validSections },
      { date: "2026-04-12", title: "Sunday", sections: validSections },
    ]) as never);

    const result = await generateWeek(1, "2026-04-06", basePrefs);

    expect(result.skippedDates).toContain("2026-04-06");
    expect(result.skippedDates).toContain("2026-04-08");
    expect(result.skippedDates).not.toContain("2026-04-07");

    expect(result.generatedDays).toHaveLength(5);
  });
});
