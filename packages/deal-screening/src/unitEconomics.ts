import { EngineDecimal, type EngineDecimalType } from "./decimal.js";
import { UnsupportedCaseError } from "./errors.js";

export interface RuleOf40Input {
  /** e.g. 0.65 for 65% annual revenue growth. */
  annualGrowthRate: EngineDecimalType;
  /** e.g. -0.15 for a 15% margin loss, 0.10 for a 10% profit margin. */
  profitMargin: EngineDecimalType;
}

export interface RuleOf40Result {
  score: EngineDecimalType;
  /** Ledger §5: growth + margin should be at least 0.40 (40 points). */
  meetsBar: boolean;
}

export function computeRuleOf40(input: RuleOf40Input): RuleOf40Result {
  const score = input.annualGrowthRate.plus(input.profitMargin);
  return { score, meetsBar: score.gte(new EngineDecimal("0.40")) };
}

export interface UnitEconomicsInput {
  /** Average revenue per account, per month. */
  monthlyRevenuePerCustomer: EngineDecimalType;
  /** e.g. 0.78 for 78% gross margin. */
  grossMargin: EngineDecimalType;
  /** e.g. 0.02 for 2% monthly churn. */
  monthlyChurnRate: EngineDecimalType;
  customerAcquisitionCost: EngineDecimalType;
}

export interface UnitEconomicsResult {
  monthlyGrossProfitPerCustomer: EngineDecimalType;
  lifetimeValue: EngineDecimalType;
  ltvToCacRatio: EngineDecimalType;
  /** Meets the commonly cited 3:1 healthy-band floor (Ledger §5). */
  meetsLtvCacFloor: boolean;
  cacPaybackMonths: EngineDecimalType;
}

/**
 * LTV:CAC and CAC payback (Ledger §5): read together, never LTV:CAC alone
 * — a healthy ratio collected over years is not the same deal as the same
 * ratio collected in months.
 */
export function computeUnitEconomics(input: UnitEconomicsInput): UnitEconomicsResult {
  if (input.monthlyChurnRate.lte(0)) {
    throw new UnsupportedCaseError(
      "non_positive_denominator",
      `monthlyChurnRate must be greater than zero (an LTV over an infinite lifetime is not computable), got ${input.monthlyChurnRate.toString()}`,
    );
  }
  if (input.customerAcquisitionCost.lte(0)) {
    throw new UnsupportedCaseError(
      "non_positive_denominator",
      `customerAcquisitionCost must be greater than zero, got ${input.customerAcquisitionCost.toString()}`,
    );
  }

  const monthlyGrossProfitPerCustomer = input.monthlyRevenuePerCustomer.times(input.grossMargin);
  const lifetimeValue = monthlyGrossProfitPerCustomer.div(input.monthlyChurnRate);
  const ltvToCacRatio = lifetimeValue.div(input.customerAcquisitionCost);

  if (monthlyGrossProfitPerCustomer.lte(0)) {
    throw new UnsupportedCaseError(
      "non_positive_denominator",
      `monthly gross profit per customer must be positive to compute a payback period, got ${monthlyGrossProfitPerCustomer.toString()}`,
    );
  }
  const cacPaybackMonths = input.customerAcquisitionCost.div(monthlyGrossProfitPerCustomer);

  return {
    monthlyGrossProfitPerCustomer,
    lifetimeValue,
    ltvToCacRatio,
    meetsLtvCacFloor: ltvToCacRatio.gte(3),
    cacPaybackMonths,
  };
}
