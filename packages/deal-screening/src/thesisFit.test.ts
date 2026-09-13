import { describe, expect, it } from "vitest";
import { EngineDecimal } from "./decimal.js";
import { evaluateThesisFit, type ThesisCriterion } from "./thesisFit.js";
import { UnsupportedCaseError } from "./errors.js";

describe("evaluateThesisFit", () => {
  const criteria: ThesisCriterion[] = [
    {
      metric: "ltvToCacRatio",
      label: "LTV:CAC ratio",
      comparator: "gte",
      threshold: new EngineDecimal(3),
    },
    {
      metric: "cacPaybackMonths",
      label: "CAC payback period",
      comparator: "lte",
      threshold: new EngineDecimal(18),
    },
  ];

  it("reports each criterion independently, never a combined verdict", () => {
    const rows = evaluateThesisFit(criteria, {
      ltvToCacRatio: new EngineDecimal(5),
      cacPaybackMonths: new EngineDecimal(24),
    });

    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.metric === "ltvToCacRatio")?.meetsThreshold).toBe(true);
    expect(rows.find((r) => r.metric === "cacPaybackMonths")?.meetsThreshold).toBe(false);
    // No row, and no return value from this function, carries a combined field.
    for (const row of rows) {
      expect(Object.keys(row)).not.toContain("overall");
      expect(Object.keys(row)).not.toContain("score");
      expect(Object.keys(row)).not.toContain("verdict");
    }
  });

  it("throws UnsupportedCaseError when a referenced metric has no supplied value", () => {
    expect(() => evaluateThesisFit(criteria, { ltvToCacRatio: new EngineDecimal(5) })).toThrow(
      UnsupportedCaseError,
    );
  });
});
