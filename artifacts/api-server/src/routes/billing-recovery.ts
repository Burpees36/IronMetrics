import { Router, type IRouter } from "express";
import { db, billingRecoveryTable, subscriptionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { billingRecoveryService } from "../services/billing-recovery";
import { paymentUpdateTokenService } from "../services/payment-update-token";
import { billingAuditLogger } from "../billingAuditLogger";
import { requireBillingPermission } from "../middlewares/billingRbac";

const router: IRouter = Router();

function parseGymId(params: any): number | null {
  const raw = Array.isArray(params.gymId) ? params.gymId[0] : params.gymId;
  const id = parseInt(raw, 10);
  return isNaN(id) ? null : id;
}

router.get("/gyms/:gymId/billing/recovery", requireBillingPermission("billing.read"), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  try {
    const recoveries = await billingRecoveryService.getActiveRecoveries(gymId);
    res.json(recoveries);
  } catch (err: any) {
    console.error(`[billing-recovery] Error fetching recoveries for gym ${gymId}:`, err.message);
    res.status(500).json({ error: "Failed to fetch recovery data" });
  }
});

router.get("/gyms/:gymId/members/:memberId/billing/recovery", requireBillingPermission("billing.read"), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const memberId = parseInt(String(req.params.memberId), 10);
  if (!gymId || isNaN(memberId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  try {
    const recovery = await billingRecoveryService.getMemberRecovery(memberId, gymId);
    res.json(recovery);
  } catch (err: any) {
    console.error(`[billing-recovery] Error fetching member recovery: gym=${gymId}, member=${memberId}:`, err.message);
    res.status(500).json({ error: "Failed to fetch recovery data" });
  }
});

router.post("/gyms/:gymId/billing/recovery/:recoveryId/send-link", requireBillingPermission("billing.create_subscription"), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const recoveryId = parseInt(String(req.params.recoveryId), 10);
  if (!gymId || isNaN(recoveryId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  try {
    const [recovery] = await db.select().from(billingRecoveryTable).where(
      and(eq(billingRecoveryTable.id, recoveryId), eq(billingRecoveryTable.gymId, gymId))
    );

    if (!recovery) { res.status(404).json({ error: "Recovery not found" }); return; }

    const result = await billingRecoveryService.sendRecoveryNotification(
      recoveryId, gymId, recovery.memberId, recovery.subscriptionId
    );

    await billingAuditLogger.log({
      gymId,
      memberId: recovery.memberId,
      actorUserId: req.user?.id,
      actorName: req.user?.firstName && req.user?.lastName ? `${req.user.firstName} ${req.user.lastName}` : undefined,
      action: "recovery.link_generated",
      entityType: "billing_recovery",
      entityId: String(recoveryId),
      source: "ui",
      metadata: { manual: true },
    });

    res.json({
      success: result.success,
      updateLink: result.updateLink,
      emailSent: result.success,
      error: result.error,
    });
  } catch (err: any) {
    console.error(`[billing-recovery] Error sending link for recovery ${recoveryId}:`, err.message);
    res.status(500).json({ error: "Failed to send recovery link" });
  }
});

router.post("/gyms/:gymId/billing/recovery/generate-link", requireBillingPermission("billing.create_subscription"), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const { memberId, subscriptionId } = req.body;
  if (!memberId || !subscriptionId) { res.status(400).json({ error: "memberId and subscriptionId required" }); return; }

  try {
    const parsedMemberId = parseInt(String(memberId), 10);
    const parsedSubId = parseInt(String(subscriptionId), 10);

    const [sub] = await db.select().from(subscriptionsTable).where(
      and(
        eq(subscriptionsTable.id, parsedSubId),
        eq(subscriptionsTable.gymId, gymId),
        eq(subscriptionsTable.memberId, parsedMemberId)
      )
    );
    if (!sub) { res.status(404).json({ error: "Subscription not found or does not belong to member" }); return; }

    const { token, expiresAt } = await paymentUpdateTokenService.createToken({
      gymId,
      memberId: parsedMemberId,
      subscriptionId: parsedSubId,
    });

    const domain = process.env.REPLIT_DOMAINS?.split(",")[0] || process.env.REPLIT_DEV_DOMAIN || "localhost";
    const updateLink = `https://${domain}/update-payment?token=${token}`;

    await billingAuditLogger.log({
      gymId,
      memberId: parseInt(String(memberId), 10),
      actorUserId: req.user?.id,
      actorName: req.user?.firstName && req.user?.lastName ? `${req.user.firstName} ${req.user.lastName}` : undefined,
      action: "recovery.link_generated",
      entityType: "payment_update_token",
      entityId: token.substring(0, 8),
      source: "ui",
    });

    res.json({ updateLink, expiresAt });
  } catch (err: any) {
    console.error(`[billing-recovery] Error generating link for gym ${gymId}:`, err.message);
    res.status(500).json({ error: "Failed to generate recovery link" });
  }
});

router.post("/gyms/:gymId/billing/recovery/evaluate-grace", requireBillingPermission("billing.create_subscription"), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  try {
    const result = await billingRecoveryService.evaluateGraceDeadlines(gymId);
    res.json({
      success: true,
      escalated: result.escalated,
      errors: result.errors,
    });
  } catch (err: any) {
    console.error(`[billing-recovery] Error evaluating grace deadlines:`, err.message);
    res.status(500).json({ error: "Failed to evaluate grace deadlines" });
  }
});

router.post("/gyms/:gymId/billing/recovery/maintenance", requireBillingPermission("billing.create_subscription"), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  try {
    const [tokensDeleted, recoveriesArchived] = await Promise.all([
      paymentUpdateTokenService.cleanupExpiredTokens(gymId),
      billingRecoveryService.archiveOldResolvedRecoveries(gymId),
    ]);

    const graceResult = await billingRecoveryService.evaluateGraceDeadlines(gymId);

    await billingAuditLogger.log({
      gymId,
      actorUserId: req.user?.id,
      actorName: req.user?.firstName && req.user?.lastName ? `${req.user.firstName} ${req.user.lastName}` : undefined,
      action: "maintenance.tokens_cleaned",
      entityType: "system",
      source: "ui",
      metadata: {
        tokensDeleted,
        recoveriesArchived,
        graceEscalated: graceResult.escalated,
        graceErrors: graceResult.errors,
      },
    });

    res.json({
      success: true,
      tokensDeleted,
      recoveriesArchived,
      graceEscalated: graceResult.escalated,
      graceErrors: graceResult.errors,
    });
  } catch (err: any) {
    console.error(`[billing-recovery] Error running maintenance:`, err.message);
    res.status(500).json({ error: "Maintenance task failed" });
  }
});

export default router;
