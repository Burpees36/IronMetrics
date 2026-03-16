import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: [
        "src/middlewares/**/*.ts",
        "src/services/**/*.ts",
        "src/schedulers/**/*.ts",
        "src/billingMetrics.ts",
      ],
      reporter: ["text", "json-summary"],
    },
  },
});
