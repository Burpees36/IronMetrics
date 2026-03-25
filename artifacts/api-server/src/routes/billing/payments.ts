import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, paymentsTable, refundsTable } from "@workspace/db";
import { stripeService } from "../../stripeService";
import { getStripeClient } from "../../stripeClient";
import { requireBillingPermission, requireBillingRead } from "../../middlewares/billingRbac";
import { parseGymId, getActor } from "./helpers";

const router: IRouter = Router();

router.get("/gyms/:gymId/payment-methods/:paymentMethodId", requireBillingRead(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const pmId = req.params.paymentMethodId;
  if (!pmId) { res.status(400).json({ error: "Payment method ID is required" }); return; }

  try {
    const stripe = await getStripeClient();
    const pm = await stripe.paymentMethods.retrieve(pmId);
    if (pm.customer) {
      const customerId = typeof pm.customer === "string" ? pm.customer : pm.customer.id;
      const customer = await stripe.customers.retrieve(customerId);
      if (!customer.deleted) {
        const meta = (customer as { metadata?: Record<string, string> }).metadata || {};
        if (meta.gymId && meta.gymId !== String(gymId)) {
          res.status(403).json({ error: "Payment method does not belong to this gym" });
          return;
        }
      }
    }
    res.json({
      brand: pm.card?.brand || "card",
      last4: pm.card?.last4 || "****",
      expMonth: pm.card?.exp_month,
      expYear: pm.card?.exp_year,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to retrieve payment method";
    res.status(400).json({ error: message });
  }
});

router.post("/gyms/:gymId/members/:memberId/setup-intent", requireBillingPermission("billing.create_subscription"), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const memberId = parseInt(String(req.params.memberId), 10);
  if (!gymId || isNaN(memberId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  try {
    const result = await stripeService.createSetupIntent(memberId, gymId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/gyms/:gymId/members/:memberId/payment-methods", requireBillingRead(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const memberId = parseInt(String(req.params.memberId), 10);
  if (!gymId || isNaN(memberId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  try {
    const methods = await stripeService.listPaymentMethods(memberId, gymId);
    res.json(methods);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/gyms/:gymId/members/:memberId/payment-methods/:paymentMethodId/set-default", requireBillingPermission("billing.create_subscription"), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const memberId = parseInt(String(req.params.memberId), 10);
  const paymentMethodId = req.params.paymentMethodId;
  if (!gymId || isNaN(memberId) || !paymentMethodId) { res.status(400).json({ error: "Invalid IDs" }); return; }

  try {
    await stripeService.setDefaultPaymentMethod(memberId, gymId, paymentMethodId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/gyms/:gymId/members/:memberId/payment-methods/:paymentMethodId", requireBillingPermission("billing.create_subscription"), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const memberId = parseInt(String(req.params.memberId), 10);
  const paymentMethodId = req.params.paymentMethodId;
  if (!gymId || isNaN(memberId) || !paymentMethodId) { res.status(400).json({ error: "Invalid IDs" }); return; }

  try {
    await stripeService.detachPaymentMethod(memberId, gymId, paymentMethodId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/gyms/:gymId/members/:memberId/charge", requireBillingPermission("billing.create_charge"), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const memberId = parseInt(String(req.params.memberId), 10);
  if (!gymId || isNaN(memberId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const { amount, description, paymentMethodId } = req.body;
  if (!amount || !description) { res.status(400).json({ error: "amount and description required" }); return; }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) { res.status(400).json({ error: "Amount must be a positive number" }); return; }

  try {
    const result = await stripeService.createOneTimeCharge(memberId, gymId, parsedAmount, description, paymentMethodId, getActor(req));
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/gyms/:gymId/payments/:paymentId/refund", requireBillingPermission("billing.issue_refund"), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const paymentId = parseInt(String(req.params.paymentId), 10);
  if (!gymId || isNaN(paymentId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const { amount, reason } = req.body;

  try {
    const result = await stripeService.refundPayment(paymentId, gymId, amount ? parseFloat(amount) : undefined, reason, getActor(req));
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/gyms/:gymId/members/:memberId/billing-history", requireBillingRead(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const memberId = parseInt(String(req.params.memberId), 10);
  if (!gymId || isNaN(memberId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  try {
    const result = await stripeService.getMemberBillingHistory(memberId, gymId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/gyms/:gymId/payments", requireBillingRead(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const payments = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.gymId, gymId))
    .orderBy(desc(paymentsTable.createdAt));

  res.json(payments.map((p) => ({ ...p, amount: parseFloat(p.amount) })));
});

router.get("/gyms/:gymId/refunds", requireBillingRead(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const refunds = await db
    .select()
    .from(refundsTable)
    .where(eq(refundsTable.gymId, gymId))
    .orderBy(desc(refundsTable.createdAt));

  res.json(refunds.map((r) => ({ ...r, amount: parseFloat(r.amount) })));
});

router.get("/gyms/:gymId/members/:memberId/stripe-invoices", requireBillingRead(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }
  const memberId = parseInt(req.params.memberId, 10);
  try {
    const invoices = await stripeService.getMemberStripeInvoices(memberId, gymId);
    res.json(invoices);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get("/gyms/:gymId/members/:memberId/balance", requireBillingRead(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }
  const memberId = parseInt(req.params.memberId, 10);
  try {
    const balance = await stripeService.getMemberBalance(memberId, gymId);
    res.json({ balance });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post("/gyms/:gymId/members/:memberId/balance", requireBillingPermission("billing.create_subscription"), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }
  const memberId = parseInt(req.params.memberId, 10);
  const { amount, description } = req.body;
  if (!amount || !description) { res.status(400).json({ error: "amount and description required" }); return; }
  try {
    const result = await stripeService.adjustMemberBalance(memberId, gymId, parseFloat(amount), description, getActor(req));
    res.json(result);
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

export default router;
