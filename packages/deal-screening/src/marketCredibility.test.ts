import { describe, expect, it } from "vitest";
import { EngineDecimal } from "./decimal.js";
import { computeMarketCredibility } from "./marketCredibility.js";
import { UnsupportedCaseError } from "./errors.js";

describe("computeMarketCredibility", () => {
  it("matches the Ledger worked example: bottom-up and top-down disagree by ~73%", () => {
    const result = computeMarketCredibility({
      annualContractValue: new EngineDecimal(12_000),
      reachableCustomers: new EngineDecimal(2_500),
      totalAddressableMarket: new EngineDecimal(8_000_000_000),
      serviceableShare: new EngineDecimal("0.02"),
      nearTermCaptureRate: new EngineDecimal("0.05"),
    });

    expect(result.bottomUpEstimate.toString()).toBe("30000000");
    expect(result.topDownEstimate.toString()).toBe("8000000");
    expect(result.gapPercent.toDecimalPlaces(1).toString()).toBe("73.3");
    expect(result.withinCredibleTolerance).toBe(false);
  });

  it("is within tolerance when the two estimates are close", () => {
    const result = computeMarketCredibility({
      annualContractValue: new EngineDecimal(10_000),
      reachableCustomers: new EngineDecimal(1_000),
      totalAddressableMarket: new EngineDecimal(1_000_000_000),
      serviceableShare: new EngineDecimal("0.02"),
      nearTermCaptureRate: new EngineDecimal("0.50"),
    });
    // bottom-up = 10,000,000; top-down = 1,000,000,000 * 0.02 * 0.50 = 10,000,000
    expect(result.gapPercent.toString()).toBe("0");
    expect(result.withinCredibleTolerance).toBe(true);
  });

  it("throws UnsupportedCaseError when both estimates are zero", () => {
    expect(() =>
      computeMarketCredibility({
        annualContractValue: new EngineDecimal(0),
        reachableCustomers: new EngineDecimal(0),
        totalAddressableMarket: new EngineDecimal(0),
        serviceableShare: new EngineDecimal(0),
        nearTermCaptureRate: new EngineDecimal(0),
      }),
    ).toThrow(UnsupportedCaseError);
  });
});
