import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Some sandboxed dev/CI environments pre-install a specific Chromium build
// outside Playwright's own version-pinned cache (see repo environment
// notes). Prefer it when present instead of requiring a download; regular
// CI (which runs `playwright install`) is unaffected since the path won't
// exist there.
const sandboxChromiumPath = "/opt/pw-browsers/chromium";
const sandboxExecutablePath = existsSync(sandboxChromiumPath) ? sandboxChromiumPath : undefined;

export default defineConfig({
  testDir: "./specs",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm --filter @gsk/web dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: sandboxExecutablePath
          ? { executablePath: sandboxExecutablePath }
          : undefined,
      },
    },
  ],
});
