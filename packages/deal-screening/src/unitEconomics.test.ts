import { describe, expect, it } from "vitest";
import { EngineDecimal } from "./decimal.js";
import { computeRuleOf40, computeUnitEconomics } from "./unitEconomics.js";
import { UnsupportedCaseError } from "./errors.js";

describe("computeRuleOf40", () => {
  it("clears the bar when growth plus margin is at least 40", () => {
    const result = computeRuleOf40({
      annualGrowthRate: new EngineDecimal("0.65"),
      profitMargin: new EngineDecimal("-0.15"),
    });
    expect(result.score.toString()).toBe("0.5");
    expect(result.meetsBar).toBe(true);
  });

  it("misses the bar when the combined score is below 40", () => {
    const result = computeRuleOf40({
      annualGrowthRate: new EngineDecimal("0.20"),
      profitMargin: new EngineDecimal("0.05"),
    });
    expect(result.meetsBar).toBe(false);
  });
});

describe("computeUnitEconomics", () => {
  it("computes LTV, LTV:CAC ratio, and CAC payback from monthly inputs", () => {
    const result = computeUnitEconomics({
      monthlyRevenuePerCustomer: new EngineDecimal(1000),
      grossMargin: new EngineDecimal("0.80"),
      monthlyChurnRate: new EngineDecimal("0.02"),
      customerAcquisitionCost: new EngineDecimal(8000),
    });

    expect(result.monthlyGrossProfitPerCustomer.toString()).toBe("800");
    expect(result.lifetimeValue.toString()).toBe("40000");
    expect(result.ltvToCacRatio.toString()).toBe("5");
    expect(result.meetsLtvCacFloor).toBe(true);
    expect(result.cacPaybackMonths.toString()).toBe("10");
  });

  it("throws UnsupportedCaseError for zero monthly churn (undefined lifetime)", () => {
    expect(() =>
      computeUnitEconomics({
        monthlyRevenuePerCustomer: new EngineDecimal(1000),
        grossMargin: new EngineDecimal("0.80"),
        monthlyChurnRate: new EngineDecimal(0),
        customerAcquisitionCost: new EngineDecimal(8000),
      }),
    ).toThrow(UnsupportedCaseError);
  });
});
