import type { ReactNode } from "react";
import styles from "./DataTable.module.css";

export interface DataTableColumn<Row> {
  key: string;
  header: string;
  align?: "start" | "end";
  render?: (row: Row) => ReactNode;
}

export interface DataTableProps<Row> {
  /** Always required, even when visually hidden — a table needs a name. */
  caption: string;
  /** Render the caption visibly (e.g. as a small heading) instead of screen-reader-only. */
  captionVisible?: boolean;
  columns: DataTableColumn<Row>[];
  rows: Row[];
  getRowKey: (row: Row, index: number) => string;
  /** Row whose key matches this is styled as a summary/total row. */
  totalRowKey?: string;
}

/**
 * A plain, semantic, accessible data table — native `<table>` markup with a
 * caption, column headers (`scope="col"`), and no ARIA grid re-invention.
 * Used both standalone and as the "equivalent data table" the master spec
 * requires alongside every chart (OwnershipBar, DilutionBridge).
 */
export function DataTable<Row>({
  caption,
  captionVisible = false,
  columns,
  rows,
  getRowKey,
  totalRowKey,
}: DataTableProps<Row>) {
  return (
    <table className={styles.table}>
      <caption className={captionVisible ? styles.captionVisible : styles.captionHidden}>
        {caption}
      </caption>
      <thead>
        <tr>
          {columns.map((column) => (
            <th
              key={column.key}
              scope="col"
              className={column.align === "end" ? styles.alignEnd : undefined}
            >
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => {
          const rowKey = getRowKey(row, index);
          const isTotal = rowKey === totalRowKey;
          return (
            <tr key={rowKey} className={isTotal ? styles.rowTotal : undefined}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={column.align === "end" ? styles.alignEnd : undefined}
                >
                  {column.render ? column.render(row) : null}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
