# tests/e2e

Playwright journeys against `apps/web`. Run with `pnpm test:e2e` from the
repo root (starts the Next dev server automatically; see
`playwright.config.ts`).

`specs/smoke.spec.ts` is a Step 1 placeholder proving the pipeline works.
Real Scenario Studio journeys (spec §6.5) — live recalculation, keyboard
completeness, screen-reader recalculation announcements — are added
starting in Step 4.
