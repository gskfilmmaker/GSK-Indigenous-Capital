# ADR 0003: Supabase / Row-Level Security strategy

- Status: Accepted (development default) — implementation lands in Step 4
- Date: 2026-09-08

## Context

Root `CLAUDE.md` invariant 1: never bypass Postgres RLS or rely only on
UI authorization. Spec §15 requires RLS enabled and default-deny on every
exposed tenant table, capability-based authorization (§4.2) rather than
scattered role-name checks, and reusable authorization logic in hardened
`security definer` functions with a fixed `search_path`.

## Decision

1. **Default-deny by default.** Every table created in
   `supabase/migrations` that holds tenant data has `ALTER TABLE ...
ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY` in the same
   migration that creates it, with no permissive policy until an explicit
   policy is added. A table is never left both RLS-enabled and
   policy-free in a way that silently denies everything without a test
   proving it.
2. **Tenancy column.** Every tenant-scoped table carries a non-nullable
   `organization_id uuid references organizations(id)` column, or is
   provably scoped through a parent row via a `security definer` helper
   (e.g. a `scenario_versions` row scoped through its `scenarios.
organization_id`). No table relies on client-supplied tenant context.
3. **Capability functions, not role checks.** Authorization logic lives
   in `security definer` SQL functions (fixed `search_path`, minimal
   `EXECUTE` grants) that check `(auth.uid(), organization_id,
capability)` against the capability model in spec §4.2 — e.g.
   `authz.has_capability(org_id, 'ledger.post')`. RLS policies call these
   functions; policies never re-implement the check inline per table.
4. **Browser never gets elevated access.** The browser client uses the
   anon/authenticated Supabase key only; `SUPABASE_SERVICE_ROLE_KEY` is
   server/worker-only (Next.js server actions/route handlers, Inngest
   functions) and every service-role code path performs its own explicit
   organization/resource check before acting (§15) — service-role access
   is a capability bypass of RLS by design, so it must not become a
   capability bypass of _authorization_.
5. **pgTAP before CRUD.** `supabase/tests` contains cross-tenant pgTAP
   tests proving organization A cannot read, update, delete, or invoke
   privileged functions against organization B's rows — written and
   passing _before_ the corresponding application CRUD command is wired
   up, per spec §25 item 6 and the Step 4 scope for this project.
6. **Append-only tables get policy, not just triggers.** For tables under
   invariant 3 (ledger entries, audit events, snapshots, template
   versions, artifacts, approvals, filing receipts), RLS policies permit
   `INSERT`/`SELECT` per capability but never grant `UPDATE`/`DELETE` to
   any application role; a `BEFORE UPDATE OR DELETE` trigger raises an
   exception as defense in depth in case a future migration mistakenly
   grants the privilege.

## Consequences

- Every new table is more work up-front (RLS + policy + pgTAP test), but
  this is the point: authorization is proven at the database layer, not
  assumed from application code review.
- Capability-function-based policies mean adding a new capability check
  is a one-place SQL change plus a policy reference, not N call sites.
- This ADR does not select the exact capability→table policy mapping for
  every table in spec §9 — that mapping is written incrementally in
  Step 4 migrations, each with its own pgTAP coverage.
