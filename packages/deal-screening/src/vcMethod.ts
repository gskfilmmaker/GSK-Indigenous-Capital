import { EngineDecimal, type EngineDecimalType } from "./decimal.js";
import { UnsupportedCaseError } from "./errors.js";

export interface VcMethodInput {
  /** Assumed exit value, N years from now (e.g. revenue x exit multiple). */
  exitValue: EngineDecimalType;
  /** Years from today to that assumed exit. */
  yearsToExit: EngineDecimalType;
  /** The fund's required annual return for this stage/risk, e.g. 0.48 for 48%. */
  targetAnnualReturn: EngineDecimalType;
  /** New investment being proposed. */
  investment: EngineDecimalType;
}

export interface VcMethodResult {
  /** Equivalent MOIC implied by (1 + targetAnnualReturn) ^ yearsToExit. */
  impliedMultiple: EngineDecimalType;
  postMoneyValuation: EngineDecimalType;
  preMoneyValuation: EngineDecimalType;
  investorOwnership: EngineDecimalType;
}

/**
 * The VC Method (see the Ledger research document, §4): discount the
 * assumed exit value by the fund's required return to find what the
 * whole company can be worth today, then back into ownership.
 *
 * ```text
 * impliedMultiple      = (1 + targetAnnualReturn) ^ yearsToExit
 * postMoneyValuation   = exitValue / impliedMultiple
 * preMoneyValuation    = postMoneyValuation - investment
 * investorOwnership    = investment / postMoneyValuation
 * ```
 */
export function computeVcMethod(input: VcMethodInput): VcMethodResult {
  if (input.investment.lte(0)) {
    throw new UnsupportedCaseError(
      "non_positive_investment",
      `investment must be greater than zero, got ${input.investment.toString()}`,
    );
  }
  if (input.exitValue.lte(0)) {
    throw new UnsupportedCaseError(
      "non_positive_exit_value",
      `exitValue must be greater than zero, got ${input.exitValue.toString()}`,
    );
  }
  if (input.yearsToExit.lte(0)) {
    throw new UnsupportedCaseError(
      "non_positive_years",
      `yearsToExit must be greater than zero, got ${input.yearsToExit.toString()}`,
    );
  }

  const impliedMultiple = new EngineDecimal(1)
    .plus(input.targetAnnualReturn)
    .pow(input.yearsToExit);

  const postMoneyValuation = input.exitValue.div(impliedMultiple);
  const preMoneyValuation = postMoneyValuation.minus(input.investment);
  const investorOwnership = input.investment.div(postMoneyValuation);

  return { impliedMultiple, postMoneyValuation, preMoneyValuation, investorOwnership };
}

export interface FundReturnCheckInput {
  investment: EngineDecimalType;
  fundSize: EngineDecimalType;
}

export interface FundReturnCheckResult {
  /** The multiple this single check would need to hit to return the whole fund alone. */
  requiredMultipleToReturnFund: EngineDecimalType;
}

/**
 * The "power law" sanity check (Ledger §4): most early-stage checks fail
 * outright, so a fund needs each surviving check capable of returning the
 * whole fund on its own. This is reporting context for the investor, not a
 * pass/fail judgment on the deal.
 */
export function computeFundReturnCheck(input: FundReturnCheckInput): FundReturnCheckResult {
  if (input.investment.lte(0)) {
    throw new UnsupportedCaseError(
      "non_positive_investment",
      `investment must be greater than zero, got ${input.investment.toString()}`,
    );
  }
  return { requiredMultipleToReturnFund: input.fundSize.div(input.investment) };
}
