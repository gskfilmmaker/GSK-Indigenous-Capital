"use server";

import type { ScenarioId } from "@gsk/domain";
import { createClient } from "../../../../../../../lib/supabase/server";
import { saveScenarioCommand } from "../../../../../../../server/commands/saveScenario";
import type { SaveOutcome } from "../../../../../../scenario-studio/ScenarioStudio";

export async function saveScenarioAction(
  organizationId: string,
  companyId: string,
  scenarioId: ScenarioId,
  scenarioName: string,
  idempotencyKey: string,
  scenarioInput: unknown,
): Promise<SaveOutcome> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Your session has expired. Sign in again to save." };
  }

  const result = await saveScenarioCommand(
    supabase,
    organizationId,
    companyId,
    user.id,
    scenarioId,
    scenarioName,
    scenarioInput,
    idempotencyKey,
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true, versionNumber: result.versionNumber };
}
