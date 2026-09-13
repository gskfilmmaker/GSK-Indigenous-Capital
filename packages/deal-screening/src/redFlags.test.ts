import { describe, expect, it } from "vitest";
import { EngineDecimal } from "./decimal.js";
import { evaluateRedFlags } from "./redFlags.js";

describe("evaluateRedFlags", () => {
  it("returns no flags when nothing concerning is supplied", () => {
    expect(evaluateRedFlags({})).toEqual([]);
  });

  it("flags an even cap table split with no vesting left", () => {
    const flags = evaluateRedFlags({ capTableEvenSplitFullyVested: true });
    expect(flags.map((f) => f.code)).toContain("cap_table_even_split_fully_vested");
  });

  it("flags monthly churn above 5%, not at or below it", () => {
    expect(
      evaluateRedFlags({ monthlyChurnRate: new EngineDecimal("0.06") }).map((f) => f.code),
    ).toContain("monthly_churn_above_five_percent");
    expect(
      evaluateRedFlags({ monthlyChurnRate: new EngineDecimal("0.05") }).map((f) => f.code),
    ).not.toContain("monthly_churn_above_five_percent");
  });

  it("flags undisclosed cohort retention", () => {
    const flags = evaluateRedFlags({ cohortRetentionDisclosed: false });
    expect(flags.map((f) => f.code)).toContain("cohort_deterioration_undisclosed");
  });

  it("flags an unreconciled market-sizing gap past 20%", () => {
    const flags = evaluateRedFlags({ marketSizingGapPercent: new EngineDecimal("73.3") });
    expect(flags.map((f) => f.code)).toContain("market_sizing_gap_unreconciled");
  });

  it("flags an LTV:CAC ratio below the 3:1 floor", () => {
    const flags = evaluateRedFlags({ ltvToCacRatio: new EngineDecimal("2.5") });
    expect(flags.map((f) => f.code)).toContain("ltv_cac_below_floor");
  });

  it("can return multiple flags at once, each independently evidenced", () => {
    const flags = evaluateRedFlags({
      capTableEvenSplitFullyVested: true,
      monthlyChurnRate: new EngineDecimal("0.08"),
    });
    expect(flags).toHaveLength(2);
  });
});
