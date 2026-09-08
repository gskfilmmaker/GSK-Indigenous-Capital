import { fractionToCssPercent } from "../../format/decimal.js";
import { DataTable } from "../DataTable/DataTable.js";
import styles from "./OwnershipBar.module.css";

export interface OwnershipSegment {
  id: string;
  label: string;
  /** Decimal string fraction in [0, 1] — used only to set the bar's CSS width. */
  value: string;
  /** A `--gsk-color-bar-*` custom property name. */
  colorVar: string;
  /** Already display-formatted, e.g. `"81.0%"` — never derived here. */
  formattedValue: string;
}

interface OwnershipRow {
  id: string;
  label: string;
  formattedValue: string;
}

export interface OwnershipBarProps {
  segments: OwnershipSegment[];
  /** Authoritative, already-formatted total (e.g. `"100.00%"`) — never summed in this component. */
  formattedTotal: string;
  /** The plain-language sentence spec §6.5 requires alongside every chart. */
  narrative: string;
  /** Table caption — the chart's accessible-table equivalent. */
  caption: string;
  heroValue?: { formattedValue: string; label: string };
}

/**
 * A live ownership visualization: the stacked bar itself is decorative
 * (`aria-hidden`) and is always paired with an equivalent `DataTable` and a
 * plain-language narrative sentence (spec §6.5, §12 — "every chart has a
 * table and a sentence"). The narrative is an `aria-live="polite"` region,
 * so when a parent re-renders this component with new numbers, screen
 * readers announce the change (spec §6.5: "Recalculation is announced to
 * screen readers").
 */
export function OwnershipBar({
  segments,
  formattedTotal,
  narrative,
  caption,
  heroValue,
}: OwnershipBarProps) {
  const rows: OwnershipRow[] = [
    ...segments.map((segment) => ({
      id: segment.id,
      label: segment.label,
      formattedValue: segment.formattedValue,
    })),
    { id: "total", label: "Total", formattedValue: formattedTotal },
  ];

  return (
    <div className={styles.bar}>
      {heroValue ? (
        <div className={styles.hero}>
          <span className={styles.heroValue}>{heroValue.formattedValue}</span>
          <span className={styles.heroLabel}>{heroValue.label}</span>
        </div>
      ) : null}

      <div className={styles.track} aria-hidden="true">
        {segments.map((segment) => (
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

      <DataTable<OwnershipRow>
        caption={caption}
        columns={[
          { key: "label", header: "Holder", render: (row) => row.label },
          { key: "value", header: "Ownership", align: "end", render: (row) => row.formattedValue },
        ]}
        rows={rows}
        getRowKey={(row) => row.id}
        totalRowKey="total"
      />

      <p className={styles.narrative} role="status" aria-live="polite">
        {narrative}
      </p>
    </div>
  );
}
