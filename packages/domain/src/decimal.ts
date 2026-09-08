import { Decimal } from "decimal.js";
import { z } from "zod";

/**
 * Root `CLAUDE.md` invariant 2: never use JS floating point for money,
 * shares, prices, ratios, ownership, or FX. Every numeric value that
 * crosses the domain-schema boundary is therefore a plain decimal string
 * (no exponents, no thousands separators), validated here and only ever
 * parsed into a `Decimal` (see docs/adr/0001-numeric-arithmetic-library.md)
 * inside the calculation engine — never a JS `number`.
 *
 * This module uses `decimal.js` only for the validation refinements below
 * (single-value comparisons); it does not need the engine's cloned
 * 50-significant-digit context (packages/cap-table/src/decimal.ts) since no
 * chained arithmetic happens here.
 */
const decimalPattern = /^-?\d+(\.\d+)?$/;

export const decimalStringSchema = z
  .string()
  .regex(
    decimalPattern,
    'must be a plain decimal number encoded as a string, e.g. "500000" or "12.5"',
  );
export type DecimalString = z.infer<typeof decimalStringSchema>;

// Every `.refine()` below re-checks `decimalPattern` itself, short-circuiting
// before constructing a `Decimal`, rather than trusting that
// `decimalStringSchema`'s own `.regex()` check already rejected a bad value.
// Zod does not abort a chain of checks after a non-fatal failure (`.regex()`
// has no `fatal` option in Zod v3) — a `.refine()` chained after it still
// receives and runs its predicate against the original, regex-failing
// value. Without this guard, an incomplete or empty string (completely
// normal mid-keystroke input from a live form) reaches `new Decimal(...)`,
// which throws a raw `DecimalError` instead of a clean Zod validation
// issue.
export const nonNegativeDecimalStringSchema = decimalStringSchema.refine(
  (value) => decimalPattern.test(value) && new Decimal(value).gte(0),
  "must not be negative",
);

export const positiveDecimalStringSchema = decimalStringSchema.refine(
  (value) => decimalPattern.test(value) && new Decimal(value).gt(0),
  "must be greater than zero",
);

/** A decimal string in [0, 1], e.g. `"0.90"` for 90%. */
export const percentStringSchema = decimalStringSchema.refine((value) => {
  if (!decimalPattern.test(value)) return false;
  const parsed = new Decimal(value);
  return parsed.gte(0) && parsed.lte(1);
}, 'must be a decimal between 0 and 1 (e.g. "0.90" for 90%)');
