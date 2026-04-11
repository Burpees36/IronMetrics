import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("drizzle-orm", () => ({
  eq: (left: { _field: string }, right: unknown) => ({ _type: "eq", left, right }),
  and: (...conditions: Array<{ _type: string }>) => ({ _type: "and", conditions }),
  gte: (left: { _field: string }, right: unknown) => ({ _type: "gte", left, right }),
  lte: (left: { _field: string }, right: unknown) => ({ _type: "lte", left, right }),
  ne: (left: { _field: string }, right: unknown) => ({ _type: "ne", left, right }),
  desc: () => ({}),
  asc: () => ({}),
  sql: Object.assign((() => ({})) as (...args: unknown[]) => unknown, { raw: () => ({}) }),
  notInArray: (left: { _field: string }, values: unknown[]) => ({ _type: "notInArray", left, values }),
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
let mockPrefs: Record<string, unknown>[] = [];

vi.mock("@workspace/db", () => {
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
          const tn = table._name;
          let cond: MockCondition | null = null;
          const chain = {
            where(c: MockCondition) { cond = c; return chain; },
            orderBy() { return chain; },
            limit() { return chain; },
            then(resolve: (val: MockRow[]) => void) {
              const data = tn === "programming_days" ? mockDays :
                           tn === "programming_preferences" ? (mockPrefs as unknown as MockRow[]) : [];
              resolve(data.filter(r => matchesCondition(r, cond)));
            },
          };
          return chain;
        },
      };
    },
    insert(table: { _name: string }) {
      return {
        values(val: Record<string, unknown>) {
          return {
            returning() {
              return { then(resolve: (val: MockRow[]) => void) { resolve([{ id: 99, ...val } as MockRow]); } };
            },
            then(resolve: (val: undefined) => void) { resolve(undefined); },
          };
        },
      };
    },
    delete() {
      return {
        where() {
          return { then(resolve: (val: undefined) => void) { resolve(undefined); } };
        },
      };
    },
    update() {
      return {
        set() {
          return {
            where() {
              return {
                returning() {
                  return { then(resolve: (val: Record<string, unknown>[]) => void) { resolve([{}]); } };
                },
              };
            },
          };
        },
      };
    },
  };
  return {
    db,
    programmingDaysTable: makeTable("programming_days"),
    programmingSectionsTable: makeTable("programming_sections"),
    programmingPreferencesTable: makeTable("programming_preferences"),
  };
});

vi.mock("../../middlewares/programmingRbac", () => ({
  requireProgrammingWrite: () => (_req: unknown, _res: unknown, next: () => void) => { next(); },
}));

vi.mock("../../services/programmingAI", () => ({
  generateDay: vi.fn().mockResolvedValue({
    day: { date: "2026-04-13", title: "Test", publicNotes: "", coachNotes: "", sections: [] },
    validation: { valid: true, errorCount: 0, warningCount: 0, violations: [] },
    retries: 0,
  }),
  generateWeek: vi.fn(),
  buildValidationMeta: vi.fn().mockReturnValue({ valid: true, errorCount: 0, warningCount: 0, retryCount: 0, violations: [] }),
}));

function makeReqRes(opts: { params?: Record<string, string>; body?: Record<string, unknown> }) {
  const req = {
    params: opts.params || {},
    query: {},
    body: opts.body || {},
    gymId: 1,
    user: { id: "user-1" },
    isAuthenticated: () => true,
    programmingRole: "owner",
  };
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const res = { json, status };
  return { req, res };
}

interface RouteLayer {
  route?: {
    path: string;
    methods: Record<string, boolean>;
    stack: Array<{ handle: (...args: unknown[]) => Promise<void> }>;
  };
  handle?: { stack: RouteLayer[] };
}

function findHandler(router: { stack: RouteLayer[] }, method: string, path: string): ((...args: unknown[]) => Promise<void>) | null {
  for (const layer of router.stack) {
    if (layer.route) {
      const routeMethod = Object.keys(layer.route.methods)[0];
      if (routeMethod === method && layer.route.path === path) {
        return layer.route.stack[layer.route.stack.length - 1].handle;
      }
    } else if (layer.handle?.stack) {
      const found = findHandler(layer.handle as typeof router, method, path);
      if (found) return found;
    }
  }
  return null;
}

describe("generate-day route: archived day exclusion", () => {
  let handler: (...args: unknown[]) => Promise<void>;

  beforeEach(async () => {
    mockDays = [];
    mockPrefs = [];
    vi.resetModules();
    const mod = await import("../routes/programming/generate");
    handler = findHandler(mod.default, "post", "/gyms/:gymId/programming/generate-day")!;
    expect(handler).toBeDefined();
  });

  it("does not return 409 when only an archived day exists for the date", async () => {
    mockDays = [
      { id: 1, gymId: 1, date: "2026-04-13", title: "Archived Day", status: "archived" },
    ];

    const { req, res } = makeReqRes({
      params: { gymId: "1" },
      body: { date: "2026-04-13" },
    });

    await handler(req, res);

    expect(res.status).not.toHaveBeenCalledWith(409);
  });

  it("returns 409 when a draft day exists and overwrite is false", async () => {
    mockDays = [
      { id: 1, gymId: 1, date: "2026-04-13", title: "Draft Day", status: "draft" },
    ];

    const { req, res } = makeReqRes({
      params: { gymId: "1" },
      body: { date: "2026-04-13", overwrite: false },
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it("returns 409 when a published day exists and overwrite is not set", async () => {
    mockDays = [
      { id: 1, gymId: 1, date: "2026-04-13", title: "Published Day", status: "published" },
    ];

    const { req, res } = makeReqRes({
      params: { gymId: "1" },
      body: { date: "2026-04-13" },
    });

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it("proceeds without conflict when multiple archived days exist for the date", async () => {
    mockDays = [
      { id: 1, gymId: 1, date: "2026-04-13", title: "Old Workout", status: "archived" },
      { id: 2, gymId: 1, date: "2026-04-13", title: "Another Old", status: "archived" },
    ];

    const { req, res } = makeReqRes({
      params: { gymId: "1" },
      body: { date: "2026-04-13" },
    });

    await handler(req, res);

    expect(res.status).not.toHaveBeenCalledWith(409);
  });
});
