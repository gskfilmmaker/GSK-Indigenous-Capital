import type { ReactNode } from "react";
import styles from "./DisclaimerBanner.module.css";

export interface DisclaimerBannerProps {
  children?: ReactNode;
}

const DEFAULT_DISCLAIMER =
  "SAFE Studio is not legal, tax, accounting, or investment advice. It models dilution and organizes your financing paperwork for review by your own Canadian lawyer and accountant — it does not replace them, choose a securities exemption, or decide who can invest.";

/**
 * The prominent not-legal-advice disclaimer spec §6.1/§6.9/§11 requires
 * wherever calculated or legal-adjacent output is shown. Always visible
 * text in normal document flow — never hidden, never collapsed behind a
 * tooltip or accordion.
 */
export function DisclaimerBanner({ children }: DisclaimerBannerProps) {
  return <p className={styles.banner}>{children ?? DEFAULT_DISCLAIMER}</p>;
}
