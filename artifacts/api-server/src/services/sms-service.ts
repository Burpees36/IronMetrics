interface SmsParams {
  to: string;
  body: string;
  from?: string;
}

interface SmsService {
  isConfigured(): boolean;
  sendSms(params: SmsParams): Promise<{ success: boolean; messageSid?: string; error?: string }>;
}

class TwilioSmsService implements SmsService {
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor(accountSid: string, authToken: string, fromNumber: string) {
    this.accountSid = accountSid;
    this.authToken = authToken;
    this.fromNumber = fromNumber;
  }

  isConfigured(): boolean {
    return !!(this.accountSid && this.authToken && this.fromNumber);
  }

  async sendSms(params: SmsParams): Promise<{ success: boolean; messageSid?: string; error?: string }> {
    try {
      const from = params.from || this.fromNumber;
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;

      const formData = new URLSearchParams();
      formData.append("To", params.to);
      formData.append("From", from);
      formData.append("Body", params.body);

      const credentials = Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64");

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      const data = await response.json() as any;

      if (!response.ok) {
        console.error("[sms-service] Twilio API error:", { status: response.status, error: data.message });
        return { success: false, error: data.message || `Twilio API error: ${response.status}` };
      }

      console.log("[sms-service] SMS sent via Twilio:", { messageSid: data.sid });
      return { success: true, messageSid: data.sid };
    } catch (error: any) {
      console.error("[sms-service] Twilio send failed:", error.message);
      return { success: false, error: error.message || "Failed to send SMS" };
    }
  }
}

class NoopSmsService implements SmsService {
  isConfigured(): boolean {
    return false;
  }

  async sendSms(): Promise<{ success: boolean; error?: string }> {
    return { success: false, error: "No SMS service configured. Set up Twilio in Settings to enable text messaging." };
  }
}

export function getSmsService(gymConfig?: {
  smsEnabled?: boolean;
  twilioAccountSid?: string | null;
  twilioAuthToken?: string | null;
  twilioPhoneNumber?: string | null;
}): SmsService {
  if (
    gymConfig?.smsEnabled &&
    gymConfig.twilioAccountSid &&
    gymConfig.twilioAuthToken &&
    gymConfig.twilioPhoneNumber
  ) {
    return new TwilioSmsService(
      gymConfig.twilioAccountSid,
      gymConfig.twilioAuthToken,
      gymConfig.twilioPhoneNumber
    );
  }

  return new NoopSmsService();
}

export type { SmsService, SmsParams };
