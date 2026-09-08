import { Decimal } from "decimal.js";

/**
 * The engine's arithmetic context (docs/adr/0001-numeric-arithmetic-library.md):
 * 50 significant digits, ROUND_HALF_UP for intermediate operations. Cloned
 * rather than mutating the global `decimal.js` singleton, so this package
 * never changes precision/rounding behaviour for any other consumer of
 * `decimal.js` in the monorepo (e.g. packages/domain's validation-only
 * usage).
 */
export const EngineDecimal = Decimal.clone({
  precision: 50,
  rounding: Decimal.ROUND_HALF_UP,
});

export type EngineDecimalType = InstanceType<typeof EngineDecimal>;
