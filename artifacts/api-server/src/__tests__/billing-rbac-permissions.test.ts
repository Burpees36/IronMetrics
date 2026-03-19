import { describe, it, expect } from "vitest";
import { getPermissionsForRole, type BillingPermission } from "../middlewares/billingRbac";

const ALL_PERMISSIONS: BillingPermission[] = [
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
];

describe("billing RBAC permission matrix", () => {
  describe("owner permissions", () => {
    const perms = getPermissionsForRole("owner");
    it("has all 10 billing permissions", () => {
      expect(perms).toHaveLength(10);
    });
    for (const perm of ALL_PERMISSIONS) {
      it(`has ${perm}`, () => expect(perms).toContain(perm));
    }
  });

  describe("admin permissions", () => {
    const perms = getPermissionsForRole("admin");
    it("has all 10 billing permissions", () => {
      expect(perms).toHaveLength(10);
    });
    it("matches owner permissions", () => {
      expect(perms.sort()).toEqual(getPermissionsForRole("owner").sort());
    });
  });

  describe("front_desk permissions", () => {
    const perms = getPermissionsForRole("front_desk");
    it("can read billing", () => expect(perms).toContain("billing.read"));
    it("can create charges", () => expect(perms).toContain("billing.create_charge"));
    it("can create subscriptions", () => expect(perms).toContain("billing.create_subscription"));
    it("cannot cancel subscriptions", () => expect(perms).not.toContain("billing.cancel_subscription"));
    it("cannot issue refunds", () => expect(perms).not.toContain("billing.issue_refund"));
    it("cannot create plans", () => expect(perms).not.toContain("billing.create_plan"));
    it("cannot edit plans", () => expect(perms).not.toContain("billing.edit_plan"));
    it("cannot view audit logs", () => expect(perms).not.toContain("billing.view_audit_logs"));
    it("has exactly 3 permissions", () => expect(perms).toHaveLength(3));
  });

  describe("coach permissions", () => {
    const perms = getPermissionsForRole("coach");
    it("has no billing permissions", () => expect(perms).toHaveLength(0));
  });

  describe("analyst permissions", () => {
    const perms = getPermissionsForRole("analyst");
    it("can read billing", () => expect(perms).toContain("billing.read"));
    it("has exactly 1 permission", () => expect(perms).toHaveLength(1));
    it("cannot create anything", () => {
      expect(perms).not.toContain("billing.create_charge");
      expect(perms).not.toContain("billing.create_subscription");
    });
  });

  describe("unknown/undefined roles", () => {
    it("returns empty for unknown role", () => {
      expect(getPermissionsForRole("unknown")).toHaveLength(0);
    });
    it("returns empty for empty string", () => {
      expect(getPermissionsForRole("")).toHaveLength(0);
    });
  });
});
