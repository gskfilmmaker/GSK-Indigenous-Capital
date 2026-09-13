import { describe, expect, it } from "vitest";
import { parseCreateStartupIntakeInput } from "./startupIntake.js";

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    companyName: "HYDRIX Systems Inc.",
    industry: "SaaS",
    stage: "seed",
    intakeData: {},
    ...overrides,
  };
}

describe("createStartupIntakeInputSchema", () => {
  it("accepts a bare submission with no groups filled in (idea-stage)", () => {
    expect(parseCreateStartupIntakeInput(validInput()).success).toBe(true);
  });

  it("accepts a full submission with every group present", () => {
    const result = parseCreateStartupIntakeInput(
      validInput({
        intakeData: {
          unitEconomics: {
            monthlyRevenuePerCustomer: "1000",
            grossMargin: "0.80",
            monthlyChurnRate: "0.02",
            customerAcquisitionCost: "8000",
            annualGrowthRate: "0.65",
            profitMargin: "-0.15",
          },
          marketSizing: {
            annualContractValue: "12000",
            reachableCustomers: "2500",
            totalAddressableMarket: "8000000000",
            serviceableShare: "0.02",
            nearTermCaptureRate: "0.05",
          },
          exitAssumption: {
            exitValue: { amount: "150000000", currency: "CAD" },
            yearsToExit: "7",
            proposedInvestment: { amount: "2000000", currency: "CAD" },
          },
          redFlagInputs: { capTableEvenSplitFullyVested: false, cohortRetentionDisclosed: true },
        },
      }),
    );
    expect(result.success).toBe(true);
  });

  it("rejects an unknown stage", () => {
    expect(parseCreateStartupIntakeInput(validInput({ stage: "ipo" })).success).toBe(false);
  });

  it("rejects a non-positive monthlyRevenuePerCustomer", () => {
    const result = parseCreateStartupIntakeInput(
      validInput({
        intakeData: {
          unitEconomics: {
            monthlyRevenuePerCustomer: "0",
            grossMargin: "0.80",
            monthlyChurnRate: "0.02",
            customerAcquisitionCost: "8000",
            annualGrowthRate: "0.65",
            profitMargin: "-0.15",
          },
        },
      }),
    );
    expect(result.success).toBe(false);
  });
});
