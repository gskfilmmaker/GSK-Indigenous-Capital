/**
 * The controlled state vocabulary from spec §6.3 / §10. `StateBadge` only
 * ever renders one of these labels — never an arbitrary string — so it is
 * structurally impossible to render a non-existent state like "compliant"
 * or "approved" (root `CLAUDE.md` invariant 7 / legal posture: "Never
 * render a financing as 'compliant,' 'eligible,' or 'approved.'").
 */

export type StateTone = "neutral" | "progress" | "attention" | "block" | "recorded";

export interface StateMeta {
  label: string;
  tone: StateTone;
}

/** Spec §10.1 investment state machine. */
export type InvestmentState =
  | "draft"
  | "data_complete"
  | "counsel_review_pending"
  | "counsel_review_recorded"
  | "board_evidence_pending"
  | "authorized_for_signature"
  | "sent"
  | "signed"
  | "funding_pending"
  | "funded"
  | "filing_evidence_pending"
  | "closed_record_complete"
  | "cancelled";

export const INVESTMENT_STATES: Record<InvestmentState, StateMeta> = {
  draft: { label: "Draft", tone: "neutral" },
  data_complete: { label: "Data complete", tone: "progress" },
  counsel_review_pending: { label: "Needs counsel review", tone: "attention" },
  counsel_review_recorded: { label: "Counsel review recorded", tone: "recorded" },
  board_evidence_pending: { label: "Board evidence missing", tone: "attention" },
  authorized_for_signature: { label: "Ready for authorized signing", tone: "progress" },
  sent: { label: "Sent", tone: "progress" },
  signed: { label: "Signed", tone: "recorded" },
  funding_pending: { label: "Funding pending", tone: "progress" },
  funded: { label: "Funded", tone: "recorded" },
  filing_evidence_pending: { label: "Filing evidence pending", tone: "attention" },
  closed_record_complete: { label: "Closed record complete", tone: "recorded" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

/** Spec §10.2 document state machine. */
export type DocumentState =
  | "draft_request"
  | "rendering"
  | "draft_generated"
  | "counsel_review_pending"
  | "counsel_approved_hash"
  | "board_evidence_verified"
  | "final_generated"
  | "sent"
  | "partially_signed"
  | "completed"
  | "delivered"
  | "archived";

export const DOCUMENT_STATES: Record<DocumentState, StateMeta> = {
  draft_request: { label: "Draft requested", tone: "neutral" },
  rendering: { label: "Rendering", tone: "progress" },
  draft_generated: { label: "Draft generated", tone: "progress" },
  counsel_review_pending: { label: "Needs counsel review", tone: "attention" },
  counsel_approved_hash: { label: "Counsel approved", tone: "recorded" },
  board_evidence_verified: { label: "Board evidence verified", tone: "recorded" },
  final_generated: { label: "Final generated", tone: "progress" },
  sent: { label: "Sent", tone: "progress" },
  partially_signed: { label: "Partially signed", tone: "progress" },
  completed: { label: "Completed", tone: "recorded" },
  delivered: { label: "Delivered", tone: "recorded" },
  archived: { label: "Archived", tone: "neutral" },
};

/** Spec §10.3 scenario state machine. */
export type ScenarioState =
  "draft" | "running" | "succeeded" | "failed" | "frozen_snapshot" | "archived";

export const SCENARIO_STATES: Record<ScenarioState, StateMeta> = {
  draft: { label: "Draft", tone: "neutral" },
  running: { label: "Running", tone: "progress" },
  succeeded: { label: "Succeeded", tone: "recorded" },
  failed: { label: "Failed", tone: "block" },
  frozen_snapshot: { label: "Frozen snapshot", tone: "recorded" },
  archived: { label: "Archived", tone: "neutral" },
};
