"use client";

import { useActionState } from "react";
import { AuthField } from "../AuthField";
import { signUpAction, type AuthActionState } from "../actions";
import styles from "../auth.module.css";

const INITIAL_STATE: AuthActionState = {};

export function SignupForm() {
  const [state, formAction, isPending] = useActionState(signUpAction, INITIAL_STATE);

  return (
    <form className={styles.form} action={formAction} noValidate>
      {state.error ? (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      ) : null}
      <AuthField label="Email" type="email" name="email" autoComplete="email" required />
      <AuthField
        label="Password"
        type="password"
        name="password"
        autoComplete="new-password"
        required
        minLength={8}
        hint="At least 8 characters."
      />
      <AuthField
        label="Confirm password"
        type="password"
        name="confirmPassword"
        autoComplete="new-password"
        required
        minLength={8}
      />
      <button type="submit" className={styles.submit} disabled={isPending}>
        {isPending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
