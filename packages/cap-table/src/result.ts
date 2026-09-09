import { canonicalHash, canonicalize } from "@gsk/audit";
import type { CapSafeOwnershipResult } from "./capSafeOwnership.js";
import { serializeScenarioRunResult, type ScenarioRunResult } from "./runScenario.js";

export interface SerializableCapSafeResult {
  rows: { id: string; ownership: string }[];
  totalSafeOwnership: string;
  legacyOwnership: string;
}

/**
 * Converts an engine result (built from `Decimal` instances) into a
 * JSON-safe, canonically-hashable shape. Row order is preserved from the
 * input/computation order — never resorted — so the hash also captures the
 * documented stable tie-break (spec §8 test 13), not just the value set.
 */
export function serializeCapSafeResult(result: CapSafeOwnershipResult): SerializableCapSafeResult {
  return {
    rows: result.rows.map((row) => ({ id: row.id, ownership: row.ownership.toString() })),
    totalSafeOwnership: result.totalSafeOwnership.toString(),
    legacyOwnership: result.legacyOwnership.toString(),
  };
}

/** Spec §8 test 15: identical canonical input yields a byte-equivalent hash. */
export function hashCapSafeResult(result: CapSafeOwnershipResult): string {
  return canonicalHash(serializeCapSafeResult(result));
}

export function canonicalizeCapSafeResult(result: CapSafeOwnershipResult): string {
  return canonicalize(serializeCapSafeResult(result));
}

/** Spec §8 test 15: identical canonical input yields a byte-equivalent hash. */
export function hashScenarioRunResult(result: ScenarioRunResult): string {
  return canonicalHash(serializeScenarioRunResult(result));
}

export function canonicalizeScenarioRunResult(result: ScenarioRunResult): string {
  return canonicalize(serializeScenarioRunResult(result));
}
