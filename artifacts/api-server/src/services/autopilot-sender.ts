import { eq, and, sql, desc } from "drizzle-orm";
import { db, aiTasksTable, aiOperatorSettingsTable, membersTable, leadsTable, gymsTable } from "@workspace/db";
import { sendMemberEmail } from "./member-email";
import { getEmailService } from "./email-service";

const TYPE_TO_SETTING_KEY: Record<string, "autopilotOutreach" | "autopilotBilling" | "autopilotLeads"> = {
  outreach: "autopilotOutreach",
  billing: "autopilotBilling",
  leads: "autopilotLeads",
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

  const emailService = getEmailService();
  if (!emailService.isConfigured()) {
    return { autoSentCount: 0, skippedCount: 0 };
  }

  const [gym] = await db.select().from(gymsTable).where(eq(gymsTable.id, gymId));
  if (!gym?.fromEmail) {
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

    const inCooldown = await isWithinCooldown(
      gymId,
      task.targetId,
      task.targetType,
      settings.cooldownDays
    );
    if (inCooldown) {
      skippedCount++;
      console.log(
        `[autopilot] Skipping task ${task.id} — target ${task.targetType}:${task.targetId} within ${settings.cooldownDays}-day cooldown`
      );
      continue;
    }

    let recipientEmail: string | null = null;
    let recipientName = "";

    if (task.targetType === "member") {
      const [member] = await db
        .select()
        .from(membersTable)
        .where(and(eq(membersTable.id, task.targetId), eq(membersTable.gymId, gymId)));
      if (!member) { skippedCount++; continue; }
      recipientEmail = member.email;
      recipientName = `${member.firstName} ${member.lastName}`;
    } else if (task.targetType === "lead") {
      const [lead] = await db
        .select()
        .from(leadsTable)
        .where(and(eq(leadsTable.id, task.targetId), eq(leadsTable.gymId, gymId)));
      if (!lead) { skippedCount++; continue; }
      recipientEmail = lead.email;
      recipientName = `${lead.firstName} ${lead.lastName}`;
    }

    if (!recipientEmail) {
      skippedCount++;
      console.log(
        `[autopilot] Skipping task ${task.id} — no valid email for ${task.targetType}:${task.targetId}`
      );
      continue;
    }

    const subjectMap: Record<string, string> = {
      outreach: `Checking in, ${recipientName.split(" ")[0]}`,
      leads: `Let's connect, ${recipientName.split(" ")[0]}`,
      billing: `Quick heads-up about your account, ${recipientName.split(" ")[0]}`,
    };
    const subject = task.subject || subjectMap[task.type] || "Message from your gym";

    try {
      let sendResult;

      if (task.targetType === "member") {
        sendResult = await sendMemberEmail({
          memberId: task.targetId,
          gymId,
          to: recipientEmail,
          subject,
          text: task.aiContent,
          fromEmail: gym.fromEmail,
          fromName: gym.fromName || undefined,
          emailType: task.type,
          timelineTitle: "AI Auto-Pilot email sent",
        });
      } else {
        sendResult = await emailService.sendEmail({
          to: recipientEmail,
          subject,
          text: task.aiContent,
          fromEmail: gym.fromEmail,
          fromName: gym.fromName || undefined,
        });
      }

      if (sendResult.success) {
        await db
          .update(aiTasksTable)
          .set({ status: "sent", autoSent: true, updatedAt: new Date() })
          .where(eq(aiTasksTable.id, task.id));
        autoSentCount++;
        console.log(
          `[autopilot] Auto-sent task ${task.id} (${task.type}) to ${recipientEmail}`
        );
      } else {
        skippedCount++;
        console.error(
          `[autopilot] Failed to send task ${task.id}: ${sendResult.error}`
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
