"use client";

import type {
  ExistingCapitalizationFormState,
  SafeRowFormState,
} from "../../../../../../../lib/scenario/buildScenario";
import type { ScenarioId } from "@gsk/domain";
import { useId, useState } from "react";
import { ScenarioStudio, type SaveOutcome } from "../../../../../../scenario-studio/ScenarioStudio";
import { saveScenarioAction } from "./actions";
import styles from "./scenarioDetail.module.css";

export function PersistedScenarioStudio({
  organizationId,
  companyId,
  scenarioId,
  initialName,
  initialExistingCapitalization,
  initialSafeRows,
  initialSavedVersionNumber,
}: {
  organizationId: string;
  companyId: string;
  scenarioId: ScenarioId;
  initialName: string;
  initialExistingCapitalization?: ExistingCapitalizationFormState;
  initialSafeRows?: SafeRowFormState[];
  initialSavedVersionNumber?: number;
}) {
  const [name, setName] = useState(initialName);
  const nameId = useId();

  async function handleSave(scenarioInput: unknown): Promise<SaveOutcome> {
    // A fresh idempotency key per save: this protects one save's request
    // from being duplicated by a network retry, without treating two
    // deliberate, separate saves as the same request (which would be
    // rejected — see save_scenario()'s "reused with a different request
    // payload" check).
    return saveScenarioAction(
      organizationId,
      companyId,
      scenarioId,
      name,
      crypto.randomUUID(),
      scenarioInput,
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.nameField}>
        <label htmlFor={nameId} className={styles.nameLabel}>
          Scenario name
        </label>
        <input
          id={nameId}
          type="text"
          className={styles.nameInput}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <ScenarioStudio
        scenarioId={scenarioId}
        initialExistingCapitalization={initialExistingCapitalization}
        initialSafeRows={initialSafeRows}
        persistence={{
          scenarioName: name,
          onSave: handleSave,
          savedVersionNumber: initialSavedVersionNumber,
        }}
      />
    </div>
  );
}
