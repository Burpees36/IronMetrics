import { db, timelineEventsTable, leadActivitiesTable } from "@workspace/db";
import { getSmsService } from "./sms-service";

interface SmsTimelineParams {
  memberId: number;
  gymId: number;
  to: string;
  smsType: string;
  timelineTitle: string;
  messageSid?: string;
  body: string;
}

interface MemberSmsParams {
  memberId: number;
  gymId: number;
  to: string;
  body: string;
  smsType: string;
  timelineTitle: string;
  gymConfig: {
    smsEnabled?: boolean;
    twilioAccountSid?: string | null;
    twilioAuthToken?: string | null;
    twilioPhoneNumber?: string | null;
  };
}

interface LeadSmsParams {
  leadId: number;
  gymId: number;
  to: string;
  body: string;
  smsType: string;
  gymConfig: {
    smsEnabled?: boolean;
    twilioAccountSid?: string | null;
    twilioAuthToken?: string | null;
    twilioPhoneNumber?: string | null;
  };
}

export async function logMemberSmsSent(params: SmsTimelineParams): Promise<void> {
  await db.insert(timelineEventsTable).values({
    memberId: params.memberId,
    gymId: params.gymId,
    type: "sms_sent",
    title: params.timelineTitle,
    description: params.body.length > 160 ? params.body.substring(0, 157) + "..." : params.body,
    date: new Date(),
    metadata: JSON.stringify({
      smsType: params.smsType,
      to: params.to,
      messageSid: params.messageSid,
      channel: "sms",
    }),
  });
}

export async function sendMemberSms(params: MemberSmsParams): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  const smsService = getSmsService(params.gymConfig);

  const result = await smsService.sendSms({
    to: params.to,
    body: params.body,
  });

  if (result.success) {
    await logMemberSmsSent({
      memberId: params.memberId,
      gymId: params.gymId,
      to: params.to,
      body: params.body,
      smsType: params.smsType,
      timelineTitle: params.timelineTitle,
      messageSid: result.messageSid,
    });
  }

  return result;
}

export async function sendLeadSms(params: LeadSmsParams): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  const smsService = getSmsService(params.gymConfig);

  const result = await smsService.sendSms({
    to: params.to,
    body: params.body,
  });

  if (result.success) {
    await db.insert(leadActivitiesTable).values({
      leadId: params.leadId,
      gymId: params.gymId,
      type: "sms_sent",
      description: params.body.length > 160 ? params.body.substring(0, 157) + "..." : params.body,
      metadata: JSON.stringify({
        smsType: params.smsType,
        to: params.to,
        messageSid: result.messageSid,
        channel: "sms",
      }),
    });
  }

  return result;
}
