import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, discountCodesTable, gymsTable } from "@workspace/db";
import { stripeService } from "../../stripeService";
import { requireBillingPermission, requireBillingRead } from "../../middlewares/billingRbac";
import { billingAuditLogger } from "../../billingAuditLogger";
import { parseGymId, paramStr, getActor } from "./helpers";

const router: IRouter = Router();

router.get("/gyms/:gymId/discount-codes", requireBillingRead(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }
  const codes = await db.select().from(discountCodesTable)
    .where(eq(discountCodesTable.gymId, gymId)).orderBy(desc(discountCodesTable.createdAt));
  res.json(codes.map(c => ({ ...c, amount: parseFloat(c.amount) })));
});

router.post("/gyms/:gymId/discount-codes", requireBillingPermission("billing.create_plan"), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }
  const { name, code, type, amount, duration, durationInMonths, maxRedemptions, expiresAt } = req.body;
  if (!name || !code || !type || !amount) { res.status(400).json({ error: "name, code, type, amount required" }); return; }
  if (!["percentage", "fixed"].includes(type)) { res.status(400).json({ error: "type must be percentage or fixed" }); return; }
  try {
    const result = await stripeService.createDiscountCode(gymId, {
      name, code, type, amount: parseFloat(amount),
      duration: duration || "once", durationInMonths, maxRedemptions,
      expiresAt: expiresAt || undefined,
    }, getActor(req));
    res.status(201).json(result);
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.patch("/gyms/:gymId/discount-codes/:id", requireBillingPermission("billing.create_plan"), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }
  const id = parseInt(paramStr(req.params.id), 10);
  const { isActive } = req.body;
  const [updated] = await db.update(discountCodesTable)
    .set({ isActive: !!isActive })
    .where(and(eq(discountCodesTable.id, id), eq(discountCodesTable.gymId, gymId)))
    .returning();
  if (!updated) { res.status(404).json({ error: "Discount not found" }); return; }
  await billingAuditLogger.log({
    gymId, actorUserId: req.user?.id, actorName: req.user?.firstName || "Unknown",
    action: isActive ? "discount.reactivated" : "discount.deactivated",
    entityType: "discount", entityId: String(id), source: "ui",
  });
  res.json({ ...updated, amount: parseFloat(updated.amount) });
});

router.post("/gyms/:gymId/subscriptions/:subscriptionId/apply-discount", requireBillingPermission("billing.create_subscription"), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }
  const subscriptionId = parseInt(paramStr(req.params.subscriptionId), 10);
  const { discountId } = req.body;
  if (!discountId) { res.status(400).json({ error: "discountId required" }); return; }
  try {
    const result = await stripeService.applyDiscountToSubscription(subscriptionId, gymId, parseInt(String(discountId), 10), getActor(req));
    res.json(result);
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.delete("/gyms/:gymId/subscriptions/:subscriptionId/discount", requireBillingPermission("billing.create_subscription"), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }
  const subscriptionId = parseInt(paramStr(req.params.subscriptionId), 10);
  try {
    const result = await stripeService.removeDiscountFromSubscription(subscriptionId, gymId, getActor(req));
    res.json(result);
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.get("/gyms/:gymId/tax-config", requireBillingRead(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }
  const [gym] = await db.select().from(gymsTable).where(eq(gymsTable.id, gymId));
  if (!gym) { res.status(404).json({ error: "Gym not found" }); return; }
  res.json({
    taxEnabled: gym.taxEnabled, taxLabel: gym.taxLabel,
    taxRate: gym.taxRate ? parseFloat(gym.taxRate) : 0,
    taxJurisdiction: gym.taxJurisdiction, stripeTaxRateId: gym.stripeTaxRateId,
  });
});

router.post("/gyms/:gymId/tax-config", requireBillingPermission("billing.create_plan"), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }
  const { taxLabel, taxRate, taxJurisdiction } = req.body;
  if (!taxLabel || taxRate === undefined) { res.status(400).json({ error: "taxLabel and taxRate required" }); return; }
  try {
    const result = await stripeService.createOrUpdateTaxRate(gymId, { taxLabel, taxRate: parseFloat(taxRate), taxJurisdiction }, getActor(req));
    res.json(result);
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.delete("/gyms/:gymId/tax-config", requireBillingPermission("billing.create_plan"), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }
  try {
    const result = await stripeService.disableTax(gymId, getActor(req));
    res.json(result);
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

export default router;
