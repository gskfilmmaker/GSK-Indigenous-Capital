/**
 * Fail closed and visibly (root `CLAUDE.md` invariant 9; see ./CLAUDE.md).
 * Every input this package has not been built and validated to handle
 * throws one of these rather than emitting an approximated, NaN, or
 * silently-wrong result.
 */
export type UnsupportedCaseReason =
  | "non_positive_investment"
  | "non_positive_exit_value"
  | "non_positive_years"
  | "factor_exceeds_ceiling"
  | "weights_do_not_sum_to_one"
  | "non_positive_denominator"
  | "unknown_thesis_metric";

export class UnsupportedCaseError extends Error {
  readonly reason: UnsupportedCaseReason;

  constructor(reason: UnsupportedCaseReason, message: string) {
    super(message);
    this.name = "UnsupportedCaseError";
    this.reason = reason;
  }
}
