import { getEmailService } from "./email-service";

interface GymBranding {
  name: string;
  fromEmail?: string | null;
  fromName?: string | null;
  logoUrl?: string | null;
  email?: string | null;
  phone?: string | null;
}

function buildHeader(branding: GymBranding, primaryColor: string): string {
  const logoHtml = branding.logoUrl
    ? `<img src="${branding.logoUrl}" alt="${branding.name}" style="max-height:48px;max-width:200px;margin-bottom:16px;" />`
    : "";
  return `
    <div style="text-align:center;padding:32px 24px 24px;background:${primaryColor};border-radius:12px 12px 0 0;">
      ${logoHtml}
      <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">${branding.name}</h1>
    </div>
  `;
}

function buildFooter(branding: GymBranding): string {
  const contactLines: string[] = [];
  if (branding.email) contactLines.push(`Email: ${branding.email}`);
  if (branding.phone) contactLines.push(`Phone: ${branding.phone}`);
  const contactHtml = contactLines.length > 0
    ? `<p style="margin:8px 0 0;font-size:13px;color:#9ca3af;">${contactLines.join(" &bull; ")}</p>`
    : "";

  return `
    <div style="text-align:center;padding:24px;background:#f9fafb;border-radius:0 0 12px 12px;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:13px;color:#9ca3af;">${branding.name}</p>
      ${contactHtml}
    </div>
  `;
}

function wrapEmail(branding: GymBranding, bodyContent: string): string {
  const primaryColor = "#FBBF24";
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    ${buildHeader(branding, primaryColor)}
    <div style="padding:32px 24px;">
      ${bodyContent}
    </div>
    ${buildFooter(branding)}
  </div>
</body>
</html>`;
}

export function buildPaymentFailedEmail(params: {
  memberName: string;
  amountDue: number;
  cardLast4?: string | null;
  cardBrand?: string | null;
  updateLink: string;
  branding: GymBranding;
}): { subject: string; html: string; text: string } {
  const { memberName, amountDue, cardLast4, cardBrand, updateLink, branding } = params;

  const cardInfo = cardLast4 && cardBrand
    ? `<p style="margin:0 0 16px;font-size:15px;color:#6b7280;">Card on file: <strong>${cardBrand} ending in ${cardLast4}</strong></p>`
    : "";

  const body = `
    <h2 style="margin:0 0 8px;font-size:18px;font-weight:600;color:#111827;">Payment Issue</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;">Hi ${memberName},</p>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;">
      We were unable to process your payment of <strong>$${amountDue.toFixed(2)}</strong> for your membership at ${branding.name}.
    </p>
    ${cardInfo}
    <p style="margin:0 0 24px;font-size:15px;color:#374151;">
      Please update your payment method to keep your membership active. Click the button below to securely update your card:
    </p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${updateLink}" style="display:inline-block;padding:14px 32px;background:#FBBF24;color:#111827;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">
        Update Payment Method
      </a>
    </div>
    <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;">
      This link expires in 72 hours. If you have questions, please contact us directly.
    </p>
  `;

  const text = `Hi ${memberName},\n\nWe were unable to process your payment of $${amountDue.toFixed(2)} for your membership at ${branding.name}.\n\nPlease update your payment method: ${updateLink}\n\nThis link expires in 72 hours.\n\n${branding.name}`;

  return {
    subject: `Action Required: Payment failed for your ${branding.name} membership`,
    html: wrapEmail(params.branding, body),
    text,
  };
}

export function buildPaymentUpdatedEmail(params: {
  memberName: string;
  cardLast4: string;
  cardBrand: string;
  branding: GymBranding;
}): { subject: string; html: string; text: string } {
  const { memberName, cardLast4, cardBrand, branding } = params;

  const body = `
    <h2 style="margin:0 0 8px;font-size:18px;font-weight:600;color:#111827;">Payment Method Updated</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;">Hi ${memberName},</p>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;">
      Your payment method has been successfully updated for your membership at ${branding.name}.
    </p>
    <div style="padding:16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin:16px 0;">
      <p style="margin:0;font-size:15px;color:#166534;">
        &#10003; New card: <strong>${cardBrand} ending in ${cardLast4}</strong>
      </p>
    </div>
    <p style="margin:16px 0 0;font-size:15px;color:#374151;">
      Your membership is now active and future payments will be charged to this card. No further action is needed.
    </p>
  `;

  const text = `Hi ${memberName},\n\nYour payment method has been successfully updated for your membership at ${branding.name}.\n\nNew card: ${cardBrand} ending in ${cardLast4}\n\nYour membership is now active.\n\n${branding.name}`;

  return {
    subject: `Payment method updated - ${branding.name}`,
    html: wrapEmail(params.branding, body),
    text,
  };
}

export function buildGraceExpiredEmail(params: {
  memberName: string;
  amountDue: number;
  updateLink: string;
  branding: GymBranding;
}): { subject: string; html: string; text: string } {
  const { memberName, amountDue, updateLink, branding } = params;

  const body = `
    <h2 style="margin:0 0 8px;font-size:18px;font-weight:600;color:#991b1b;">Final Notice: Payment Required</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#374151;">Hi ${memberName},</p>
    <div style="padding:16px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;margin:0 0 16px;">
      <p style="margin:0;font-size:15px;color:#991b1b;">
        Your payment of <strong>$${amountDue.toFixed(2)}</strong> is now significantly overdue. Your membership at ${branding.name} may be suspended if this is not resolved promptly.
      </p>
    </div>
    <p style="margin:0 0 24px;font-size:15px;color:#374151;">
      Please update your payment method immediately to keep your membership active:
    </p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${updateLink}" style="display:inline-block;padding:14px 32px;background:#dc2626;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">
        Update Payment Method Now
      </a>
    </div>
    <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;">
      This link expires in 72 hours. If you have questions or need assistance, please contact us directly.
    </p>
  `;

  const text = `FINAL NOTICE: Hi ${memberName},\n\nYour payment of $${amountDue.toFixed(2)} for your membership at ${branding.name} is significantly overdue. Your membership may be suspended.\n\nUpdate your payment method now: ${updateLink}\n\nThis link expires in 72 hours.\n\n${branding.name}`;

  return {
    subject: `FINAL NOTICE: Payment overdue for your ${branding.name} membership`,
    html: wrapEmail(params.branding, body),
    text,
  };
}

export async function sendBillingEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
  branding: GymBranding;
}): Promise<{ success: boolean; error?: string }> {
  const emailService = getEmailService();

  if (!emailService.isConfigured()) {
    console.warn("[billing-email] No email service configured, skipping email send");
    return { success: false, error: "Email service not configured" };
  }

  const result = await emailService.sendEmail({
    to: params.to,
    subject: params.subject,
    text: params.text,
    html: params.html,
    fromEmail: params.branding.fromEmail || undefined,
    fromName: params.branding.fromName || params.branding.name,
  });

  return result;
}
