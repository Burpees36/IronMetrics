import { getSmsService } from "./sms-service";
import { fmtDollars } from "./iron-metrics-voice";

interface BriefingSnapshot {
  activeMembers: number;
  mrr: number;
  rsiScore: number;
  rsiBand: string;
  atRiskMembers: number;
  failedPayments: number;
  staleLeads: number;
}

interface GymSmsConfig {
  smsEnabled?: boolean;
  twilioAccountSid?: string | null;
  twilioAuthToken?: string | null;
  twilioPhoneNumber?: string | null;
}

export function buildBriefingSmsText(
  gymName: string,
  snapshot: BriefingSnapshot,
  dashboardUrl: string
): string {
  const parts: string[] = [`${gymName} Morning Brief:`];

  const alerts: string[] = [];
  if (snapshot.atRiskMembers > 0) alerts.push(`${snapshot.atRiskMembers} at-risk`);
  if (snapshot.failedPayments > 0) alerts.push(`${snapshot.failedPayments} failed pmts`);
  if (snapshot.staleLeads > 0) alerts.push(`${snapshot.staleLeads} stale leads`);

  if (alerts.length > 0) {
    parts.push(alerts.join(", "));
  } else {
    parts.push("All clear");
  }

  parts.push(`${snapshot.activeMembers} members | ${fmtDollars(snapshot.mrr)} MRR | RSI ${snapshot.rsiScore.toFixed(0)}`);
  parts.push(dashboardUrl);

  return parts.join("\n");
}

export async function sendBriefingSms(
  toPhone: string,
  gymName: string,
  snapshot: BriefingSnapshot,
  dashboardUrl: string,
  gymConfig: GymSmsConfig
): Promise<{ success: boolean; error?: string }> {
  const smsService = getSmsService(gymConfig);
  if (!smsService.isConfigured()) {
    return { success: false, error: "SMS service not configured" };
  }

  const body = buildBriefingSmsText(gymName, snapshot, dashboardUrl);

  const result = await smsService.sendSms({ to: toPhone, body });
  return result;
}
