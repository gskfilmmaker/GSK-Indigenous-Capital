import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createInvestorThesisCommand } from "./createInvestorThesis.js";

function fakeSupabase(rpcImpl: (fn: string, args: unknown) => { data: unknown; error: unknown }) {
  return {
    rpc: vi.fn((fn: string, args: unknown) => Promise.resolve(rpcImpl(fn, args))),
  } as unknown as Parameters<typeof createInvestorThesisCommand>[0];
}

const VALID_INPUT = {
  name: "Seed thesis",
  criteria: [{ metric: "ltvToCacRatio", label: "LTV:CAC", comparator: "gte", threshold: "3" }],
};

describe("createInvestorThesisCommand", () => {
  it("rejects invalid input before calling Supabase", async () => {
    const rpc = vi.fn();
    const result = await createInvestorThesisCommand(fakeSupabase(rpc), "org-1", "user-1", {}, "idem-1");
    expect(result.success).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("reads the audit chain tip before calling create_investor_thesis", async () => {
    const calls: string[] = [];
    const supabase = fakeSupabase((fn) => {
      calls.push(fn);
      if (fn === "get_last_audit_event_hash") return { data: null, error: null };
      return { data: { id: "thesis-1" }, error: null };
    });
    await createInvestorThesisCommand(supabase, "org-1", "user-1", VALID_INPUT, "idem-1");
    expect(calls).toEqual(["get_last_audit_event_hash", "create_investor_thesis"]);
  });

  it("returns the created thesis id on success", async () => {
    const supabase = fakeSupabase((fn) => {
      if (fn === "get_last_audit_event_hash") return { data: null, error: null };
      return { data: { id: "thesis-abc" }, error: null };
    });
    const result = await createInvestorThesisCommand(supabase, "org-1", "user-1", VALID_INPUT, "idem-1");
    expect(result).toEqual({ success: true, thesisId: "thesis-abc" });
  });

  it("surfaces a create_investor_thesis error", async () => {
    const supabase = fakeSupabase((fn) => {
      if (fn === "get_last_audit_event_hash") return { data: null, error: null };
      return { data: null, error: { message: "insufficient capability: thesis.write" } };
    });
    const result = await createInvestorThesisCommand(supabase, "org-1", "user-1", VALID_INPUT, "idem-1");
    expect(result).toEqual({ success: false, error: "insufficient capability: thesis.write" });
  });
});
