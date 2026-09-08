import {
  DOCUMENT_STATES,
  INVESTMENT_STATES,
  SCENARIO_STATES,
  type DocumentState,
  type InvestmentState,
  type ScenarioState,
} from "./states.js";
import styles from "./StateBadge.module.css";

export type StateBadgeProps =
  | { kind: "investment"; state: InvestmentState }
  | { kind: "document"; state: DocumentState }
  | { kind: "scenario"; state: ScenarioState };

const TONE_CLASS = {
  neutral: styles.neutral,
  progress: styles.progress,
  attention: styles.attention,
  block: styles.block,
  recorded: styles.recorded,
};

/**
 * Renders one of the controlled state labels from spec §6.3/§10 — never an
 * arbitrary string. See ./states.ts. A plain `<span>` is deliberate: state
 * text is read by assistive technology like any other text, and the colour
 * coding is reinforcement, never the only signal (spec §12: "never rely on
 * colour alone").
 */
export function StateBadge(props: StateBadgeProps) {
  const meta =
    props.kind === "investment"
      ? INVESTMENT_STATES[props.state]
      : props.kind === "document"
        ? DOCUMENT_STATES[props.state]
        : SCENARIO_STATES[props.state];

  return <span className={`${styles.badge} ${TONE_CLASS[meta.tone]}`}>{meta.label}</span>;
}
