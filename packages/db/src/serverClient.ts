import { createServerClient } from "@supabase/ssr";
import type { CookieMethodsServer } from "@supabase/ssr";
import type { Database } from "./generated/database.types.js";

export type { CookieMethodsServer } from "@supabase/ssr";
export type SupabaseServerClient = ReturnType<typeof createServerClient<Database>>;

/**
 * Server-side Supabase client (RLS-scoped to the signed-in user, spec
 * §13.2) for use in Next.js Server Components, Route Handlers, Server
 * Actions, and middleware.
 *
 * Takes the URL/anon key and a cookie adapter as explicit arguments
 * instead of importing `next/headers` or reading `process.env` directly:
 * this package stays framework-agnostic (matching packages/domain and
 * packages/cap-table's own purity rules — see root CLAUDE.md's dependency
 * direction), and each call site (Server Component vs. Route Handler vs.
 * middleware) has a different `next/headers`/`NextRequest`/`NextResponse`
 * cookie API of its own to adapt from.
 *
 * The caller must implement `getAll`/`setAll` per
 * https://supabase.com/docs/guides/auth/server-side/nextjs — omitting or
 * mis-wiring `setAll` causes silent auth bugs (early logouts, stale
 * sessions), not a visible error, so the adapter has no safe default here.
 */
export function createSupabaseServerClient(
  supabaseUrl: string,
  supabaseAnonKey: string,
  cookies: CookieMethodsServer,
): SupabaseServerClient {
  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, { cookies });
}
