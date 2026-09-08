import styles from "./StepIndicator.module.css";

export interface Step {
  id: string;
  label: string;
}

export interface StepIndicatorProps {
  steps: Step[];
  currentStepId: string;
}

const STATUS_CLASS = {
  complete: styles.itemComplete,
  current: styles.itemCurrent,
  upcoming: undefined,
};

/**
 * The Model → Review → Record progress indicator (spec §6.1, §6.5).
 * Standard accessible "steps" pattern: an ordered list inside
 * `<nav aria-label="Progress">`, with `aria-current="step"` on the active
 * item's label.
 */
export function StepIndicator({ steps, currentStepId }: StepIndicatorProps) {
  const currentIndex = steps.findIndex((step) => step.id === currentStepId);

  return (
    <nav aria-label="Progress">
      <ol className={styles.list}>
        {steps.map((step, index) => {
          const status =
            index < currentIndex ? "complete" : index === currentIndex ? "current" : "upcoming";
          return (
            <li
              key={step.id}
              className={[styles.item, STATUS_CLASS[status]].filter(Boolean).join(" ")}
            >
              <span className={styles.marker} aria-hidden="true">
                {status === "complete" ? (
                  <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                    <path
                      d="M1 5L4.5 8.5L11 1.5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  index + 1
                )}
              </span>
              <span
                className={styles.label}
                aria-current={status === "current" ? "step" : undefined}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
