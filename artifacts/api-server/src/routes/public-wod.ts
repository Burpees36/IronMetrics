import { Router, type IRouter } from "express";
import { eq, and, gte, lte, asc, desc, or, isNull } from "drizzle-orm";
import { db, gymsTable, programmingDaysTable, programmingSectionsTable } from "@workspace/db";

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

    const trackFilter = track && typeof track === "string" && track !== "default"
      ? eq(programmingDaysTable.track, track)
      : or(eq(programmingDaysTable.track, "default"), isNull(programmingDaysTable.track));

    const conditions: any[] = [
      eq(programmingDaysTable.gymId, gym.id),
      eq(programmingDaysTable.status, "published"),
      trackFilter,
    ];

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

export default router;
