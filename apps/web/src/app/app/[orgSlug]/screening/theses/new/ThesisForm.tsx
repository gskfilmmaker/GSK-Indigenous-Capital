"use client";

import { useActionState, useId, useState } from "react";
import { createThesisAction, type ThesisActionState } from "../actions";
import styles from "../../screening.module.css";

const INITIAL_STATE: ThesisActionState = {};

const METRIC_OPTIONS = [
  { value: "ltvToCacRatio", label: "LTV : CAC ratio" },
  { value: "cacPaybackMonths", label: "CAC payback (months)" },
  { value: "ruleOf40GrowthPlusMargin", label: "Rule of 40 (growth + margin)" },
  { value: "investorOwnership", label: "Investor ownership at this price (VC Method)" },
  { value: "marketGapPercent", label: "Market-size gap (bottom-up vs. top-down)" },
] as const;

interface CriterionRow {
  metric: string;
  label: string;
  comparator: "gte" | "lte";
  threshold: string;
}

function defaultRow(): CriterionRow {
  return { metric: METRIC_OPTIONS[0].value, label: METRIC_OPTIONS[0].label, comparator: "gte", threshold: "" };
}

export function ThesisForm({ orgSlug, idempotencyKey }: { orgSlug: string; idempotencyKey: string }) {
  const [state, formAction, isPending] = useActionState(createThesisAction, INITIAL_STATE);
  const [rows, setRows] = useState<CriterionRow[]>([defaultRow()]);
  const [includeFundContext, setIncludeFundContext] = useState(false);

  const nameId = useId();
  const fundSizeId = useId();
  const targetReturnId = useId();
  const targetYearsId = useId();

  function updateRow(index: number, patch: Partial<CriterionRow>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <form className={styles.form} action={formAction} noValidate>
      {state.error ? (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      ) : null}

      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="criteriaJson" value={JSON.stringify(rows)} />

      <div className={styles.field}>
        <label htmlFor={nameId} className={styles.label}>
          Thesis name
        </label>
        <input id={nameId} name="name" type="text" required className={styles.input} placeholder="e.g. Seed thesis — SaaS" />
      </div>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Your own criteria</legend>
        <p className={styles.hint}>
          Every threshold below is yours, not this tool&apos;s — a startup&apos;s numbers are only ever
          compared against what you set here.
        </p>
        {rows.map((row, index) => (
          <div className={styles.criteriaRow} key={index}>
            <div className={styles.field}>
              <label htmlFor={`metric-${index}`} className={styles.label}>
                Metric
              </label>
              <select
                id={`metric-${index}`}
                className={styles.select}
                value={row.metric}
                onChange={(event) => {
                  const option = METRIC_OPTIONS.find((o) => o.value === event.target.value);
                  updateRow(index, { metric: event.target.value, label: option?.label ?? event.target.value });
                }}
              >
                {METRIC_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor={`comparator-${index}`} className={styles.label}>
                Must be
              </label>
              <select
                id={`comparator-${index}`}
                className={styles.select}
                value={row.comparator}
                onChange={(event) => updateRow(index, { comparator: event.target.value as "gte" | "lte" })}
              >
                <option value="gte">at least</option>
                <option value="lte">at most</option>
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor={`threshold-${index}`} className={styles.label}>
                Threshold
              </label>
              <input
                id={`threshold-${index}`}
                type="text"
                inputMode="decimal"
                className={styles.input}
                value={row.threshold}
                onChange={(event) => updateRow(index, { threshold: event.target.value })}
                placeholder="e.g. 3"
              />
            </div>
            <button
              type="button"
              className={styles.removeButton}
              onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
              disabled={rows.length === 1}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => setRows((prev) => [...prev, defaultRow()])}
        >
          + Add criterion
        </button>
      </fieldset>

      <div className={styles.toggleRow}>
        <input
          id="includeFundContext"
          name="includeFundContext"
          type="checkbox"
          checked={includeFundContext}
          onChange={(event) => setIncludeFundContext(event.target.checked)}
        />
        <label htmlFor="includeFundContext">Set fund context for the VC Method (optional)</label>
      </div>
      {includeFundContext ? (
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Fund context</legend>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label htmlFor={fundSizeId} className={styles.label}>
                Fund size (CAD)
              </label>
              <input id={fundSizeId} name="fundSizeAmount" type="text" inputMode="decimal" className={styles.input} />
            </div>
            <div className={styles.field}>
              <label htmlFor={targetReturnId} className={styles.label}>
                Target annual return (%)
              </label>
              <input
                id={targetReturnId}
                name="targetAnnualReturnPoints"
                type="text"
                inputMode="decimal"
                className={styles.input}
                placeholder="e.g. 48"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor={targetYearsId} className={styles.label}>
                Typical years to exit
              </label>
              <input id={targetYearsId} name="targetHoldYears" type="text" inputMode="decimal" className={styles.input} />
            </div>
          </div>
        </fieldset>
      ) : null}

      <button type="submit" className={styles.submit} disabled={isPending}>
        {isPending ? "Saving…" : "Save thesis"}
      </button>
    </form>
  );
}
