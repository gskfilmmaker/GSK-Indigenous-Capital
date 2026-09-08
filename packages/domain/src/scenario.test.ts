import { Decimal } from "decimal.js";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { canonicalizeScenario, hashScenario } from "./canonical.js";
import { newSafeId, newScenarioId } from "./ids.js";
import { existingCapitalizationSimpleSchema, parseScenario, type Scenario } from "./scenario.js";

describe("existingCapitalizationSimpleSchema", () => {
  it("accepts percentages that sum to exactly 1", () => {
    const result = existingCapitalizationSimpleSchema.safeParse({
      founders: "0.90",
      grantedOptions: "0.08",
      unissuedPool: "0.02",
    });
    expect(result.success).toBe(true);
  });

  it("rejects percentages that do not sum to 1", () => {
    const result = existingCapitalizationSimpleSchema.safeParse({
      founders: "0.90",
      grantedOptions: "0.08",
      unissuedPool: "0.01",
    });
    expect(result.success).toBe(false);
  });
});

function validScenario(overrides: Partial<Scenario> = {}): Scenario {
  const base: Scenario = {
    id: newScenarioId(),
    schemaVersion: 1,
    currency: "CAD",
    existingCapitalization: {
      founders: "0.90",
      grantedOptions: "0.08",
      unissuedPool: "0.02",
    },
    safes: [
      {
        id: newSafeId(),
        sequence: 0,
        instrumentType: "post_money_cap",
        purchaseAmount: { amount: "500000", currency: "CAD" },
        valuationCap: { amount: "5000000", currency: "CAD" },
      },
    ],
  };
  return { ...base, ...overrides };
}

describe("scenarioSchema", () => {
  it("accepts a well-formed cap-SAFE scenario", () => {
    expect(parseScenario(validScenario()).success).toBe(true);
  });

  it("rejects a scenario with a duplicate SAFE id", () => {
    const dupId = newSafeId();
    const scenario = validScenario({
      safes: [
        {
          id: dupId,
          sequence: 0,
          instrumentType: "post_money_cap",
          purchaseAmount: { amount: "500000", currency: "CAD" },
          valuationCap: { amount: "5000000", currency: "CAD" },
        },
        {
          id: dupId,
          sequence: 1,
          instrumentType: "post_money_cap",
          purchaseAmount: { amount: "100000", currency: "CAD" },
          valuationCap: { amount: "2000000", currency: "CAD" },
        },
      ],
    });
    expect(parseScenario(scenario).success).toBe(false);
  });

  it("rejects a scenario with a duplicate SAFE sequence number", () => {
    const scenario = validScenario({
      safes: [
        {
          id: newSafeId(),
          sequence: 0,
          instrumentType: "post_money_cap",
          purchaseAmount: { amount: "500000", currency: "CAD" },
          valuationCap: { amount: "5000000", currency: "CAD" },
        },
        {
          id: newSafeId(),
          sequence: 0,
          instrumentType: "post_money_cap",
          purchaseAmount: { amount: "100000", currency: "CAD" },
          valuationCap: { amount: "2000000", currency: "CAD" },
        },
      ],
    });
    expect(parseScenario(scenario).success).toBe(false);
  });

  it("rejects a scenario with more than one MFN instrument (unsupported complex MFN chain, spec §7.7/§7.9)", () => {
    const scenario = validScenario({
      safes: [
        {
          id: newSafeId(),
          sequence: 0,
          instrumentType: "mfn",
          purchaseAmount: { amount: "100000", currency: "CAD" },
        },
        {
          id: newSafeId(),
          sequence: 1,
          instrumentType: "mfn",
          purchaseAmount: { amount: "200000", currency: "CAD" },
        },
      ],
    });
    expect(parseScenario(scenario).success).toBe(false);
  });

  it("accepts exactly one MFN instrument", () => {
    const scenario = validScenario({
      safes: [
        {
          id: newSafeId(),
          sequence: 0,
          instrumentType: "mfn",
          purchaseAmount: { amount: "100000", currency: "CAD" },
        },
      ],
    });
    expect(parseScenario(scenario).success).toBe(true);
  });
});

describe("canonical scenario hashing (spec §8 test 15: determinism)", () => {
  it("is stable regardless of property insertion order and identical across repeated calls", () => {
    const scenario = validScenario();
    const reordered: Scenario = {
      currency: scenario.currency,
      id: scenario.id,
      safes: scenario.safes,
      existingCapitalization: scenario.existingCapitalization,
      schemaVersion: scenario.schemaVersion,
    };
    expect(canonicalizeScenario(scenario)).toBe(canonicalizeScenario(reordered));
    expect(hashScenario(scenario)).toBe(hashScenario(reordered));
    expect(hashScenario(scenario)).toBe(hashScenario(scenario));
  });

  it("differs when a value differs", () => {
    const a = validScenario();
    const b = validScenario({ id: newScenarioId() });
    expect(hashScenario(a)).not.toBe(hashScenario(b));
  });
});

// Property test: percentages that always sum to exactly 1 (basis-points
// split, so the Decimal sum is exact — no floating point involved).
const percentTripleArb = fc
  .tuple(fc.integer({ min: 0, max: 10000 }), fc.integer({ min: 0, max: 10000 }))
  .map(([x, y]): [number, number] => (x <= y ? [x, y] : [y, x]))
  .map(([a, b]): [string, string, string] => {
    const parts = [a, b - a, 10000 - b];
    return parts.map((p) => new Decimal(p).div(10000).toFixed(4)) as [string, string, string];
  });

const capSafeArb = fc.record({
  id: fc.constant(null).map(() => newSafeId()),
  sequence: fc.integer({ min: 0, max: 1000 }),
  instrumentType: fc.constant("post_money_cap" as const),
  purchaseAmount: fc
    .integer({ min: 1, max: 10_000_000 })
    .map((n) => ({ amount: String(n), currency: "CAD" as const })),
  valuationCap: fc
    .integer({ min: 1, max: 100_000_000 })
    .map((n) => ({ amount: String(n), currency: "CAD" as const })),
});

const scenarioArb: fc.Arbitrary<Scenario> = fc
  .record({
    percents: percentTripleArb,
    safes: fc.uniqueArray(capSafeArb, { selector: (s) => s.sequence, maxLength: 4 }),
  })
  .map(({ percents, safes }) => ({
    id: newScenarioId(),
    schemaVersion: 1 as const,
    currency: "CAD" as const,
    existingCapitalization: {
      founders: percents[0],
      grantedOptions: percents[1],
      unissuedPool: percents[2],
    },
    safes,
  }));

describe("property: serialization round-trip", () => {
  it("parseScenario(canonical JSON of a valid scenario) reproduces an equal scenario", () => {
    fc.assert(
      fc.property(scenarioArb, (scenario) => {
        const roundTripped: unknown = JSON.parse(canonicalizeScenario(scenario));
        const result = parseScenario(roundTripped);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(scenario);
        }
      }),
    );
  });

  it("hashing is idempotent: repeated calls on the same scenario never drift", () => {
    fc.assert(
      fc.property(scenarioArb, (scenario) => {
        expect(hashScenario(scenario)).toBe(hashScenario(scenario));
      }),
    );
  });
});
