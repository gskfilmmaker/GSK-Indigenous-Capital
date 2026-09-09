/**
 * Supabase clients, generated types, and SQL helpers (spec §13.2, §15).
 *
 * Every factory here takes its Supabase URL/key (and, for the server
 * client, a cookie adapter) as explicit arguments rather than reading
 * `process.env`/`next/headers` internally — see each factory's own
 * comment for why. Callers in apps/web read their environment variables
 * and pass them in.
 */

export type { Database, Json } from "./generated/database.types.js";
export type { EmailOtpType, AuthError } from "@supabase/supabase-js";
export { createSupabaseBrowserClient, type SupabaseBrowserClient } from "./browserClient.js";
export {
  createSupabaseServerClient,
  type SupabaseServerClient,
  type CookieMethodsServer,
} from "./serverClient.js";
export {
  createSupabaseServiceRoleClient,
  type SupabaseServiceRoleClient,
} from "./serviceRoleClient.js";
