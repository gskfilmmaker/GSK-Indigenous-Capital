/**
 * Fail closed and visibly (root `CLAUDE.md` invariant 9; see ./CLAUDE.md).
 * Every case in spec §7.9 — and every other input the engine has not been
 * built and validated to handle — throws one of these rather than emitting
 * an approximated, NaN, or silently-wrong result.
 */
export type UnsupportedCaseReason =
  | "cap_safes_sell_entire_or_more_than_company"
  | "duplicate_safe_id"
  | "duplicate_sequence"
  | "mfn_instrument_not_found"
  | "multiple_mfn_instruments_not_supported";

export class UnsupportedCaseError extends Error {
  readonly reason: UnsupportedCaseReason;

  constructor(reason: UnsupportedCaseReason, message: string) {
    super(message);
    this.name = "UnsupportedCaseError";
    this.reason = reason;
  }
}
