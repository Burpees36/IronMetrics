import { eq, and, sql, desc } from "drizzle-orm";
import { db, aiTasksTable, aiOperatorSettingsTable, membersTable, leadsTable, gymsTable } from "@workspace/db";
import { sendMemberEmail } from "./member-email";
import { sendMemberSms, sendLeadSms } from "./member-sms";
import { getEmailService } from "./email-service";
import { getSmsService } from "./sms-service";

const TYPE_TO_SETTING_KEY: Record<string, "autopilotOutreach" | "autopilotBilling" | "autopilotLeads"> = {
  outreach: "autopilotOutreach",
  billing: "autopilotBilling",
  leads: "autopilotLeads",
};

const TYPE_TO_CHANNEL_KEY: Record<string, "channelOutreach" | "channelBilling" | "channelLeads"> = {
  outreach: "channelOutreach",
  billing: "channelBilling",
  leads: "channelLeads",
};

const TYPE_TO_COOLDOWN_KEY: Record<string, "cooldownOutreach" | "cooldownBilling" | "cooldownLeads"> = {
  outreach: "cooldownOutreach",
  billing: "cooldownBilling",
  leads: "cooldownLeads",
};

async function isWithinCooldown(
  gymId: number,
  targetId: number,
  targetType: string,
  cooldownDays: number
): Promise<boolean> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - cooldownDays);

  const [recent] = await db
    .select({ id: aiTasksTable.id })
    .from(aiTasksTable)
    .where(
      and(
        eq(aiTasksTable.gymId, gymId),
        eq(aiTasksTable.targetId, targetId),
        eq(aiTasksTable.targetType, targetType),
        eq(aiTasksTable.status, "sent"),
        sql`${aiTasksTable.updatedAt} >= ${cutoffDate.toISOString()}`
      )
    )
    .orderBy(desc(aiTasksTable.updatedAt))
    .limit(1);

  return !!recent;
}

function buildSmsContent(task: any, recipientName: string): string {
  const firstName = recipientName.split(" ")[0];
  const smsTemplates: Record<string, string> = {
    outreach: `Hey ${firstName}! We miss you at the gym. Want to set up a quick catch-up this week? No pressure - just want to make sure you're doing well. Reply or call us anytime!`,
    leads: `Hi ${firstName}! Thanks for your interest in our gym. We'd love to set up a free No Sweat Intro for you - 20 min, zero pressure. What day works best?`,
    billing: `Hi ${firstName}, quick heads-up - looks like there's a small issue with your payment on file. Super easy to fix! Give us a call or stop by and we'll sort it out in 2 min.`,
  };
  return smsTemplates[task.type] || `Hi ${firstName}, this is a message from your gym. Give us a call when you get a chance!`;
}

export async function processAutopilotTasks(
  gymId: number,
  insertedTasks: any[]
): Promise<{ autoSentCount: number; skippedCount: number }> {
  if (insertedTasks.length === 0) {
    return { autoSentCount: 0, skippedCount: 0 };
  }

  const [settings] = await db
    .select()
    .from(aiOperatorSettingsTable)
    .where(eq(aiOperatorSettingsTable.gymId, gymId));

  if (!settings) {
    return { autoSentCount: 0, skippedCount: 0 };
  }

  const hasAnyAutopilot =
    settings.autopilotOutreach || settings.autopilotBilling || settings.autopilotLeads;
  if (!hasAnyAutopilot) {
    return { autoSentCount: 0, skippedCount: 0 };
  }

  const [gym] = await db.select().from(gymsTable).where(eq(gymsTable.id, gymId));
  if (!gym) {
    return { autoSentCount: 0, skippedCount: 0 };
  }

  const emailService = getEmailService();
  const emailConfigured = emailService.isConfigured() && !!gym.fromEmail;

  const smsService = getSmsService(gym);
  const smsConfigured = smsService.isConfigured();

  if (!emailConfigured && !smsConfigured) {
    return { autoSentCount: 0, skippedCount: 0 };
  }

  let autoSentCount = 0;
  let skippedCount = 0;

  for (const task of insertedTasks) {
    const settingKey = TYPE_TO_SETTING_KEY[task.type];
    if (!settingKey || !settings[settingKey]) {
      continue;
    }

    if (!task.aiContent || !task.targetId || !task.targetType) {
      skippedCount++;
      continue;
    }

    const cooldownKey = TYPE_TO_COOLDOWN_KEY[task.type];
    const cooldownDays = cooldownKey ? (settings[cooldownKey] ?? settings.cooldownDays) : settings.cooldownDays;
    const inCooldown = await isWithinCooldown(
      gymId,
      task.targetId,
      task.targetType,
      cooldownDays
    );
    if (inCooldown) {
      skippedCount++;
      console.log(
        `[autopilot] Skipping task ${task.id} — target ${task.targetType}:${task.targetId} within ${cooldownDays}-day cooldown`
      );
      continue;
    }

    const channelKey = TYPE_TO_CHANNEL_KEY[task.type];
    const channelPref = channelKey ? (settings[channelKey] as string) : "email";

    let recipientEmail: string | null = null;
    let recipientPhone: string | null = null;
    let recipientName = "";

    if (task.targetType === "member") {
      const [member] = await db
        .select()
        .from(membersTable)
        .where(and(eq(membersTable.id, task.targetId), eq(membersTable.gymId, gymId)));
      if (!member) { skippedCount++; continue; }
      recipientEmail = member.email;
      recipientPhone = member.phone;
      recipientName = `${member.firstName} ${member.lastName}`;
    } else if (task.targetType === "lead") {
      const [lead] = await db
        .select()
        .from(leadsTable)
        .where(and(eq(leadsTable.id, task.targetId), eq(leadsTable.gymId, gymId)));
      if (!lead) { skippedCount++; continue; }
      recipientEmail = lead.email;
      recipientPhone = lead.phone;
      recipientName = `${lead.firstName} ${lead.lastName}`;
    }

    const shouldEmail = (channelPref === "email" || channelPref === "both") && emailConfigured && recipientEmail;
    const shouldSms = (channelPref === "sms" || channelPref === "both") && smsConfigured && recipientPhone;

    if (!shouldEmail && !shouldSms) {
      skippedCount++;
      console.log(
        `[autopilot] Skipping task ${task.id} — no valid channel for ${task.targetType}:${task.targetId} (pref: ${channelPref})`
      );
      continue;
    }

    const subjectMap: Record<string, string> = {
      outreach: `Checking in, ${recipientName.split(" ")[0]}`,
      leads: `Let's connect, ${recipientName.split(" ")[0]}`,
      billing: `Quick heads-up about your account, ${recipientName.split(" ")[0]}`,
    };
    const subject = task.subject || subjectMap[task.type] || "Message from your gym";

    let emailSuccess = false;
    let smsSuccess = false;
    let sentChannel = "";

    try {
      if (shouldEmail) {
        let sendResult;
        if (task.targetType === "member") {
          sendResult = await sendMemberEmail({
            memberId: task.targetId,
            gymId,
            to: recipientEmail!,
            subject,
            text: task.aiContent,
            fromEmail: gym.fromEmail!,
            fromName: gym.fromName || undefined,
            emailType: task.type,
            timelineTitle: "AI Auto-Pilot email sent",
          });
        } else {
          sendResult = await emailService.sendEmail({
            to: recipientEmail!,
            subject,
            text: task.aiContent,
            fromEmail: gym.fromEmail!,
            fromName: gym.fromName || undefined,
          });
        }
        emailSuccess = sendResult.success;
      }

      if (shouldSms) {
        const smsBody = buildSmsContent(task, recipientName);
        let smsResult;
        if (task.targetType === "member") {
          smsResult = await sendMemberSms({
            memberId: task.targetId,
            gymId,
            to: recipientPhone!,
            body: smsBody,
            smsType: task.type,
            timelineTitle: "AI Auto-Pilot text sent",
            gymConfig: gym,
          });
        } else {
          smsResult = await sendLeadSms({
            leadId: task.targetId,
            gymId,
            to: recipientPhone!,
            body: smsBody,
            smsType: task.type,
            gymConfig: gym,
          });
        }
        smsSuccess = smsResult.success;
      }

      if (emailSuccess && smsSuccess) sentChannel = "both";
      else if (emailSuccess) sentChannel = "email";
      else if (smsSuccess) sentChannel = "sms";

      if (emailSuccess || smsSuccess) {
        await db
          .update(aiTasksTable)
          .set({ status: "sent", autoSent: true, channel: sentChannel, updatedAt: new Date() })
          .where(eq(aiTasksTable.id, task.id));
        autoSentCount++;
        console.log(
          `[autopilot] Auto-sent task ${task.id} (${task.type}) via ${sentChannel} to ${task.targetType}:${task.targetId}`
        );
      } else {
        skippedCount++;
        console.error(
          `[autopilot] Failed to send task ${task.id} via any channel`
        );
      }
    } catch (err: any) {
      skippedCount++;
      console.error(
        `[autopilot] Error sending task ${task.id}:`,
        err.message
      );
    }
  }

  return { autoSentCount, skippedCount };
}
