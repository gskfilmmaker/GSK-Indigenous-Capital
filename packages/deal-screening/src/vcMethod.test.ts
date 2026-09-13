import { describe, expect, it } from "vitest";
import { EngineDecimal } from "./decimal.js";
import { computeFundReturnCheck, computeVcMethod } from "./vcMethod.js";
import { UnsupportedCaseError } from "./errors.js";

describe("computeVcMethod", () => {
  it("discounts an exit value by the target return to find post-money, pre-money, and ownership", () => {
    const result = computeVcMethod({
      exitValue: new EngineDecimal(90_000_000),
      yearsToExit: new EngineDecimal(2),
      targetAnnualReturn: new EngineDecimal("0.50"),
      investment: new EngineDecimal(4_000_000),
    });

    expect(result.impliedMultiple.toString()).toBe("2.25");
    expect(result.postMoneyValuation.toString()).toBe("40000000");
    expect(result.preMoneyValuation.toString()).toBe("36000000");
    expect(result.investorOwnership.toString()).toBe("0.1");
  });

  it("throws UnsupportedCaseError for a non-positive investment", () => {
    expect(() =>
      computeVcMethod({
        exitValue: new EngineDecimal(90_000_000),
        yearsToExit: new EngineDecimal(2),
        targetAnnualReturn: new EngineDecimal("0.50"),
        investment: new EngineDecimal(0),
      }),
    ).toThrow(UnsupportedCaseError);
  });

  it("throws UnsupportedCaseError for a non-positive exit value", () => {
    expect(() =>
      computeVcMethod({
        exitValue: new EngineDecimal(-1),
        yearsToExit: new EngineDecimal(2),
        targetAnnualReturn: new EngineDecimal("0.50"),
        investment: new EngineDecimal(1),
      }),
    ).toThrow(UnsupportedCaseError);
  });
});

describe("computeFundReturnCheck", () => {
  it("computes the multiple a single check would need to return the whole fund", () => {
    const result = computeFundReturnCheck({
      investment: new EngineDecimal(2_000_000),
      fundSize: new EngineDecimal(100_000_000),
    });
    expect(result.requiredMultipleToReturnFund.toString()).toBe("50");
  });

  it("throws UnsupportedCaseError for a non-positive investment", () => {
    expect(() =>
      computeFundReturnCheck({
        investment: new EngineDecimal(0),
        fundSize: new EngineDecimal(100_000_000),
      }),
    ).toThrow(UnsupportedCaseError);
  });
});
