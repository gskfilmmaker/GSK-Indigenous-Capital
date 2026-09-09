import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./generated/database.types.js";

export type SupabaseServiceRoleClient = SupabaseClient<Database>;

/**
 * Service-role Supabase client: authenticates as `service_role`, which
 * Postgres grants an explicit RLS bypass (this is Postgres's own escape
 * hatch for backend jobs, not an application-layer workaround — see
 * `alter table ... force row level security` in every migration, which
 * still applies to `service_role` unless the table's policies name it,
 * so most tables here scope `service_role` the same as `authenticated`
 * and this client's privilege is narrower than the key name suggests).
 *
 * Root CLAUDE.md invariant 1 ("never bypass Postgres RLS or rely only on
 * UI authorization") is about request-serving code path: never hand this
 * client to a browser, never construct it from a user request, and never
 * use it to skip a capability check that would otherwise apply. It exists
 * only for apps/worker's background jobs (outbox delivery, scheduled
 * jobs) that legitimately act across tenants — e.g. draining
 * `outbox_events` for every organization, not one signed-in user's own
 * organization the way `packages/db`'s server/browser clients are scoped.
 *
 * The service-role key must never reach a browser bundle or be logged
 * (root CLAUDE.md invariant 6) — callers read it from a server-only
 * environment variable (e.g. `SUPABASE_SERVICE_ROLE_KEY`, never
 * `NEXT_PUBLIC_*`) and pass it in explicitly, same reasoning as the
 * browser/server client factories.
 */
export function createSupabaseServiceRoleClient(
  supabaseUrl: string,
  serviceRoleKey: string,
): SupabaseServiceRoleClient {
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
