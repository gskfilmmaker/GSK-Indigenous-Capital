import { Decimal } from "decimal.js";

/**
 * Display-only formatting. Per root `CLAUDE.md` invariant 2, every value
 * here is a decimal string in, and a decimal string out — this module never
 * round-trips through a JS `number`, including for thousands-grouping.
 * These helpers must not be used to produce a value fed back into
 * calculation; the calculation engine (`packages/cap-table`) always works
 * from the original unrounded value.
 */

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** `"500000"` -> `"500,000"`; `"1200000.5"` -> `"1,200,000.5"`. */
export function formatDecimalWithThousands(decimalString: string): string {
  const negative = decimalString.startsWith("-");
  const unsigned = negative ? decimalString.slice(1) : decimalString;
  const [intPart = "0", fracPart] = unsigned.split(".");
  const grouped = groupThousands(intPart);
  return (negative ? "−" : "") + grouped + (fracPart !== undefined ? `.${fracPart}` : "");
}

/** `"500000"` -> `"CAD 500,000"`. Currency is always explicit (spec §7.8). */
export function formatCad(amountDecimalString: string): string {
  return `CAD ${formatDecimalWithThousands(amountDecimalString)}`;
}

/**
 * A fraction in [0, 1] as a decimal string -> a percentage string, e.g.
 * `"0.81"` -> `"81.0%"`. Rounding uses `decimal.js` (never `parseFloat`),
 * consistent with the calculation engine's own numeric policy
 * (docs/adr/0001-numeric-arithmetic-library.md) even though this is a pure
 * display step.
 */
export function formatPercent(fractionDecimalString: string, decimalPlaces = 1): string {
  const percent = new Decimal(fractionDecimalString).times(100).toFixed(decimalPlaces);
  return `${percent}%`;
}

/**
 * `"0.81"` -> `"81"` (a bare number, for interpolating into a CSS
 * `width: N%` value — the one place this package multiplies a fraction by
 * 100 without also formatting it as display text).
 */
export function fractionToCssPercent(fractionDecimalString: string): string {
  return new Decimal(fractionDecimalString).times(100).toString();
}

/** `"0.81"`, `"0.72"` -> `"+9.0 pts"` / `"−9.0 pts"` for a delta between two fractions. */
export function formatPercentPointDelta(
  fromFractionDecimalString: string,
  toFractionDecimalString: string,
  decimalPlaces = 1,
): string {
  const delta = new Decimal(toFractionDecimalString)
    .minus(fromFractionDecimalString)
    .times(100)
    .toFixed(decimalPlaces);
  const isNegative = delta.startsWith("-");
  const magnitude = isNegative ? delta.slice(1) : delta;
  const sign = isNegative ? "−" : "+";
  return `${sign}${magnitude} pts`;
}
