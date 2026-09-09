"use client";

import { useActionState } from "react";
import { AuthField } from "../AuthField";
import { signInAction, type AuthActionState } from "../actions";
import styles from "../auth.module.css";

const INITIAL_STATE: AuthActionState = {};

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(signInAction, INITIAL_STATE);

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
        autoComplete="current-password"
        required
      />
      <button type="submit" className={styles.submit} disabled={isPending}>
        {isPending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
