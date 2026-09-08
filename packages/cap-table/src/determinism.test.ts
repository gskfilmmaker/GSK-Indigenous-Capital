import { describe, expect, it } from "vitest";
import { computeCapSafeOwnership } from "./capSafeOwnership.js";
import { EngineDecimal } from "./decimal.js";
import { canonicalizeCapSafeResult, hashCapSafeResult } from "./result.js";

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
