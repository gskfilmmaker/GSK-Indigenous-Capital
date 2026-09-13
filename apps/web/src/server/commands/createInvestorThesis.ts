import "server-only";

import { canonicalHash } from "@gsk/audit";
import type { SupabaseServerClient } from "@gsk/db";
import { createInvestorThesisInputSchema, newInvestorThesisId } from "@gsk/domain";

export type CreateInvestorThesisCommandResult =
  | { success: true; thesisId: string }
  | { success: false; error: string };

/**
 * Creates an investor's own named screening thesis (packages/deal-
 * screening's thesisFit.ts). Same shape as createCompanyCommand: a thin
 * wrapper around create_investor_thesis() (root CLAUDE.md invariant 5),
 * responsible for Zod validation and the audit event hash only.
 */
export async function createInvestorThesisCommand(
  supabase: SupabaseServerClient,
  organizationId: string,
  actorUserId: string,
  rawInput: unknown,
  idempotencyKey: string,
): Promise<CreateInvestorThesisCommandResult> {
  const parsed = createInvestorThesisInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Enter a valid thesis.",
    };
  }
  const input = parsed.data;
  const thesisId = newInvestorThesisId();

  const { data: prevEventHash, error: tipError } = await supabase.rpc("get_last_audit_event_hash", {
    p_organization_id: organizationId,
  });
  if (tipError) {
    return { success: false, error: tipError.message };
  }

  const requestHash = canonicalHash({ organizationId, thesisId, input });
  const eventHash = canonicalHash({
    prevEventHash: prevEventHash ?? null,
    actor: actorUserId,
    action: "thesis.created",
    resource: { type: "investor_thesis", id: thesisId },
    payload: { thesisId },
    occurredAt: new Date().toISOString(),
  });

  const { data, error } = await supabase.rpc("create_investor_thesis", {
    p_organization_id: organizationId,
    p_thesis_id: thesisId,
    p_thesis: input,
    p_idempotency_key: idempotencyKey,
    p_request_hash: requestHash,
    p_prev_event_hash: prevEventHash ?? null,
    p_event_hash: eventHash,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, thesisId: data.id };
}
