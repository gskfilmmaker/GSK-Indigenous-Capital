# ADR 0001: Arbitrary-precision numeric arithmetic library

- Status: Proposed default (development), pending accountant/finance
  validation per spec §22 and §26 item 8.
- Date: 2026-09-08

## Context

Spec §7.1 and root `CLAUDE.md` invariant 2 require arbitrary-precision
decimal/rational arithmetic for money, shares, prices, ratios, ownership,
and FX — never JS `number`. The engine must reconcile displayed
percentages to exactly 100.00% via a documented deterministic residual
policy, and must produce byte-identical output hashes for identical
canonical input under a fixed engine version (spec §8 test 15).

Golden test 5 (`250,000 / 1,666,666.666… = 15%`) involves a
non-terminating decimal quotient. A pure rational/fraction
representation (e.g. `fractions.js`-style numerator/denominator bigints)
gives exact results for every ratio but is slower and more complex to
serialize/display; a fixed high-precision decimal (e.g. `decimal.js`)
gives predictable, easily-serialized values but is an approximation of
the true rational value at whatever precision is configured.

## Decision

Use **`decimal.js`** configured with a package-wide precision context
(50 significant digits, `ROUND_HALF_UP` as the default _internal_
rounding mode for intermediate operations) as the arithmetic primitive
for all money, share, price, ratio, and ownership values throughout
`packages/cap-table`, `packages/domain`, and any package touching these
values. `numeric` columns in Postgres store the same values without loss
(see ADR 0003 companion notes in `packages/db`).

Display-time rounding (e.g. to 2 decimal places for a percentage, or to
whole shares at a legal allocation boundary) is a separate, explicit,
documented step — never the same rounding used for internal
accumulation — per spec §7.1.

## Consequences

- 50 significant digits is enough headroom that repeating-decimal
  quotients like test 5 do not visibly drift before the documented
  display rounding is applied, but it is still an approximation, not
  exact rational arithmetic. If counsel/accounting later requires exact
  rational results (e.g. for audit reproducibility across arbitrary
  precision), this ADR should be revisited in favour of a rational
  (bigint numerator/denominator) representation.
- All engine inputs/outputs serialize `Decimal` values as decimal strings
  (never binary floats) in canonical JSON, so hashes in spec §8 test 15
  are stable across platforms.
- The exact rounding and residual-allocation policy for the 100.00%
  reconciliation (spec §7.1) is **not** decided by this ADR — it is
  §26 item 8 and requires a separate, explicitly authorized decision
  before Step 2 implementation.

## Flagged for owner/counsel/accountant approval

This is a development default, not a final decision (spec §26 item 8).
