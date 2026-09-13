import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { submitStartupIntakeCommand } from "./submitStartupIntake.js";

function fakeSupabase(rpcImpl: (fn: string, args: unknown) => { data: unknown; error: unknown }) {
  return {
    rpc: vi.fn((fn: string, args: unknown) => Promise.resolve(rpcImpl(fn, args))),
  } as unknown as Parameters<typeof submitStartupIntakeCommand>[0];
}

const VALID_INPUT = {
  companyName: "HYDRIX Systems Inc.",
  industry: "SaaS",
  stage: "seed",
  intakeData: {},
};

describe("submitStartupIntakeCommand", () => {
  it("rejects invalid input before calling Supabase", async () => {
    const rpc = vi.fn();
    const result = await submitStartupIntakeCommand(fakeSupabase(rpc), "org-1", "user-1", {}, "idem-1");
    expect(result.success).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("reads the audit chain tip before calling create_startup_intake", async () => {
    const calls: string[] = [];
    const supabase = fakeSupabase((fn) => {
      calls.push(fn);
      if (fn === "get_last_audit_event_hash") return { data: null, error: null };
      return { data: { id: "intake-1" }, error: null };
    });
    await submitStartupIntakeCommand(supabase, "org-1", "user-1", VALID_INPUT, "idem-1");
    expect(calls).toEqual(["get_last_audit_event_hash", "create_startup_intake"]);
  });

  it("returns the created intake id on success", async () => {
    const supabase = fakeSupabase((fn) => {
      if (fn === "get_last_audit_event_hash") return { data: null, error: null };
      return { data: { id: "intake-abc" }, error: null };
    });
    const result = await submitStartupIntakeCommand(supabase, "org-1", "user-1", VALID_INPUT, "idem-1");
    expect(result).toEqual({ success: true, intakeId: "intake-abc" });
  });

  it("surfaces a create_startup_intake error", async () => {
    const supabase = fakeSupabase((fn) => {
      if (fn === "get_last_audit_event_hash") return { data: null, error: null };
      return { data: null, error: { message: "insufficient capability: intake.write" } };
    });
    const result = await submitStartupIntakeCommand(supabase, "org-1", "user-1", VALID_INPUT, "idem-1");
    expect(result).toEqual({ success: false, error: "insufficient capability: intake.write" });
  });
});
