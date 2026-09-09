import { describe, expect, it, vi } from "vitest";

// createCompany.ts imports `server-only`, which throws when loaded
// outside a real Next.js server build (see LoginForm.test.tsx for the
// same note) — stub it so the command's real logic still runs here. It
// also imports @gsk/audit's canonicalHash (node:crypto), which is safe
// under Vitest's jsdom environment since Node built-ins stay available.
vi.mock("server-only", () => ({}));

import { createCompanyCommand } from "./createCompany.js";

function fakeSupabase(rpcImpl: (fn: string, args: unknown) => { data: unknown; error: unknown }) {
  return {
    rpc: vi.fn((fn: string, args: unknown) => Promise.resolve(rpcImpl(fn, args))),
  } as unknown as Parameters<typeof createCompanyCommand>[0];
}

const VALID_INPUT = { legalName: "Example Startup Inc." };

describe("createCompanyCommand", () => {
  it("rejects invalid input before calling Supabase", async () => {
    const rpc = vi.fn();
    const result = await createCompanyCommand(fakeSupabase(rpc), "org-1", "user-1", {}, "idem-1");
    expect(result.success).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("reads the audit chain tip before calling create_company", async () => {
    const calls: string[] = [];
    const supabase = fakeSupabase((fn) => {
      calls.push(fn);
      if (fn === "get_last_audit_event_hash") return { data: null, error: null };
      return { data: { id: "company-1" }, error: null };
    });
    await createCompanyCommand(supabase, "org-1", "user-1", VALID_INPUT, "idem-1");
    expect(calls).toEqual(["get_last_audit_event_hash", "create_company"]);
  });

  it("passes the same idempotency key through unchanged, and a fresh company id", async () => {
    let createArgs: Record<string, unknown> | undefined;
    const supabase = fakeSupabase((fn, args) => {
      if (fn === "get_last_audit_event_hash") return { data: "prev-hash", error: null };
      createArgs = args as Record<string, unknown>;
      return { data: { id: "company-1" }, error: null };
    });
    await createCompanyCommand(supabase, "org-1", "user-1", VALID_INPUT, "my-idempotency-key");
    expect(createArgs?.p_idempotency_key).toBe("my-idempotency-key");
    expect(createArgs?.p_organization_id).toBe("org-1");
    expect(createArgs?.p_prev_event_hash).toBe("prev-hash");
    expect(typeof createArgs?.p_company_id).toBe("string");
    expect(typeof createArgs?.p_event_hash).toBe("string");
    expect(typeof createArgs?.p_request_hash).toBe("string");
  });

  it("computes a different request hash for different company input", async () => {
    const requestHashes: unknown[] = [];
    const supabase = fakeSupabase((fn, args) => {
      if (fn === "get_last_audit_event_hash") return { data: null, error: null };
      requestHashes.push((args as Record<string, unknown>).p_request_hash);
      return { data: { id: "company-1" }, error: null };
    });
    await createCompanyCommand(supabase, "org-1", "user-1", VALID_INPUT, "idem-1");
    await createCompanyCommand(
      supabase,
      "org-1",
      "user-1",
      { legalName: "A Different Startup Inc." },
      "idem-2",
    );
    expect(requestHashes[0]).not.toBe(requestHashes[1]);
  });

  it("returns failure and stops before create_company when reading the chain tip errors", async () => {
    const rpc = vi.fn((fn: string) => {
      if (fn === "get_last_audit_event_hash") {
        return { data: null, error: { message: "permission denied" } };
      }
      throw new Error("create_company should not be called");
    });
    const result = await createCompanyCommand(
      fakeSupabase(rpc),
      "org-1",
      "user-1",
      VALID_INPUT,
      "idem-1",
    );
    expect(result).toEqual({ success: false, error: "permission denied" });
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("surfaces a create_company error", async () => {
    const supabase = fakeSupabase((fn) => {
      if (fn === "get_last_audit_event_hash") return { data: null, error: null };
      return { data: null, error: { message: "insufficient capability: company.write" } };
    });
    const result = await createCompanyCommand(supabase, "org-1", "user-1", VALID_INPUT, "idem-1");
    expect(result).toEqual({ success: false, error: "insufficient capability: company.write" });
  });

  it("returns the created company id on success", async () => {
    const supabase = fakeSupabase((fn) => {
      if (fn === "get_last_audit_event_hash") return { data: null, error: null };
      return { data: { id: "company-abc" }, error: null };
    });
    const result = await createCompanyCommand(supabase, "org-1", "user-1", VALID_INPUT, "idem-1");
    expect(result).toEqual({ success: true, companyId: "company-abc" });
  });
});
