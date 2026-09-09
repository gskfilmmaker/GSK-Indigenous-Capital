import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./onboarding.module.css";

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <main className={styles.page}>
      <Link href="/" className={styles.wordmark}>
        GSK Indigenous Capital
      </Link>
      {children}
    </main>
  );
}
