import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./generated/database.types.js";

export type SupabaseBrowserClient = ReturnType<typeof createBrowserClient<Database>>;

/**
 * Browser-side Supabase client (RLS-scoped to the signed-in user via the
 * anon key + auth cookie, spec §13.2). Takes the URL/anon key as explicit
 * arguments rather than reading `process.env` internally: Next.js only
 * inlines `NEXT_PUBLIC_*` values in files its own compiler processes, not
 * in this pre-built workspace package's `dist/` output, so a
 * `process.env` read here would be `undefined` at runtime in the browser
 * bundle. The caller (apps/web) reads `process.env.NEXT_PUBLIC_SUPABASE_URL`
 * / `NEXT_PUBLIC_SUPABASE_ANON_KEY` itself and passes them in.
 *
 * Cookie storage is left to `@supabase/ssr`'s built-in `document.cookie`
 * handling (no `cookies` option) so the session stays readable by the
 * server client on the next request.
 */
export function createSupabaseBrowserClient(
  supabaseUrl: string,
  supabaseAnonKey: string,
): SupabaseBrowserClient {
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
