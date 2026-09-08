import type { ReactNode } from "react";
import styles from "./WatermarkOverlay.module.css";

export interface WatermarkOverlayProps {
  children: ReactNode;
  /** Defaults to the exact spec §6.9/§16.1 wording. */
  watermarkText?: string;
}

/**
 * Wraps a legal-document preview with the required draft watermark (spec
 * §6.9: "All legal previews/downloads must be watermarked DRAFT — NOT FOR
 * SIGNATURE until counsel approves..."). The diagonal stamp is decorative
 * (`aria-hidden`) — the same text is also rendered as a real, visible,
 * non-hidden banner, so the watermark's meaning reaches screen-reader users
 * too, not only sighted ones (spec §12: never rely on a visual-only signal).
 */
export function WatermarkOverlay({
  children,
  watermarkText = "DRAFT — NOT FOR SIGNATURE",
}: WatermarkOverlayProps) {
  return (
    <div className={styles.overlay}>
      <p className={styles.banner}>{watermarkText}</p>
      <div className={styles.content}>
        <span className={styles.stamp} aria-hidden="true">
          {watermarkText}
        </span>
        {children}
      </div>
    </div>
  );
}
