# packages/cap-table

Pure, deterministic, versioned SAFE/cap-table calculation engine. See root
`CLAUDE.md` for repository-wide invariants; this file adds rules specific
to this package.

## Purity

- No imports from Next.js, React, Supabase, browser APIs, `fs`, network,
  document-rendering, or email packages. This package must be usable from
  a Node script, a worker, and a test runner identically.
- No wall-clock reads (`Date.now`, `new Date()`) inside calculation code.
  Dates/timestamps are inputs, not ambient state.
- No randomness. Any tie-break must be a documented, stable, deterministic
  rule (see spec §7.1, §8 test 13), not `Math.random`.

## Arithmetic

- Never use JS `number` for money, shares, prices, ratios, ownership
  percentages, or valuation caps. Use the arbitrary-precision decimal
  library selected in `docs/adr/0001-numeric-arithmetic-library.md`.
- Preserve full unrounded precision through every internal step. Round
  only at the documented display or legal share-allocation boundary
  (spec §7.1).
- Displayed ownership tables must reconcile to exactly 100.00% using the
  documented deterministic residual-allocation policy — never let
  independent per-row rounding silently drift the total.

## Versioning and determinism

- Every public engine function is bound to an explicit engine/schema
  version. A scenario snapshot always records the engine version that
  produced it.
- Identical canonical input under the same engine version must produce a
  byte-identical canonical output and hash (spec §8 test 15). Canonical
  serialization lives in `packages/audit`; this package must not invent
  its own serialization format.
- A historical snapshot is never silently recalculated under a newer
  engine version. Changing calculation behaviour requires a new engine
  version, not an in-place edit to existing logic paths still reachable
  by old snapshots.

## Unsupported cases

Fail closed and visibly (a typed `UnsupportedCaseError`/result variant,
never a silent approximation, never `NaN`/`Infinity`, never an arbitrary
branch) for anything in spec §7.9, including: pre-money legacy SAFEs,
convertible notes/warrants/secondaries/debt, unusual side-letter
economics, clause-level custom amendments, complex MFN chains,
multi-currency conversion, unmodelled sequential closings, waterfalls,
liquidation preferences, dividends, tax results, and numerical
non-convergence or contradictory inputs.

## Testing

- Golden tests 1–6 and 10–15 from spec §8 must pass before this package
  is wired into any UI or API route.
- Add property-based tests (fast-check) for: nonnegative holdings,
  ownership reconciliation to 100.00%, monotonicity where valid,
  serialization round-trips, idempotency of repeated runs on identical
  input, and unsupported-case blocking.
- Do not weaken a golden test to make it pass. If a golden test appears
  wrong, stop and ask — do not silently reinterpret spec §7–§8.
