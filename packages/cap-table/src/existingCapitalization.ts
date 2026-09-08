import type { EngineDecimalType } from "./decimal.js";

export interface ExistingCapitalizationSimple {
  founders: EngineDecimalType;
  grantedOptions: EngineDecimalType;
  unissuedPool: EngineDecimalType;
}

export type ExistingHolderKey = "founders" | "grantedOptions" | "unissuedPool";

export interface AllocatedHolderRow {
  key: ExistingHolderKey;
  ownershipBeforeSafes: EngineDecimalType;
  ownershipAfterSafes: EngineDecimalType;
}

const HOLDER_KEYS: ExistingHolderKey[] = ["founders", "grantedOptions", "unissuedPool"];

/**
 * Spec §7.2 / §8 test 6: once cap SAFEs are layered in, every existing
 * legacy holder (founders, granted options, unissued pool) is diluted pro
 * rata by `legacyOwnership` — each holder's share of the pre-SAFE cap table
 * shrinks by the same factor.
 */
export function allocateExistingCapitalization(
  existing: ExistingCapitalizationSimple,
  legacyOwnership: EngineDecimalType,
): AllocatedHolderRow[] {
  return HOLDER_KEYS.map((key) => ({
    key,
    ownershipBeforeSafes: existing[key],
    ownershipAfterSafes: existing[key].times(legacyOwnership),
  }));
}
