# supabase/

Schema, constraints, RLS policies, `security definer` functions, triggers
(`migrations/`), and pgTAP security/constraint tests (`tests/`).

## Step 4 status

`migrations/` contains seven migrations covering extensions/helpers,
authz capabilities, organizations/memberships, companies, scenarios/
versions/runs/snapshots, snapshot share links, and audit/outbox/
idempotency (spec §9.1, §9.2, §9.5, §9.8, this project's Step 4 scope),
plus three persistence-phase migrations
(`20260908150700_audit_chain_tip_function.sql`,
`20260908150800_create_company_command.sql`, and
`20260908150900_save_scenario_command.sql`, see below). Every table
is RLS-enabled and default-deny from the migration that creates it
(`docs/adr/0003-supabase-rls-strategy.md`); `tests/` holds a
79-assertion pgTAP suite proving cross-tenant isolation for every one
of them (spec §25 item 6), plus append-only and hash-chain-integrity
checks where those apply.

**Applied to the real Supabase project** (`trrebatalezmucwpovcw`) as of
commit `682f808`, by an agent with real network access — this sandbox
never had one (raw-TCP Postgres connections and the `api.supabase.com`
management API are both blocked by its egress proxy policy; see the git
history of this directory for the full diagnosis, and
`20260908150700_audit_chain_tip_function.sql`'s commit for independent
re-confirmation that `*.supabase.co` itself is also blocked). All seven
of the original migrations were verified locally first against a
Postgres 16 + pgTAP instance that approximates the real project closely
enough to catch real bugs (and did — see the commit messages for the
GRANT and `SELECT ... FOR UPDATE` privilege issues found and fixed this
way), then applied for real via `supabase db push` and confirmed against
`supabase migration list` and direct spot-queries (table access,
`authz.*` function presence).

**Not yet applied to the real project:**

- `20260908150700_audit_chain_tip_function.sql` — see its own header
  comment: an `editor`-role member has `company.write` but not
  `audit.read`, and would otherwise have no way to read the audit chain
  tip needed to append a correctly hash-chained event for their own
  authorized action.
- `20260908150800_create_company_command.sql` — the first real command
  (root CLAUDE.md invariant 5 in full: authorization, validation,
  idempotency, audit, atomic outbox) for company creation during
  onboarding. `security invoker`, so every internal statement is still
  subject to the caller's own RLS exactly as if issued directly — see
  its own header comment, including the documented, deliberate decision
  not to retrofit `create_organization()` the same way (idempotency
  doesn't fit its structure, and it is already live in production).
- `20260908150900_save_scenario_command.sql` — the same pattern for
  saving a Scenario Studio scenario: one call creates the scenario and
  its first version, or appends a new version to an existing one, plus
  its engine run, atomically.
- `20260908151000_qualify_pgcrypto_calls.sql` — **urgent, fixes a live
  production bug**, found during the first real onboarding test:
  `create_organization()` failed with `function gen_random_bytes(integer)
  does not exist`. Root cause: on the real Supabase project, `pgcrypto`
  installs into an `extensions` schema, not `public`; `public.uuidv7()`
  (the default for every table's `id` column) and the two
  snapshot-share-link functions call `gen_random_bytes`/`digest`
  unqualified, which fails once invoked from inside anything running
  under `set search_path = public, pg_temp` (ADR 0003) — i.e. any insert
  made from `create_organization`, `create_company`, `save_scenario`,
  `create_snapshot_share_link`, or `get_snapshot_by_share_token`, not
  just organization creation. Fixed via `create or replace function`
  (same objects, existing grants preserved), qualifying every pgcrypto
  call as `extensions.<fn>`. This also uncovered a matching gap in the
  local verification harness (see below) that had been silently masking
  this whole bug class — fixed alongside it.

All four verified locally the same way as the original seven (pgTAP:
`Files=9, Tests=79, ... Result: PASS`, re-confirmed after this fix);
need the same apply-via-an-agent-with-real-network-access handoff as
before — this one is time-sensitive since it blocks all onboarding on
the live site.

**Known gap:** the pgTAP suite in `tests/` has been run and passes
(79/79) against the local approximation harness, but has **not** been
run against the real, deployed project — the environment that applied
the first seven migrations had no Docker available for `supabase test
db` (which in any case tests a fresh local copy, not the live remote
project itself — see below). The schema applied is byte-identical to
what was locally verified, so this is a residual-risk gap, not an
unknown: it would only surface a difference between this project's real
`auth` schema and the local stand-in (unlikely, since both are
recreations of the same Supabase/PostgREST contract, but not zero).

### How to apply (for future migrations)

From the repo root, with the Supabase CLI available (already a
devDependency — invoke it via `pnpm exec supabase`, no global install
needed) and the project's credentials from `.env`/`apps/web/.env.local`
(gitignored, not in this repository):

```bash
# Link this repo to the real project (one-time; prompts for the DB
# password — SUPABASE_DB_PASSWORD in .env).
pnpm exec supabase link --project-ref trrebatalezmucwpovcw

# Apply any new migrations, in order, to the linked project.
pnpm exec supabase db push
```

`db push` is transactional per migration file and idempotent against
`supabase_migrations.schema_migrations` — safe to re-run; already-applied
migrations are skipped. After it completes, verify with:

```bash
pnpm exec supabase migration list   # should show all as applied remotely
```

`pnpm exec supabase test db` (requires Docker) re-verifies the suite
against a fresh **local** copy of the schema — useful re-verification,
but it does not touch the deployed project and so can't rule out an
environment-specific difference there. To actually run pgTAP against
the live, deployed project, point `pg_prove` at its **direct** (not
pooled) connection string — `DIRECT_URL` in `.env`, not `DATABASE_URL`,
since the pgTAP suite relies on `SET LOCAL ROLE`/session state that a
transaction-pooled (pgbouncer) connection isn't guaranteed to preserve
the way a direct connection is:

```bash
pg_prove -d "$DIRECT_URL" supabase/tests/*.sql
```

This is safe to run as-is: `00_setup.sql` (the first file in that glob)
only defines `auth.set_test_session()`, which wraps the real project's
own `auth.uid()`/session mechanism rather than replacing any part of
it — unlike `scripts/dev/local-supabase-harness.sql`, which stubs
`auth.users`/`auth.uid()`/the `anon`/`authenticated`/`service_role`
roles from scratch and must never be applied to a real Supabase project
that already provides all of that genuinely (see "Local verification
harness" below). This has not been done yet.

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

Installs `pgcrypto` into a dedicated `extensions` schema (with `usage`
granted to `anon`/`authenticated`/`service_role`), matching the real
Supabase project's own layout, rather than the `public`-schema default
a bare `create extension pgcrypto;` would give on a self-managed
Postgres instance. This distinction is exactly what let the
`20260908151000_qualify_pgcrypto_calls.sql` bug reach production
undetected: before this fix, the harness put `pgcrypto` in `public`,
which happened to still be inside the restricted
`search_path = public, pg_temp` privileged functions run under (ADR
0003), so unqualified `gen_random_bytes`/`digest` calls resolved fine
here even though they couldn't on the real project.

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
