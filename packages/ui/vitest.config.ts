import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    css: true,
    // @testing-library/react's automatic cleanup between tests only
    // registers when it can detect a true global `afterEach` — Vitest only
    // provides that when `globals` is enabled (see
    // https://testing-library.com/docs/react-testing-library/setup#vitest).
    globals: true,
  },
});
