"use client";

import { useActionState } from "react";
import { AuthField } from "../AuthField";
import { requestPasswordResetAction, type AuthActionState } from "../actions";
import styles from "../auth.module.css";

const INITIAL_STATE: AuthActionState = {};

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(requestPasswordResetAction, INITIAL_STATE);

  return (
    <form className={styles.form} action={formAction} noValidate>
      {state.error ? (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      ) : null}
      <AuthField label="Email" type="email" name="email" autoComplete="email" required />
      <button type="submit" className={styles.submit} disabled={isPending}>
        {isPending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
