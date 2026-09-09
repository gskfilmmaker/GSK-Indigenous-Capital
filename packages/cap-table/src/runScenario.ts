import type { Scenario } from "@gsk/domain";
import { EngineDecimal, type EngineDecimalType } from "./decimal.js";
import { computeCapSafeOwnership } from "./capSafeOwnership.js";
import {
  allocateExistingCapitalization,
  type AllocatedHolderRow,
  type ExistingHolderKey,
} from "./existingCapitalization.js";

/**
 * This package's calculation-behavior version (root CLAUDE.md invariant:
 * every mutation/artifact records the engine version that produced it;
 * this package's own CLAUDE.md: "a scenario snapshot always records the
 * engine version that produced it... changing calculation behaviour
 * requires a new engine version"). Deliberately independent of this
 * package's npm `version` field in package.json, which tracks packaging,
 * not calculation behavior — bump this only when a calculation rule
 * actually changes, never for routine dependency/tooling updates.
 */
export const ENGINE_VERSION = "1";

export type SafeRowResult =
  | {
      id: string;
      instrumentType: "post_money_cap";
      /** Always true for a cap SAFE — indicative ownership is determinable pre-round (spec §7.2). */
      determinable: true;
      ownership: EngineDecimalType;
    }
  | {
      id: string;
      instrumentType: "discount_only" | "mfn";
      /**
       * Always false: a discount-only SAFE's conversion depends on a future
       * priced round's price (spec §7.6), and an MFN's on that round's
       * eligible terms (spec §7.7) — neither is modelled before one exists.
       * This is a typed result, never a silently-wrong number.
       */
      determinable: false;
    };

export interface ScenarioRunResult {
  engineVersion: string;
  schemaVersion: number;
  /** Founders/granted-options/unissued-pool, before and after cap-SAFE dilution (spec §8 test 6). */
  existingCapitalizationRows: AllocatedHolderRow[];
  /** One row per SAFE, in the scenario's original order (spec §8 test 13's stable tie-break). */
  safeRows: SafeRowResult[];
  /** Sum of only the determinable (post_money_cap) rows' ownership. */
  totalCapSafeOwnership: EngineDecimalType;
  /** `1 - totalCapSafeOwnership` — what dilutes the existing capitalization rows above. */
  legacyOwnership: EngineDecimalType;
}

/**
 * Runs a fully validated (`@gsk/domain`'s `parseScenario`/`scenarioSchema`)
 * scenario through this package's pure calculation functions and returns a
 * single UI-ready result. This is the one place that orchestrates across
 * `computeCapSafeOwnership` and `allocateExistingCapitalization` for a full
 * scenario — everything below it stays pure and composable on its own.
 *
 * Scope (this project's Step 4): only `post_money_cap` SAFEs have
 * determinable ownership before a priced round; `discount_only` and `mfn`
 * rows come back with `determinable: false` rather than an approximated
 * number (spec §7.6, §7.7; root CLAUDE.md invariant 9). Throws
 * `UnsupportedCaseError` (never a silent approximation) for anything this
 * package's CLAUDE.md lists as unsupported, including cap SAFEs that sell
 * the entire company or more (spec §8 test 12).
 *
 * Callers are responsible for validating the input `Scenario` first (e.g.
 * via `parseScenario`) — this function trusts the shape it's given and
 * does not re-run schema-level checks like duplicate ids across all SAFEs
 * or multiple MFN instruments, which are schema, not engine, concerns.
 */
export function runScenario(scenario: Scenario): ScenarioRunResult {
  const capSafes = scenario.safes.filter((safe) => safe.instrumentType === "post_money_cap");

  const {
    rows: capRows,
    totalSafeOwnership,
    legacyOwnership,
  } = computeCapSafeOwnership(
    capSafes.map((safe) => ({
      id: safe.id,
      purchaseAmount: new EngineDecimal(safe.purchaseAmount.amount),
      valuationCap: new EngineDecimal(safe.valuationCap.amount),
    })),
  );

  const existingCapitalizationRows = allocateExistingCapitalization(
    {
      founders: new EngineDecimal(scenario.existingCapitalization.founders),
      grantedOptions: new EngineDecimal(scenario.existingCapitalization.grantedOptions),
      unissuedPool: new EngineDecimal(scenario.existingCapitalization.unissuedPool),
    },
    legacyOwnership,
  );

  const capOwnershipById = new Map(capRows.map((row) => [row.id, row.ownership]));

  const safeRows: SafeRowResult[] = scenario.safes.map((safe) =>
    safe.instrumentType === "post_money_cap"
      ? {
          id: safe.id,
          instrumentType: safe.instrumentType,
          determinable: true,
          // capOwnershipById is guaranteed to have this id: capRows is
          // computed from exactly the post_money_cap subset of scenario.safes.
          ownership: capOwnershipById.get(safe.id) as EngineDecimalType,
        }
      : { id: safe.id, instrumentType: safe.instrumentType, determinable: false },
  );

  return {
    engineVersion: ENGINE_VERSION,
    schemaVersion: scenario.schemaVersion,
    existingCapitalizationRows,
    safeRows,
    totalCapSafeOwnership: totalSafeOwnership,
    legacyOwnership,
  };
}

export interface SerializableScenarioRunResult {
  engineVersion: string;
  schemaVersion: number;
  existingCapitalizationRows: {
    key: ExistingHolderKey;
    ownershipBeforeSafes: string;
    ownershipAfterSafes: string;
  }[];
  safeRows: (
    | { id: string; instrumentType: "post_money_cap"; determinable: true; ownership: string }
    | { id: string; instrumentType: "discount_only" | "mfn"; determinable: false }
  )[];
  totalCapSafeOwnership: string;
  legacyOwnership: string;
}

/**
 * Converts a `ScenarioRunResult` (built from `Decimal` instances) into a
 * JSON-safe, canonically-hashable shape — the same
 * Decimal-to-string-then-canonicalize-elsewhere split `result.ts`'s
 * `serializeCapSafeResult` uses, extended to the full scenario result
 * (existing-capitalization rows and per-SAFE determinable/ownership
 * union included, not just the cap-SAFE subset). This is what gets
 * persisted as `scenario_runs.output` and hashed for `output_hash`
 * (root CLAUDE.md invariant 3: the persisted record, not a recomputable
 * approximation of it).
 */
export function serializeScenarioRunResult(
  result: ScenarioRunResult,
): SerializableScenarioRunResult {
  return {
    engineVersion: result.engineVersion,
    schemaVersion: result.schemaVersion,
    existingCapitalizationRows: result.existingCapitalizationRows.map((row) => ({
      key: row.key,
      ownershipBeforeSafes: row.ownershipBeforeSafes.toString(),
      ownershipAfterSafes: row.ownershipAfterSafes.toString(),
    })),
    safeRows: result.safeRows.map((row) =>
      row.determinable
        ? {
            id: row.id,
            instrumentType: row.instrumentType,
            determinable: true as const,
            ownership: row.ownership.toString(),
          }
        : { id: row.id, instrumentType: row.instrumentType, determinable: false as const },
    ),
    totalCapSafeOwnership: result.totalCapSafeOwnership.toString(),
    legacyOwnership: result.legacyOwnership.toString(),
  };
}
