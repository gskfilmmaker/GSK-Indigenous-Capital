# supabase/

Schema, constraints, RLS policies, `security definer` functions, triggers
(`migrations/`), and pgTAP security/constraint tests (`tests/`).

## Step 4 status

`migrations/` contains six migrations covering organizations,
memberships, companies, scenarios/versions/runs/snapshots, snapshot
share links, and audit/outbox/idempotency (spec §9.1, §9.2, §9.5, §9.8,
this project's Step 4 scope). Every table is RLS-enabled and
default-deny from the migration that creates it
(`docs/adr/0003-supabase-rls-strategy.md`); `tests/` holds a 50-assertion
pgTAP suite proving cross-tenant isolation for every one of them (spec
§25 item 6), plus append-only and hash-chain-integrity checks where
those apply.

**Not yet applied to the real Supabase project.** The sandbox these
migrations were authored and tested in has no network path to Supabase
at all (raw-TCP Postgres connections and the `api.supabase.com`
management API are both blocked by its egress proxy policy) — see the
git history of this directory for the full diagnosis. Every migration
was instead verified against a local Postgres 16 + pgTAP instance that
approximates the real project closely enough to catch real bugs (and
did — see the commit messages for the GRANT and `SELECT ... FOR UPDATE`
privilege issues found and fixed this way). Someone with real network
access to the project (the account owner, or an agent acting on their
behalf) needs to apply them for real before any application code can
read or write through Supabase.

### How to apply

From the repo root, with the Supabase CLI available (already a
devDependency — invoke it via `pnpm exec supabase`, no global install
needed) and the project's credentials from `.env`/`apps/web/.env.local`
(gitignored, not in this repository):

```bash
# Link this repo to the real project (one-time; prompts for the DB
# password — SUPABASE_DB_PASSWORD in .env).
pnpm exec supabase link --project-ref trrebatalezmucwpovcw

# Apply all six migrations, in order, to the linked project.
pnpm exec supabase db push
```

`db push` is transactional per migration file and idempotent against
`supabase_migrations.schema_migrations` — safe to re-run; already-applied
migrations are skipped. After it completes, verify with:

```bash
pnpm exec supabase migration list   # should show all six as applied remotely
```

The pgTAP suite in `tests/` was authored against, and only verified
against, the local harness (`scripts/dev/local-supabase-harness.sql`)
described below — it has not been run against the real project. Running
it there requires either the Supabase CLI's local dev stack
(`supabase test db`, which spins up a disposable local copy — this does
**not** touch the real project) or `pg_prove` pointed at a real project's
connection string directly; either is optional re-verification, not a
prerequisite for `db push`, since the schema itself is unchanged between
what was tested locally and what ships in `migrations/`.

## Local verification harness

`scripts/dev/local-supabase-harness.sql` (dev tooling, not a migration —
never apply it to a real Supabase project, which already provides
everything it stubs) approximates the pieces of a real Supabase project
these migrations depend on: the `anon`/`authenticated`/`service_role`
roles, a stand-in `auth.users` table, and `auth.uid()`/`auth.role()`
reading the same `request.jwt.claim.*` session settings PostgREST
populates from the request JWT. `supabase/tests/00_setup.sql` adds
`auth.set_test_session(user_id, role_name)`, a helper for running the
rest of a psql session "as" a given user — safe to run against a real
Supabase stack too, since it only wraps that same session-setting
mechanism.

To rebuild and test locally:

```bash
dropdb safe_studio_test --if-exists && createdb safe_studio_test
psql -d safe_studio_test -f scripts/dev/local-supabase-harness.sql
for f in supabase/migrations/*.sql; do psql -d safe_studio_test -f "$f" -v ON_ERROR_STOP=1; done
pg_prove -d safe_studio_test supabase/tests/*.sql
```

## Rules (see root `CLAUDE.md` invariant 1 and 3)

- Every exposed tenant table is RLS-enabled and default-deny from the
  migration that creates it — never added in a later "add RLS" migration.
- Posted ledger entries, executed terms, snapshots, template versions,
  artifacts, approvals, filing receipts, and audit events are never
  `UPDATE`/`DELETE`-able by any application role. Corrections are
  reversal/superseding rows.
- No business-critical financial value lives only in unvalidated JSON
  (spec §9).
