import { Router, type IRouter } from "express";
import { eq, and, ilike, or, count, desc, ne, sql, inArray } from "drizzle-orm";
import { db, membersTable, memberNotesTable, timelineEventsTable, subscriptionsTable, attendanceTable, membershipPlansTable, gymsTable } from "@workspace/db";
import { stripeService } from "../../stripeService";
import { getStripeClient } from "../../stripeClient";
import { sendMemberSms } from "../../services/member-sms";
import { CreateMemberBody, UpdateMemberBody } from "@workspace/api-zod";
import { parseGymId, parseMemberId, EMAIL_REGEX } from "./helpers";

const router: IRouter = Router();

router.get("/gyms/:gymId/members", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const status = req.query.status as string | undefined;
  const search = req.query.search as string | undefined;
  const idsParam = req.query.ids as string | undefined;
  const planIdParam = req.query.planId as string | undefined;
  const planId = planIdParam ? parseInt(planIdParam, 10) : null;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const offset = parseInt(req.query.offset as string) || 0;

  let conditions = [eq(membersTable.gymId, gymId)];
  if (idsParam) {
    const ids = idsParam.split(",").map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
    if (ids.length > 0) {
      conditions.push(inArray(membersTable.id, ids));
    }
  }
  if (status) conditions.push(eq(membersTable.status, status));
  if (search) {
    conditions.push(
      or(
        ilike(membersTable.firstName, `%${search}%`),
        ilike(membersTable.lastName, `%${search}%`),
        ilike(membersTable.email, `%${search}%`)
      )!
    );
  }

  if (planId && !isNaN(planId)) {
    const memberIdsWithPlan = db
      .select({ memberId: subscriptionsTable.memberId })
      .from(subscriptionsTable)
      .where(and(
        eq(subscriptionsTable.gymId, gymId),
        eq(subscriptionsTable.planId, planId),
        inArray(subscriptionsTable.status, ["active", "past_due", "on_hold", "paused", "cancel_at_period_end"])
      ));
    conditions.push(inArray(membersTable.id, memberIdsWithPlan));
  }

  const where = conditions.length === 1 ? conditions[0] : and(...conditions);

  const members = await db
    .select()
    .from(membersTable)
    .where(where)
    .orderBy(desc(membersTable.createdAt))
    .limit(limit)
    .offset(offset);

  const [totalResult] = await db
    .select({ count: count() })
    .from(membersTable)
    .where(where);

  res.json({
    members: members.map((m) => ({
      ...m,
      riskScore: m.riskScore ? parseFloat(m.riskScore) : null,
    })),
    total: Number(totalResult?.count ?? 0),
    limit,
    offset,
  });
});

router.get("/gyms/:gymId/members/check-email", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const email = (req.query.email as string || "").trim().toLowerCase();
  if (!email) { res.json({ exists: false }); return; }

  const excludeId = req.query.excludeMemberId ? parseInt(req.query.excludeMemberId as string, 10) : null;

  let conditions = [eq(membersTable.gymId, gymId), eq(sql`lower(${membersTable.email})`, email)];
  if (excludeId) conditions.push(ne(membersTable.id, excludeId));

  const [existing] = await db.select({ id: membersTable.id, firstName: membersTable.firstName, lastName: membersTable.lastName })
    .from(membersTable).where(and(...conditions)).limit(1);

  if (existing) {
    res.json({ exists: true, memberName: `${existing.firstName} ${existing.lastName}`, memberId: existing.id });
  } else {
    res.json({ exists: false, memberName: null, memberId: null });
  }
});

router.get("/gyms/:gymId/members/membership-types", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const rows = await db.selectDistinct({ membershipType: membersTable.membershipType })
    .from(membersTable)
    .where(and(eq(membersTable.gymId, gymId), sql`${membersTable.membershipType} IS NOT NULL AND ${membersTable.membershipType} != ''`))
    .orderBy(membersTable.membershipType);

  res.json(rows.map(r => r.membershipType as string));
});

router.post("/gyms/:gymId/members", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  if (!gymId) { res.status(400).json({ error: "Invalid gym ID" }); return; }

  const parsed = CreateMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const fieldErrors: Record<string, string> = {};
  if (!parsed.data.firstName?.trim()) fieldErrors.firstName = "First name is required";
  if (!parsed.data.lastName?.trim()) fieldErrors.lastName = "Last name is required";
  if (!parsed.data.email?.trim()) fieldErrors.email = "Email is required";
  else if (!EMAIL_REGEX.test(parsed.data.email.trim())) fieldErrors.email = "Invalid email format";

  if (Object.keys(fieldErrors).length > 0) {
    res.status(400).json({ error: "Validation failed", fieldErrors });
    return;
  }

  const emailLower = parsed.data.email.trim().toLowerCase();
  const [dup] = await db.select({ id: membersTable.id })
    .from(membersTable)
    .where(and(eq(membersTable.gymId, gymId), eq(sql`lower(${membersTable.email})`, emailLower)))
    .limit(1);

  if (dup) {
    res.status(409).json({ error: "A member with this email already exists", fieldErrors: { email: "This email is already in use" } });
    return;
  }

  const today = new Date().toISOString().split("T")[0];
  const body = req.body as Record<string, unknown>;
  const setupIntentId = typeof body.setupIntentId === "string" ? body.setupIntentId : null;
  const planId = body.planId ? parseInt(String(body.planId), 10) : null;

  if (planId) {
    const billingPermissions = req.billingPermissions || [];
    const canCreateSub = billingPermissions.includes("billing.create_subscription") || req.gymRole === "owner" || req.gymRole === "admin";
    if (!canCreateSub) {
      res.status(403).json({ error: "You do not have permission to create subscriptions" });
      return;
    }
  }

  let verifiedCustomerId: string | null = null;
  let verifiedPaymentMethodId: string | null = null;

  if (setupIntentId && planId) {
    try {
      const stripe = await getStripeClient();
      const intent = await stripe.setupIntents.retrieve(setupIntentId, {
        expand: ["customer"],
      });
      if (intent.status !== "succeeded") {
        res.status(400).json({ error: "Payment setup has not been completed" });
        return;
      }
      const customer = typeof intent.customer === "string"
        ? await stripe.customers.retrieve(intent.customer)
        : intent.customer;
      if (!customer || customer.deleted) {
        res.status(400).json({ error: "Invalid customer for setup intent" });
        return;
      }
      const customerMeta = (customer as { metadata?: Record<string, string> }).metadata || {};
      if (customerMeta.gymId !== String(gymId) || customerMeta.source !== "onboarding") {
        res.status(403).json({ error: "Setup intent does not belong to this gym" });
        return;
      }
      verifiedCustomerId = customer.id;
      verifiedPaymentMethodId = typeof intent.payment_method === "string" ? intent.payment_method : null;
    } catch (err: unknown) {
      res.status(400).json({ error: "Invalid setup intent" });
      return;
    }
  }

  const [member] = await db
    .insert(membersTable)
    .values({
      ...parsed.data,
      firstName: parsed.data.firstName.trim(),
      lastName: parsed.data.lastName.trim(),
      email: parsed.data.email.trim().toLowerCase(),
      gymId,
      status: "active",
      joinDate: today,
      tags: parsed.data.tags || [],
      ...(verifiedCustomerId ? { stripeCustomerId: verifiedCustomerId } : {}),
    })
    .returning();

  await db.insert(timelineEventsTable).values({
    memberId: member.id,
    gymId,
    type: "joined",
    title: "Member joined",
    description: `${member.firstName} ${member.lastName} joined the gym`,
    date: new Date(),
  });

  let subscriptionResult = null;
  let subscriptionError = null;

  if (planId && verifiedPaymentMethodId) {
    try {
      subscriptionResult = await stripeService.createStripeSubscription(
        member.id, gymId, planId, verifiedPaymentMethodId
      );
    } catch (err: unknown) {
      subscriptionError = err instanceof Error ? err.message : "Failed to create subscription";
    }
  } else if (planId && !setupIntentId) {
    subscriptionError = "Payment setup required for subscription activation";
  }

  res.status(201).json({
    ...member,
    riskScore: member.riskScore ? parseFloat(member.riskScore) : null,
    subscription: subscriptionResult || undefined,
    subscriptionError: subscriptionError || undefined,
  });
});

router.get("/gyms/:gymId/members/:memberId", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const memberId = parseMemberId(req.params);
  if (!gymId || !memberId) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const [member] = await db
    .select()
    .from(membersTable)
    .where(and(eq(membersTable.id, memberId), eq(membersTable.gymId, gymId)));

  if (!member) { res.status(404).json({ error: "Member not found" }); return; }

  const notes = await db
    .select()
    .from(memberNotesTable)
    .where(eq(memberNotesTable.memberId, memberId))
    .orderBy(desc(memberNotesTable.createdAt));

  const recentAttendance = await db
    .select()
    .from(attendanceTable)
    .where(eq(attendanceTable.memberId, memberId))
    .orderBy(desc(attendanceTable.checkinTime))
    .limit(20);

  const [activeSub] = await db
    .select({
      id: subscriptionsTable.id,
      gymId: subscriptionsTable.gymId,
      memberId: subscriptionsTable.memberId,
      memberName: subscriptionsTable.memberName,
      planId: subscriptionsTable.planId,
      planName: subscriptionsTable.planName,
      status: subscriptionsTable.status,
      amount: subscriptionsTable.amount,
      failedPayments: subscriptionsTable.failedPayments,
      stripeSubscriptionId: subscriptionsTable.stripeSubscriptionId,
      stripePriceId: subscriptionsTable.stripePriceId,
      currentPeriodStart: subscriptionsTable.currentPeriodStart,
      currentPeriodEnd: subscriptionsTable.currentPeriodEnd,
      cancelledAt: subscriptionsTable.cancelledAt,
      cancelReason: subscriptionsTable.cancelReason,
      createdAt: subscriptionsTable.createdAt,
      updatedAt: subscriptionsTable.updatedAt,
      billingInterval: membershipPlansTable.billingInterval,
    })
    .from(subscriptionsTable)
    .leftJoin(membershipPlansTable, eq(subscriptionsTable.planId, membershipPlansTable.id))
    .where(and(
      eq(subscriptionsTable.memberId, memberId),
      inArray(subscriptionsTable.status, ["active", "past_due", "on_hold", "paused", "cancel_at_period_end"])
    ))
    .orderBy(desc(subscriptionsTable.createdAt));

  res.json({
    ...member,
    riskScore: member.riskScore ? parseFloat(member.riskScore) : null,
    notes,
    recentAttendance: recentAttendance.map((a) => ({ ...a })),
    activeSubscription: activeSub ? { ...activeSub, amount: parseFloat(activeSub.amount), failedPayments: activeSub.failedPayments } : undefined,
    waiverSigned: member.waiverSigned,
  });
});

router.patch("/gyms/:gymId/members/:memberId", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const memberId = parseMemberId(req.params);
  if (!gymId || !memberId) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const parsed = UpdateMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const fieldErrors: Record<string, string> = {};
  const data = parsed.data;

  if (data.firstName !== undefined && !data.firstName.trim()) {
    fieldErrors.firstName = "First name is required";
  }
  if (data.lastName !== undefined && !data.lastName.trim()) {
    fieldErrors.lastName = "Last name is required";
  }
  if (data.email !== undefined) {
    if (!data.email.trim()) {
      fieldErrors.email = "Email is required";
    } else if (!EMAIL_REGEX.test(data.email.trim())) {
      fieldErrors.email = "Invalid email format";
    } else {
      const [existing] = await db
        .select({ id: membersTable.id })
        .from(membersTable)
        .where(and(
          eq(membersTable.gymId, gymId),
          eq(sql`lower(${membersTable.email})`, data.email.trim().toLowerCase()),
          ne(membersTable.id, memberId)
        ))
        .limit(1);
      if (existing) {
        fieldErrors.email = "This email is already in use";
      }
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    res.status(400).json({ error: "Validation failed", fieldErrors });
    return;
  }

  if (data.email) {
    data.email = data.email.trim().toLowerCase();
  }

  const [member] = await db
    .update(membersTable)
    .set(data)
    .where(and(eq(membersTable.id, memberId), eq(membersTable.gymId, gymId)))
    .returning();

  if (!member) { res.status(404).json({ error: "Member not found" }); return; }

  if (data.status === "cancelled") {
    await db.update(subscriptionsTable)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        cancelReason: "Member cancelled by staff",
      })
      .where(and(
        eq(subscriptionsTable.memberId, memberId),
        eq(subscriptionsTable.gymId, gymId),
        inArray(subscriptionsTable.status, ["active", "past_due", "cancel_at_period_end"]),
      ));
  }

  res.json({
    ...member,
    riskScore: member.riskScore ? parseFloat(member.riskScore) : null,
  });
});

router.post("/gyms/:gymId/members/:memberId/send-sms", async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const memberId = parseMemberId(req.params);
  if (!gymId || !memberId) { res.status(400).json({ error: "Invalid gym or member ID" }); return; }

  const { message } = req.body as { message?: string };
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    res.status(400).json({ error: "Message is required" }); return;
  }

  try {
    const [member] = await db.select().from(membersTable).where(and(eq(membersTable.id, memberId), eq(membersTable.gymId, gymId)));
    if (!member) { res.status(404).json({ error: "Member not found" }); return; }
    if (!member.phone) { res.status(400).json({ error: "Member has no phone number on file" }); return; }

    const [gym] = await db.select().from(gymsTable).where(eq(gymsTable.id, gymId));
    if (!gym) { res.status(404).json({ error: "Gym not found" }); return; }
    if (!gym.smsEnabled) { res.status(400).json({ error: "SMS is not enabled for this gym" }); return; }

    const result = await sendMemberSms({
      memberId,
      gymId,
      to: member.phone,
      body: message.trim(),
      smsType: "manual",
      timelineTitle: "Text Message Sent",
      gymConfig: {
        smsEnabled: gym.smsEnabled ?? false,
        twilioAccountSid: gym.twilioAccountSid,
        twilioAuthToken: gym.twilioAuthToken,
        twilioPhoneNumber: gym.twilioPhoneNumber,
      },
    });

    if (!result.success) {
      res.status(500).json({ error: result.error || "Failed to send SMS" }); return;
    }

    res.json({
      success: true,
      recipientName: `${member.firstName} ${member.lastName}`,
      recipientPhone: member.phone,
      messageSid: result.messageSid,
    });
  } catch (err) {
    console.error("Error sending member SMS:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
