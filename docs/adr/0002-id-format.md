# ADR 0002: Primary key / entity ID format

- Status: Accepted (development default)
- Date: 2026-09-08

## Context

Spec §9 requires "UUIDv7/ULID IDs" across the data model. IDs need to be:

- globally unique across tenants without coordination;
- safe to generate client-side or server-side before a row is persisted
  (needed for idempotent command handling and optimistic UI);
- reasonably index-friendly in Postgres (monotonic-ish to avoid severe
  B-tree fragmentation at scale);
- a native Postgres type where possible, since RLS policies and foreign
  keys are simplest against `uuid` columns.

ULIDs are excellent for sortability and are compact as base32 text, but
they are not a native Postgres type — they'd be stored as `text` or
`char(26)`, which loses `uuid`-specific tooling (Supabase client typing,
`gen_random_uuid()`-adjacent ecosystem, PostgREST behavior).

UUIDv7 is a standard UUID variant (RFC 9562) with an embedded
millisecond timestamp prefix, giving the same monotonic-insert benefit
as ULID while remaining a first-class Postgres `uuid` column.

## Decision

Use **UUIDv7** for every primary key in `supabase/migrations`, generated
via the `uuidv7` npm package in TypeScript (application-generated IDs,
enabling idempotent writes before INSERT) and via a Postgres function
(`uuidv7()`, either from a trusted extension if available in the chosen
Supabase Postgres version, or a small SQL/PLpgSQL implementation defined
in an early migration) as the column default for any row not created by
the application layer.

All ID columns are `uuid`, not `text`. Branded TypeScript ID types in
`packages/domain` (e.g. `OrganizationId`, `ScenarioId`) wrap `string` at
the type level but the runtime representation is always a valid UUIDv7
string.

## Consequences

- Index locality is preserved (new IDs sort near each other), which
  matters for the append-only ledger, audit, and outbox tables under
  invariant 3/5.
- Every ID leaks an approximate creation timestamp. This is an accepted
  tradeoff (also true of ULID); it is not a confidentiality boundary —
  RLS and capability checks remain the actual access control.
- If the target Supabase Postgres version does not ship a built-in
  `uuidv7()` generator, the first migration must define one so that
  server-side defaults and application-side generation stay
  bit-compatible with the RFC 9562 layout.
