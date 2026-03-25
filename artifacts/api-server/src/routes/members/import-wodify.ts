import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, membersTable } from "@workspace/db";
import { parseGymId, EMAIL_REGEX } from "./helpers";

const router: IRouter = Router();

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
