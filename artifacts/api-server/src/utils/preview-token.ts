import { createHmac } from "crypto";

const PREVIEW_SECRET = process.env.PUBLIC_WOD_PREVIEW_SECRET;
const PREVIEW_TTL_MS = 60 * 60 * 1000;

if (!PREVIEW_SECRET) {
  console.warn("[preview-token] No PUBLIC_WOD_PREVIEW_SECRET set. Preview tokens will be unavailable.");
}

export function generatePreviewToken(dayId: number, gymId: number): string | null {
  if (!PREVIEW_SECRET) return null;
  const hour = Math.floor(Date.now() / PREVIEW_TTL_MS);
  const payload = `${dayId}:${gymId}:${hour}`;
  return createHmac("sha256", PREVIEW_SECRET).update(payload).digest("hex").slice(0, 32);
}

export function verifyPreviewToken(token: string, dayId: number, gymId: number): boolean {
  if (!PREVIEW_SECRET) return false;
  const hour = Math.floor(Date.now() / PREVIEW_TTL_MS);
  for (const h of [hour, hour - 1]) {
    const payload = `${dayId}:${gymId}:${h}`;
    const expected = createHmac("sha256", PREVIEW_SECRET).update(payload).digest("hex").slice(0, 32);
    if (token === expected) return true;
  }
  return false;
}
