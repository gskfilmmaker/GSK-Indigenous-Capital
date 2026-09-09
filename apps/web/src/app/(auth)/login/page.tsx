import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";
import styles from "../auth.module.css";

export const metadata: Metadata = {
  title: "Sign in — GSK Indigenous Capital",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <>
      <h1 className={styles.title}>Sign in</h1>
      <p className={styles.subtitle}>Continue to your Scenario Studio and financing workflow.</p>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      <LoginForm />
      <div className={styles.footerLinks}>
        <Link href="/forgot-password" className={styles.link}>
          Forgot your password?
        </Link>
        <Link href="/signup" className={styles.link}>
          Don't have an account? Create one
        </Link>
      </div>
    </>
  );
}
