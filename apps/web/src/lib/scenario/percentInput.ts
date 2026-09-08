import { Decimal } from "decimal.js";

/**
 * `NumberField` (kind="percent") displays and edits percent-point strings
 * ("90" meaning 90%) — see its own stories. `@gsk/domain`'s
 * `percentStringSchema` instead stores a fraction in [0, 1] ("0.90").
 * These convert between the two. Root CLAUDE.md invariant 2: `decimal.js`
 * throughout, never `parseFloat`.
 */
const PLAIN_DECIMAL_PATTERN = /^-?\d+(\.\d+)?$/;

/**
 * "90" -> "0.9". A partially-typed or empty value (e.g. "", "12.") is
 * passed through unchanged rather than thrown on — `Decimal`'s constructor
 * throws on those, and the right behavior while the user is mid-keystroke
 * is to let `@gsk/domain`'s schema report a normal validation issue, not
 * to crash the page.
 */
export function percentPointsToFraction(percentPoints: string): string {
  if (!PLAIN_DECIMAL_PATTERN.test(percentPoints)) return percentPoints;
  return new Decimal(percentPoints).div(100).toString();
}

/** "0.9" -> "90". Same pass-through-on-invalid behavior as the inverse above. */
export function fractionToPercentPoints(fraction: string): string {
  if (!PLAIN_DECIMAL_PATTERN.test(fraction)) return fraction;
  return new Decimal(fraction).times(100).toString();
}
