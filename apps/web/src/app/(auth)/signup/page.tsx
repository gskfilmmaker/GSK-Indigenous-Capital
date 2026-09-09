import Link from "next/link";
import type { Metadata } from "next";
import { SignupForm } from "./SignupForm";
import styles from "../auth.module.css";

export const metadata: Metadata = {
  title: "Create account — GSK Indigenous Capital",
};

export default function SignupPage() {
  return (
    <>
      <h1 className={styles.title}>Create your account</h1>
      <p className={styles.subtitle}>
        Model SAFE financings and manage your company's financing workflow.
      </p>
      <SignupForm />
      <div className={styles.footerLinks}>
        <Link href="/login" className={styles.link}>
          Already have an account? Sign in
        </Link>
      </div>
    </>
  );
}
