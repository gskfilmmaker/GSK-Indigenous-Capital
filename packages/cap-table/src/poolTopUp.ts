import { EngineDecimal, type EngineDecimalType } from "./decimal.js";

/**
 * Spec §7.5 (isolated pool-sizing formula): "If the surviving existing pool
 * already exceeds the target, do not create a negative top-up or shrink it
 * silently" (spec §8 test 11). This is one component of the full
 * priced-round option-pool solver — the part of that solver which also
 * preserves the new-money investor's agreed target ownership by adjusting
 * round price is deferred; see this package's CLAUDE.md and
 * docs/adr/0001-numeric-arithmetic-library.md.
 */
export function computeOptionPoolTopUp(
  targetPoolPercent: EngineDecimalType,
  survivingPoolPercent: EngineDecimalType,
): EngineDecimalType {
  const topUp = targetPoolPercent.minus(survivingPoolPercent);
  return topUp.gt(0) ? topUp : new EngineDecimal(0);
}
