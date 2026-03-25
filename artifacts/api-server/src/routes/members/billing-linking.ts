import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, membersTable, timelineEventsTable } from "@workspace/db";
import { requireBillingPermission, requireBillingRead } from "../../middlewares/billingRbac";
import { parseGymId, parseMemberId } from "./helpers";

const router: IRouter = Router();

router.post("/gyms/:gymId/members/:memberId/link-billing", requireBillingPermission("billing.create_subscription"), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const memberId = parseMemberId(req.params);
  if (!gymId || !memberId) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const { linkedMemberId } = req.body;
  if (!linkedMemberId || linkedMemberId === memberId) {
    res.status(400).json({ error: "Invalid linked member ID" });
    return;
  }

  try {
    const [primary] = await db.select().from(membersTable).where(and(eq(membersTable.id, memberId), eq(membersTable.gymId, gymId)));
    const [secondary] = await db.select().from(membersTable).where(and(eq(membersTable.id, linkedMemberId), eq(membersTable.gymId, gymId)));
    if (!primary || !secondary) { res.status(404).json({ error: "Member not found" }); return; }

    if (secondary.linkedBillingMemberId) {
      res.status(400).json({ error: "That member is already linked to another member's billing" });
      return;
    }
    if (primary.linkedBillingMemberId) {
      res.status(400).json({ error: "Primary member is already linked to another member's billing" });
      return;
    }

    await db.update(membersTable).set({ linkedBillingMemberId: memberId }).where(eq(membersTable.id, linkedMemberId));

    await db.insert(timelineEventsTable).values([
      { memberId, gymId, type: "billing_link", title: "Couples billing linked", description: `Now paying for ${secondary.firstName} ${secondary.lastName}` },
      { memberId: linkedMemberId, gymId, type: "billing_link", title: "Couples billing linked", description: `Billing linked to ${primary.firstName} ${primary.lastName}` },
    ]);

    res.json({ success: true, primaryMemberId: memberId, linkedMemberId });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/gyms/:gymId/members/:memberId/unlink-billing", requireBillingPermission("billing.create_subscription"), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const memberId = parseMemberId(req.params);
  if (!gymId || !memberId) { res.status(400).json({ error: "Invalid IDs" }); return; }

  try {
    const linkedMembers = await db.select().from(membersTable).where(
      and(eq(membersTable.linkedBillingMemberId, memberId), eq(membersTable.gymId, gymId))
    );

    if (linkedMembers.length === 0) {
      const [self] = await db.select().from(membersTable).where(and(eq(membersTable.id, memberId), eq(membersTable.gymId, gymId)));
      if (self?.linkedBillingMemberId) {
        await db.update(membersTable).set({ linkedBillingMemberId: null }).where(eq(membersTable.id, memberId));

        const [primaryMember] = await db.select().from(membersTable).where(eq(membersTable.id, self.linkedBillingMemberId));
        await db.insert(timelineEventsTable).values([
          { memberId, gymId, type: "billing_unlink", title: "Couples billing unlinked", description: `Billing separated from ${primaryMember?.firstName || "member"} ${primaryMember?.lastName || ""}` },
          { memberId: self.linkedBillingMemberId, gymId, type: "billing_unlink", title: "Couples billing unlinked", description: `No longer paying for ${self.firstName} ${self.lastName}` },
        ]);

        res.json({ success: true });
        return;
      }
      res.status(400).json({ error: "No linked billing found" });
      return;
    }

    for (const lm of linkedMembers) {
      await db.update(membersTable).set({ linkedBillingMemberId: null }).where(eq(membersTable.id, lm.id));
      await db.insert(timelineEventsTable).values([
        { memberId: lm.id, gymId, type: "billing_unlink", title: "Couples billing unlinked", description: `Billing separated from ${(await db.select().from(membersTable).where(eq(membersTable.id, memberId)))[0]?.firstName || "member"}` },
      ]);
    }

    const [primary] = await db.select().from(membersTable).where(eq(membersTable.id, memberId));
    await db.insert(timelineEventsTable).values({
      memberId, gymId, type: "billing_unlink", title: "Couples billing unlinked",
      description: `Removed billing link for ${linkedMembers.map(m => `${m.firstName} ${m.lastName}`).join(", ")}`,
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/gyms/:gymId/members/:memberId/linked-billing", requireBillingRead(), async (req, res): Promise<void> => {
  const gymId = parseGymId(req.params);
  const memberId = parseMemberId(req.params);
  if (!gymId || !memberId) { res.status(400).json({ error: "Invalid IDs" }); return; }

  try {
    const [member] = await db.select().from(membersTable).where(and(eq(membersTable.id, memberId), eq(membersTable.gymId, gymId)));
    if (!member) { res.status(404).json({ error: "Member not found" }); return; }

    const dependents = await db.select({
      id: membersTable.id,
      firstName: membersTable.firstName,
      lastName: membersTable.lastName,
      email: membersTable.email,
      status: membersTable.status,
    }).from(membersTable).where(
      and(eq(membersTable.linkedBillingMemberId, memberId), eq(membersTable.gymId, gymId))
    );

    let primaryPayer = null;
    if (member.linkedBillingMemberId) {
      const [payer] = await db.select({
        id: membersTable.id,
        firstName: membersTable.firstName,
        lastName: membersTable.lastName,
        email: membersTable.email,
      }).from(membersTable).where(eq(membersTable.id, member.linkedBillingMemberId));
      primaryPayer = payer || null;
    }

    res.json({
      isPrimaryPayer: dependents.length > 0,
      isDependent: !!member.linkedBillingMemberId,
      primaryPayer,
      dependents,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
