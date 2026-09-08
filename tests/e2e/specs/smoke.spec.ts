import { expect, test } from "@playwright/test";

// Step 1 smoke test: proves the Playwright pipeline (browser install,
// dev-server boot, navigation, accessible heading query) works end to end
// against the placeholder page. Replaced/extended with real Scenario
// Studio journeys starting in Step 4.
test("placeholder home page renders an accessible heading", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /GSK Indigenous Capital — SAFE Studio/i }),
  ).toBeVisible();
});
