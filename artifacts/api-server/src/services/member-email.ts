import { db, timelineEventsTable } from "@workspace/db";
import { getEmailService } from "./email-service";

interface EmailTimelineParams {
  memberId: number;
  gymId: number;
  to: string;
  subject: string;
  emailType: string;
  timelineTitle: string;
  messageId?: string;
}

interface MemberEmailParams extends EmailTimelineParams {
  text: string;
  html?: string;
  fromEmail?: string;
  fromName?: string;
}

export async function logMemberEmailSent(params: EmailTimelineParams): Promise<void> {
  await db.insert(timelineEventsTable).values({
    memberId: params.memberId,
    gymId: params.gymId,
    type: "email_sent",
    title: params.timelineTitle,
    description: `Subject: ${params.subject}`,
    date: new Date(),
    metadata: JSON.stringify({
      emailType: params.emailType,
      subject: params.subject,
      to: params.to,
      messageId: params.messageId,
    }),
  });
}

export async function sendMemberEmail(params: MemberEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const emailService = getEmailService();

  const result = await emailService.sendEmail({
    to: params.to,
    subject: params.subject,
    text: params.text,
    html: params.html,
    fromEmail: params.fromEmail,
    fromName: params.fromName,
  });

  if (result.success) {
    await logMemberEmailSent({
      ...params,
      messageId: result.messageId,
    });
  }

  return result;
}
