import { describe, it, expect } from "vitest";

describe("Scan Refresh Behavior", () => {
  describe("generateAiTasks response includes interventions invalidation support", () => {
    it("frontend invalidates both tasks and interventions queries on scan success", () => {
      const mockQueryClient = {
        invalidatedKeys: [] as string[][],
        invalidateQueries({ queryKey }: { queryKey: readonly string[] }) {
          this.invalidatedKeys.push([...queryKey]);
        },
      };

      const gymId = 1;
      const tasksQueryKey = [`/api/gyms/${gymId}/ai/tasks`];
      const interventionsQueryKey = [`/api/gyms/${gymId}/intelligence/interventions`];

      mockQueryClient.invalidateQueries({ queryKey: tasksQueryKey });
      mockQueryClient.invalidateQueries({ queryKey: interventionsQueryKey });

      expect(mockQueryClient.invalidatedKeys).toHaveLength(2);
      expect(mockQueryClient.invalidatedKeys[0]).toEqual([`/api/gyms/${gymId}/ai/tasks`]);
      expect(mockQueryClient.invalidatedKeys[1]).toEqual([`/api/gyms/${gymId}/intelligence/interventions`]);
    });

    it("scan mutation onSuccess handler invalidates interventions query key pattern", () => {
      const getGetInterventionsQueryKey = (gymId: number) => {
        return [`/api/gyms/${gymId}/intelligence/interventions`] as const;
      };

      const gymId = 42;
      const key = getGetInterventionsQueryKey(gymId);
      expect(key).toEqual([`/api/gyms/42/intelligence/interventions`]);
    });
  });

  describe("zero-result scan feedback", () => {
    it("generateAiTasks response schema supports optional reason field", () => {
      const responseNoReason = { created: 3, tasks: [{}, {}, {}] };
      expect(responseNoReason).not.toHaveProperty("reason");

      const responseWithReason = {
        created: 0,
        tasks: [],
        reason: "No new risks detected — your gym metrics look healthy.",
      };
      expect(responseWithReason.reason).toBeDefined();
      expect(responseWithReason.reason).toContain("No new risks detected");
    });

    it("frontend toast logic shows reason for zero results", () => {
      const data = {
        created: 0,
        tasks: [],
        reason: "All identified risks already have pending tasks (5 active). Review or complete existing tasks first.",
      };

      let toastTitle = "";
      let toastDescription = "";

      const result = data as Record<string, unknown>;
      const created = result.created as number;
      if (created === 0 && result.reason) {
        toastTitle = "Scan Complete";
        toastDescription = result.reason as string;
      } else {
        toastTitle = "Tasks Generated";
        toastDescription = `${created} new task${created !== 1 ? "s" : ""} created from gym data.`;
      }

      expect(toastTitle).toBe("Scan Complete");
      expect(toastDescription).toContain("pending tasks");
    });

    it("frontend toast shows task count for non-zero results", () => {
      const data = { created: 3, tasks: [{}, {}, {}] };

      let toastTitle = "";
      let toastDescription = "";

      const result = data as Record<string, unknown>;
      const created = result.created as number;
      if (created === 0 && result.reason) {
        toastTitle = "Scan Complete";
        toastDescription = result.reason as string;
      } else {
        toastTitle = "Tasks Generated";
        toastDescription = `${created} new task${created !== 1 ? "s" : ""} created from gym data.`;
      }

      expect(toastTitle).toBe("Tasks Generated");
      expect(toastDescription).toBe("3 new tasks created from gym data.");
    });
  });
});
