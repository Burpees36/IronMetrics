import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const readSource = (relPath: string) =>
  readFileSync(resolve(__dirname, relPath), "utf-8");

describe("Sequence lifecycle transitions", () => {
  describe("exitMemberSequences is exported and callable", () => {
    it("exitMemberSequences is exported from retention-engine", async () => {
      const mod = await import("../schedulers/retention-engine");
      expect(typeof mod.exitMemberSequences).toBe("function");
    });
  });

  describe("cancel/hold status triggers sequence exit", () => {
    const crudSource = readSource("../routes/members/crud.ts");

    it("member PATCH route calls exit on cancelled status", () => {
      const cancelBlock = crudSource.indexOf('data.status === "cancelled"');
      const exitCallAfterCancel = crudSource.indexOf("exitMemberSequences(memberId, gymId", cancelBlock);
      expect(cancelBlock).toBeGreaterThan(-1);
      expect(exitCallAfterCancel).toBeGreaterThan(cancelBlock);
    });

    it("member PATCH route calls exit on hold status", () => {
      const holdBlock = crudSource.indexOf('data.status === "hold"');
      const exitCallAfterHold = crudSource.indexOf("exitMemberSequences(memberId, gymId", holdBlock);
      expect(holdBlock).toBeGreaterThan(-1);
      expect(exitCallAfterHold).toBeGreaterThan(holdBlock);
    });

    it("exit reason is member_inactive for both cancel and hold", () => {
      const matches = crudSource.match(/await exitMemberSequences\(memberId, gymId, "member_inactive"\)/g);
      expect(matches).not.toBeNull();
      expect(matches!.length).toBe(2);
    });

    it("holds route awaits exit when immediate hold is applied", () => {
      const holdsSource = readSource("../routes/billing/holds.ts");
      const statusUpdate = holdsSource.indexOf('status: "hold"');
      const exitCall = holdsSource.indexOf("await exitMemberSequences(memberId, gymId", statusUpdate);
      expect(statusUpdate).toBeGreaterThan(-1);
      expect(exitCall).toBeGreaterThan(statusUpdate);
    });
  });

  describe("lead conversion triggers sequence transitions", () => {
    const leadsSource = readSource("../routes/leads.ts");

    it("lead conversion calls pauseLeadSequences with lead_converted reason", () => {
      const convertRoute = leadsSource.indexOf('leads/:leadId/convert');
      const pauseCall = leadsSource.indexOf('pauseLeadSequences(leadId, gymId, "lead_converted")', convertRoute);
      expect(convertRoute).toBeGreaterThan(-1);
      expect(pauseCall).toBeGreaterThan(convertRoute);
    });

    it("lead conversion scopes onboarding evaluation to new member and onboarding_journey type", () => {
      const convertRoute = leadsSource.indexOf('leads/:leadId/convert');
      const evalCall = leadsSource.indexOf('onlyMemberId: member.id, onlySequenceType: "onboarding_journey"', convertRoute);
      expect(convertRoute).toBeGreaterThan(-1);
      expect(evalCall).toBeGreaterThan(convertRoute);
    });

    it("lead conversion awaits onboarding evaluation", () => {
      const convertRoute = leadsSource.indexOf('leads/:leadId/convert');
      const awaitEval = leadsSource.indexOf('await evaluateTriggersForGym(gymId, { onlyMemberId: member.id', convertRoute);
      expect(awaitEval).toBeGreaterThan(convertRoute);
    });

    it("lead sequence pause happens before response is sent", () => {
      const convertRoute = leadsSource.indexOf('leads/:leadId/convert');
      const routeEnd = leadsSource.indexOf("res.json(", convertRoute + 20);
      const pauseCall = leadsSource.indexOf("pauseLeadSequences", convertRoute);
      expect(pauseCall).toBeGreaterThan(convertRoute);
      expect(pauseCall).toBeLessThan(routeEnd);
    });
  });

  describe("evaluateTrigger new_member_join logic", () => {
    it("enrolls a member that just joined today", async () => {
      const { evaluateTrigger } = await import("../schedulers/retention-engine");
      const trigger = { type: "new_member_join", joinDays: 3 };
      const member = {
        riskScore: null,
        lastVisitDate: null,
        joinDate: new Date().toISOString().split("T")[0],
        createdAt: new Date(),
      };
      expect(evaluateTrigger(trigger, member)).toBe(true);
    });

    it("does not enroll a member that joined 10 days ago", async () => {
      const { evaluateTrigger } = await import("../schedulers/retention-engine");
      const trigger = { type: "new_member_join", joinDays: 3 };
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      const member = {
        riskScore: null,
        lastVisitDate: null,
        joinDate: tenDaysAgo.toISOString().split("T")[0],
        createdAt: tenDaysAgo,
      };
      expect(evaluateTrigger(trigger, member)).toBe(false);
    });
  });
});
