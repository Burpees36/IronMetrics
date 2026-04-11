import { getEmailService } from "./email-service";
import { fmtDollars, fmtPercent } from "./iron-metrics-voice";

interface GymBranding {
  name: string;
  fromEmail?: string | null;
  fromName?: string | null;
  logoUrl?: string | null;
  email?: string | null;
  phone?: string | null;
}

interface BriefingItem {
  icon: string;
  priority: "critical" | "warning" | "info" | "positive";
  message: string;
  action?: string;
  link?: string;
}

interface BriefingSnapshot {
  activeMembers: number;
  mrr: number;
  rsiScore: number;
  rsiBand: string;
  atRiskMembers: number;
  atRiskCritical: number;
  atRiskHigh: number;
  revenueAtRisk: number;
  engagementRate: number;
  staleLeads: number;
  newLeads: number;
  activeLeads: number;
  failedPayments: number;
  todayClasses: number;
  classFillRate: number;
}

interface OvernightAction {
  type: string;
  count: number;
  description: string;
}

interface CelebrationSummary {
  type: string;
  memberName: string;
  detail: string;
}

interface BriefingEmailData {
  summary: string;
  items: BriefingItem[];
  snapshot: BriefingSnapshot;
  overnightActions: OvernightAction[];
  celebrations: CelebrationSummary[];
  dashboardUrl: string;
}

function priorityColor(priority: string): string {
  switch (priority) {
    case "critical": return "#ef4444";
    case "warning": return "#f59e0b";
    case "positive": return "#10b981";
    default: return "#6b7280";
  }
}

function priorityBgColor(priority: string): string {
  switch (priority) {
    case "critical": return "#fef2f2";
    case "warning": return "#fffbeb";
    case "positive": return "#f0fdf4";
    default: return "#f9fafb";
  }
}

function priorityIcon(priority: string): string {
  switch (priority) {
    case "critical": return "&#9888;";
    case "warning": return "&#9888;";
    case "positive": return "&#10003;";
    default: return "&#8226;";
  }
}

function buildItemsHtml(items: BriefingItem[]): string {
  if (items.length === 0) {
    return `
      <div style="padding:20px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin:16px 0;">
        <p style="margin:0;font-size:15px;color:#166534;text-align:center;">
          &#10003; All clear — your gym is running smoothly. Use today to build.
        </p>
      </div>
    `;
  }

  return items.map((item) => `
    <div style="padding:14px 16px;background:${priorityBgColor(item.priority)};border-left:4px solid ${priorityColor(item.priority)};border-radius:0 8px 8px 0;margin:8px 0;">
      <p style="margin:0;font-size:14px;color:#374151;line-height:1.5;">
        <span style="color:${priorityColor(item.priority)};font-weight:600;">${priorityIcon(item.priority)}</span>
        ${item.message}
      </p>
      ${item.action ? `<p style="margin:6px 0 0;font-size:13px;"><a href="${item.link || "#"}" style="color:${priorityColor(item.priority)};font-weight:600;text-decoration:none;">${item.action} &rarr;</a></p>` : ""}
    </div>
  `).join("");
}

function buildOvernightHtml(actions: OvernightAction[]): string {
  if (actions.length === 0) return "";

  const rows = actions.map((a) => `
    <tr>
      <td style="padding:8px 12px;font-size:14px;color:#374151;border-bottom:1px solid #f3f4f6;">${a.description}</td>
      <td style="padding:8px 12px;font-size:14px;color:#6b7280;text-align:right;border-bottom:1px solid #f3f4f6;">${a.count}</td>
    </tr>
  `).join("");

  return `
    <div style="margin:24px 0;">
      <h3 style="margin:0 0 12px;font-size:15px;font-weight:600;color:#111827;">&#9889; Auto-Pilot overnight report</h3>
      <table style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:8px;overflow:hidden;">
        ${rows}
      </table>
    </div>
  `;
}

function buildCelebrationsHtml(celebrations: CelebrationSummary[]): string {
  if (celebrations.length === 0) return "";

  const celebrationEmoji: Record<string, string> = {
    birthday: "&#127874;",
    anniversary: "&#127881;",
    attendance_milestone: "&#127942;",
    streak: "&#128293;",
    comeback: "&#128170;",
  };

  const items = celebrations.map((c) => `
    <div style="display:inline-block;padding:8px 14px;background:#faf5ff;border:1px solid #e9d5ff;border-radius:20px;margin:4px;font-size:13px;color:#7c3aed;">
      ${celebrationEmoji[c.type] || "&#127881;"} ${c.memberName} — ${c.detail}
    </div>
  `).join("");

  return `
    <div style="margin:24px 0;">
      <h3 style="margin:0 0 12px;font-size:15px;font-weight:600;color:#111827;">&#127881; Celebrations today</h3>
      <div>${items}</div>
    </div>
  `;
}

function buildSnapshotHtml(snapshot: BriefingSnapshot): string {
  const metrics = [
    { label: "Active Members", value: String(snapshot.activeMembers) },
    { label: "MRR", value: fmtDollars(snapshot.mrr) },
    { label: "RSI", value: `${snapshot.rsiScore.toFixed(1)} (${snapshot.rsiBand})` },
    { label: "Engagement", value: fmtPercent(snapshot.engagementRate) },
    { label: "At Risk", value: String(snapshot.atRiskMembers) },
    { label: "Classes Today", value: `${snapshot.todayClasses} (${snapshot.classFillRate}% full)` },
  ];

  const cells = metrics.map((m) => `
    <td style="padding:12px 8px;text-align:center;width:33%;">
      <p style="margin:0;font-size:20px;font-weight:700;color:#111827;">${m.value}</p>
      <p style="margin:4px 0 0;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">${m.label}</p>
    </td>
  `);

  const row1 = cells.slice(0, 3).join("");
  const row2 = cells.slice(3).join("");

  return `
    <div style="margin:24px 0;background:#f9fafb;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>${row1}</tr>
        <tr>${row2}</tr>
      </table>
    </div>
  `;
}

export function buildMorningBriefingEmail(
  data: BriefingEmailData,
  branding: GymBranding
): { subject: string; html: string; text: string } {
  const primaryColor = "#10B981";
  const logoHtml = branding.logoUrl
    ? `<img src="${branding.logoUrl}" alt="${branding.name}" style="max-height:48px;max-width:200px;margin-bottom:16px;" />`
    : "";

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="text-align:center;padding:32px 24px 24px;background:${primaryColor};border-radius:12px 12px 0 0;">
      ${logoHtml}
      <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">${branding.name}</h1>
      <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.85);">Morning Briefing &bull; ${dateStr}</p>
    </div>
    <div style="padding:32px 24px;">
      <p style="margin:0 0 20px;font-size:16px;color:#374151;line-height:1.6;">${data.summary}</p>
      ${buildSnapshotHtml(data.snapshot)}
      ${buildItemsHtml(data.items)}
      ${buildOvernightHtml(data.overnightActions)}
      ${buildCelebrationsHtml(data.celebrations)}
      <div style="text-align:center;margin:28px 0 8px;">
        <a href="${data.dashboardUrl}" style="display:inline-block;padding:14px 32px;background:${primaryColor};color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">
          Open Dashboard
        </a>
      </div>
    </div>
    <div style="text-align:center;padding:24px;background:#f9fafb;border-radius:0 0 12px 12px;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:13px;color:#9ca3af;">${branding.name}</p>
      ${branding.email ? `<p style="margin:4px 0 0;font-size:13px;color:#9ca3af;">${branding.email}</p>` : ""}
    </div>
  </div>
</body>
</html>`;

  const textParts = [
    `Morning Briefing — ${dateStr}`,
    `${branding.name}`,
    "",
    data.summary,
    "",
    `Active Members: ${data.snapshot.activeMembers}`,
    `MRR: ${fmtDollars(data.snapshot.mrr)}`,
    `RSI: ${data.snapshot.rsiScore.toFixed(1)} (${data.snapshot.rsiBand})`,
    `At Risk: ${data.snapshot.atRiskMembers}`,
    `Engagement: ${fmtPercent(data.snapshot.engagementRate)}`,
    "",
  ];

  for (const item of data.items) {
    textParts.push(`[${item.priority.toUpperCase()}] ${item.message}`);
  }

  if (data.overnightActions.length > 0) {
    textParts.push("", "Auto-Pilot overnight:");
    for (const a of data.overnightActions) {
      textParts.push(`  - ${a.description}: ${a.count}`);
    }
  }

  if (data.celebrations.length > 0) {
    textParts.push("", "Celebrations today:");
    for (const c of data.celebrations) {
      textParts.push(`  - ${c.memberName}: ${c.detail}`);
    }
  }

  textParts.push("", `View dashboard: ${data.dashboardUrl}`);

  const criticalCount = data.items.filter((i) => i.priority === "critical").length;
  const warningCount = data.items.filter((i) => i.priority === "warning").length;
  let subjectLine: string;
  if (criticalCount > 0) {
    subjectLine = `${criticalCount} critical item${criticalCount !== 1 ? "s" : ""} need attention — Morning Briefing`;
  } else if (warningCount > 0) {
    subjectLine = `${warningCount} item${warningCount !== 1 ? "s" : ""} to follow up — Morning Briefing`;
  } else {
    subjectLine = "All clear — Morning Briefing";
  }

  return { subject: subjectLine, html, text: textParts.join("\n") };
}

export async function sendMorningBriefingEmail(
  toEmail: string,
  data: BriefingEmailData,
  branding: GymBranding
): Promise<{ success: boolean; error?: string }> {
  const emailService = getEmailService();
  if (!emailService.isConfigured()) {
    return { success: false, error: "Email service not configured" };
  }

  const { subject, html, text } = buildMorningBriefingEmail(data, branding);

  const result = await emailService.sendEmail({
    to: toEmail,
    subject,
    text,
    html,
    fromEmail: branding.fromEmail || undefined,
    fromName: branding.fromName || branding.name,
  });

  return result;
}
