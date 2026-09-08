import { fractionToCssPercent } from "../../format/decimal.js";
import { DataTable } from "../DataTable/DataTable.js";
import type { OwnershipSegment } from "../OwnershipBar/OwnershipBar.js";
import styles from "./DilutionBridge.module.css";

export interface DilutionBridgeColumn {
  label: string;
  segments: OwnershipSegment[];
}

export interface DilutionBridgeRow {
  id: string;
  label: string;
  /** Pre-formatted; `"—"` when not applicable (e.g. a SAFE before it exists). */
  beforeValue: string;
  afterValue: string;
  changeValue: string;
}

export interface DilutionBridgeProps {
  before: DilutionBridgeColumn;
  after: DilutionBridgeColumn;
  rows: DilutionBridgeRow[];
  totalRow: DilutionBridgeRow;
  /** The plain-language sentence spec §6.5 requires (e.g. "Adding this SAFE reduces founder ownership from 90% to 81%"). */
  narrative: string;
  caption: string;
}

/**
 * The before/after ownership visualization for a financing event: two
 * stacked bars (decorative, `aria-hidden`) plus one accessible comparison
 * table and a live-announced narrative sentence — spec §6.5's "dilution
 * bridge from current to post-SAFE to post-round".
 */
export function DilutionBridge({
  before,
  after,
  rows,
  totalRow,
  narrative,
  caption,
}: DilutionBridgeProps) {
  const tableRows = [...rows, totalRow];

  return (
    <div className={styles.bridge}>
      <div className={styles.bars} aria-hidden="true">
        <BridgeColumn column={before} />
        <div className={styles.arrow}>
          <svg width="20" height="14" viewBox="0 0 20 14" fill="none" aria-hidden="true">
            <path
              d="M1 7H18M18 7L12 1M18 7L12 13"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <BridgeColumn column={after} />
      </div>

      <DataTable<DilutionBridgeRow>
        caption={caption}
        columns={[
          { key: "label", header: "Holder", render: (row) => row.label },
          { key: "before", header: before.label, align: "end", render: (row) => row.beforeValue },
          { key: "after", header: after.label, align: "end", render: (row) => row.afterValue },
          { key: "change", header: "Change", align: "end", render: (row) => row.changeValue },
        ]}
        rows={tableRows}
        getRowKey={(row) => row.id}
        totalRowKey={totalRow.id}
      />

      <p className={styles.narrative} role="status" aria-live="polite">
        {narrative}
      </p>
    </div>
  );
}

function BridgeColumn({ column }: { column: DilutionBridgeColumn }) {
  return (
    <div className={styles.column}>
      <span className={styles.columnLabel}>{column.label}</span>
      <div className={styles.track}>
        {column.segments.map((segment) => (
          <div
            key={segment.id}
            className={styles.segment}
            style={{
              width: `${fractionToCssPercent(segment.value)}%`,
              background: `var(${segment.colorVar})`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
