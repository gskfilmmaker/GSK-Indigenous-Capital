import type { EngineDecimalType } from "./decimal.js";
import { UnsupportedCaseError } from "./errors.js";

/**
 * An investor-defined threshold on a single named metric. `label` is
 * whatever the investor calls it in their own thesis — this module has
 * no fixed list of "the" metrics that matter; it only compares whatever
 * the investor chose to compare.
 */
export interface ThesisCriterion {
  metric: string;
  label: string;
  comparator: "gte" | "lte";
  threshold: EngineDecimalType;
}

export interface ThesisFitRow {
  metric: string;
  label: string;
  comparator: "gte" | "lte";
  threshold: EngineDecimalType;
  actualValue: EngineDecimalType;
  /**
   * Whether this one metric clears this one investor-set threshold.
   * There is deliberately no combined field anywhere in this module —
   * see packages/deal-screening/CLAUDE.md. Combining these into a single
   * "fit" judgment is a decision for the investor reading the rows, not
   * something this function performs on their behalf.
   */
  meetsThreshold: boolean;
}

/**
 * Compares a startup's computed metrics against an investor's own stated
 * thresholds — never the app's own thresholds, and never combined into a
 * single score. `values` must contain every `metric` key referenced by
 * `criteria`, or this fails closed rather than silently skip a criterion.
 */
export function evaluateThesisFit(
  criteria: ThesisCriterion[],
  values: Record<string, EngineDecimalType>,
): ThesisFitRow[] {
  return criteria.map((criterion) => {
    const actualValue = values[criterion.metric];
    if (actualValue == null) {
      throw new UnsupportedCaseError(
        "unknown_thesis_metric",
        `no computed value was supplied for thesis metric "${criterion.metric}"`,
      );
    }

    const meetsThreshold =
      criterion.comparator === "gte"
        ? actualValue.gte(criterion.threshold)
        : actualValue.lte(criterion.threshold);

    return {
      metric: criterion.metric,
      label: criterion.label,
      comparator: criterion.comparator,
      threshold: criterion.threshold,
      actualValue,
      meetsThreshold,
    };
  });
}
