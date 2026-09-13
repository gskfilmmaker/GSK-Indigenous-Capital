import { EngineDecimal, type EngineDecimalType } from "./decimal.js";

/**
 * Patterns from the Ledger research document (§8) that show up often
 * enough across investor post-mortems to be worth surfacing automatically.
 * Each flag names the concrete evidence that triggered it — this module
 * never scores or weighs flags against each other, and a founder having
 * zero flags is not itself a "pass": it means these specific patterns
 * were not detected in the data supplied, nothing more.
 */
export type RedFlagCode =
  | "cap_table_even_split_fully_vested"
  | "monthly_churn_above_five_percent"
  | "cohort_deterioration_undisclosed"
  | "market_sizing_gap_unreconciled"
  | "ltv_cac_below_floor";

export interface RedFlag {
  code: RedFlagCode;
  description: string;
}

export interface RedFlagInput {
  /** Two co-founders each holding ~50%, with no unvested shares remaining. */
  capTableEvenSplitFullyVested?: boolean | undefined;
  monthlyChurnRate?: EngineDecimalType | undefined;
  /** Whether the founder has disclosed cohort-level retention, not just a blended figure. */
  cohortRetentionDisclosed?: boolean | undefined;
  marketSizingGapPercent?: EngineDecimalType | undefined;
  ltvToCacRatio?: EngineDecimalType | undefined;
}

const fivePercent = new EngineDecimal("0.05");

export function evaluateRedFlags(input: RedFlagInput): RedFlag[] {
  const flags: RedFlag[] = [];

  if (input.capTableEvenSplitFullyVested) {
    flags.push({
      code: "cap_table_even_split_fully_vested",
      description:
        "Cap table shows an even split between co-founders with no unvested shares remaining.",
    });
  }

  if (input.monthlyChurnRate != null && input.monthlyChurnRate.gt(fivePercent)) {
    flags.push({
      code: "monthly_churn_above_five_percent",
      description: `Monthly churn is ${input.monthlyChurnRate.times(100).toString()}%, above the commonly cited 5% concern threshold for B2B.`,
    });
  }

  if (input.cohortRetentionDisclosed === false) {
    flags.push({
      code: "cohort_deterioration_undisclosed",
      description:
        "Only a blended LTV/retention figure was supplied — cohort-level retention was not disclosed, so cohort deterioration cannot be ruled out.",
    });
  }

  if (input.marketSizingGapPercent != null && input.marketSizingGapPercent.gt(20)) {
    flags.push({
      code: "market_sizing_gap_unreconciled",
      description: `Bottom-up and top-down market-size estimates diverge by ${input.marketSizingGapPercent.toString()}%, past the ~20% credibility band.`,
    });
  }

  if (input.ltvToCacRatio != null && input.ltvToCacRatio.lt(3)) {
    flags.push({
      code: "ltv_cac_below_floor",
      description: `LTV:CAC ratio is ${input.ltvToCacRatio.toString()}:1, below the commonly cited 3:1 floor.`,
    });
  }

  return flags;
}
