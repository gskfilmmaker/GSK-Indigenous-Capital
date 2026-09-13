import type { Metadata } from "next";
import Link from "next/link";
import { ScenarioStudio } from "./ScenarioStudio";
import styles from "./public.module.css";

export const metadata: Metadata = {
  title: "SAFE Scenario Studio — GSK Indigenous Capital",
  description:
    "Model cap-SAFE dilution before a priced round. Not legal, tax, accounting, or investment advice.",
};

/**
 * This route is reached two ways: directly from the public landing page
 * (no account), and from the authenticated app shell's own "Scenario
 * Studio" nav link — which, unlike every other in-app link, leads out of
 * the authenticated area entirely into this same public trial page. The
 * shared `<ScenarioStudio />` component below is also reused inside the
 * authenticated, company-scoped persisted scenario page, which already
 * has its own app-shell header — so this wordmark link only belongs
 * here, at the public entry point, not inside the shared component
 * itself. Without it, a visitor arriving from either route had no way
 * back except the browser's back button.
 */
export default function ScenarioStudioPage() {
  return (
    <>
      <header className={styles.header}>
        <Link href="/" className={styles.wordmark}>
          GSK Indigenous Capital
        </Link>
      </header>
      <ScenarioStudio />
    </>
  );
}
