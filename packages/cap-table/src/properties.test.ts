import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { computeCapSafeOwnership, type CapSafeOwnershipInput } from "./capSafeOwnership.js";
import { EngineDecimal } from "./decimal.js";
import { UnsupportedCaseError } from "./errors.js";
import { canonicalizeCapSafeResult } from "./result.js";

/**
 * n basis-point parts (out of 10,000) that always sum to at most 9,999 —
 * i.e. total SAFE ownership is always strictly below 1 (100%) — using
 * integer cut points so the sum is exact, never a rounded approximation.
 */
function bpPartsArb(n: number): fc.Arbitrary<number[]> {
  if (n === 0) return fc.constant([]);
  return fc.array(fc.integer({ min: 0, max: 9999 }), { minLength: n, maxLength: n }).map((raw) => {
    const cuts = [...raw].sort((a, b) => a - b);
    const parts: number[] = [];
    let previous = 0;
    for (const cut of cuts) {
      parts.push(cut - previous);
      previous = cut;
    }
    return parts;
  });
}

const nonBlockingSafesArb: fc.Arbitrary<CapSafeOwnershipInput[]> = fc
  .integer({ min: 0, max: 4 })
  .chain((n) => bpPartsArb(n))
  .map((parts) =>
    parts.map((part, index): CapSafeOwnershipInput => ({
      id: `safe-${index}`,
      purchaseAmount: new EngineDecimal(part),
      valuationCap: new EngineDecimal(10_000),
    })),
  );

describe("property: nonnegativity", () => {
  it("every ownership row, the total, and legacy ownership are all >= 0", () => {
    fc.assert(
      fc.property(nonBlockingSafesArb, (safes) => {
        const result = computeCapSafeOwnership(safes);
        for (const row of result.rows) {
          expect(row.ownership.gte(0)).toBe(true);
        }
        expect(result.totalSafeOwnership.gte(0)).toBe(true);
        expect(result.legacyOwnership.gte(0)).toBe(true);
      }),
    );
  });
});

describe("property: ownership reconciliation (spec §8 test 14)", () => {
  it("totalSafeOwnership + legacyOwnership always equals exactly 1", () => {
    fc.assert(
      fc.property(nonBlockingSafesArb, (safes) => {
        const result = computeCapSafeOwnership(safes);
        expect(result.totalSafeOwnership.plus(result.legacyOwnership).eq(1)).toBe(true);
      }),
    );
  });
});

describe("property: idempotency", () => {
  it("running the engine twice on the same input yields a byte-identical canonical result", () => {
    fc.assert(
      fc.property(nonBlockingSafesArb, (safes) => {
        const first = canonicalizeCapSafeResult(computeCapSafeOwnership(safes));
        const second = canonicalizeCapSafeResult(computeCapSafeOwnership(safes));
        expect(first).toBe(second);
      }),
    );
  });
});

describe("property: unsupported-case blocking (spec §8 test 12)", () => {
  it("total indicative SAFE ownership at or above 100% always throws, never returns a value", () => {
    const blockingSafesArb: fc.Arbitrary<CapSafeOwnershipInput[]> = fc
      .integer({ min: 1, max: 4 })
      .map((n) =>
        Array.from({ length: n }, (_, index) => ({
          id: `safe-${index}`,
          // amount === cap for every SAFE: each contributes exactly 100% /
          // n on its own is not the point — n of them summed is always
          // >= 1 for any n >= 1, since each individual ratio is exactly 1.
          purchaseAmount: new EngineDecimal(1),
          valuationCap: new EngineDecimal(1),
        })),
      );

    fc.assert(
      fc.property(blockingSafesArb, (safes) => {
        expect(() => computeCapSafeOwnership(safes)).toThrow(UnsupportedCaseError);
      }),
    );
  });
});

describe("property: monotonicity where valid", () => {
  it("increasing a SAFE's purchase amount (cap fixed) never decreases its ownership", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 4000 }),
        fc.integer({ min: 1, max: 4000 }),
        (base, delta) => {
          const cap = new EngineDecimal(10_000);
          const before = computeCapSafeOwnership([
            { id: "a", purchaseAmount: new EngineDecimal(base), valuationCap: cap },
          ]);
          const after = computeCapSafeOwnership([
            { id: "a", purchaseAmount: new EngineDecimal(base + delta), valuationCap: cap },
          ]);
          expect(after.rows[0]!.ownership.gt(before.rows[0]!.ownership)).toBe(true);
        },
      ),
    );
  });
});
