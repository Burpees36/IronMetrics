import { Router, type IRouter } from "express";
import { eq, and, ilike, or, count, desc, ne, sql } from "drizzle-orm";
import { db, membersTable, memberNotesTable, timelineEventsTable, subscriptionsTable, attendanceTable } from "@workspace/db";
import { CreateMemberBody, UpdateMemberBody, AddMemberNoteBody } from "@workspace/api-zod";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    total: Number(totalResult?.count ?? 0),
    limit,
    offset,
  });
});

router.get("/gyms/:gymId/members/check-email", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const email = (req.query.email as string || "").trim().toLowerCase();
  if (!email) { res.json({ exists: false }); return; }

  const excludeId = req.query.excludeMemberId ? parseInt(req.query.excludeMemberId as string, 10) : null;

  let conditions = [eq(membersTable.gymId, gymId), eq(sql`lower(${membersTable.email})`, email)];
  if (excludeId) conditions.push(ne(membersTable.id, excludeId));

  const [existing] = await db.select({ id: membersTable.id, firstName: membersTable.firstName, lastName: membersTable.lastName })
    .from(membersTable).where(and(...conditions)).limit(1);

  if (existing) {
    res.json({ exists: true, memberName: `${existing.firstName} ${existing.lastName}`, memberId: existing.id });
  } else {
    res.json({ exists: false, memberName: null, memberId: null });
  }
});

router.get("/gyms/:gymId/members/membership-types", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const rows = await db.selectDistinct({ membershipType: membersTable.membershipType })
    .from(membersTable)
    .where(and(eq(membersTable.gymId, gymId), sql`${membersTable.membershipType} IS NOT NULL AND ${membersTable.membershipType} != ''`))
    .orderBy(membersTable.membershipType);

  res.json(rows.map(r => r.membershipType as string));
});

router.post("/gyms/:gymId/members", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const parsed = CreateMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const fieldErrors: Record<string, string> = {};
  if (!parsed.data.firstName?.trim()) fieldErrors.firstName = "First name is required";
  if (!parsed.data.lastName?.trim()) fieldErrors.lastName = "Last name is required";
  if (!parsed.data.email?.trim()) fieldErrors.email = "Email is required";
  else if (!EMAIL_REGEX.test(parsed.data.email.trim())) fieldErrors.email = "Invalid email format";

  if (Object.keys(fieldErrors).length > 0) {
    res.status(400).json({ error: "Validation failed", fieldErrors });
    return;
  }

  const emailLower = parsed.data.email.trim().toLowerCase();
  const [dup] = await db.select({ id: membersTable.id })
    .from(membersTable)
    .where(and(eq(membersTable.gymId, gymId), eq(sql`lower(${membersTable.email})`, emailLower)))
    .limit(1);

  if (dup) {
    res.status(409).json({ error: "A member with this email already exists", fieldErrors: { email: "This email is already in use" } });
    return;
  }

  const today = new Date().toISOString().split("T")[0];
  const [member] = await db
    .insert(membersTable)
    .values({
      ...parsed.data,
      firstName: parsed.data.firstName.trim(),
      lastName: parsed.data.lastName.trim(),
      email: parsed.data.email.trim().toLowerCase(),
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

  const fieldErrors: Record<string, string> = {};
  const data = parsed.data;

  if (data.firstName !== undefined && !data.firstName.trim()) {
    fieldErrors.firstName = "First name is required";
  }
  if (data.lastName !== undefined && !data.lastName.trim()) {
    fieldErrors.lastName = "Last name is required";
  }
  if (data.email !== undefined) {
    if (!data.email.trim()) {
      fieldErrors.email = "Email is required";
    } else if (!EMAIL_REGEX.test(data.email.trim())) {
      fieldErrors.email = "Invalid email format";
    } else {
      const [existing] = await db
        .select({ id: membersTable.id })
        .from(membersTable)
        .where(and(
          eq(membersTable.gymId, gymId),
          eq(sql`lower(${membersTable.email})`, data.email.trim().toLowerCase()),
          ne(membersTable.id, memberId)
        ))
        .limit(1);
      if (existing) {
        fieldErrors.email = "This email is already in use";
      }
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    res.status(400).json({ error: "Validation failed", fieldErrors });
    return;
  }

  if (data.email) {
    data.email = data.email.trim().toLowerCase();
  }

  const [member] = await db
    .update(membersTable)
    .set(data)
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
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  return digits || phone.trim();
}

export function isValidCalendarDate(dateStr: string): boolean {
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return false;
  const [y, m, day] = dateStr.split("-").map(Number);
  return d.getFullYear() === y && d.getMonth() + 1 === m && d.getDate() === day;
}

export function parseImportDate(val: string): string | null {
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

export function sanitizeRow(row: ImportRow): ImportRow {
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

export function validateRow(row: ImportRow, rowIndex: number): Omit<ValidatedRow, "isDuplicate" | "duplicateOf"> {
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

router.post("/gyms/:gymId/members/import/wodify/preview", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const { rows: rawRows } = req.body as { rows: Record<string, string>[] };
  if (!Array.isArray(rawRows) || rawRows.length === 0) {
    res.status(400).json({ error: "No rows provided" });
    return;
  }
  if (rawRows.length > 5000) {
    res.status(400).json({ error: "Maximum 5,000 rows per import" });
    return;
  }

  function getCol(row: Record<string, string>, ...candidates: string[]): string {
    for (const c of candidates) {
      if (row[c] !== undefined && row[c] !== null) return String(row[c]).trim();
    }
    return "";
  }

  function parseWodifyAmount(val: string): number {
    if (!val) return 0;
    const cleaned = val.replace(/[^0-9.\-eE]/g, "");
    if (!cleaned) return 0;
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : Math.round(num * 100) / 100;
  }

  function parseWodifyDate(val: string): string | null {
    if (!val) return null;
    const isoMatch = val.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) return val;
    const usMatch = val.match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/);
    if (usMatch) {
      const months: Record<string, string> = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };
      const m = months[usMatch[1].toLowerCase().slice(0, 3)];
      if (m) return `${usMatch[3]}-${m}-${usMatch[2].padStart(2, "0")}`;
    }
    return null;
  }

  interface WodifyMember {
    clientId: string;
    firstName: string;
    lastName: string;
    email: string;
    memberships: { name: string; type: string; amount: number; paymentPlan: string; autoRenew: boolean; startDate: string | null; expirationDate: string | null }[];
    primaryMembership: string;
    totalMonthlyRevenue: number;
    paymentMethod: string;
    emailSubscribed: boolean;
    location: string;
    programs: string[];
    joinDate: string | null;
  }

  const memberMap = new Map<string, WodifyMember>();
  const emailToKey = new Map<string, string>();

  for (const row of rawRows) {
    const clientId = getCol(row, "Client ID");
    const clientName = getCol(row, "Client Name");
    const email = getCol(row, "Email", "Clients → Email", "Clients  Email");
    const membership = getCol(row, "Membership");
    const membershipType = getCol(row, "Membership Type");
    const paymentPlan = getCol(row, "Payment Plan");
    const paymentMethod = getCol(row, "Default Payment Method", "Clients → Default Payment Method", "Clients  Default Payment Method");
    const startDate = getCol(row, "Start Date");
    const expirationDate = getCol(row, "Expiration Date");
    const autoRenew = getCol(row, "Membership Autorenew");
    const commitmentTotal = getCol(row, "Autorenew Commitment Total", "Commitment Total");
    const emailSub = getCol(row, "Mass Email Subscribed", "Clients → Mass Email Subscribed", "Clients  Mass Email Subscribed");
    const location = getCol(row, "Location");
    const programs = getCol(row, "Programs");

    if (!clientId && !email) continue;

    const normalizedEmail = email ? email.toLowerCase().trim() : "";
    let key = clientId || normalizedEmail;

    if (normalizedEmail && emailToKey.has(normalizedEmail) && !memberMap.has(key)) {
      key = emailToKey.get(normalizedEmail)!;
    }

    const amount = parseWodifyAmount(commitmentTotal);
    const parsedStart = parseWodifyDate(startDate);

    const nameParts = clientName.split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    if (!memberMap.has(key)) {
      memberMap.set(key, {
        clientId: clientId,
        firstName,
        lastName,
        email: email.toLowerCase().trim(),
        memberships: [],
        primaryMembership: "",
        totalMonthlyRevenue: 0,
        paymentMethod,
        emailSubscribed: emailSub.toLowerCase() !== "not subscribed",
        location,
        programs: [],
        joinDate: parsedStart,
      });
      if (normalizedEmail) emailToKey.set(normalizedEmail, key);
    }

    const member = memberMap.get(key)!;

    if (!member.email && normalizedEmail) member.email = normalizedEmail;
    if (normalizedEmail && !emailToKey.has(normalizedEmail)) emailToKey.set(normalizedEmail, key);
    if (!member.paymentMethod && paymentMethod) member.paymentMethod = paymentMethod;

    member.memberships.push({
      name: membership,
      type: membershipType,
      amount,
      paymentPlan,
      autoRenew: autoRenew.toLowerCase().includes("auto"),
      startDate: parsedStart,
      expirationDate: parseWodifyDate(expirationDate),
    });

    if (parsedStart && (!member.joinDate || parsedStart < member.joinDate)) {
      member.joinDate = parsedStart;
    }

    if (programs) {
      const progList = programs.split(",").map(p => p.trim()).filter(Boolean);
      for (const p of progList) {
        if (!member.programs.includes(p)) member.programs.push(p);
      }
    }
  }

  for (const member of memberMap.values()) {
    const nonZeroMemberships = member.memberships.filter(m => m.amount > 0);
    member.totalMonthlyRevenue = member.memberships.reduce((sum, m) => sum + m.amount, 0);

    if (nonZeroMemberships.length > 0) {
      const primary = nonZeroMemberships.reduce((a, b) => a.amount > b.amount ? a : b);
      member.primaryMembership = primary.name || primary.paymentPlan || "Unknown";
    } else if (member.memberships.length > 0) {
      member.primaryMembership = member.memberships[0].name || member.memberships[0].paymentPlan || "Complimentary";
    }
  }

  const members = Array.from(memberMap.values()).filter(m => m.email);
  const existingMembers = await db
    .select({ id: membersTable.id, firstName: membersTable.firstName, lastName: membersTable.lastName, email: membersTable.email })
    .from(membersTable)
    .where(eq(membersTable.gymId, gymId));
  const existingEmails = new Set(existingMembers.map(m => m.email.toLowerCase()));

  const previewMembers = members.map((m, i) => ({
    rowIndex: i,
    data: {
      firstName: m.firstName,
      lastName: m.lastName,
      email: m.email,
      membershipType: m.primaryMembership,
      joinDate: m.joinDate || new Date().toISOString().split("T")[0],
      status: "active",
      tags: m.emailSubscribed ? "" : "email-opt-out",
    },
    memberships: m.memberships,
    totalMonthlyRevenue: m.totalMonthlyRevenue,
    paymentMethod: m.paymentMethod,
    emailSubscribed: m.emailSubscribed,
    programCount: m.programs.length,
    errors: [] as string[],
    isDuplicate: false,
    duplicateOf: undefined as { id: number; name: string; email: string } | undefined,
  }));

  for (const row of previewMembers) {
    if (!row.data.firstName) row.errors.push("Missing first name");
    if (!row.data.lastName) row.errors.push("Missing last name");
    if (!row.data.email) row.errors.push("Missing email");
    else if (!EMAIL_REGEX.test(row.data.email)) row.errors.push("Invalid email");

    if (existingEmails.has(row.data.email.toLowerCase())) {
      row.isDuplicate = true;
      const existing = existingMembers.find(m => m.email.toLowerCase() === row.data.email.toLowerCase());
      if (existing) row.duplicateOf = { id: existing.id, name: `${existing.firstName} ${existing.lastName}`, email: existing.email };
    }
  }

  const csvEmailsSeen = new Map<string, number>();
  for (const row of previewMembers) {
    if (row.data.email && !row.isDuplicate && row.errors.length === 0) {
      const email = row.data.email.toLowerCase();
      if (csvEmailsSeen.has(email)) {
        row.isDuplicate = true;
        row.errors.push(`Duplicate of row ${csvEmailsSeen.get(email)! + 1}`);
      } else {
        csvEmailsSeen.set(email, row.rowIndex);
      }
    }
  }

  const membershipBreakdown: Record<string, number> = {};
  for (const m of members) {
    const key = m.primaryMembership || "Unknown";
    membershipBreakdown[key] = (membershipBreakdown[key] || 0) + 1;
  }

  const totalMRR = members.reduce((sum, m) => sum + m.totalMonthlyRevenue, 0);
  const validRows = previewMembers.filter(r => r.errors.length === 0 && !r.isDuplicate).length;

  res.json({
    rows: previewMembers,
    summary: {
      totalRows: rawRows.length,
      uniqueMembers: members.length,
      validRows,
      invalidRows: previewMembers.filter(r => r.errors.length > 0).length,
      duplicateRows: previewMembers.filter(r => r.isDuplicate).length,
      totalMRR: Math.round(totalMRR * 100) / 100,
      membershipBreakdown,
      emailOptOuts: members.filter(m => !m.emailSubscribed).length,
    },
  });
});

export default router;
