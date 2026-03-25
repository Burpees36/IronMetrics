import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, membersTable, timelineEventsTable, syncRunsTable } from "@workspace/db";
import { parseGymId, EMAIL_REGEX } from "./helpers";
import { validateRow, sanitizeRow, normalizePhone, parseImportDate, type ImportRow, type ValidatedRow } from "./import-utils";

const router: IRouter = Router();

router.post("/gyms/:gymId/members/import/preview", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const { rows, mappings } = req.body as { rows: Record<string, string>[]; mappings: Record<string, string> };
  if (!Array.isArray(rows) || rows.length === 0) {
    res.status(400).json({ error: "No rows provided" });
    return;
  }
  if (rows.length > 5000) {
    res.status(400).json({ error: "Maximum 5,000 rows per import" });
    return;
  }
  if (!mappings || typeof mappings !== "object") {
    res.status(400).json({ error: "Column mappings required" });
    return;
  }

  const mapped: ImportRow[] = rows.map((rawRow) => {
    const row: ImportRow = {};
    for (const [csvCol, memberField] of Object.entries(mappings)) {
      if (memberField && rawRow[csvCol] !== undefined) {
        (row as any)[memberField] = String(rawRow[csvCol]).trim();
      }
    }
    return row;
  });

  const validated: ValidatedRow[] = mapped.map((row, i) => ({
    ...validateRow(row, i),
    isDuplicate: false,
  }));

  const existingMembers = await db
    .select({ id: membersTable.id, firstName: membersTable.firstName, lastName: membersTable.lastName, email: membersTable.email, phone: membersTable.phone })
    .from(membersTable)
    .where(eq(membersTable.gymId, gymId));

  const existingByEmail = new Map(existingMembers.map((m) => [m.email.toLowerCase(), m]));
  const existingByNamePhone = new Map<string, typeof existingMembers[0]>();
  for (const m of existingMembers) {
    if (m.phone) {
      const key = `${m.firstName.toLowerCase().trim()}|${m.lastName.toLowerCase().trim()}|${m.phone.replace(/\D/g, "")}`;
      existingByNamePhone.set(key, m);
    }
  }

  for (const row of validated) {
    if (row.errors.length > 0) continue;
    if (row.data.email) {
      const existing = existingByEmail.get(row.data.email.toLowerCase().trim());
      if (existing) {
        row.isDuplicate = true;
        row.duplicateOf = { id: existing.id, name: `${existing.firstName} ${existing.lastName}`, email: existing.email };
        continue;
      }
    }
    if (row.data.firstName && row.data.lastName && row.data.phone) {
      const key = `${row.data.firstName.toLowerCase().trim()}|${row.data.lastName.toLowerCase().trim()}|${row.data.phone.replace(/\D/g, "")}`;
      const existing = existingByNamePhone.get(key);
      if (existing) {
        row.isDuplicate = true;
        row.duplicateOf = { id: existing.id, name: `${existing.firstName} ${existing.lastName}`, email: existing.email };
      }
    }
  }

  const csvEmailsSeen = new Map<string, number>();
  for (const row of validated) {
    if (row.data.email && !row.isDuplicate && row.errors.length === 0) {
      const email = row.data.email.toLowerCase().trim();
      if (csvEmailsSeen.has(email)) {
        row.isDuplicate = true;
        row.errors.push(`Duplicate of row ${csvEmailsSeen.get(email)! + 1} in this file`);
      } else {
        csvEmailsSeen.set(email, row.rowIndex);
      }
    }
  }

  const totalRows = validated.length;
  const validRows = validated.filter((r) => r.errors.length === 0 && !r.isDuplicate).length;
  const invalidRows = validated.filter((r) => r.errors.length > 0).length;
  const duplicateRows = validated.filter((r) => r.isDuplicate).length;

  res.json({
    rows: validated,
    summary: { totalRows, validRows, invalidRows, duplicateRows },
  });
});

router.post("/gyms/:gymId/members/import/confirm", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const { rows, source, fileName } = req.body as { rows: ImportRow[]; source?: string; fileName?: string };
  if (!Array.isArray(rows) || rows.length === 0) {
    res.status(400).json({ error: "No rows to import" });
    return;
  }
  if (rows.length > 5000) {
    res.status(400).json({ error: "Maximum 5,000 rows per import" });
    return;
  }

  const [syncRun] = await db.insert(syncRunsTable).values({
    gymId,
    source: source || "csv",
    status: "running",
    fileName: fileName || null,
    totalRows: rows.length,
    triggeredBy: (req as any).user?.claims?.sub || "unknown",
  }).returning();

  const existingMembers = await db
    .select({ email: membersTable.email })
    .from(membersTable)
    .where(eq(membersTable.gymId, gymId));
  const existingEmails = new Set(existingMembers.map((m) => m.email.toLowerCase()));

  const results = {
    processed: 0,
    created: 0,
    skipped: 0,
    errored: 0,
    errors: [] as { rowIndex: number; error: string }[],
    syncRunId: syncRun.id,
  };

  const today = new Date().toISOString().split("T")[0];

  for (let i = 0; i < rows.length; i++) {
    results.processed++;
    const row = rows[i];

    const { errors } = validateRow(row, i);
    if (errors.length > 0) {
      results.errored++;
      results.errors.push({ rowIndex: i, error: errors.join("; ") });
      continue;
    }

    const email = row.email!.toLowerCase().trim();
    if (existingEmails.has(email)) {
      results.skipped++;
      continue;
    }

    try {
      const safe = sanitizeRow(row);
      const [member] = await db
        .insert(membersTable)
        .values({
          gymId,
          firstName: safe.firstName!.trim(),
          lastName: safe.lastName!.trim(),
          email,
          phone: safe.phone ? normalizePhone(safe.phone) : undefined,
          status: safe.status ? safe.status.toLowerCase().trim() : "active",
          membershipType: safe.membershipType?.trim() || undefined,
          joinDate: safe.joinDate ? parseImportDate(safe.joinDate) || today : today,
          birthDate: safe.birthDate ? parseImportDate(safe.birthDate) || undefined : undefined,
          emergencyContactName: safe.emergencyContactName?.trim() || undefined,
          emergencyContactPhone: safe.emergencyContactPhone?.trim() || undefined,
          address: safe.address?.trim() || undefined,
          city: safe.city?.trim() || undefined,
          state: safe.state?.trim() || undefined,
          tags: safe.tags ? safe.tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [],
        })
        .returning();

      existingEmails.add(email);
      results.created++;

      try {
        await db.insert(timelineEventsTable).values({
          memberId: member.id,
          gymId,
          type: "imported",
          title: `Imported from ${source === "wodify" ? "Wodify" : "CSV"}`,
          description: `${member.firstName} ${member.lastName} was imported via ${source === "wodify" ? "Wodify" : "CSV"} upload`,
          date: new Date(),
        });
      } catch (_timelineErr) {
      }
    } catch (err: any) {
      results.errored++;
      results.errors.push({ rowIndex: i, error: err.message || "Unexpected error" });
    }
  }

  const finalStatus = results.errored > 0 && results.created === 0 ? "failed"
    : results.errored > 0 ? "completed_with_errors"
    : "completed";

  await db.update(syncRunsTable)
    .set({
      status: finalStatus,
      created: results.created,
      skipped: results.skipped,
      errored: results.errored,
      totalRows: results.processed,
      errorDetails: results.errors.length > 0 ? results.errors.slice(0, 50) : null,
      completedAt: new Date(),
    })
    .where(eq(syncRunsTable.id, syncRun.id));

  res.json(results);
});

export default router;
