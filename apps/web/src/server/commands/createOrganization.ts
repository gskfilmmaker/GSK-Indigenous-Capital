import "server-only";

import type { SupabaseServerClient } from "@gsk/db";
import { createOrganizationInputSchema } from "@gsk/domain";

export type CreateOrganizationCommandResult =
  { success: true; organizationId: string; slug: string } | { success: false; error: string };

/**
 * Creates an organization (spec §6.2 onboarding step 1). Delegates the
 * actual mutation to `create_organization()` (security definer,
 * atomically creates the org and makes the caller its owner — see
 * 20260908150200_organizations_and_memberships.sql) rather than
 * inserting directly.
 *
 * Not retrofitted with the idempotency/audit/outbox pattern
 * `createCompanyCommand` uses: `idempotency_keys.organization_id` is
 * `not null`, but organization creation has no organization to scope a
 * key to until it succeeds. A retry after a network blip instead fails
 * on the slug's own unique constraint (surfaced below as a clear
 * message), which is a safe, if not fully idempotent, fallback — see
 * supabase/migrations/20260908150800_create_company_command.sql's own
 * comment for the full reasoning.
 */
export async function createOrganizationCommand(
  supabase: SupabaseServerClient,
  rawInput: unknown,
): Promise<CreateOrganizationCommandResult> {
  const parsed = createOrganizationInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Enter a valid organization name and URL.",
    };
  }

  const { data, error } = await supabase.rpc("create_organization", {
    p_name: parsed.data.name,
    p_slug: parsed.data.slug,
  });

  if (error) {
    if (error.code === "23505") {
      return {
        success: false,
        error: "That organization URL is already taken. Try a different one.",
      };
    }
    return { success: false, error: error.message };
  }

  return { success: true, organizationId: data.id, slug: data.slug };
}
