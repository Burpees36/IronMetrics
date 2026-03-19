import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: [
        "src/middlewares/**/*.ts",
        "src/services/**/*.ts",
        "src/schedulers/**/*.ts",
        "src/routes/**/*.ts",
        "src/billingMetrics.ts",
        "src/webhookHandlers.ts",
      ],
      reporter: ["text", "json-summary"],
    },
  },
});
