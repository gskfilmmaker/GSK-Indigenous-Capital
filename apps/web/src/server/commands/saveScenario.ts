import "server-only";

import { canonicalHash } from "@gsk/audit";
import {
  runScenario,
  serializeScenarioRunResult,
  UnsupportedCaseError,
  type ScenarioRunResult,
} from "@gsk/cap-table";
import { hashScenarioRunResult } from "@gsk/cap-table/hashing";
import type { Json, SupabaseServerClient } from "@gsk/db";
import { hashScenario } from "@gsk/domain/hashing";
import { parseScenario, type ScenarioId } from "@gsk/domain";

export type SaveScenarioCommandResult =
  | {
      success: true;
      scenarioId: string;
      versionNumber: number;
      run: { status: "succeeded"; result: ScenarioRunResult } | { status: "failed"; error: string };
    }
  | { success: false; error: string };

/**
 * Saves a Scenario Studio scenario (spec §7-§10.3). The engine
 * (packages/cap-table's runScenario(), pure and synchronous) always runs
 * here, server-side, from the validated input — never trusting a
 * client-supplied result — so the persisted output is always genuinely
 * computed by this deployment's engine version, not spoofable by a
 * malicious client. An `UnsupportedCaseError` is persisted as a failed
 * run (root CLAUDE.md invariant 9: never a silent approximation, and
 * never dropped instead of recorded).
 *
 * `save_scenario()` (see supabase/migrations/20260908150900_save_scenario_command.sql)
 * does the actual atomic persistence (idempotency, the scenario/version/
 * run rows, the hash-chained audit event, the outbox event) — this
 * function's own job is validating, running the engine, and computing
 * the two hashes ADR 0006 requires the caller (not the database) to
 * compute: the input hash (`@gsk/domain`'s hashScenario) and the audit
 * event hash.
 */
export async function saveScenarioCommand(
  supabase: SupabaseServerClient,
  organizationId: string,
  companyId: string,
  actorUserId: string,
  scenarioId: ScenarioId,
  scenarioName: string,
  rawScenarioInput: unknown,
  idempotencyKey: string,
): Promise<SaveScenarioCommandResult> {
  const parsed = parseScenario(rawScenarioInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "This scenario isn't valid yet.",
    };
  }
  const scenario = parsed.data;
  const inputHash = hashScenario(scenario);

  let run:
    | { status: "succeeded"; result: ScenarioRunResult }
    | { status: "failed"; error: UnsupportedCaseError };
  try {
    run = { status: "succeeded", result: runScenario(scenario) };
  } catch (error) {
    if (error instanceof UnsupportedCaseError) {
      run = { status: "failed", error };
    } else {
      throw error;
    }
  }

  const { data: prevEventHash, error: tipError } = await supabase.rpc("get_last_audit_event_hash", {
    p_organization_id: organizationId,
  });
  if (tipError) {
    return { success: false, error: tipError.message };
  }

  const requestHash = canonicalHash({ companyId, scenarioId, scenarioName, input: scenario });
  const eventHash = canonicalHash({
    prevEventHash: prevEventHash ?? null,
    actor: actorUserId,
    action: "scenario.saved",
    resource: { type: "scenario", id: scenarioId },
    payload: { scenarioId },
    occurredAt: new Date().toISOString(),
  });

  const { data, error } = await supabase.rpc("save_scenario", {
    p_company_id: companyId,
    p_scenario_id: scenarioId,
    p_scenario_name: scenarioName,
    p_input: scenario as unknown as Json,
    p_input_schema_version: scenario.schemaVersion,
    p_input_hash: inputHash,
    p_engine_version: run.status === "succeeded" ? run.result.engineVersion : "1",
    p_run_status: run.status,
    p_output:
      run.status === "succeeded"
        ? (serializeScenarioRunResult(run.result) as unknown as Json)
        : null,
    p_output_hash: run.status === "succeeded" ? hashScenarioRunResult(run.result) : null,
    p_error_code: run.status === "failed" ? "UNSUPPORTED_CASE" : null,
    p_error_message: run.status === "failed" ? run.error.message : null,
    p_idempotency_key: idempotencyKey,
    p_request_hash: requestHash,
    p_prev_event_hash: prevEventHash ?? null,
    p_event_hash: eventHash,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    scenarioId: data.scenarioId,
    versionNumber: data.versionNumber,
    run:
      run.status === "succeeded"
        ? { status: "succeeded", result: run.result }
        : { status: "failed", error: run.error.message },
  };
}
