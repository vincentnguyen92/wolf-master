import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      // Unit tests cover the plain TypeScript layers; React screens are
      // covered by the Playwright suite instead.
      include: ["src/**/*.ts"],
      reporter: ["text", "html"],
    },
  },
});
