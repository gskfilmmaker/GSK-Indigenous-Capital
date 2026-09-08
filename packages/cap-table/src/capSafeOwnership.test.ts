import { describe, expect, it } from "vitest";
import { computeCapSafeOwnership, type CapSafeOwnershipInput } from "./capSafeOwnership.js";
import { EngineDecimal } from "./decimal.js";
import { UnsupportedCaseError } from "./errors.js";

function safe(
  id: string,
  purchaseAmount: number | string,
  valuationCap: number | string,
): CapSafeOwnershipInput {
  return {
    id,
    purchaseAmount: new EngineDecimal(purchaseAmount),
    valuationCap: new EngineDecimal(valuationCap),
  };
}

describe("computeCapSafeOwnership — spec §8 golden tests", () => {
  it("test 1: single cap — 500,000 at 5,000,000 = SAFE 10%, legacy 90%", () => {
    const result = computeCapSafeOwnership([safe("a", 500_000, 5_000_000)]);
    expect(result.rows[0]?.ownership.toString()).toBe("0.1");
    expect(result.totalSafeOwnership.toString()).toBe("0.1");
    expect(result.legacyOwnership.toString()).toBe("0.9");
  });

  it("test 2: mixed caps — 200,000/4,000,000 + 800,000/8,000,000 = 5% + 10% = 15%, legacy 85%", () => {
    const result = computeCapSafeOwnership([
      safe("a", 200_000, 4_000_000),
      safe("b", 800_000, 8_000_000),
    ]);
    expect(result.rows[0]?.ownership.toString()).toBe("0.05");
    expect(result.rows[1]?.ownership.toString()).toBe("0.1");
    expect(result.totalSafeOwnership.toString()).toBe("0.15");
    expect(result.legacyOwnership.toString()).toBe("0.85");
  });

  it("test 3: five SAFEs — five x 100,000 at 5,000,000 = 10% total", () => {
    const safes = Array.from({ length: 5 }, (_, i) => safe(`safe-${i}`, 100_000, 5_000_000));
    const result = computeCapSafeOwnership(safes);
    for (const row of result.rows) {
      expect(row.ownership.toString()).toBe("0.02");
    }
    expect(result.totalSafeOwnership.toString()).toBe("0.1");
    expect(result.legacyOwnership.toString()).toBe("0.9");
  });

  it("test 4: source video — 1,200,000/8,000,000 = 15%; 100,000/20,000,000 = 0.5%; total 15.5%", () => {
    const result = computeCapSafeOwnership([
      safe("a", 1_200_000, 8_000_000),
      safe("b", 100_000, 20_000_000),
    ]);
    expect(result.rows[0]?.ownership.toString()).toBe("0.15");
    expect(result.rows[1]?.ownership.toString()).toBe("0.005");
    expect(result.totalSafeOwnership.toString()).toBe("0.155");
    expect(result.legacyOwnership.toString()).toBe("0.845");
  });

  describe("test 5: HYDRIX comparison — CAD 250,000 at four caps", () => {
    it("250,000 / 2,500,000 = 10%", () => {
      const result = computeCapSafeOwnership([safe("a", 250_000, 2_500_000)]);
      expect(result.rows[0]?.ownership.toString()).toBe("0.1");
    });

    it("250,000 / 2,000,000 = 12.5%", () => {
      const result = computeCapSafeOwnership([safe("a", 250_000, 2_000_000)]);
      expect(result.rows[0]?.ownership.toString()).toBe("0.125");
    });

    it("250,000 / 1,250,000 = 20%", () => {
      const result = computeCapSafeOwnership([safe("a", 250_000, 1_250_000)]);
      expect(result.rows[0]?.ownership.toString()).toBe("0.2");
    });

    it("250,000 / 1,666,666.666... (= 5,000,000/3) = 15%, to full engine precision", () => {
      // The cap itself is a repeating decimal (5,000,000/3). We construct it
      // as an exact division so the 50-significant-digit engine context
      // (docs/adr/0001-numeric-arithmetic-library.md) carries full
      // precision through both divisions, rather than testing against a
      // pre-rounded decimal-string cap (a real caller entering this cap as
      // text would round it, which is a display/input-precision policy
      // question this test does not decide).
      const cap = new EngineDecimal(5_000_000).div(3);
      const result = computeCapSafeOwnership([safe("a", 250_000, cap.toString())]);
      const ownership = result.rows[0]!.ownership;
      expect(ownership.toDecimalPlaces(2).toString()).toBe("0.15");
      expect(ownership.minus("0.15").abs().lt("1e-40")).toBe(true);
    });
  });

  it('test 12: exactly 100% total SAFE ownership blocks ("sells the whole company")', () => {
    expect(() => computeCapSafeOwnership([safe("a", 5_000_000, 5_000_000)])).toThrow(
      UnsupportedCaseError,
    );
  });

  it("test 12: above 100% total SAFE ownership blocks and never displays negative legacy ownership", () => {
    expect(() => computeCapSafeOwnership([safe("a", 6_000_000, 5_000_000)])).toThrow(
      UnsupportedCaseError,
    );
  });

  it("test 13: tie handling — equal routes show economic equivalence in stable input order", () => {
    const result = computeCapSafeOwnership([
      safe("later-but-first-in-input", 200_000, 2_000_000), // 10%
      safe("earlier-but-second-in-input", 100_000, 1_000_000), // 10%
    ]);
    expect(result.rows[0]?.id).toBe("later-but-first-in-input");
    expect(result.rows[1]?.id).toBe("earlier-but-second-in-input");
    expect(result.rows[0]?.ownership.eq(result.rows[1]!.ownership)).toBe(true);
    expect(result.rows[0]?.ownership.toString()).toBe("0.1");
  });

  it("rejects a duplicate SAFE id", () => {
    expect(() =>
      computeCapSafeOwnership([safe("dup", 100_000, 1_000_000), safe("dup", 200_000, 2_000_000)]),
    ).toThrow(UnsupportedCaseError);
  });
});
