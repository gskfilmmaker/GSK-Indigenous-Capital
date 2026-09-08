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

export const nonNegativeDecimalStringSchema = decimalStringSchema.refine(
  (value) => new Decimal(value).gte(0),
  "must not be negative",
);

export const positiveDecimalStringSchema = decimalStringSchema.refine(
  (value) => new Decimal(value).gt(0),
  "must be greater than zero",
);

/** A decimal string in [0, 1], e.g. `"0.90"` for 90%. */
export const percentStringSchema = decimalStringSchema.refine((value) => {
  const parsed = new Decimal(value);
  return parsed.gte(0) && parsed.lte(1);
}, 'must be a decimal between 0 and 1 (e.g. "0.90" for 90%)');
