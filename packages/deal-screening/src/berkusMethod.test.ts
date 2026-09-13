import { describe, expect, it } from "vitest";
import { computeBerkusMethod } from "./berkusMethod.js";
import { EngineDecimal } from "./decimal.js";
import { UnsupportedCaseError } from "./errors.js";

describe("computeBerkusMethod", () => {
  it("matches the Ledger worked example: MVP, two LOIs, strong team, no paying customers yet", () => {
    const result = computeBerkusMethod({
      soundIdea: new EngineDecimal(400_000),
      workingPrototype: new EngineDecimal(400_000),
      qualityManagementTeam: new EngineDecimal(450_000),
      strategicRelationships: new EngineDecimal(300_000),
      productRolloutOrSales: new EngineDecimal(0),
    });

    expect(result.preMoneyValuation.toString()).toBe("1550000");
    expect(result.ceiling.toString()).toBe("2500000");
  });

  it("throws UnsupportedCaseError when a factor exceeds the $500K ceiling", () => {
    expect(() =>
      computeBerkusMethod({
        soundIdea: new EngineDecimal(500_001),
        workingPrototype: new EngineDecimal(0),
        qualityManagementTeam: new EngineDecimal(0),
        strategicRelationships: new EngineDecimal(0),
        productRolloutOrSales: new EngineDecimal(0),
      }),
    ).toThrow(UnsupportedCaseError);
  });
});
