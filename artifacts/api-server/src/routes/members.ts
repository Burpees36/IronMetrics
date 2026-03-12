import { Router, type IRouter } from "express";
import { eq, and, ilike, or, count, desc } from "drizzle-orm";
import { db, membersTable, memberNotesTable, timelineEventsTable, subscriptionsTable, attendanceTable } from "@workspace/db";
import { CreateMemberBody, UpdateMemberBody, AddMemberNoteBody } from "@workspace/api-zod";

const router: IRouter = Router();

function parseGymId(params: any): number | null {
  const raw = Array.isArray(params.gymId) ? params.gymId[0] : params.gymId;
  const id = parseInt(raw, 10);
  return isNaN(id) ? null : id;
}

function parseMemberId(params: any): number | null {
  const raw = Array.isArray(params.memberId) ? params.memberId[0] : params.memberId;
  const id = parseInt(raw, 10);
  return isNaN(id) ? null : id;
}

router.get("/gyms/:gymId/members", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const status = req.query.status as string | undefined;
  const search = req.query.search as string | undefined;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const offset = parseInt(req.query.offset as string) || 0;

  let conditions = [eq(membersTable.gymId, gymId)];
  if (status) conditions.push(eq(membersTable.status, status));
  if (search) {
    conditions.push(
      or(
        ilike(membersTable.firstName, `%${search}%`),
        ilike(membersTable.lastName, `%${search}%`),
        ilike(membersTable.email, `%${search}%`)
      )!
    );
  }

  const where = conditions.length === 1 ? conditions[0] : and(...conditions);

  const members = await db
    .select()
    .from(membersTable)
    .where(where)
    .orderBy(desc(membersTable.createdAt))
    .limit(limit)
    .offset(offset);

  const [totalResult] = await db
    .select({ count: count() })
    .from(membersTable)
    .where(where);

  res.json({
    members: members.map((m) => ({
      ...m,
      riskScore: m.riskScore ? parseFloat(m.riskScore) : null,
    })),
    total: totalResult?.count ?? 0,
    limit,
    offset,
  });
});

router.post("/gyms/:gymId/members", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const parsed = CreateMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const today = new Date().toISOString().split("T")[0];
  const [member] = await db
    .insert(membersTable)
    .values({
      ...parsed.data,
      gymId,
      status: "active",
      joinDate: today,
      tags: parsed.data.tags || [],
    })
    .returning();

  await db.insert(timelineEventsTable).values({
    memberId: member.id,
    gymId,
    type: "joined",
    title: "Member joined",
    description: `${member.firstName} ${member.lastName} joined the gym`,
    date: new Date(),
  });

  res.status(201).json({
    ...member,
    riskScore: member.riskScore ? parseFloat(member.riskScore) : null,
  });
});

router.get("/gyms/:gymId/members/:memberId", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const memberId = parseMemberId(req.params);
  if (!gymId || !memberId) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const [member] = await db
    .select()
    .from(membersTable)
    .where(and(eq(membersTable.id, memberId), eq(membersTable.gymId, gymId)));

  if (!member) { res.status(404).json({ error: "Member not found" }); return; }

  const notes = await db
    .select()
    .from(memberNotesTable)
    .where(eq(memberNotesTable.memberId, memberId))
    .orderBy(desc(memberNotesTable.createdAt));

  const recentAttendance = await db
    .select()
    .from(attendanceTable)
    .where(eq(attendanceTable.memberId, memberId))
    .orderBy(desc(attendanceTable.checkinTime))
    .limit(20);

  const [activeSub] = await db
    .select()
    .from(subscriptionsTable)
    .where(and(eq(subscriptionsTable.memberId, memberId), eq(subscriptionsTable.status, "active")));

  res.json({
    ...member,
    riskScore: member.riskScore ? parseFloat(member.riskScore) : null,
    notes,
    recentAttendance: recentAttendance.map((a) => ({ ...a })),
    activeSubscription: activeSub ? { ...activeSub, amount: parseFloat(activeSub.amount), failedPayments: activeSub.failedPayments } : undefined,
    waiverSigned: member.waiverSigned,
  });
});

router.patch("/gyms/:gymId/members/:memberId", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const memberId = parseMemberId(req.params);
  if (!gymId || !memberId) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const parsed = UpdateMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [member] = await db
    .update(membersTable)
    .set(parsed.data)
    .where(and(eq(membersTable.id, memberId), eq(membersTable.gymId, gymId)))
    .returning();

  if (!member) { res.status(404).json({ error: "Member not found" }); return; }

  res.json({
    ...member,
    riskScore: member.riskScore ? parseFloat(member.riskScore) : null,
  });
});

router.post("/gyms/:gymId/members/:memberId/notes", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const memberId = parseMemberId(req.params);
  if (!gymId || !memberId) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const parsed = AddMemberNoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const authorName = req.isAuthenticated() ? `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim() || "Staff" : "System";
  const authorId = req.isAuthenticated() ? req.user.id : undefined;

  const [note] = await db
    .insert(memberNotesTable)
    .values({ memberId, gymId, content: parsed.data.content, authorName, authorId })
    .returning();

  res.status(201).json(note);
});

router.get("/gyms/:gymId/members/:memberId/timeline", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const memberId = parseMemberId(req.params);
  if (!gymId || !memberId) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const events = await db
    .select()
    .from(timelineEventsTable)
    .where(and(eq(timelineEventsTable.memberId, memberId), eq(timelineEventsTable.gymId, gymId)))
    .orderBy(desc(timelineEventsTable.date));

  res.json(events.map((e) => ({ ...e, metadata: e.metadata ? JSON.parse(e.metadata) : {} })));
});

const VALID_STATUSES = ["active", "inactive", "hold", "cancelled", "prospect"];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function normalizePhone(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  return digits || phone.trim();
}

function isValidCalendarDate(dateStr: string): boolean {
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return false;
  const [y, m, day] = dateStr.split("-").map(Number);
  return d.getFullYear() === y && d.getMonth() + 1 === m && d.getDate() === day;
}

function parseImportDate(val: string): string | null {
  if (!val) return null;
  const trimmed = val.trim();
  if (DATE_REGEX.test(trimmed)) {
    return isValidCalendarDate(trimmed) ? trimmed : null;
  }
  const parts = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (parts) {
    const year = parts[3].length === 2 ? "20" + parts[3] : parts[3];
    const month = parts[1].padStart(2, "0");
    const day = parts[2].padStart(2, "0");
    const candidate = `${year}-${month}-${day}`;
    if (isValidCalendarDate(candidate)) return candidate;
    return null;
  }
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    const iso = d.toISOString().split("T")[0];
    return isValidCalendarDate(iso) ? iso : null;
  }
  return null;
}

interface ImportRow {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  status?: string;
  joinDate?: string;
  birthDate?: string;
  membershipType?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  address?: string;
  city?: string;
  state?: string;
  notes?: string;
  tags?: string;
}

interface ValidatedRow {
  rowIndex: number;
  data: ImportRow;
  errors: string[];
  isDuplicate: boolean;
  duplicateOf?: { id: number; name: string; email: string };
}

function safeStr(val: any): string {
  if (val === null || val === undefined) return "";
  return String(val);
}

function sanitizeRow(row: ImportRow): ImportRow {
  return {
    firstName: safeStr(row.firstName),
    lastName: safeStr(row.lastName),
    email: safeStr(row.email),
    phone: safeStr(row.phone),
    status: safeStr(row.status),
    joinDate: safeStr(row.joinDate),
    birthDate: safeStr(row.birthDate),
    membershipType: safeStr(row.membershipType),
    emergencyContactName: safeStr(row.emergencyContactName),
    emergencyContactPhone: safeStr(row.emergencyContactPhone),
    address: safeStr(row.address),
    city: safeStr(row.city),
    state: safeStr(row.state),
    notes: safeStr(row.notes),
    tags: safeStr(row.tags),
  };
}

function validateRow(row: ImportRow, rowIndex: number): Omit<ValidatedRow, "isDuplicate" | "duplicateOf"> {
  const safe = sanitizeRow(row);
  const errors: string[] = [];
  if (!safe.firstName?.trim()) errors.push("First name is required");
  if (!safe.lastName?.trim()) errors.push("Last name is required");
  if (!safe.email?.trim()) errors.push("Email is required");
  else if (!EMAIL_REGEX.test(safe.email.trim())) errors.push("Invalid email format");
  if (safe.status && !VALID_STATUSES.includes(safe.status.toLowerCase().trim())) {
    errors.push(`Invalid status "${safe.status}". Must be: ${VALID_STATUSES.join(", ")}`);
  }
  if (safe.joinDate && !parseImportDate(safe.joinDate)) errors.push(`Invalid join date format "${safe.joinDate}"`);
  if (safe.birthDate && !parseImportDate(safe.birthDate)) errors.push(`Invalid birth date format "${safe.birthDate}"`);
  return { rowIndex, data: safe, errors };
}

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

  const emails = validated
    .filter((r) => r.data.email && r.errors.length === 0)
    .map((r) => r.data.email!.toLowerCase().trim());

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

  const { rows } = req.body as { rows: ImportRow[] };
  if (!Array.isArray(rows) || rows.length === 0) {
    res.status(400).json({ error: "No rows to import" });
    return;
  }
  if (rows.length > 5000) {
    res.status(400).json({ error: "Maximum 5,000 rows per import" });
    return;
  }

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
          title: "Imported from CSV",
          description: `${member.firstName} ${member.lastName} was imported via CSV upload`,
          date: new Date(),
        });
      } catch (_timelineErr) {
      }
    } catch (err: any) {
      results.errored++;
      results.errors.push({ rowIndex: i, error: err.message || "Unexpected error" });
    }
  }

  res.json(results);
});

export default router;
