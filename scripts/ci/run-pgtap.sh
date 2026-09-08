#!/usr/bin/env bash
# Runs pgTAP tests in supabase/tests against a local Supabase Postgres
# instance. Spec §21 Phase 1/§25 item 6 requires cross-tenant RLS pgTAP
# tests to exist and pass before application CRUD is wired up.
#
# Step 1: supabase/migrations and supabase/tests are intentionally empty
# (see supabase/README.md) — this script no-ops rather than faking a green
# check. From Step 4 onward, once migrations/tests exist, it fails loudly
# if the Supabase CLI isn't available, so CI never silently skips real
# pgTAP coverage.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/../.."

sql_files=$(find supabase/migrations -name '*.sql' 2>/dev/null | wc -l | tr -d ' ')
test_files=$(find supabase/tests -name '*.sql' 2>/dev/null | wc -l | tr -d ' ')

if [ "$sql_files" = "0" ] && [ "$test_files" = "0" ]; then
  echo "pgTAP: no migrations or tests yet (Step 4+). Skipping — this is expected pre-Step-4."
  exit 0
fi

if ! command -v supabase >/dev/null 2>&1; then
  echo "pgTAP: supabase/migrations or supabase/tests is non-empty but the Supabase CLI is not installed." >&2
  echo "Install it (see https://supabase.com/docs/guides/cli) — this must not be silently skipped." >&2
  exit 1
fi

supabase db test
