import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { computeScreeningOutput, runScreeningCommand } from "./runScreening.js";
import type { StartupIntakeData, ThesisCriterion } from "@gsk/domain";

function fakeSupabase(rpcImpl: (fn: string, args: unknown) => { data: unknown; error: unknown }) {
  return {
    rpc: vi.fn((fn: string, args: unknown) => Promise.resolve(rpcImpl(fn, args))),
  } as unknown as Parameters<typeof runScreeningCommand>[0];
}

describe("computeScreeningOutput", () => {
  it("never produces a verdict/score/recommendation field, regardless of input", () => {
    const intakeData: StartupIntakeData = {
      unitEconomics: {
        monthlyRevenuePerCustomer: "1000",
        grossMargin: "0.80",
        monthlyChurnRate: "0.02",
        customerAcquisitionCost: "8000",
        annualGrowthRate: "0.65",
        profitMargin: "-0.15",
      },
      exitAssumption: {
        exitValue: { amount: "90000000", currency: "CAD" },
        yearsToExit: "2",
        proposedInvestment: { amount: "4000000", currency: "CAD" },
      },
    };
    const output = computeScreeningOutput(intakeData, undefined, {
      fundSize: "100000000",
      targetAnnualReturn: "0.50",
      targetHoldYears: "2",
    });

    const serialized = JSON.stringify(output);
    for (const forbidden of ["verdict", "score", "overallScore", "recommendation", "rating"]) {
      expect(serialized.toLowerCase().includes(forbidden.toLowerCase())).toBe(false);
    }
  });

  it("computes the VC Method and unit economics correctly from a full intake", () => {
    const intakeData: StartupIntakeData = {
      unitEconomics: {
        monthlyRevenuePerCustomer: "1000",
        grossMargin: "0.80",
        monthlyChurnRate: "0.02",
        customerAcquisitionCost: "8000",
        annualGrowthRate: "0.65",
        profitMargin: "-0.15",
      },
      exitAssumption: {
        exitValue: { amount: "90000000", currency: "CAD" },
        yearsToExit: "2",
        proposedInvestment: { amount: "4000000", currency: "CAD" },
      },
    };
    const output = computeScreeningOutput(intakeData, undefined, {
      fundSize: "100000000",
      targetAnnualReturn: "0.50",
      targetHoldYears: "2",
    }) as {
      vcMethod: { postMoneyValuation: string; investorOwnership: string };
      unitEconomics: { ltvToCacRatio: string; cacPaybackMonths: string };
      ruleOf40: { meetsBar: boolean };
    };

    expect(output.vcMethod.postMoneyValuation).toBe("40000000");
    expect(output.vcMethod.investorOwnership).toBe("0.1");
    expect(output.unitEconomics.ltvToCacRatio).toBe("5");
    expect(output.ruleOf40.meetsBar).toBe(true);
  });

  it("skips a formula entirely when its required intake group is absent, never approximating", () => {
    const output = computeScreeningOutput({}, undefined, undefined);
    expect(output.vcMethod).toBeUndefined();
    expect(output.scorecard).toBeUndefined();
    expect(output.berkus).toBeUndefined();
    expect(output.unitEconomics).toBeUndefined();
    expect(output.marketCredibility).toBeUndefined();
    expect(output.redFlags).toEqual([]);
  });

  it("evaluates thesis fit per-metric, with no combined field anywhere in the output", () => {
    const intakeData: StartupIntakeData = {
      unitEconomics: {
        monthlyRevenuePerCustomer: "1000",
        grossMargin: "0.80",
        monthlyChurnRate: "0.02",
        customerAcquisitionCost: "8000",
        annualGrowthRate: "0.65",
        profitMargin: "-0.15",
      },
    };
    const criteria: ThesisCriterion[] = [
      { metric: "ltvToCacRatio", label: "LTV:CAC", comparator: "gte", threshold: "3" },
    ];
    const output = computeScreeningOutput(intakeData, criteria, undefined) as {
      thesisFit: { metric: string; meetsThreshold: boolean }[];
    };
    expect(output.thesisFit).toEqual([
      expect.objectContaining({ metric: "ltvToCacRatio", meetsThreshold: true }),
    ]);
  });
});

describe("runScreeningCommand", () => {
  it("rejects invalid intake data before touching Supabase", async () => {
    const rpc = vi.fn();
    const result = await runScreeningCommand(
      fakeSupabase(rpc),
      "org-1",
      "intake-1",
      null,
      "snapshot-1",
      { unitEconomics: { monthlyRevenuePerCustomer: "not-a-number" } },
      undefined,
      undefined,
      "idem-1",
    );
    expect(result.success).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("persists the computed output via run_screening", async () => {
    let runArgs: Record<string, unknown> | undefined;
    const supabase = fakeSupabase((fn, args) => {
      if (fn === "get_last_audit_event_hash") return { data: "prev-hash", error: null };
      runArgs = args as Record<string, unknown>;
      return { data: { id: "snapshot-1" }, error: null };
    });

    const result = await runScreeningCommand(
      supabase,
      "org-1",
      "intake-1",
      null,
      "snapshot-1",
      {},
      undefined,
      undefined,
      "idem-1",
    );

    expect(result.success).toBe(true);
    expect(runArgs?.p_startup_intake_id).toBe("intake-1");
    expect(runArgs?.p_investor_thesis_id).toBeNull();
    expect(runArgs?.p_output).toBeDefined();
  });
});
