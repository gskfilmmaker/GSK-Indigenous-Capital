import { describe, expect, it, vi } from "vitest";

// saveScenario.ts imports `server-only` — see LoginForm.test.tsx for
// why this is stubbed.
vi.mock("server-only", () => ({}));

import { saveScenarioCommand } from "./saveScenario.js";

function fakeSupabase(rpcImpl: (fn: string, args: unknown) => { data: unknown; error: unknown }) {
  return {
    rpc: vi.fn((fn: string, args: unknown) => Promise.resolve(rpcImpl(fn, args))),
  } as unknown as Parameters<typeof saveScenarioCommand>[0];
}

const VALID_SCENARIO_INPUT = {
  id: "018e5b3a-0000-7000-8000-000000000001",
  schemaVersion: 1,
  currency: "CAD",
  existingCapitalization: { founders: "0.90", grantedOptions: "0.08", unissuedPool: "0.02" },
  safes: [
    {
      id: "018e5b3a-0000-7000-8000-000000000002",
      sequence: 0,
      instrumentType: "post_money_cap",
      purchaseAmount: { amount: "500000", currency: "CAD" },
      valuationCap: { amount: "5000000", currency: "CAD" },
    },
  ],
};

const UNSUPPORTED_SCENARIO_INPUT = {
  ...VALID_SCENARIO_INPUT,
  safes: [
    {
      ...VALID_SCENARIO_INPUT.safes[0],
      purchaseAmount: { amount: "5000000", currency: "CAD" },
      valuationCap: { amount: "5000000", currency: "CAD" },
    },
  ],
};

const SCENARIO_ID = "018e5b3a-0000-7000-8000-000000000001" as Parameters<
  typeof saveScenarioCommand
>[4];

describe("saveScenarioCommand", () => {
  it("rejects invalid scenario input before touching Supabase", async () => {
    const rpc = vi.fn();
    const result = await saveScenarioCommand(
      fakeSupabase(rpc),
      "org-1",
      "company-1",
      "user-1",
      SCENARIO_ID,
      "My Scenario",
      {},
      "idem-1",
    );
    expect(result.success).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("runs the engine server-side and persists a succeeded run", async () => {
    let saveArgs: Record<string, unknown> | undefined;
    const supabase = fakeSupabase((fn, args) => {
      if (fn === "get_last_audit_event_hash") return { data: "prev-hash", error: null };
      saveArgs = args as Record<string, unknown>;
      return {
        data: { scenarioId: SCENARIO_ID, versionNumber: 1, runId: "run-1", runStatus: "succeeded" },
        error: null,
      };
    });

    const result = await saveScenarioCommand(
      supabase,
      "org-1",
      "company-1",
      "user-1",
      SCENARIO_ID,
      "My Scenario",
      VALID_SCENARIO_INPUT,
      "idem-1",
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.scenarioId).toBe(SCENARIO_ID);
      expect(result.versionNumber).toBe(1);
      expect(result.run.status).toBe("succeeded");
      if (result.run.status === "succeeded") {
        expect(result.run.result.engineVersion).toBe("1");
      }
    }
    expect(saveArgs?.p_run_status).toBe("succeeded");
    expect(saveArgs?.p_error_code).toBeNull();
    expect(saveArgs?.p_output).not.toBeNull();
  });

  it("persists an unsupported-case run as failed, never silently as succeeded", async () => {
    let saveArgs: Record<string, unknown> | undefined;
    const supabase = fakeSupabase((fn, args) => {
      if (fn === "get_last_audit_event_hash") return { data: null, error: null };
      saveArgs = args as Record<string, unknown>;
      return {
        data: { scenarioId: SCENARIO_ID, versionNumber: 1, runId: "run-1", runStatus: "failed" },
        error: null,
      };
    });

    const result = await saveScenarioCommand(
      supabase,
      "org-1",
      "company-1",
      "user-1",
      SCENARIO_ID,
      "My Scenario",
      UNSUPPORTED_SCENARIO_INPUT,
      "idem-1",
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.run.status).toBe("failed");
    }
    expect(saveArgs?.p_run_status).toBe("failed");
    expect(saveArgs?.p_output).toBeNull();
    expect(saveArgs?.p_error_code).toBe("UNSUPPORTED_CASE");
  });

  it("returns failure when reading the audit chain tip errors, without calling save_scenario", async () => {
    const rpc = vi.fn((fn: string) => {
      if (fn === "get_last_audit_event_hash") {
        return { data: null, error: { message: "permission denied" } };
      }
      throw new Error("save_scenario should not be called");
    });
    const result = await saveScenarioCommand(
      fakeSupabase(rpc),
      "org-1",
      "company-1",
      "user-1",
      SCENARIO_ID,
      "My Scenario",
      VALID_SCENARIO_INPUT,
      "idem-1",
    );
    expect(result).toEqual({ success: false, error: "permission denied" });
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("surfaces a save_scenario error", async () => {
    const supabase = fakeSupabase((fn) => {
      if (fn === "get_last_audit_event_hash") return { data: null, error: null };
      return { data: null, error: { message: "insufficient capability: scenario.write" } };
    });
    const result = await saveScenarioCommand(
      supabase,
      "org-1",
      "company-1",
      "user-1",
      SCENARIO_ID,
      "My Scenario",
      VALID_SCENARIO_INPUT,
      "idem-1",
    );
    expect(result).toEqual({ success: false, error: "insufficient capability: scenario.write" });
  });
});
