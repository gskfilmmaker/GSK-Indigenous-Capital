import { EngineDecimal, type EngineDecimalType } from "./decimal.js";
import { UnsupportedCaseError } from "./errors.js";

/** Dave Berkus's five qualitative, risk-reducing milestones (Ledger §2). */
export const berkusFactorCeiling = new EngineDecimal(500_000);

export interface BerkusFactors {
  soundIdea: EngineDecimalType;
  workingPrototype: EngineDecimalType;
  qualityManagementTeam: EngineDecimalType;
  strategicRelationships: EngineDecimalType;
  productRolloutOrSales: EngineDecimalType;
}

export interface BerkusResult {
  preMoneyValuation: EngineDecimalType;
  ceiling: EngineDecimalType;
}

const berkusFactorKeys = [
  "soundIdea",
  "workingPrototype",
  "qualityManagementTeam",
  "strategicRelationships",
  "productRolloutOrSales",
] as const;

/**
 * Berkus caps each factor at $500K by design — a pre-revenue negotiating
 * anchor, not a valuation model (Ledger §2). Callers pass in whatever
 * currency their scenario uses; this function does not itself assume CAD.
 */
export function computeBerkusMethod(factors: BerkusFactors): BerkusResult {
  for (const key of berkusFactorKeys) {
    const value = factors[key];
    if (value.lt(0) || value.gt(berkusFactorCeiling)) {
      throw new UnsupportedCaseError(
        "factor_exceeds_ceiling",
        `Berkus factor "${key}" must be between 0 and ${berkusFactorCeiling.toString()}, got ${value.toString()}`,
      );
    }
  }

  const preMoneyValuation = berkusFactorKeys.reduce(
    (sum, key) => sum.plus(factors[key]),
    new EngineDecimal(0),
  );

  return { preMoneyValuation, ceiling: berkusFactorCeiling.times(berkusFactorKeys.length) };
}
