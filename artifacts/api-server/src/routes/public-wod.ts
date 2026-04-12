import { Router, type IRouter } from "express";
import { eq, and, gte, lte, asc, desc, or, isNull, ne } from "drizzle-orm";
import { createHmac } from "crypto";
import { db, gymsTable, programmingDaysTable, programmingSectionsTable } from "@workspace/db";

const PREVIEW_SECRET = process.env.DATABASE_URL || "forgeos-preview-secret";
const PREVIEW_TTL_MS = 60 * 60 * 1000;

export function generatePreviewToken(dayId: number, gymId: number): string {
  const hour = Math.floor(Date.now() / PREVIEW_TTL_MS);
  const payload = `${dayId}:${gymId}:${hour}`;
  return createHmac("sha256", PREVIEW_SECRET).update(payload).digest("hex").slice(0, 32);
}

function verifyPreviewToken(token: string, dayId: number, gymId: number): boolean {
  const hour = Math.floor(Date.now() / PREVIEW_TTL_MS);
  for (const h of [hour, hour - 1]) {
    const payload = `${dayId}:${gymId}:${h}`;
    const expected = createHmac("sha256", PREVIEW_SECRET).update(payload).digest("hex").slice(0, 32);
    if (token === expected) return true;
  }
  return false;
}

const router: IRouter = Router();

router.get("/public/wod/:gymSlug/info", async (req, res): Promise<void> => {
  try {
    const { gymSlug } = req.params;
    if (!gymSlug) {
      res.status(400).json({ error: "Missing gym identifier" });
      return;
    }

    const [gym] = await db.select().from(gymsTable).where(eq(gymsTable.slug, gymSlug));
    if (!gym) {
      res.status(404).json({ error: "Gym not found" });
      return;
    }

    res.json({
      id: gym.id,
      name: gym.name,
      slug: gym.slug,
      logoUrl: gym.logoUrl,
      description: gym.description,
    });
  } catch (err: any) {
    console.error("[public-wod] GET info error:", err.message);
    res.status(500).json({ error: "Failed to load gym info" });
  }
});

router.get("/public/wod/:gymSlug/programming", async (req, res): Promise<void> => {
  try {
    const { gymSlug } = req.params;
    if (!gymSlug) {
      res.status(400).json({ error: "Missing gym identifier" });
      return;
    }

    const [gym] = await db.select().from(gymsTable).where(eq(gymsTable.slug, gymSlug));
    if (!gym) {
      res.status(404).json({ error: "Gym not found" });
      return;
    }

    const { startDate, endDate, track } = req.query;

    const conditions: any[] = [
      eq(programmingDaysTable.gymId, gym.id),
      eq(programmingDaysTable.status, "published"),
    ];

    if (track && typeof track === "string") {
      if (track === "default") {
        conditions.push(
          or(eq(programmingDaysTable.track, "default"), isNull(programmingDaysTable.track))!
        );
      } else {
        conditions.push(eq(programmingDaysTable.track, track));
      }
    }

    if (startDate && typeof startDate === "string") {
      conditions.push(gte(programmingDaysTable.date, startDate));
    }
    if (endDate && typeof endDate === "string") {
      conditions.push(lte(programmingDaysTable.date, endDate));
    }

    const days = await db
      .select()
      .from(programmingDaysTable)
      .where(and(...conditions))
      .orderBy(desc(programmingDaysTable.date));

    const daysWithSections = await Promise.all(
      days.map(async (day) => {
        const sections = await db
          .select()
          .from(programmingSectionsTable)
          .where(eq(programmingSectionsTable.dayId, day.id))
          .orderBy(asc(programmingSectionsTable.orderIndex));

        const filteredSections = sections.map((s) => {
          const { coachNotes, ...rest } = s;
          return rest;
        });

        const { coachNotes, ...dayRest } = day;
        return { ...dayRest, sections: filteredSections };
      })
    );

    res.json(daysWithSections);
  } catch (err: any) {
    console.error("[public-wod] GET programming error:", err.message);
    res.status(500).json({ error: "Failed to load programming" });
  }
});

router.get("/public/wod/:gymSlug/preview/:dayId", async (req, res): Promise<void> => {
  try {
    const { gymSlug, dayId: dayIdStr } = req.params;
    const dayId = parseInt(dayIdStr, 10);
    const token = req.query.token as string | undefined;

    if (!gymSlug || isNaN(dayId) || !token) {
      res.status(400).json({ error: "Missing parameters" });
      return;
    }

    const [gym] = await db.select().from(gymsTable).where(eq(gymsTable.slug, gymSlug));
    if (!gym) {
      res.status(404).json({ error: "Gym not found" });
      return;
    }

    if (!verifyPreviewToken(token, dayId, gym.id)) {
      res.status(403).json({ error: "Invalid or expired preview token" });
      return;
    }

    const [day] = await db
      .select()
      .from(programmingDaysTable)
      .where(and(eq(programmingDaysTable.id, dayId), eq(programmingDaysTable.gymId, gym.id)));

    if (!day) {
      res.status(404).json({ error: "Day not found" });
      return;
    }

    const sections = await db
      .select()
      .from(programmingSectionsTable)
      .where(eq(programmingSectionsTable.dayId, day.id))
      .orderBy(asc(programmingSectionsTable.orderIndex));

    const filteredSections = sections.map((s) => {
      const { coachNotes, ...rest } = s;
      return rest;
    });

    const { coachNotes, ...dayRest } = day;
    res.json({ ...dayRest, sections: filteredSections });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[public-wod] GET preview error:", error.message);
    res.status(500).json({ error: "Failed to load preview" });
  }
});


export default router;
