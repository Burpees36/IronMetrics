import { type Request, type Response, type NextFunction } from "express";
import { db, gymStaffTable, gymsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

export type BillingPermission =
  | "billing.read"
  | "billing.create_charge"
  | "billing.create_subscription"
  | "billing.cancel_subscription"
  | "billing.pause_subscription"
  | "billing.resume_subscription"
  | "billing.create_plan"
  | "billing.edit_plan"
  | "billing.issue_refund"
  | "billing.view_audit_logs";

const ROLE_PERMISSIONS: Record<string, BillingPermission[]> = {
  owner: [
    "billing.read",
    "billing.create_charge",
    "billing.create_subscription",
    "billing.cancel_subscription",
    "billing.pause_subscription",
    "billing.resume_subscription",
    "billing.create_plan",
    "billing.edit_plan",
    "billing.issue_refund",
    "billing.view_audit_logs",
  ],
  admin: [
    "billing.read",
    "billing.create_charge",
    "billing.create_subscription",
    "billing.cancel_subscription",
    "billing.pause_subscription",
    "billing.resume_subscription",
    "billing.create_plan",
    "billing.edit_plan",
    "billing.issue_refund",
    "billing.view_audit_logs",
  ],
  front_desk: [
    "billing.read",
    "billing.create_charge",
    "billing.create_subscription",
  ],
  coach: [],
  analyst: [
    "billing.read",
  ],
};

export function getPermissionsForRole(role: string): BillingPermission[] {
  return ROLE_PERMISSIONS[role] || [];
}

async function resolveUserRole(userId: string, gymId: number): Promise<string | null> {
  const [gym] = await db.select().from(gymsTable).where(eq(gymsTable.id, gymId));
  if (gym && gym.ownerId === userId) return "owner";

  const [staff] = await db
    .select()
    .from(gymStaffTable)
    .where(and(eq(gymStaffTable.userId, userId), eq(gymStaffTable.gymId, gymId), eq(gymStaffTable.isActive, true)));

  return staff?.role || null;
}

export function requireBillingPermission(...requiredPerms: BillingPermission[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const gymIdParam = req.params.gymId;
    const gymId = gymIdParam ? parseInt(Array.isArray(gymIdParam) ? gymIdParam[0] : gymIdParam, 10) : null;

    if (!gymId || isNaN(gymId)) {
      res.status(400).json({ error: "Invalid gym ID" });
      return;
    }

    const userId = req.user!.id;
    const role = await resolveUserRole(userId, gymId);

    if (!role) {
      res.status(403).json({ error: "No access to this gym's billing" });
      return;
    }

    const userPerms = getPermissionsForRole(role);
    const hasAll = requiredPerms.every((p) => userPerms.includes(p));

    if (!hasAll) {
      res.status(403).json({ error: "Insufficient billing permissions", required: requiredPerms, role });
      return;
    }

    req.billingRole = role;
    req.billingPermissions = userPerms;
    next();
  };
}

export function requireBillingRead() {
  return requireBillingPermission("billing.read");
}
