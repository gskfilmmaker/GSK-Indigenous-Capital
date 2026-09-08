/**
 * Canonical serialization and hash-chain helpers (spec §15, §7.1;
 * docs/adr/0006-audit-anchoring.md).
 *
 * Step 1 placeholder. This package is a dependency of packages/cap-table
 * (deterministic output hashing, spec §8 test 15) built in Step 2, and of
 * the `audit_events` hash chain built in Step 4 — one canonical
 * serialization format is shared by both, not reinvented per consumer.
 */

export const AUDIT_PACKAGE_PLACEHOLDER = true;
