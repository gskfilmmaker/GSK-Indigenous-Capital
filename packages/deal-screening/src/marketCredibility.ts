import { EngineDecimal, type EngineDecimalType } from "./decimal.js";
import { UnsupportedCaseError } from "./errors.js";

export interface MarketCredibilityInput {
  /** Annual contract value. */
  annualContractValue: EngineDecimalType;
  /** Realistically reachable customers in the near term. */
  reachableCustomers: EngineDecimalType;
  /** Top-down total addressable market. */
  totalAddressableMarket: EngineDecimalType;
  /** e.g. 0.02 for the 2% of TAM that is actually serviceable. */
  serviceableShare: EngineDecimalType;
  /** e.g. 0.05 for a realistic near-term capture rate of that serviceable share. */
  nearTermCaptureRate: EngineDecimalType;
}

export interface MarketCredibilityResult {
  bottomUpEstimate: EngineDecimalType;
  topDownEstimate: EngineDecimalType;
  /** Percentage gap between the two independent estimates, at the same layer. */
  gapPercent: EngineDecimalType;
  /** Ledger §6: most 2026 VCs treat a gap within ~20% as a credible market story. */
  withinCredibleTolerance: boolean;
}

/**
 * Bottom-up vs. top-down market sizing (Ledger §6). Neither number is "the"
 * market size — the gap between them is the signal, so both are always
 * returned alongside the gap, never collapsed into a single figure.
 */
export function computeMarketCredibility(input: MarketCredibilityInput): MarketCredibilityResult {
  const bottomUpEstimate = input.annualContractValue.times(input.reachableCustomers);
  const serviceableAddressableMarket = input.totalAddressableMarket.times(input.serviceableShare);
  const topDownEstimate = serviceableAddressableMarket.times(input.nearTermCaptureRate);

  const larger = EngineDecimal.max(bottomUpEstimate, topDownEstimate);
  if (larger.lte(0)) {
    throw new UnsupportedCaseError(
      "non_positive_denominator",
      "both the bottom-up and top-down estimates are zero or negative; the gap is not computable",
    );
  }

  const gapPercent = bottomUpEstimate.minus(topDownEstimate).abs().div(larger).times(100);

  return {
    bottomUpEstimate,
    topDownEstimate,
    gapPercent,
    withinCredibleTolerance: gapPercent.lte(20),
  };
}
