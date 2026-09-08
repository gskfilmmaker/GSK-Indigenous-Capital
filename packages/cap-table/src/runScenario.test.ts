import { parseScenario } from "@gsk/domain";
import { describe, expect, it } from "vitest";
import { UnsupportedCaseError } from "./errors.js";
import { runScenario } from "./runScenario.js";

function validScenario(overrides: Record<string, unknown> = {}) {
  return {
    id: "018e5b3a-0000-7000-8000-000000000001",
    schemaVersion: 1,
    currency: "CAD",
    existingCapitalization: {
      founders: "0.90",
      grantedOptions: "0.08",
      unissuedPool: "0.02",
    },
    safes: [
      {
        id: "018e5b3a-0000-7000-8000-000000000002",
        sequence: 0,
        instrumentType: "post_money_cap",
        purchaseAmount: { amount: "500000", currency: "CAD" },
        valuationCap: { amount: "5000000", currency: "CAD" },
      },
      {
        id: "018e5b3a-0000-7000-8000-000000000003",
        sequence: 1,
        instrumentType: "discount_only",
        purchaseAmount: { amount: "100000", currency: "CAD" },
        discountPercent: "0.20",
      },
      {
        id: "018e5b3a-0000-7000-8000-000000000004",
        sequence: 2,
        instrumentType: "mfn",
        purchaseAmount: { amount: "50000", currency: "CAD" },
      },
    ],
    ...overrides,
  };
}

describe("runScenario", () => {
  it("computes cap-SAFE ownership matching spec §8 test 1 (500,000/5,000,000 = 10%) inside a full scenario", () => {
    const parsed = parseScenario(validScenario());
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    const result = runScenario(parsed.data);

    expect(result.engineVersion).toBe("1");
    expect(result.schemaVersion).toBe(1);
    expect(result.totalCapSafeOwnership.toString()).toBe("0.1");
    expect(result.legacyOwnership.toString()).toBe("0.9");
  });

  it("marks discount_only and mfn rows as not determinable, and the cap row as determinable", () => {
    const parsed = parseScenario(validScenario());
    if (!parsed.success) throw new Error("fixture must be valid");

    const result = runScenario(parsed.data);
    const [capRow, discountRow, mfnRow] = result.safeRows;

    expect(capRow).toMatchObject({ instrumentType: "post_money_cap", determinable: true });
    expect(capRow?.determinable && capRow.ownership.toString()).toBe("0.1");
    expect(discountRow).toEqual({
      id: discountRow?.id,
      instrumentType: "discount_only",
      determinable: false,
    });
    expect(mfnRow).toEqual({ id: mfnRow?.id, instrumentType: "mfn", determinable: false });
  });

  it("dilutes existing capitalization rows by the cap-SAFE legacy factor (spec §8 test 6)", () => {
    const parsed = parseScenario(validScenario());
    if (!parsed.success) throw new Error("fixture must be valid");

    const result = runScenario(parsed.data);
    const founders = result.existingCapitalizationRows.find((row) => row.key === "founders");

    expect(founders?.ownershipBeforeSafes.toString()).toBe("0.9");
    // 0.90 * legacyOwnership (0.9) = 0.81
    expect(founders?.ownershipAfterSafes.toString()).toBe("0.81");
  });

  it("preserves the scenario's original SAFE order in safeRows (spec §8 test 13's stable tie-break)", () => {
    const parsed = parseScenario(validScenario());
    if (!parsed.success) throw new Error("fixture must be valid");

    const result = runScenario(parsed.data);
    expect(result.safeRows.map((row) => row.instrumentType)).toEqual([
      "post_money_cap",
      "discount_only",
      "mfn",
    ]);
  });

  it("throws UnsupportedCaseError when cap SAFEs sell the entire company or more (spec §8 test 12)", () => {
    const scenario = validScenario({
      safes: [
        {
          id: "018e5b3a-0000-7000-8000-000000000002",
          sequence: 0,
          instrumentType: "post_money_cap",
          purchaseAmount: { amount: "5000000", currency: "CAD" },
          valuationCap: { amount: "5000000", currency: "CAD" },
        },
      ],
    });
    const parsed = parseScenario(scenario);
    if (!parsed.success) throw new Error("fixture must be valid");

    expect(() => runScenario(parsed.data)).toThrow(UnsupportedCaseError);
  });
});
