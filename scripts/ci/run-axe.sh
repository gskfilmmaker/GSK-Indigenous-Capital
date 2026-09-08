#!/usr/bin/env bash
# Runs axe accessibility checks against packages/ui's Storybook, per spec
# §12 (WCAG 2.2 AA build gate) and this project's Step 3 scope ("A
# Storybook (or equivalent) with axe checks wired into CI so every
# component is verified accessible").
#
# Before Step 3, packages/ui had no Storybook yet and this script no-op'd
# rather than faking a green check. From Step 3 onward packages/ui/.storybook
# exists and this runs the real gate: packages/ui's `test:axe` script
# (vitest running axe-core against every component's rendered DOM via
# React Testing Library — see packages/ui/src/a11y). A missing or failing
# script fails this whole check loudly; CI never silently skips real
# accessibility coverage.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/../.."

if [ ! -d "packages/ui/.storybook" ]; then
  echo "axe: packages/ui/.storybook does not exist yet (Step 3+). Skipping — this is expected pre-Step-3."
  exit 0
fi

if ! pnpm --filter @gsk/ui run test:axe; then
  echo "axe: packages/ui/.storybook exists but the 'test:axe' script failed or is missing." >&2
  exit 1
fi
