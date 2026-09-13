import { describe, expect, it } from "vitest";
import { parseCreateInvestorThesisInput } from "./investorThesis.js";

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    name: "Seed thesis — SaaS",
    criteria: [
      { metric: "ltvToCacRatio", label: "LTV:CAC", comparator: "gte", threshold: "3" },
      { metric: "cacPaybackMonths", label: "CAC payback", comparator: "lte", threshold: "18" },
    ],
    ...overrides,
  };
}

describe("createInvestorThesisInputSchema", () => {
  it("accepts a well-formed thesis with no fund context", () => {
    expect(parseCreateInvestorThesisInput(validInput()).success).toBe(true);
  });

  it("accepts an optional fund context for the VC Method", () => {
    const result = parseCreateInvestorThesisInput(
      validInput({
        fundContext: {
          fundSize: { amount: "100000000", currency: "CAD" },
          targetAnnualReturn: "0.48",
          targetHoldYears: "7",
        },
      }),
    );
    expect(result.success).toBe(true);
  });

  it("rejects an empty name", () => {
    expect(parseCreateInvestorThesisInput(validInput({ name: "" })).success).toBe(false);
  });

  it("rejects a criterion with an invalid comparator", () => {
    const result = parseCreateInvestorThesisInput(
      validInput({
        criteria: [{ metric: "x", label: "X", comparator: "eq", threshold: "1" }],
      }),
    );
    expect(result.success).toBe(false);
  });
});
