import { eq, and } from "drizzle-orm";
import { db, membersTable } from "@workspace/db";
import { createHmac } from "crypto";

const RETENTION_SEQUENCE_PRIORITY: Record<string, number> = {
  win_back: 100,
  miss_you: 80,
  check_in: 60,
  onboarding_journey: 40,
  custom: 20,
};

export function getSequencePriority(type: string): number {
  return RETENTION_SEQUENCE_PRIORITY[type] ?? 10;
}

export function isWithinQuietHours(
  timezone: string,
  quietStart = 20,
  quietEnd = 8,
): boolean {
  try {
    const nowInTz = new Date().toLocaleString("en-US", { timeZone: timezone });
    const localHour = new Date(nowInTz).getHours();

    if (quietStart > quietEnd) {
      return localHour >= quietStart || localHour < quietEnd;
    }
    return localHour >= quietStart && localHour < quietEnd;
  } catch {
    return false;
  }
}

export function getNextBusinessHourDate(
  timezone: string,
  quietEnd = 8,
): Date {
  try {
    const now = new Date();
    const nowInTz = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
    const localHour = nowInTz.getHours();
    const localMinute = nowInTz.getMinutes();

    let hoursUntilOpen: number;
    if (localHour >= quietEnd) {
      hoursUntilOpen = (24 - localHour) + quietEnd;
    } else {
      hoursUntilOpen = quietEnd - localHour;
    }

    const msUntilOpen = (hoursUntilOpen * 60 - localMinute) * 60 * 1000;
    return new Date(now.getTime() + msUntilOpen);
  } catch {
    return new Date(Date.now() + 12 * 60 * 60 * 1000);
  }
}

export async function isMemberOptedOut(
  memberId: number,
  channel: "email" | "sms",
): Promise<boolean> {
  const tag = channel === "email" ? "email-opt-out" : "sms-opt-out";
  const [member] = await db
    .select({ tags: membersTable.tags })
    .from(membersTable)
    .where(eq(membersTable.id, memberId))
    .limit(1);

  if (!member) return true;
  return member.tags.includes(tag);
}

export async function addOptOutTag(
  memberId: number,
  gymId: number,
  channel: "email" | "sms",
): Promise<boolean> {
  const tag = channel === "email" ? "email-opt-out" : "sms-opt-out";
  const [member] = await db
    .select({ tags: membersTable.tags })
    .from(membersTable)
    .where(and(eq(membersTable.id, memberId), eq(membersTable.gymId, gymId)))
    .limit(1);

  if (!member) return false;

  if (member.tags.includes(tag)) return true;

  const updatedTags = [...member.tags, tag];
  await db
    .update(membersTable)
    .set({ tags: updatedTags })
    .where(and(eq(membersTable.id, memberId), eq(membersTable.gymId, gymId)));

  return true;
}

function getUnsubscribeSecret(): string {
  return process.env.UNSUBSCRIBE_SECRET || process.env.DATABASE_URL || "forgeos-unsubscribe-fallback";
}

function signPayload(payload: string): string {
  return createHmac("sha256", getUnsubscribeSecret()).update(payload).digest("hex");
}

export function buildUnsubscribeUrl(memberId: number, gymId: number): string {
  const baseUrl = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : process.env.APP_URL || "https://app.forgeos.com";

  const payload = JSON.stringify({ m: memberId, g: gymId });
  const encoded = Buffer.from(payload).toString("base64url");
  const sig = signPayload(payload);
  return `${baseUrl}/api/unsubscribe?token=${encoded}.${sig}`;
}

export function parseUnsubscribeToken(token: string): { memberId: number; gymId: number } | null {
  try {
    const dotIdx = token.lastIndexOf(".");
    if (dotIdx === -1) return null;

    const encoded = token.substring(0, dotIdx);
    const sig = token.substring(dotIdx + 1);

    const payload = Buffer.from(encoded, "base64url").toString("utf-8");
    const expectedSig = signPayload(payload);

    if (sig !== expectedSig) {
      console.warn("[sequence-utils] Invalid unsubscribe token signature");
      return null;
    }

    const decoded = JSON.parse(payload);
    if (decoded.m && decoded.g) {
      return { memberId: decoded.m, gymId: decoded.g };
    }
    return null;
  } catch {
    return null;
  }
}
