"use client";

import { useActionState } from "react";
import { AuthField } from "../AuthField";
import { updatePasswordAction, type AuthActionState } from "../actions";
import styles from "../auth.module.css";

const INITIAL_STATE: AuthActionState = {};

export function ResetPasswordForm() {
  const [state, formAction, isPending] = useActionState(updatePasswordAction, INITIAL_STATE);

  return (
    <form className={styles.form} action={formAction} noValidate>
      {state.error ? (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      ) : null}
      <AuthField
        label="New password"
        type="password"
        name="password"
        autoComplete="new-password"
        required
        minLength={8}
        hint="At least 8 characters."
      />
      <AuthField
        label="Confirm new password"
        type="password"
        name="confirmPassword"
        autoComplete="new-password"
        required
        minLength={8}
      />
      <button type="submit" className={styles.submit} disabled={isPending}>
        {isPending ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
