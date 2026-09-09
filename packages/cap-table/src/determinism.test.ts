import { parseScenario } from "@gsk/domain";
import { describe, expect, it } from "vitest";
import { computeCapSafeOwnership } from "./capSafeOwnership.js";
import { EngineDecimal } from "./decimal.js";
import {
  canonicalizeCapSafeResult,
  canonicalizeScenarioRunResult,
  hashCapSafeResult,
  hashScenarioRunResult,
} from "./result.js";
import { runScenario } from "./runScenario.js";

describe("determinism — spec §8 test 15", () => {
  it("identical canonical input yields a byte-equivalent canonical output and hash under the same engine version", () => {
    const input = [
      {
        id: "safe-1",
        purchaseAmount: new EngineDecimal(500_000),
        valuationCap: new EngineDecimal(5_000_000),
      },
      {
        id: "safe-2",
        purchaseAmount: new EngineDecimal(200_000),
        valuationCap: new EngineDecimal(4_000_000),
      },
    ];

    const resultA = computeCapSafeOwnership(input);
    const resultB = computeCapSafeOwnership(input);

    expect(canonicalizeCapSafeResult(resultA)).toBe(canonicalizeCapSafeResult(resultB));
    expect(hashCapSafeResult(resultA)).toBe(hashCapSafeResult(resultB));
  });

  it("a different input produces a different hash", () => {
    const resultA = computeCapSafeOwnership([
      {
        id: "safe-1",
        purchaseAmount: new EngineDecimal(500_000),
        valuationCap: new EngineDecimal(5_000_000),
      },
    ]);
    const resultB = computeCapSafeOwnership([
      {
        id: "safe-1",
        purchaseAmount: new EngineDecimal(600_000),
        valuationCap: new EngineDecimal(5_000_000),
      },
    ]);

    expect(hashCapSafeResult(resultA)).not.toBe(hashCapSafeResult(resultB));
  });
});

describe("determinism — full ScenarioRunResult (spec §8 test 15)", () => {
  const scenarioInput = {
    id: "018e5b3a-0000-7000-8000-000000000001",
    schemaVersion: 1 as const,
    currency: "CAD" as const,
    existingCapitalization: { founders: "0.90", grantedOptions: "0.08", unissuedPool: "0.02" },
    safes: [
      {
        id: "018e5b3a-0000-7000-8000-000000000002",
        sequence: 0,
        instrumentType: "post_money_cap" as const,
        purchaseAmount: { amount: "500000", currency: "CAD" as const },
        valuationCap: { amount: "5000000", currency: "CAD" as const },
      },
    ],
  };

  it("identical scenario input yields a byte-equivalent canonical output and hash", () => {
    const parsed = parseScenario(scenarioInput);
    if (!parsed.success) throw new Error("fixture must be valid");

    const resultA = runScenario(parsed.data);
    const resultB = runScenario(parsed.data);

    expect(canonicalizeScenarioRunResult(resultA)).toBe(canonicalizeScenarioRunResult(resultB));
    expect(hashScenarioRunResult(resultA)).toBe(hashScenarioRunResult(resultB));
  });

  it("a different scenario input produces a different hash", () => {
    const parsedA = parseScenario(scenarioInput);
    const parsedB = parseScenario({
      ...scenarioInput,
      safes: [{ ...scenarioInput.safes[0], purchaseAmount: { amount: "600000", currency: "CAD" } }],
    });
    if (!parsedA.success || !parsedB.success) throw new Error("fixtures must be valid");

    expect(hashScenarioRunResult(runScenario(parsedA.data))).not.toBe(
      hashScenarioRunResult(runScenario(parsedB.data)),
    );
  });
});
