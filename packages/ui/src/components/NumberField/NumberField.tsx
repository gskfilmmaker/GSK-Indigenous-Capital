import { useId, type ChangeEvent } from "react";
import styles from "./NumberField.module.css";

export interface NumberFieldProps {
  label: string;
  /**
   * A decimal string — the source of truth. Root `CLAUDE.md` invariant 2:
   * never a JS `number`. This component formats for *display* only (the
   * CAD/percent adornments); it never parses `value` into a float.
   */
  value: string;
  onChange: (nextValue: string) => void;
  kind?: "money" | "percent" | "plain";
  currency?: "CAD";
  hint?: string;
  error?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
}

const DECIMAL_INPUT_PATTERN = /^-?\d*\.?\d*$/;

/**
 * An accessible, decimal-string-preserving numeric input. Uses
 * `type="text"` with `inputMode="decimal"` rather than `type="number"` —
 * native number inputs silently coerce through a JS float and mangle
 * locale-formatted or partially-typed values, which this project's numeric
 * invariant does not allow.
 */
export function NumberField({
  label,
  value,
  onChange,
  kind = "plain",
  currency = "CAD",
  hint,
  error,
  id,
  required,
  disabled,
}: NumberFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;
    if (next === "" || DECIMAL_INPUT_PATTERN.test(next)) {
      onChange(next);
    }
  }

  return (
    <div className={styles.field}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <div className={styles.control}>
        {kind === "money" ? (
          <span className={styles.adornment} aria-hidden="true">
            {currency}
          </span>
        ) : null}
        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          className={styles.input}
          value={value}
          onChange={handleChange}
          aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
          aria-invalid={error ? true : undefined}
          required={required}
          disabled={disabled}
        />
        {kind === "percent" ? (
          <span className={styles.adornment} aria-hidden="true">
            %
          </span>
        ) : null}
      </div>
      {hint ? (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
