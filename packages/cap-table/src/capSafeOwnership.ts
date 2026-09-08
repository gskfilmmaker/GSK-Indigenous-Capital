import { EngineDecimal, type EngineDecimalType } from "./decimal.js";
import { UnsupportedCaseError } from "./errors.js";

export interface CapSafeOwnershipInput {
  id: string;
  purchaseAmount: EngineDecimalType;
  valuationCap: EngineDecimalType;
}

export interface CapSafeOwnershipRow {
  id: string;
  ownership: EngineDecimalType;
}

export interface CapSafeOwnershipResult {
  rows: CapSafeOwnershipRow[];
  totalSafeOwnership: EngineDecimalType;
  legacyOwnership: EngineDecimalType;
}

/**
 * Spec §7.2: indicative cap SAFE ownership before a priced round.
 *
 * ```text
 * indicativeOwnership_i = purchaseAmount_i / postMoneyValuationCap_i
 * totalCapSafeOwnership = Σ indicativeOwnership_i
 * legacyOwnership = 1 - totalCapSafeOwnership
 * ```
 *
 * Multiple post-money cap SAFEs add and do not dilute one another at this
 * pre-round layer. Rows are returned in input order — that order is the
 * documented, stable tie-break for SAFEs with equal indicative ownership
 * (spec §8 test 13).
 */
export function computeCapSafeOwnership(safes: CapSafeOwnershipInput[]): CapSafeOwnershipResult {
  const seenIds = new Set<string>();
  for (const safe of safes) {
    if (seenIds.has(safe.id)) {
      throw new UnsupportedCaseError("duplicate_safe_id", `duplicate SAFE id: ${safe.id}`);
    }
    seenIds.add(safe.id);
  }

  const rows: CapSafeOwnershipRow[] = safes.map((safe) => ({
    id: safe.id,
    ownership: safe.purchaseAmount.div(safe.valuationCap),
  }));

  const totalSafeOwnership = rows.reduce(
    (sum, row) => sum.plus(row.ownership),
    new EngineDecimal(0),
  );

  // Spec §8 test 12: exactly 100% is a blocking "terms sell the whole
  // company" state; above 100% must never display negative ownership. Both
  // are the same failure mode here — fail closed rather than emit a
  // legacyOwnership at or below zero.
  if (totalSafeOwnership.gte(1)) {
    throw new UnsupportedCaseError(
      "cap_safes_sell_entire_or_more_than_company",
      `total indicative SAFE ownership is ${totalSafeOwnership.times(100).toString()}%, which sells the entire company or more`,
    );
  }

  const legacyOwnership = new EngineDecimal(1).minus(totalSafeOwnership);

  return { rows, totalSafeOwnership, legacyOwnership };
}
