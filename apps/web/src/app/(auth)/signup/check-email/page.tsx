import Link from "next/link";
import type { Metadata } from "next";
import styles from "../../auth.module.css";

export const metadata: Metadata = {
  title: "Check your email — GSK Indigenous Capital",
};

export default function CheckEmailPage() {
  return (
    <>
      <h1 className={styles.title}>Check your email</h1>
      <p className={styles.notice} role="status">
        We've sent a confirmation link to the email address you signed up with. Follow it to
        activate your account.
      </p>
      <div className={styles.footerLinks}>
        <Link href="/login" className={styles.link}>
          Back to sign in
        </Link>
      </div>
    </>
  );
}
