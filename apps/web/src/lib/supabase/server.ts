import "server-only";

import { createSupabaseServerClient, type SupabaseServerClient } from "@gsk/db";
import { cookies } from "next/headers";
import { getSupabasePublicEnv } from "./env";

/**
 * Server Supabase client for Server Components, Route Handlers, and
 * Server Actions — RLS-scoped to the signed-in user via the session
 * cookie (spec §13.2). Must be constructed fresh on every call (never
 * cached across requests): it captures this request's cookie jar.
 *
 * `setAll` can throw when called from a Server Component (there is no
 * response to attach cookies to there) — that's expected and safe to
 * swallow, because `middleware.ts` refreshes the session cookie on every
 * request regardless, per the official Supabase/Next.js SSR guidance.
 */
export async function createClient(): Promise<SupabaseServerClient> {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabasePublicEnv();

  return createSupabaseServerClient(url, anonKey, {
    getAll() {
      return cookieStore.getAll();
    },
    setAll(cookiesToSet) {
      try {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      } catch {
        // Called from a Server Component — no-op (see comment above).
      }
    },
  });
}
