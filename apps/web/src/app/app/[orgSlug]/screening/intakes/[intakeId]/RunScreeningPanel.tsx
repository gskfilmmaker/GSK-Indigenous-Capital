"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ThesisCriterion } from "@gsk/domain";
import { runScreeningAction } from "../actions";
import styles from "../../screening.module.css";

interface ThesisOption {
  id: string;
  name: string;
  criteria: ThesisCriterion[];
  fundContext: { fundSize: { amount: string }; targetAnnualReturn: string; targetHoldYears: string } | null;
}

export function RunScreeningPanel({
  organizationId,
  intakeId,
  intakeData,
  theses,
}: {
  organizationId: string;
  intakeId: string;
  intakeData: unknown;
  theses: ThesisOption[];
}) {
  const [selectedThesisId, setSelectedThesisId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const selectId = useId();

  function handleRun() {
    setError(null);
    const thesis = theses.find((t) => t.id === selectedThesisId);
    startTransition(async () => {
      const result = await runScreeningAction(
        organizationId,
        intakeId,
        thesis?.id ?? null,
        crypto.randomUUID(),
        intakeData,
        thesis?.criteria,
        thesis?.fundContext
          ? {
              fundSize: thesis.fundContext.fundSize.amount,
              targetAnnualReturn: thesis.fundContext.targetAnnualReturn,
              targetHoldYears: thesis.fundContext.targetHoldYears,
            }
          : undefined,
      );
      if (!result.success) {
        setError(result.error ?? "Screening failed.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className={styles.uploadBox}>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      <div className={styles.field}>
        <label htmlFor={selectId} className={styles.label}>
          Compare against a thesis (optional)
        </label>
        <select
          id={selectId}
          className={styles.select}
          value={selectedThesisId}
          onChange={(event) => setSelectedThesisId(event.target.value)}
        >
          <option value="">No thesis — just show the computed metrics</option>
          {theses.map((thesis) => (
            <option key={thesis.id} value={thesis.id}>
              {thesis.name}
            </option>
          ))}
        </select>
      </div>
      <button type="button" className={styles.submit} onClick={handleRun} disabled={isPending}>
        {isPending ? "Running…" : "Run screening"}
      </button>
    </div>
  );
}
