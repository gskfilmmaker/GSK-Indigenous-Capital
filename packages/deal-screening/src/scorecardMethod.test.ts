import { describe, expect, it } from "vitest";
import { EngineDecimal } from "./decimal.js";
import { computeScorecardMethod, defaultScorecardWeights } from "./scorecardMethod.js";
import { UnsupportedCaseError } from "./errors.js";

describe("computeScorecardMethod", () => {
  it("matches the Ledger worked example: strong team and market, crowded competition", () => {
    const result = computeScorecardMethod({
      regionalMedianPreMoney: new EngineDecimal(4_000_000),
      ratings: {
        team: new EngineDecimal("1.25"),
        marketSize: new EngineDecimal("1.50"),
        product: new EngineDecimal("1.00"),
        competitiveEnvironment: new EngineDecimal("0.80"),
        salesChannels: new EngineDecimal("1.00"),
        needForFinancing: new EngineDecimal("1.00"),
        other: new EngineDecimal("1.00"),
      },
    });

    expect(result.weightedComparisonFactor.toString()).toBe("1.18");
    expect(result.adjustedPreMoneyValuation.toString()).toBe("4720000");
  });

  it("throws UnsupportedCaseError when custom weights do not sum to 1", () => {
    expect(() =>
      computeScorecardMethod({
        regionalMedianPreMoney: new EngineDecimal(4_000_000),
        ratings: {
          team: new EngineDecimal(1),
          marketSize: new EngineDecimal(1),
          product: new EngineDecimal(1),
          competitiveEnvironment: new EngineDecimal(1),
          salesChannels: new EngineDecimal(1),
          needForFinancing: new EngineDecimal(1),
          other: new EngineDecimal(1),
        },
        weights: { ...defaultScorecardWeights, team: new EngineDecimal("0.31") },
      }),
    ).toThrow(UnsupportedCaseError);
  });
});
