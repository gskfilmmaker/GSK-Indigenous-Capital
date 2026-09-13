# packages/deal-screening

Pure, deterministic engine that applies publicly documented investor
evaluation frameworks (VC Method, Payne Scorecard, Berkus Method, Rule of
40, LTV:CAC/payback, TAM/SAM/SOM credibility check, a red-flag rule set)
to a founder's submitted data, and compares the result against an
investor's own stated thresholds. See root `CLAUDE.md` for
repository-wide invariants; this file adds rules specific to this
package.

## The one invariant that matters most here

**This package never produces a verdict.** No function in this package
may return, and no caller may render, a single aggregate score, a
letter grade, a percentile rank, a pass/fail flag, or any output that
reads as "invest" or "pass." Every function returns a structured set of
named metrics, each traceable to a specific formula and a specific
input, evaluated against thresholds the *investor* supplied — never a
threshold this package invented on its own.

This is not a style preference. Root `CLAUDE.md` invariant 7 is
absolute: never present app output as investment advice, never declare
investor eligibility. A collapsed score is advice with extra steps —
see the design discussion that produced this package for the reasoning
in full. If a change to this package would require collapsing multiple
metrics into one number or one word, stop and ask rather than build it.

## What this package is and isn't

- It is a faithful, tested implementation of well-known, independently
  documented investor methods — nothing here is a proprietary
  prediction model, and nothing here claims to outperform a human
  investor's judgment.
- It does not ingest documents, call an external AI service, or persist
  anything — this package is pure calculation only, exactly like
  `packages/cap-table`. Document upload, extraction, and storage are a
  separate concern with its own open questions (data residency,
  retention) that this package does not decide.
- It does not select an industry-specific benchmark set on the
  founder's behalf without that being explicit, visible input — a
  default benchmark is a starting point the investor can see and
  override, never a silent assumption baked into the output.

## Purity, arithmetic, and versioning

Same rules as `packages/cap-table/CLAUDE.md`: no Next.js/Supabase/
browser/`fs`/network imports, no wall-clock reads inside calculation
code, no randomness, never JS `number` for money/ratios/percentages —
use the `EngineDecimal` context in `src/decimal.ts`. Every public
function is bound to an explicit version; identical input under the
same version must produce a byte-identical output.

## Unsupported cases

Fail closed (a typed `UnsupportedCaseError`, never `NaN`/`Infinity`,
never a silent default) when a required input for a given method is
missing or nonsensical for the stage supplied — e.g. running the VC
Method with a zero or negative investment amount, or Berkus scoring
with a factor value above its $500K ceiling. Never guess an industry
benchmark that was not supplied.

## Testing

Each formula ported from the Ledger research document needs at least
one worked-example test reproducing the numbers used in that document,
plus a boundary/unsupported-case test. Do not weaken a test to make it
pass — if a formula's documented behavior seems wrong, stop and ask.
