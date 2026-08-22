import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup-env.ts"],
    pool: "forks",
    singleFork: true,
    testTimeout: 60000,
    hookTimeout: 120000,
  },
});
