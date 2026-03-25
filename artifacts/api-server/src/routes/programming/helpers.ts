import { eq, and, asc } from "drizzle-orm";
import { db, programmingDaysTable, programmingSectionsTable } from "@workspace/db";

export function parseGymId(params: any): number | null {
  const raw = Array.isArray(params.gymId) ? params.gymId[0] : params.gymId;
  const id = parseInt(raw, 10);
  return isNaN(id) ? null : id;
}

export function parseDayId(params: any): number | null {
  const raw = Array.isArray(params.dayId) ? params.dayId[0] : params.dayId;
  const id = parseInt(raw, 10);
  return isNaN(id) ? null : id;
}

export function parseSectionId(params: any): number | null {
  const raw = Array.isArray(params.sectionId) ? params.sectionId[0] : params.sectionId;
  const id = parseInt(raw, 10);
  return isNaN(id) ? null : id;
}

export async function getDayWithSections(dayId: number, gymId?: number) {
  const conditions = [eq(programmingDaysTable.id, dayId)];
  if (gymId !== undefined) {
    conditions.push(eq(programmingDaysTable.gymId, gymId));
  }

  const [day] = await db
    .select()
    .from(programmingDaysTable)
    .where(and(...conditions));
  if (!day) return null;

  const sections = await db
    .select()
    .from(programmingSectionsTable)
    .where(eq(programmingSectionsTable.dayId, dayId))
    .orderBy(asc(programmingSectionsTable.orderIndex));

  return { ...day, sections };
}

export async function verifyDayBelongsToGym(dayId: number, gymId: number) {
  const [day] = await db
    .select()
    .from(programmingDaysTable)
    .where(and(eq(programmingDaysTable.id, dayId), eq(programmingDaysTable.gymId, gymId)));
  return day || null;
}

export async function verifySectionBelongsToDay(sectionId: number, dayId: number) {
  const [section] = await db
    .select()
    .from(programmingSectionsTable)
    .where(and(eq(programmingSectionsTable.id, sectionId), eq(programmingSectionsTable.dayId, dayId)));
  return section || null;
}
