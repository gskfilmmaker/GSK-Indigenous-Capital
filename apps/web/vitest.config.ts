import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/vitest.setup.ts"],
    css: true,
    // @testing-library/react's automatic cleanup between tests only
    // registers when it can detect a true global `afterEach` — Vitest only
    // provides that when `globals` is enabled (see packages/ui's
    // vitest.config.ts, which hit the same thing first).
    globals: true,
  },
  esbuild: {
    // apps/web's tsconfig sets "jsx": "preserve" for Next.js's own SWC
    // compiler — vitest's own esbuild-based transform needs an explicit
    // override here, or it inherits "preserve" too and leaves JSX
    // untransformed, which is not valid JS at test-run time.
    jsx: "automatic",
  },
});
