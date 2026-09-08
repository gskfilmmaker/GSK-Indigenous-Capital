# supabase/

Schema, constraints, RLS policies, `security definer` functions, triggers
(`migrations/`), and pgTAP security/constraint tests (`tests/`).

## Step 1 status

Empty by design. No Supabase project has been provisioned yet — that is
an owner decision (`docs/adr/0007-canadian-region-hosting-policy.md`,
spec §26 item 11), not something to default silently. `supabase/config.toml`
and the first migration are added at the start of Step 4
("Foundation + accessible Scenario Studio MVP"), which is scoped to:

- organizations, memberships, companies, scenarios, versions, runs,
  snapshots, share links, audit, outbox, idempotency (spec §9.1, §9.2,
  §9.5, §9.8, this project's Step 4 scope);
- default-deny RLS on every table in the same migration that creates it
  (`docs/adr/0003-supabase-rls-strategy.md`);
- pgTAP cross-tenant tests in `tests/`, written and passing **before**
  the application CRUD command they protect is wired up (spec §25 item 6).

## Rules (see root `CLAUDE.md` invariant 1 and 3)

- Every exposed tenant table is RLS-enabled and default-deny from the
  migration that creates it — never added in a later "add RLS" migration.
- Posted ledger entries, executed terms, snapshots, template versions,
  artifacts, approvals, filing receipts, and audit events are never
  `UPDATE`/`DELETE`-able by any application role. Corrections are
  reversal/superseding rows.
- No business-critical financial value lives only in unvalidated JSON
  (spec §9).
