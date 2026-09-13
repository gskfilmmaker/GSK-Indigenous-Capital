import "server-only";

import { canonicalHash } from "@gsk/audit";
import type { SupabaseServerClient } from "@gsk/db";
import { createStartupIntakeInputSchema, newStartupIntakeId } from "@gsk/domain";

export type SubmitStartupIntakeCommandResult =
  | { success: true; intakeId: string }
  | { success: false; error: string };

/**
 * Creates a founder's submitted startup intake (ADR 0009). Same shape as
 * createCompanyCommand: a thin wrapper around create_startup_intake()
 * (root CLAUDE.md invariant 5), responsible for Zod validation and the
 * audit event hash only.
 */
export async function submitStartupIntakeCommand(
  supabase: SupabaseServerClient,
  organizationId: string,
  actorUserId: string,
  rawInput: unknown,
  idempotencyKey: string,
): Promise<SubmitStartupIntakeCommandResult> {
  const parsed = createStartupIntakeInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Enter valid startup details.",
    };
  }
  const input = parsed.data;
  const intakeId = newStartupIntakeId();

  const { data: prevEventHash, error: tipError } = await supabase.rpc("get_last_audit_event_hash", {
    p_organization_id: organizationId,
  });
  if (tipError) {
    return { success: false, error: tipError.message };
  }

  const requestHash = canonicalHash({ organizationId, intakeId, input });
  const eventHash = canonicalHash({
    prevEventHash: prevEventHash ?? null,
    actor: actorUserId,
    action: "intake.created",
    resource: { type: "startup_intake", id: intakeId },
    payload: { intakeId },
    occurredAt: new Date().toISOString(),
  });

  const { data, error } = await supabase.rpc("create_startup_intake", {
    p_organization_id: organizationId,
    p_intake_id: intakeId,
    p_intake: input,
    p_idempotency_key: idempotencyKey,
    p_request_hash: requestHash,
    p_prev_event_hash: prevEventHash ?? null,
    p_event_hash: eventHash,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, intakeId: data.id };
}
