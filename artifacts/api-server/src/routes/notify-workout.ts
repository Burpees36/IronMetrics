import { Router, type IRouter } from "express";
import { eq, and, gte, lte, asc } from "drizzle-orm";
import { db, gymsTable, membersTable, programmingDaysTable, programmingSectionsTable } from "@workspace/db";
import { sendMemberEmail } from "../services/member-email";
import { requireProgrammingWrite } from "../middlewares/programmingRbac";

const router: IRouter = Router();

const COOLDOWN_MS = 15 * 60 * 1000;
const lastNotifyTimestamps = new Map<string, number>();

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function getCooldownKey(gymId: number, date: string | undefined): string {
  return `${gymId}:${date || "all"}`;
}

function getPublicBaseUrl(): string {
  const devDomain = process.env.REPLIT_DEV_DOMAIN;
  if (devDomain) {
    return `https://${devDomain}`;
  }
  return process.env.APP_URL || "https://ironmetrics.app";
}

router.post("/gyms/:gymId/notify-workout", requireProgrammingWrite(), async (req, res): Promise<void> => {
  try {
    const gymId = Number(req.params.gymId);
    if (!gymId || isNaN(gymId)) {
      res.status(400).json({ error: "Invalid gym ID" });
      return;
    }

    const { date, startDate, endDate } = req.body as { date?: string; startDate?: string; endDate?: string };

    if (date && !DATE_REGEX.test(date)) {
      res.status(400).json({ error: "Invalid date format. Expected YYYY-MM-DD." });
      return;
    }
    if (startDate && !DATE_REGEX.test(startDate)) {
      res.status(400).json({ error: "Invalid startDate format. Expected YYYY-MM-DD." });
      return;
    }
    if (endDate && !DATE_REGEX.test(endDate)) {
      res.status(400).json({ error: "Invalid endDate format. Expected YYYY-MM-DD." });
      return;
    }

    const cooldownKey = getCooldownKey(gymId, date || startDate);
    const lastSent = lastNotifyTimestamps.get(cooldownKey);
    if (lastSent && Date.now() - lastSent < COOLDOWN_MS) {
      const remainingMin = Math.ceil((COOLDOWN_MS - (Date.now() - lastSent)) / 60000);
      res.status(429).json({
        error: `Notification was sent recently. Please wait ${remainingMin} minute${remainingMin !== 1 ? "s" : ""} before sending again.`,
        cooldownMinutes: remainingMin,
      });
      return;
    }

    const [gym] = await db.select().from(gymsTable).where(eq(gymsTable.id, gymId));
    if (!gym) {
      res.status(404).json({ error: "Business not found" });
      return;
    }

    const conditions = [
      eq(programmingDaysTable.gymId, gymId),
      eq(programmingDaysTable.status, "published"),
    ];

    if (date) {
      conditions.push(eq(programmingDaysTable.date, date));
    } else if (startDate || endDate) {
      if (startDate) {
        conditions.push(gte(programmingDaysTable.date, startDate));
      }
      if (endDate) {
        conditions.push(lte(programmingDaysTable.date, endDate));
      }
    } else {
      const today = new Date().toISOString().split("T")[0];
      const weekFromNow = new Date();
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      const weekEnd = weekFromNow.toISOString().split("T")[0];
      conditions.push(gte(programmingDaysTable.date, today));
      conditions.push(lte(programmingDaysTable.date, weekEnd));
    }

    const publishedDays = await db
      .select()
      .from(programmingDaysTable)
      .where(and(...conditions))
      .orderBy(asc(programmingDaysTable.date));

    if (publishedDays.length === 0) {
      res.status(400).json({ error: "No published programming found for the specified date." });
      return;
    }

    const daySections = await Promise.all(
      publishedDays.map(async (day) => {
        const sections = await db
          .select()
          .from(programmingSectionsTable)
          .where(eq(programmingSectionsTable.dayId, day.id))
          .orderBy(asc(programmingSectionsTable.orderIndex));
        return { day, sections };
      })
    );

    const activeMembers = await db
      .select()
      .from(membersTable)
      .where(and(eq(membersTable.gymId, gymId), eq(membersTable.status, "active")));

    const membersWithEmail = activeMembers.filter((m) => m.email && m.email.trim().length > 0);

    if (membersWithEmail.length === 0) {
      res.status(400).json({ error: "No active members with email addresses found." });
      return;
    }

    const baseUrl = getPublicBaseUrl();
    const publicUrl = `${baseUrl}/wod/${gym.slug}`;

    const workoutSummary = daySections
      .map(({ day, sections }) => {
        const dateFormatted = new Date(day.date + "T00:00:00").toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        });
        const sectionList = sections
          .map((s) => `  - ${s.title}${s.instructions ? `: ${s.instructions.split("\n")[0]}` : ""}`)
          .join("\n");
        return `${day.title} (${dateFormatted})\n${sectionList}`;
      })
      .join("\n\n");

    const firstDay = daySections[0];
    const subject = daySections.length === 1
      ? `New Programming: ${firstDay.day.title}`
      : `New Programming Published - ${daySections.length} days`;

    const textBody = `New programming has been published at ${gym.name}!\n\n${workoutSummary}\n\nView the full programming:\n${publicUrl}\n`;

    const htmlBody = buildNotificationHtml(gym.name, daySections, publicUrl, gym.logoUrl);

    let emailsSent = 0;
    const errors: string[] = [];

    for (const member of membersWithEmail) {
      const result = await sendMemberEmail({
        memberId: member.id,
        gymId,
        to: member.email,
        subject,
        text: textBody,
        html: htmlBody,
        emailType: "workout_notification",
        timelineTitle: "Workout notification sent",
        fromEmail: gym.fromEmail || undefined,
        fromName: gym.fromName || gym.name,
      });
      if (result.success) {
        emailsSent++;
      } else if (result.error) {
        errors.push(`${member.email}: ${result.error}`);
      }
    }

    if (emailsSent > 0) {
      lastNotifyTimestamps.set(cooldownKey, Date.now());
    }

    console.log(`[notify-workout] Sent ${emailsSent}/${membersWithEmail.length} emails for gym ${gymId}`);
    if (errors.length > 0) {
      console.warn(`[notify-workout] ${errors.length} email failures:`, errors.slice(0, 5));
    }

    res.json({ emailsSent, totalMembers: membersWithEmail.length, errors: errors.length });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[notify-workout] Error:", error.message);
    res.status(500).json({ error: "Failed to send workout notifications" });
  }
});

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildNotificationHtml(
  gymName: string,
  daySections: Array<{ day: { title: string; date: string }; sections: Array<{ title: string; instructions: string | null; sectionType: string }> }>,
  publicUrl: string,
  logoUrl: string | null,
): string {
  const dayBlocks = daySections
    .map(({ day, sections }) => {
      const dateFormatted = new Date(day.date + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
      const sectionRows = sections
        .map(
          (s) =>
            `<tr><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;"><strong style="color:#1a1a1a;">${escapeHtml(s.title)}</strong>${
              s.instructions
                ? `<br/><span style="color:#666;font-size:13px;">${escapeHtml(s.instructions.split("\n").slice(0, 3).join("\n")).replace(/\n/g, "<br/>")}</span>`
                : ""
            }</td></tr>`
        )
        .join("");

      return `
        <div style="margin-bottom:20px;">
          <h2 style="color:#1a1a1a;font-size:18px;margin:0 0 4px 0;">${escapeHtml(day.title)}</h2>
          <p style="color:#888;font-size:13px;margin:0 0 12px 0;">${escapeHtml(dateFormatted)}</p>
          <table style="width:100%;border-collapse:collapse;background:#fafafa;border-radius:8px;overflow:hidden;">
            ${sectionRows}
          </table>
        </div>
      `;
    })
    .join("");

  const safeGymName = escapeHtml(gymName);
  const logoBlock = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="${safeGymName}" style="max-height:48px;margin-bottom:16px;" />`
    : "";

  return `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
        <div style="background:white;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          ${logoBlock}
          <h1 style="color:#1a1a1a;font-size:22px;margin:0 0 8px 0;">New Programming Published</h1>
          <p style="color:#666;font-size:14px;margin:0 0 24px 0;">Check out the latest programming at ${safeGymName}</p>
          ${dayBlocks}
          <div style="margin-top:24px;text-align:center;">
            <a href="${escapeHtml(publicUrl)}" style="display:inline-block;padding:12px 32px;background:#6366f1;color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">
              View Full Programming
            </a>
          </div>
        </div>
        <p style="text-align:center;color:#999;font-size:12px;margin-top:16px;">
          Sent by ${safeGymName} via Iron Metrics
        </p>
      </div>
    </body>
    </html>
  `;
}

export default router;
