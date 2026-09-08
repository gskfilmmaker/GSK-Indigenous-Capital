import { canonicalHash, canonicalize } from "@gsk/audit";
import type { Scenario } from "./scenario.js";

/**
 * Scenario values are already JSON-safe decimal strings (never `Decimal`
 * instances or JS numbers for financial fields — see ./decimal.ts), so
 * canonicalization is a direct pass-through to the shared canonical
 * serializer. Identical scenarios canonicalize and hash identically
 * regardless of property insertion order (spec §8 test 15).
 */
export function canonicalizeScenario(scenario: Scenario): string {
  return canonicalize(scenario);
}

export function hashScenario(scenario: Scenario): string {
  return canonicalHash(scenario);
}
