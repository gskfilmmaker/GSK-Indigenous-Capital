import "server-only";

import { canonicalHash } from "@gsk/audit";
import type { SupabaseServerClient } from "@gsk/db";
import { createCompanyInputSchema, newCompanyId } from "@gsk/domain";

export type CreateCompanyCommandResult =
  { success: true; companyId: string } | { success: false; error: string };

/**
 * Creates a company for an organization (spec §6.2 onboarding step 2),
 * satisfying root CLAUDE.md invariant 5 in full: this is a thin
 * TypeScript wrapper around `create_company()` — the RPC does the actual
 * work atomically (idempotency bookkeeping, the company row, the
 * hash-chained audit event, and the outbox event all in one
 * transaction; see supabase/migrations/20260908150800_create_company_command.sql)
 * — and is responsible for the two things that must happen in
 * TypeScript, not SQL: Zod validation (fail closed before any network
 * call) and computing the audit event's hash via @gsk/audit's
 * canonicalHash() (ADR 0006: the database only verifies the chain, it
 * never computes it).
 *
 * `idempotencyKey` is supplied by the caller (typically a value
 * generated once per form render and carried in a hidden field, so a
 * double-click or a retried request reuses the same key rather than
 * generating a fresh one per attempt).
 */
export async function createCompanyCommand(
  supabase: SupabaseServerClient,
  organizationId: string,
  actorUserId: string,
  rawInput: unknown,
  idempotencyKey: string,
): Promise<CreateCompanyCommandResult> {
  const parsed = createCompanyInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Enter valid company details.",
    };
  }
  const input = parsed.data;
  const companyId = newCompanyId();

  const { data: prevEventHash, error: tipError } = await supabase.rpc("get_last_audit_event_hash", {
    p_organization_id: organizationId,
  });
  if (tipError) {
    return { success: false, error: tipError.message };
  }

  const requestHash = canonicalHash({ organizationId, companyId, input });
  const eventHash = canonicalHash({
    prevEventHash: prevEventHash ?? null,
    actor: actorUserId,
    action: "company.created",
    resource: { type: "company", id: companyId },
    payload: { companyId },
    occurredAt: new Date().toISOString(),
  });

  const { data, error } = await supabase.rpc("create_company", {
    p_organization_id: organizationId,
    p_company_id: companyId,
    p_company: input,
    p_idempotency_key: idempotencyKey,
    p_request_hash: requestHash,
    p_prev_event_hash: prevEventHash ?? null,
    p_event_hash: eventHash,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, companyId: data.id };
}
