# ADR 0006: Audit event hash-chaining and anchoring

- Status: Accepted (development default)
- Date: 2026-09-08

## Context

Spec §15: "Audit events are append-only and hash-chained. Periodically
anchor signed batch roots in separate immutable object storage because a
privileged database operator could otherwise alter rows." Root
`CLAUDE.md` invariant 3 forbids overwriting audit events; invariant 5
requires every mutation to write an audit event atomically with the
domain change.

The threat this defends against is specifically a _privileged database
operator_ (or a compromised service-role credential) editing history
in-place — RLS cannot stop this, since RLS constrains ordinary
authenticated roles, not a superuser/service-role connection.

## Decision

- **Hash-chained rows.** Every `audit_events` row stores
  `prev_event_hash` (the hash of the previous event for the same
  organization, or a defined genesis value for the first) and
  `event_hash = SHA-256(canonical_serialize(prev_event_hash, actor,
action, resource, payload, occurred_at))`. Canonical serialization
  comes from `packages/audit` (same canonicalization approach used for
  scenario-snapshot hashing, per ADR 0001's determinism requirement) so
  hashing is consistent across the codebase.
- **No UPDATE/DELETE grants.** As in ADR 0003, `audit_events` has RLS
  permitting `INSERT`/`SELECT` only, plus a trigger that rejects
  `UPDATE`/`DELETE` outright as defense in depth against a mis-issued
  grant.
- **Periodic anchoring.** An Inngest scheduled job (ADR 0004) computes a
  Merkle root over each organization's new `audit_events` since the last
  anchor, signs it, and writes the signed root plus the event-id range it
  covers to `AUDIT_ANCHOR_BUCKET` — object storage outside the
  application database, with its own restrictive access policy (ideally
  write-once/object-lock if the storage provider supports it). Anchoring
  cadence starts at once per day per organization with activity; this is
  tunable, not load-bearing on correctness.
- **Verification is a first-class operation.** A verification routine
  (used in tests and available to platform admins) re-derives the chain
  from stored rows and confirms it matches the anchored root; a mismatch
  is a security incident, not a warning to log and ignore.

## Consequences

- Anchoring detects retroactive tampering after the fact; it does not
  prevent a privileged operator from acting in real time. That is an
  accepted limitation — the goal is tamper-evidence, not tamper-proofing,
  consistent with spec §15's framing ("could otherwise alter rows").
- The exact object-storage provider/region for `AUDIT_ANCHOR_BUCKET` is
  covered by ADR 0007 (Canadian-region policy) since anchor storage holds
  metadata about tenant activity even though it should not hold PII
  content itself (only hashes, ids, and timestamps).
