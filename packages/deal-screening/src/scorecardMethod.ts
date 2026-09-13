import { EngineDecimal, type EngineDecimalType } from "./decimal.js";
import { UnsupportedCaseError } from "./errors.js";

/**
 * Bill Payne's canonical seven factors (Ledger §3), weights summing to 1.
 * An investor may override these weights, but they must still sum to 1 —
 * see `ScorecardWeights` below.
 */
export const defaultScorecardWeights = {
  team: new EngineDecimal("0.30"),
  marketSize: new EngineDecimal("0.25"),
  product: new EngineDecimal("0.15"),
  competitiveEnvironment: new EngineDecimal("0.10"),
  salesChannels: new EngineDecimal("0.10"),
  needForFinancing: new EngineDecimal("0.05"),
  other: new EngineDecimal("0.05"),
} as const;

export type ScorecardFactor = keyof typeof defaultScorecardWeights;

export type ScorecardWeights = Record<ScorecardFactor, EngineDecimalType>;

/** Each rating is relative to 1.00 = an average deal for this stage/region. */
export type ScorecardRatings = Record<ScorecardFactor, EngineDecimalType>;

export interface ScorecardInput {
  regionalMedianPreMoney: EngineDecimalType;
  ratings: ScorecardRatings;
  weights?: ScorecardWeights;
}

export interface ScorecardResult {
  weightedComparisonFactor: EngineDecimalType;
  adjustedPreMoneyValuation: EngineDecimalType;
}

const scorecardFactors = Object.keys(defaultScorecardWeights) as ScorecardFactor[];

export function computeScorecardMethod(input: ScorecardInput): ScorecardResult {
  const weights = input.weights ?? defaultScorecardWeights;

  const weightSum = scorecardFactors.reduce(
    (sum, factor) => sum.plus(weights[factor]),
    new EngineDecimal(0),
  );
  if (!weightSum.equals(1)) {
    throw new UnsupportedCaseError(
      "weights_do_not_sum_to_one",
      `scorecard weights must sum to exactly 1, got ${weightSum.toString()}`,
    );
  }

  const weightedComparisonFactor = scorecardFactors.reduce(
    (sum, factor) => sum.plus(weights[factor].times(input.ratings[factor])),
    new EngineDecimal(0),
  );

  return {
    weightedComparisonFactor,
    adjustedPreMoneyValuation: input.regionalMedianPreMoney.times(weightedComparisonFactor),
  };
}
