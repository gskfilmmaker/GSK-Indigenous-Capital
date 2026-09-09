import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./auth.module.css";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className={styles.page}>
      <Link href="/" className={styles.wordmark}>
        GSK Indigenous Capital
      </Link>
      {children}
    </main>
  );
}
