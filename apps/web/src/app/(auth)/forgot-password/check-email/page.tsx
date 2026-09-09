import Link from "next/link";
import type { Metadata } from "next";
import styles from "../../auth.module.css";

export const metadata: Metadata = {
  title: "Check your email — GSK Indigenous Capital",
};

export default function ForgotPasswordCheckEmailPage() {
  return (
    <>
      <h1 className={styles.title}>Check your email</h1>
      <p className={styles.notice} role="status">
        If an account exists for that email address, we've sent a link to reset your password.
      </p>
      <div className={styles.footerLinks}>
        <Link href="/login" className={styles.link}>
          Back to sign in
        </Link>
      </div>
    </>
  );
}
