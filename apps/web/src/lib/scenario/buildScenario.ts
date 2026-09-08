import type { SafeId } from "@gsk/domain";
import { percentPointsToFraction } from "./percentInput";

export type SafeInstrumentType = "post_money_cap" | "discount_only" | "mfn";

/**
 * One SAFE row's editable form state. Decimal-string fields throughout
 * (root CLAUDE.md invariant 2) — `valuationCap`/`discountPercent` are only
 * meaningful for their respective `instrumentType` (spec §6.5: "type
 * switching must clear... inapplicable fields"), enforced by the row editor
 * clearing the other on every type change, not by this shape.
 */
export interface SafeRowFormState {
  id: SafeId;
  investorLabel: string;
  purchaseAmount: string;
  instrumentType: SafeInstrumentType;
  /** Money decimal string; percent-point string for a UI field is a different unit, see valuationCap vs discountPercent below. */
  valuationCap: string;
  /** Percent-point string ("20" meaning 20%), matching `NumberField`'s convention — not the fraction `@gsk/domain` stores. */
  discountPercent: string;
}

export interface ExistingCapitalizationFormState {
  /** Percent-point strings ("90" meaning 90%), matching `NumberField`'s convention. */
  founders: string;
  grantedOptions: string;
  unissuedPool: string;
}

/**
 * Assembles the raw (unvalidated) scenario object `@gsk/domain`'s
 * `parseScenario` expects, from this page's form state. A SAFE row's
 * position in `safeRows` becomes its `sequence` — reordering the array
 * (the row editor's up/down controls) is how chronological order is
 * edited, so there is no separately user-editable sequence field to keep
 * in sync (spec §6.5: "chronological order and drag/keyboard reorder").
 * Returns `unknown` deliberately: this is meant to be fed straight into
 * `parseScenario`, which validates the shape — duplicating `@gsk/domain`'s
 * Zod-inferred types here would just be a second, driftable copy of them.
 */
export function buildScenarioInput(
  scenarioId: string,
  existingCapitalization: ExistingCapitalizationFormState,
  safeRows: SafeRowFormState[],
): unknown {
  return {
    id: scenarioId,
    schemaVersion: 1,
    currency: "CAD",
    existingCapitalization: {
      founders: percentPointsToFraction(existingCapitalization.founders),
      grantedOptions: percentPointsToFraction(existingCapitalization.grantedOptions),
      unissuedPool: percentPointsToFraction(existingCapitalization.unissuedPool),
    },
    safes: safeRows.map((row, index) => buildSafeInput(row, index)),
  };
}

function buildSafeInput(row: SafeRowFormState, sequence: number): unknown {
  const base = {
    id: row.id,
    sequence,
    ...(row.investorLabel.trim() ? { investorLabel: row.investorLabel.trim() } : {}),
    purchaseAmount: { amount: row.purchaseAmount, currency: "CAD" },
  };

  switch (row.instrumentType) {
    case "post_money_cap":
      return {
        ...base,
        instrumentType: "post_money_cap",
        valuationCap: { amount: row.valuationCap, currency: "CAD" },
      };
    case "discount_only":
      return {
        ...base,
        instrumentType: "discount_only",
        discountPercent: percentPointsToFraction(row.discountPercent),
      };
    case "mfn":
      return { ...base, instrumentType: "mfn" };
  }
}
