import Link from "next/link";
import type { Metadata } from "next";
import { ForgotPasswordForm } from "./ForgotPasswordForm";
import styles from "../auth.module.css";

export const metadata: Metadata = {
  title: "Reset your password — GSK Indigenous Capital",
};

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className={styles.title}>Reset your password</h1>
      <p className={styles.subtitle}>
        Enter the email address on your account and we'll send you a link to reset your password.
      </p>
      <ForgotPasswordForm />
      <div className={styles.footerLinks}>
        <Link href="/login" className={styles.link}>
          Back to sign in
        </Link>
      </div>
    </>
  );
}
