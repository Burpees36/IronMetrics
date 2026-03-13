interface EmailParams {
  to: string;
  subject: string;
  text: string;
  html?: string;
  fromEmail?: string;
  fromName?: string;
}

interface EmailService {
  isConfigured(): boolean;
  sendEmail(params: EmailParams): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

class ResendEmailService implements EmailService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async sendEmail(params: EmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      let from: string;
      if (params.fromEmail && params.fromName) {
        from = `${params.fromName} <${params.fromEmail}>`;
      } else if (params.fromEmail) {
        from = params.fromEmail;
      } else {
        from = "Iron Metrics <onboarding@resend.dev>";
      }

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [params.to],
          subject: params.subject,
          text: params.text,
          ...(params.html ? { html: params.html } : {}),
        }),
      });

      const data = await response.json() as any;

      if (!response.ok) {
        console.error("[email-service] Resend API error:", { status: response.status, error: data.message });
        return { success: false, error: data.message || `Resend API error: ${response.status}` };
      }

      console.log("[email-service] Email sent via Resend:", { messageId: data.id });
      return { success: true, messageId: data.id };
    } catch (error: any) {
      console.error("[email-service] Resend send failed:", error.message);
      return { success: false, error: error.message || "Failed to send email" };
    }
  }
}

class SendGridEmailService implements EmailService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async sendEmail(params: EmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const fromObj: { email: string; name?: string } = {
        email: params.fromEmail || "noreply@ironmetrics.app",
      };
      if (params.fromName) {
        fromObj.name = params.fromName;
      }

      const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: params.to }] }],
          from: fromObj,
          subject: params.subject,
          content: [
            ...(params.html ? [{ type: "text/html", value: params.html }] : []),
            { type: "text/plain", value: params.text },
          ],
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("[email-service] SendGrid API error:", { status: response.status, error: text });
        return { success: false, error: `SendGrid API error: ${response.status} - ${text}` };
      }

      const messageId = response.headers.get("x-message-id") || undefined;
      console.log("[email-service] Email sent via SendGrid:", { messageId });
      return { success: true, messageId };
    } catch (error: any) {
      console.error("[email-service] SendGrid send failed:", error.message);
      return { success: false, error: error.message || "Failed to send email" };
    }
  }
}

class NoopEmailService implements EmailService {
  isConfigured(): boolean {
    return false;
  }

  async sendEmail(): Promise<{ success: boolean; error?: string }> {
    return { success: false, error: "No email service configured. Set up Resend or SendGrid integration to enable email sending." };
  }
}

let cachedService: EmailService | null = null;

export function getEmailService(): EmailService {
  if (cachedService) return cachedService;

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    console.log("[email-service] Initialized with Resend provider");
    cachedService = new ResendEmailService(resendKey);
    return cachedService;
  }

  const sendgridKey = process.env.SENDGRID_API_KEY;
  if (sendgridKey) {
    console.log("[email-service] Initialized with SendGrid provider");
    cachedService = new SendGridEmailService(sendgridKey);
    return cachedService;
  }

  console.warn("[email-service] No email provider configured (RESEND_API_KEY or SENDGRID_API_KEY not set)");
  cachedService = new NoopEmailService();
  return cachedService;
}

export function resetEmailServiceCache(): void {
  cachedService = null;
}
