import { Decimal } from "decimal.js";

/**
 * This package's own arithmetic context, cloned rather than mutating the
 * global `decimal.js` singleton — same discipline as
 * packages/cap-table/src/decimal.ts, kept independent rather than shared
 * so a precision change in one calculation engine can never silently
 * affect the other.
 */
export const EngineDecimal = Decimal.clone({
  precision: 50,
  rounding: Decimal.ROUND_HALF_UP,
});

export type EngineDecimalType = InstanceType<typeof EngineDecimal>;
