import type { Metadata } from "next";
import { ResetPasswordForm } from "./ResetPasswordForm";
import styles from "../auth.module.css";

export const metadata: Metadata = {
  title: "Set a new password — GSK Indigenous Capital",
};

/**
 * Reached only after `/auth/confirm` verifies a "recovery"-type token and
 * establishes a session cookie (see auth/confirm/route.ts) — this page
 * itself does not check the recovery token; `updatePasswordAction`
 * relies on that session existing, and Supabase rejects the update
 * server-side if it doesn't.
 */
export default function ResetPasswordPage() {
  return (
    <>
      <h1 className={styles.title}>Set a new password</h1>
      <p className={styles.subtitle}>Choose a new password for your account.</p>
      <ResetPasswordForm />
    </>
  );
}
