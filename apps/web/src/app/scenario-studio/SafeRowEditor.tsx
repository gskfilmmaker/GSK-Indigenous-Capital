import { NumberField } from "@gsk/ui";
import { useId } from "react";
import type { SafeInstrumentType, SafeRowFormState } from "../../lib/scenario/buildScenario";
import styles from "./SafeRowEditor.module.css";

export const INSTRUMENT_LABELS: Record<SafeInstrumentType, string> = {
  post_money_cap: "Post-money valuation cap",
  discount_only: "Discount only",
  mfn: "Most favoured nation (MFN)",
};

export interface SafeRowEditorProps {
  row: SafeRowFormState;
  index: number;
  rowCount: number;
  onChange: (patch: Partial<SafeRowFormState>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}

/**
 * One SAFE row's fields (spec §6.5 "SAFE row fields"). Reordering is
 * up/down buttons rather than mouse drag-and-drop — this satisfies spec
 * §6.5's "keyboard reorder" requirement directly and accessibly; full
 * pointer drag-and-drop is not yet implemented (see this session's final
 * report).
 *
 * Type switching clears the fields the new type doesn't use (spec §6.5:
 * "must clear or disable inapplicable fields and must not silently reuse
 * stale values") — handled in the `onInstrumentTypeChange` here, not left
 * to the parent.
 */
export function SafeRowEditor({
  row,
  index,
  rowCount,
  onChange,
  onMoveUp,
  onMoveDown,
  onRemove,
}: SafeRowEditorProps) {
  const labelId = useId();
  const typeId = useId();

  function handleInstrumentTypeChange(next: SafeInstrumentType) {
    onChange({
      instrumentType: next,
      valuationCap: next === "post_money_cap" ? row.valuationCap : "",
      discountPercent: next === "discount_only" ? row.discountPercent : "",
    });
  }

  return (
    <fieldset className={styles.row}>
      <div className={styles.rowHeader}>
        <legend className={styles.rowTitle}>SAFE {index + 1}</legend>
        <div className={styles.rowControls}>
          <button
            type="button"
            className={styles.iconButton}
            onClick={onMoveUp}
            disabled={index === 0}
            aria-label={`Move SAFE ${index + 1} earlier`}
          >
            ↑
          </button>
          <button
            type="button"
            className={styles.iconButton}
            onClick={onMoveDown}
            disabled={index === rowCount - 1}
            aria-label={`Move SAFE ${index + 1} later`}
          >
            ↓
          </button>
          <button
            type="button"
            className={styles.removeButton}
            onClick={onRemove}
            aria-label={`Remove SAFE ${index + 1}`}
          >
            Remove
          </button>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={labelId}>
            Investor label (optional)
          </label>
          <input
            id={labelId}
            type="text"
            className={styles.textInput}
            value={row.investorLabel}
            onChange={(event) => onChange({ investorLabel: event.target.value })}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor={typeId}>
            Instrument type
          </label>
          <select
            id={typeId}
            className={styles.select}
            value={row.instrumentType}
            onChange={(event) =>
              handleInstrumentTypeChange(event.target.value as SafeInstrumentType)
            }
          >
            {(Object.keys(INSTRUMENT_LABELS) as SafeInstrumentType[]).map((type) => (
              <option key={type} value={type}>
                {INSTRUMENT_LABELS[type]}
              </option>
            ))}
          </select>
        </div>

        <NumberField
          label="Investment amount"
          kind="money"
          value={row.purchaseAmount}
          onChange={(value) => onChange({ purchaseAmount: value })}
          required
        />

        {row.instrumentType === "post_money_cap" ? (
          <NumberField
            label="Post-money valuation cap"
            kind="money"
            value={row.valuationCap}
            onChange={(value) => onChange({ valuationCap: value })}
            required
          />
        ) : null}

        {row.instrumentType === "discount_only" ? (
          <NumberField
            label="Discount"
            kind="percent"
            value={row.discountPercent}
            onChange={(value) => onChange({ discountPercent: value })}
            hint="Not determinable as ownership until a priced round happens."
            required
          />
        ) : null}

        {row.instrumentType === "mfn" ? (
          <p className={styles.label}>
            MFN ownership is not determinable until a priced round happens.
          </p>
        ) : null}
      </div>
    </fieldset>
  );
}
