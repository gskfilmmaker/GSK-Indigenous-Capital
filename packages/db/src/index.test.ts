import { describe, expect, it } from "vitest";
import {
  createSupabaseBrowserClient,
  createSupabaseServerClient,
  createSupabaseServiceRoleClient,
} from "./index.js";

const FAKE_URL = "https://example.supabase.co";
const FAKE_ANON_KEY = "fake-anon-key";
const FAKE_SERVICE_ROLE_KEY = "fake-service-role-key";

describe("createSupabaseBrowserClient", () => {
  it("constructs a client without throwing and exposes the query/auth surface", () => {
    const client = createSupabaseBrowserClient(FAKE_URL, FAKE_ANON_KEY);
    expect(client.auth).toBeDefined();
    expect(typeof client.from).toBe("function");
  });

  it("wires the Database generic so a known table is queryable without a network call", () => {
    const client = createSupabaseBrowserClient(FAKE_URL, FAKE_ANON_KEY);
    expect(() => client.from("organizations").select("id, name, slug")).not.toThrow();
  });
});

describe("createSupabaseServerClient", () => {
  it("constructs a client from an explicit getAll/setAll cookie adapter without throwing", () => {
    const cookieStore = new Map<string, string>([["sb-access-token", "fake"]]);
    const client = createSupabaseServerClient(FAKE_URL, FAKE_ANON_KEY, {
      getAll: () => Array.from(cookieStore, ([name, value]) => ({ name, value })),
      setAll: (cookiesToSet) => {
        for (const { name, value } of cookiesToSet) {
          cookieStore.set(name, value);
        }
      },
    });
    expect(client.auth).toBeDefined();
  });

  it("does not read cookies during construction (lazy session initialization)", () => {
    let getAllCalls = 0;
    createSupabaseServerClient(FAKE_URL, FAKE_ANON_KEY, {
      getAll: () => {
        getAllCalls += 1;
        return [];
      },
      setAll: () => {},
    });
    expect(getAllCalls).toBe(0);
  });
});

describe("createSupabaseServiceRoleClient", () => {
  it("constructs a client without throwing and does not persist a session", () => {
    const client = createSupabaseServiceRoleClient(FAKE_URL, FAKE_SERVICE_ROLE_KEY);
    expect(client.auth).toBeDefined();
    expect(typeof client.from).toBe("function");
  });
});
