import { describe, expect, it, vi } from "vitest";

// This module (transitively, via `server-only`) throws when imported
// outside a real Next.js server build — see createCompany.test.ts for
// the same note. Stub it so the command's real logic still runs here.
vi.mock("server-only", () => ({}));

import { createOrganizationCommand } from "./createOrganization.js";

function fakeSupabase(rpcImpl: (fn: string, args: unknown) => { data: unknown; error: unknown }) {
  return {
    rpc: vi.fn((fn: string, args: unknown) => Promise.resolve(rpcImpl(fn, args))),
  } as unknown as Parameters<typeof createOrganizationCommand>[0];
}

describe("createOrganizationCommand", () => {
  it("rejects invalid input before calling Supabase", async () => {
    const rpc = vi.fn();
    const result = await createOrganizationCommand(fakeSupabase(rpc), {
      name: "",
      slug: "gsk",
    });
    expect(result.success).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("calls create_organization with the parsed name/slug and returns the created org", async () => {
    const supabase = fakeSupabase((fn, args) => {
      expect(fn).toBe("create_organization");
      expect(args).toEqual({ p_name: "GSK Indigenous Capital", p_slug: "gsk-ic" });
      return { data: { id: "org-1", slug: "gsk-ic" }, error: null };
    });
    const result = await createOrganizationCommand(supabase, {
      name: "GSK Indigenous Capital",
      slug: "gsk-ic",
    });
    expect(result).toEqual({ success: true, organizationId: "org-1", slug: "gsk-ic" });
  });

  it("translates a unique-slug violation into a clear message", async () => {
    const supabase = fakeSupabase(() => ({
      data: null,
      error: { code: "23505", message: "duplicate key value violates unique constraint" },
    }));
    const result = await createOrganizationCommand(supabase, { name: "Dup Co", slug: "dup-co" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/already taken/i);
    }
  });

  it("surfaces any other Supabase error message as-is", async () => {
    const supabase = fakeSupabase(() => ({
      data: null,
      error: { code: "28000", message: "create_organization requires an authenticated user" },
    }));
    const result = await createOrganizationCommand(supabase, { name: "Co", slug: "co" });
    expect(result).toEqual({
      success: false,
      error: "create_organization requires an authenticated user",
    });
  });
});
