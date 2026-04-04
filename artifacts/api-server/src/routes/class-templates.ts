import { Router, type IRouter } from "express";
import { eq, and, gte, lt, desc, sql } from "drizzle-orm";
import { db, classesTable, classTemplatesTable, classTemplateItemsTable, gymStaffTable } from "@workspace/db";
import { addDays, startOfWeek, format } from "date-fns";
import { requireScheduleManage } from "../middlewares/scheduleRbac";

const router: IRouter = Router();

function parseGymId(params: any): number | null {
  const raw = Array.isArray(params.gymId) ? params.gymId[0] : params.gymId;
  const id = parseInt(raw, 10);
  return isNaN(id) ? null : id;
}

function paramStr(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function getWeekBounds(dateStr: string) {
  const date = new Date(dateStr);
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = addDays(weekStart, 7);
  weekEnd.setHours(0, 0, 0, 0);
  return { weekStart, weekEnd };
}

function getWeekday(date: Date): number {
  return date.getDay();
}

function getTimeStr(date: Date): string {
  return format(date, "HH:mm");
}

function buildDateForWeekday(weekStart: Date, weekday: number, timeStr: string): Date {
  const mondayDay = weekStart.getDay();
  let diff = weekday - mondayDay;
  if (diff < 0) diff += 7;
  const targetDate = addDays(weekStart, diff);
  const [hours, minutes] = timeStr.split(":").map(Number);
  targetDate.setHours(hours, minutes, 0, 0);
  return targetDate;
}

function isDuplicate(
  existing: { name: string; startTime: Date | string; endTime: Date | string }[],
  name: string,
  startTime: Date,
  endTime: Date
): boolean {
  return existing.some((cls) => {
    const clsStart = new Date(cls.startTime);
    const clsEnd = new Date(cls.endTime);
    return (
      cls.name === name &&
      getWeekday(clsStart) === getWeekday(startTime) &&
      getTimeStr(clsStart) === getTimeStr(startTime) &&
      getTimeStr(clsEnd) === getTimeStr(endTime)
    );
  });
}

router.post("/gyms/:gymId/classes/copy-week", requireScheduleManage(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const { sourceWeek, targetWeek } = req.body;
  if (!sourceWeek || !targetWeek) {
    res.status(400).json({ error: "sourceWeek and targetWeek are required (ISO date strings)" });
    return;
  }

  const source = getWeekBounds(sourceWeek);
  const target = getWeekBounds(targetWeek);

  const sourceClasses = await db
    .select()
    .from(classesTable)
    .where(
      and(
        eq(classesTable.gymId, gymId),
        gte(classesTable.startTime, source.weekStart),
        lt(classesTable.startTime, source.weekEnd)
      )
    );

  if (sourceClasses.length === 0) {
    res.json({ created: [], skipped: [], warnings: [], message: "No classes found in source week." });
    return;
  }

  const existingTargetClasses = await db
    .select()
    .from(classesTable)
    .where(
      and(
        eq(classesTable.gymId, gymId),
        gte(classesTable.startTime, target.weekStart),
        lt(classesTable.startTime, target.weekEnd)
      )
    );

  const staffList = await db.select().from(gymStaffTable).where(eq(gymStaffTable.gymId, gymId));
  const staffMap = new Map(staffList.map((s) => [s.id, s]));

  const created: any[] = [];
  const skipped: any[] = [];
  const warnings: string[] = [];
  const allTargetClasses = [...existingTargetClasses];

  for (const cls of sourceClasses) {
    const weekday = getWeekday(new Date(cls.startTime));
    const startTimeStr = getTimeStr(new Date(cls.startTime));
    const endTimeStr = getTimeStr(new Date(cls.endTime));

    const newStart = buildDateForWeekday(target.weekStart, weekday, startTimeStr);
    const newEnd = buildDateForWeekday(target.weekStart, weekday, endTimeStr);

    if (isDuplicate(allTargetClasses, cls.name, newStart, newEnd)) {
      skipped.push({ name: cls.name, weekday, startTime: startTimeStr, reason: "duplicate" });
      continue;
    }

    let coachId = cls.coachId;
    let coachName = cls.coachName;
    if (coachId && !staffMap.has(coachId)) {
      warnings.push(`Coach (ID: ${coachId}) for "${cls.name}" no longer exists. Class created without coach.`);
      coachId = null;
      coachName = null;
    }

    const [newClass] = await db.insert(classesTable).values({
      gymId,
      name: cls.name,
      description: cls.description,
      coachId,
      coachName,
      startTime: newStart,
      endTime: newEnd,
      capacity: cls.capacity,
      enrolled: 0,
      type: cls.type,
      status: "scheduled",
      isRecurring: false,
    }).returning();

    created.push(newClass);
    allTargetClasses.push(newClass);
  }

  res.json({ created, skipped, warnings, message: `${created.length} classes created, ${skipped.length} skipped.` });
});

router.post("/gyms/:gymId/classes/copy-week/preview", requireScheduleManage(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const { sourceWeek, targetWeek } = req.body;
  if (!sourceWeek || !targetWeek) {
    res.status(400).json({ error: "sourceWeek and targetWeek are required" });
    return;
  }

  const source = getWeekBounds(sourceWeek);
  const target = getWeekBounds(targetWeek);

  const sourceClasses = await db
    .select()
    .from(classesTable)
    .where(
      and(
        eq(classesTable.gymId, gymId),
        gte(classesTable.startTime, source.weekStart),
        lt(classesTable.startTime, source.weekEnd)
      )
    );

  const existingTargetClasses = await db
    .select()
    .from(classesTable)
    .where(
      and(
        eq(classesTable.gymId, gymId),
        gte(classesTable.startTime, target.weekStart),
        lt(classesTable.startTime, target.weekEnd)
      )
    );

  const staffList = await db.select().from(gymStaffTable).where(eq(gymStaffTable.gymId, gymId));
  const staffMap = new Map(staffList.map((s) => [s.id, s]));

  const toCreate: any[] = [];
  const toSkip: any[] = [];
  const warnings: string[] = [];

  for (const cls of sourceClasses) {
    const weekday = getWeekday(new Date(cls.startTime));
    const startTimeStr = getTimeStr(new Date(cls.startTime));
    const endTimeStr = getTimeStr(new Date(cls.endTime));

    const newStart = buildDateForWeekday(target.weekStart, weekday, startTimeStr);
    const newEnd = buildDateForWeekday(target.weekStart, weekday, endTimeStr);

    if (isDuplicate(existingTargetClasses, cls.name, newStart, newEnd)) {
      toSkip.push({ name: cls.name, weekday, startTime: startTimeStr, endTime: endTimeStr, reason: "duplicate" });
      continue;
    }

    if (cls.coachId && !staffMap.has(cls.coachId)) {
      warnings.push(`Coach (ID: ${cls.coachId}) for "${cls.name}" no longer exists.`);
    }

    toCreate.push({
      name: cls.name,
      weekday,
      startTime: startTimeStr,
      endTime: endTimeStr,
      type: cls.type,
      capacity: cls.capacity,
      coachName: cls.coachId && staffMap.has(cls.coachId) ? cls.coachName : null,
      description: cls.description,
    });
  }

  res.json({ toCreate, toSkip, warnings });
});

router.get("/gyms/:gymId/class-templates", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const templates = await db
    .select()
    .from(classTemplatesTable)
    .where(eq(classTemplatesTable.gymId, gymId))
    .orderBy(desc(classTemplatesTable.createdAt));

  res.json(templates);
});

router.get("/gyms/:gymId/class-templates/:templateId", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const templateId = parseInt(paramStr(req.params.templateId), 10);
  if (!gymId || isNaN(templateId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const [template] = await db
    .select()
    .from(classTemplatesTable)
    .where(and(eq(classTemplatesTable.id, templateId), eq(classTemplatesTable.gymId, gymId)));

  if (!template) { res.status(404).json({ error: "Template not found" }); return; }

  const items = await db
    .select()
    .from(classTemplateItemsTable)
    .where(eq(classTemplateItemsTable.templateId, templateId));

  res.json({ ...template, items });
});

router.post("/gyms/:gymId/class-templates", requireScheduleManage(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const { name, description, sourceWeek } = req.body;
  if (!name || !sourceWeek) {
    res.status(400).json({ error: "name and sourceWeek are required" });
    return;
  }

  const source = getWeekBounds(sourceWeek);

  const sourceClasses = await db
    .select()
    .from(classesTable)
    .where(
      and(
        eq(classesTable.gymId, gymId),
        gte(classesTable.startTime, source.weekStart),
        lt(classesTable.startTime, source.weekEnd)
      )
    );

  if (sourceClasses.length === 0) {
    res.status(400).json({ error: "No classes found in the source week to create a template." });
    return;
  }

  const userId = req.user?.id || null;

  const [template] = await db.insert(classTemplatesTable).values({
    gymId,
    name,
    description: description || null,
    createdBy: userId,
    totalClasses: sourceClasses.length,
  }).returning();

  const items = [];
  for (const cls of sourceClasses) {
    const [item] = await db.insert(classTemplateItemsTable).values({
      templateId: template.id,
      weekday: getWeekday(new Date(cls.startTime)),
      startTime: getTimeStr(new Date(cls.startTime)),
      endTime: getTimeStr(new Date(cls.endTime)),
      className: cls.name,
      type: cls.type,
      capacity: cls.capacity,
      coachId: cls.coachId,
      coachName: cls.coachName,
      description: cls.description,
    }).returning();
    items.push(item);
  }

  res.status(201).json({ ...template, items });
});

router.patch("/gyms/:gymId/class-templates/:templateId", requireScheduleManage(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const templateId = parseInt(paramStr(req.params.templateId), 10);
  if (!gymId || isNaN(templateId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const { name, description } = req.body;
  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;

  const [template] = await db
    .update(classTemplatesTable)
    .set(updateData)
    .where(and(eq(classTemplatesTable.id, templateId), eq(classTemplatesTable.gymId, gymId)))
    .returning();

  if (!template) { res.status(404).json({ error: "Template not found" }); return; }
  res.json(template);
});

router.delete("/gyms/:gymId/class-templates/:templateId", requireScheduleManage(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const templateId = parseInt(paramStr(req.params.templateId), 10);
  if (!gymId || isNaN(templateId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  await db.delete(classTemplatesTable).where(
    and(eq(classTemplatesTable.id, templateId), eq(classTemplatesTable.gymId, gymId))
  );
  res.sendStatus(204);
});

router.post("/gyms/:gymId/class-templates/:templateId/apply", requireScheduleManage(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const templateId = parseInt(paramStr(req.params.templateId), 10);
  if (!gymId || isNaN(templateId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const { targetWeek, selectedItemIds } = req.body;
  if (!targetWeek) { res.status(400).json({ error: "targetWeek is required" }); return; }

  const [template] = await db
    .select()
    .from(classTemplatesTable)
    .where(and(eq(classTemplatesTable.id, templateId), eq(classTemplatesTable.gymId, gymId)));

  if (!template) { res.status(404).json({ error: "Template not found" }); return; }

  let items = await db
    .select()
    .from(classTemplateItemsTable)
    .where(eq(classTemplateItemsTable.templateId, templateId));

  if (selectedItemIds && Array.isArray(selectedItemIds) && selectedItemIds.length > 0) {
    const selectedSet = new Set(selectedItemIds);
    items = items.filter((item) => selectedSet.has(item.id));
  }

  const target = getWeekBounds(targetWeek);

  const existingTargetClasses = await db
    .select()
    .from(classesTable)
    .where(
      and(
        eq(classesTable.gymId, gymId),
        gte(classesTable.startTime, target.weekStart),
        lt(classesTable.startTime, target.weekEnd)
      )
    );

  const staffList = await db.select().from(gymStaffTable).where(eq(gymStaffTable.gymId, gymId));
  const staffMap = new Map(staffList.map((s) => [s.id, s]));

  const created: any[] = [];
  const skipped: any[] = [];
  const warnings: string[] = [];
  const allTargetClasses = [...existingTargetClasses];

  for (const item of items) {
    const newStart = buildDateForWeekday(target.weekStart, item.weekday, item.startTime);
    const newEnd = buildDateForWeekday(target.weekStart, item.weekday, item.endTime);

    if (isDuplicate(allTargetClasses, item.className, newStart, newEnd)) {
      skipped.push({ name: item.className, weekday: item.weekday, startTime: item.startTime, reason: "duplicate" });
      continue;
    }

    let coachId = item.coachId;
    let coachName = item.coachName;
    if (coachId && !staffMap.has(coachId)) {
      warnings.push(`Coach (ID: ${coachId}) for "${item.className}" no longer exists. Class created without coach.`);
      coachId = null;
      coachName = null;
    }

    const [newClass] = await db.insert(classesTable).values({
      gymId,
      name: item.className,
      description: item.description,
      coachId,
      coachName,
      startTime: newStart,
      endTime: newEnd,
      capacity: item.capacity,
      enrolled: 0,
      type: item.type,
      status: "scheduled",
      isRecurring: false,
    }).returning();

    created.push(newClass);
    allTargetClasses.push(newClass);
  }

  await db.update(classTemplatesTable)
    .set({
      usedCount: sql`COALESCE(${classTemplatesTable.usedCount}, 0) + 1`,
      lastUsedAt: new Date(),
    })
    .where(eq(classTemplatesTable.id, templateId));

  res.json({ created, skipped, warnings, message: `${created.length} classes created, ${skipped.length} skipped.` });
});

router.post("/gyms/:gymId/class-templates/:templateId/apply/preview", requireScheduleManage(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const templateId = parseInt(paramStr(req.params.templateId), 10);
  if (!gymId || isNaN(templateId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const { targetWeek } = req.body;
  if (!targetWeek) { res.status(400).json({ error: "targetWeek is required" }); return; }

  const [template] = await db
    .select()
    .from(classTemplatesTable)
    .where(and(eq(classTemplatesTable.id, templateId), eq(classTemplatesTable.gymId, gymId)));

  if (!template) { res.status(404).json({ error: "Template not found" }); return; }

  const items = await db
    .select()
    .from(classTemplateItemsTable)
    .where(eq(classTemplateItemsTable.templateId, templateId));

  const target = getWeekBounds(targetWeek);

  const existingTargetClasses = await db
    .select()
    .from(classesTable)
    .where(
      and(
        eq(classesTable.gymId, gymId),
        gte(classesTable.startTime, target.weekStart),
        lt(classesTable.startTime, target.weekEnd)
      )
    );

  const staffList = await db.select().from(gymStaffTable).where(eq(gymStaffTable.gymId, gymId));
  const staffMap = new Map(staffList.map((s) => [s.id, s]));

  const toCreate: any[] = [];
  const toSkip: any[] = [];
  const warnings: string[] = [];

  for (const item of items) {
    const newStart = buildDateForWeekday(target.weekStart, item.weekday, item.startTime);
    const newEnd = buildDateForWeekday(target.weekStart, item.weekday, item.endTime);

    if (isDuplicate(existingTargetClasses, item.className, newStart, newEnd)) {
      toSkip.push({ name: item.className, weekday: item.weekday, startTime: item.startTime, endTime: item.endTime, reason: "duplicate" });
      continue;
    }

    if (item.coachId && !staffMap.has(item.coachId)) {
      warnings.push(`Coach (ID: ${item.coachId}) for "${item.className}" no longer exists.`);
    }

    toCreate.push({
      name: item.className,
      weekday: item.weekday,
      startTime: item.startTime,
      endTime: item.endTime,
      type: item.type,
      capacity: item.capacity,
      coachName: item.coachId && staffMap.has(item.coachId) ? item.coachName : null,
      description: item.description,
    });
  }

  res.json({ toCreate, toSkip, warnings });
});

export default router;
