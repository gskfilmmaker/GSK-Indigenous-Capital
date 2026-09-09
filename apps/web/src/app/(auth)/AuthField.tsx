import { useId } from "react";
import styles from "./auth.module.css";

export interface AuthFieldProps {
  label: string;
  type: "email" | "password";
  name: string;
  autoComplete: string;
  required?: boolean;
  minLength?: number;
  hint?: string;
}

/**
 * Accessible label/input pair for the auth forms — same label + hint
 * pattern as packages/ui's NumberField (see its own comment), kept local
 * to this route group rather than added to the design system: it has no
 * decimal-string/money/percent formatting concerns, so folding it into
 * NumberField's contract would only weaken that component's contract.
 */
export function AuthField({
  label,
  type,
  name,
  autoComplete,
  required,
  minLength,
  hint,
}: AuthFieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        aria-describedby={hintId}
        className={styles.input}
      />
      {hint ? (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
