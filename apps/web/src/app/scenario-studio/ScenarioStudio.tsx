"use client";

import {
  runScenario,
  UnsupportedCaseError,
  ENGINE_VERSION,
  type ScenarioRunResult,
} from "@gsk/cap-table";
import { newSafeId, newScenarioId, parseScenario, type ScenarioId, type SafeId } from "@gsk/domain";
import {
  DataTable,
  DilutionBridge,
  DisclaimerBanner,
  NumberField,
  OwnershipBar,
  StateBadge,
  formatCad,
  formatPercent,
  formatPercentPointDelta,
  type OwnershipSegment,
} from "@gsk/ui";
import { useMemo, useState } from "react";
import {
  buildScenarioInput,
  type ExistingCapitalizationFormState,
  type SafeRowFormState,
} from "../../lib/scenario/buildScenario";
import { INSTRUMENT_LABELS, SafeRowEditor } from "./SafeRowEditor";
import styles from "./ScenarioStudio.module.css";

export type SaveOutcome =
  { success: true; versionNumber: number } | { success: false; error: string };

export interface ScenarioStudioPersistence {
  scenarioName: string;
  /** Only called with a schema-valid scenario — never on an "invalid" run outcome. */
  onSave: (scenarioInput: unknown) => Promise<SaveOutcome>;
  /** Version number of the most recently saved version, if any (hydrating an existing scenario). */
  savedVersionNumber?: number | undefined;
}

export interface ScenarioStudioProps {
  /** Reuses an already-persisted scenario's id rather than generating a fresh one. */
  scenarioId?: ScenarioId | undefined;
  initialExistingCapitalization?: ExistingCapitalizationFormState | undefined;
  initialSafeRows?: SafeRowFormState[] | undefined;
  /** Omit for the public, unpersisted /scenario-studio trial page. */
  persistence?: ScenarioStudioPersistence | undefined;
}

const DEFAULT_EXISTING_CAPITALIZATION: ExistingCapitalizationFormState = {
  founders: "90",
  grantedOptions: "8",
  unissuedPool: "2",
};

function newSafeRow(): SafeRowFormState {
  return {
    id: newSafeId(),
    investorLabel: "",
    purchaseAmount: "",
    instrumentType: "post_money_cap",
    valuationCap: "",
    discountPercent: "",
  };
}

interface SimpleIssue {
  path: (string | number)[];
  message: string;
}

type RunOutcome =
  | { status: "invalid"; issues: SimpleIssue[] }
  | { status: "unsupported"; error: UnsupportedCaseError }
  | { status: "succeeded"; result: ScenarioRunResult };

/**
 * SAFE Scenario Studio (spec §6.5), scoped to this project's Step 4: cap
 * SAFEs only, no priced round yet. Recomputes live on every keystroke
 * (client-side, for instant feedback); nothing here ever touches a JS
 * `number` for a money/share/ownership value (root CLAUDE.md invariant 2).
 *
 * Persistence is optional (the `persistence` prop): the public
 * `/scenario-studio` trial page omits it and stays exactly as ephemeral
 * as before — "no account needed, nothing is saved." The authenticated
 * `/app/:orgSlug/companies/:companyId/scenarios/:scenarioId` route
 * supplies it; saving always re-runs the engine server-side from the
 * validated input rather than trusting this client-side run's result
 * (see apps/web/src/server/commands/saveScenario.ts).
 */
export function ScenarioStudio({
  scenarioId: scenarioIdProp,
  initialExistingCapitalization,
  initialSafeRows,
  persistence,
}: ScenarioStudioProps = {}) {
  const [scenarioId] = useState(() => scenarioIdProp ?? newScenarioId());
  const [existingCapitalization, setExistingCapitalization] = useState(
    initialExistingCapitalization ?? DEFAULT_EXISTING_CAPITALIZATION,
  );
  const [safeRows, setSafeRows] = useState<SafeRowFormState[]>(initialSafeRows ?? []);
  const [saveState, setSaveState] = useState<
    { status: "idle" } | { status: "saving" } | { status: "error"; error: string }
  >({ status: "idle" });
  const [savedVersionNumber, setSavedVersionNumber] = useState(persistence?.savedVersionNumber);

  const scenarioInput = useMemo(
    () => buildScenarioInput(scenarioId, existingCapitalization, safeRows),
    [scenarioId, existingCapitalization, safeRows],
  );

  const runOutcome = useMemo<RunOutcome>(() => {
    const parsed = parseScenario(scenarioInput);
    if (!parsed.success) {
      return { status: "invalid", issues: parsed.error.issues };
    }
    try {
      return { status: "succeeded", result: runScenario(parsed.data) };
    } catch (error) {
      if (error instanceof UnsupportedCaseError) {
        return { status: "unsupported", error };
      }
      throw error;
    }
  }, [scenarioInput]);

  async function handleSave() {
    if (!persistence || runOutcome.status === "invalid") return;
    setSaveState({ status: "saving" });
    const outcome = await persistence.onSave(scenarioInput);
    if (outcome.success) {
      setSaveState({ status: "idle" });
      setSavedVersionNumber(outcome.versionNumber);
    } else {
      setSaveState({ status: "error", error: outcome.error });
    }
  }

  function updateSafeRow(id: SafeId, patch: Partial<SafeRowFormState>) {
    setSafeRows((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function moveSafeRow(id: SafeId, direction: -1 | 1) {
    setSafeRows((rows) => {
      const index = rows.findIndex((row) => row.id === id);
      const targetIndex = index + direction;
      if (index === -1 || targetIndex < 0 || targetIndex >= rows.length) return rows;
      const next = [...rows];
      const [moved] = next.splice(index, 1);
      if (!moved) return rows;
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>SAFE Scenario Studio</h1>
        <StateBadge
          kind="scenario"
          state={runOutcome.status === "succeeded" ? "succeeded" : "failed"}
        />
      </header>
      {persistence ? (
        <div className={styles.saveRow}>
          <button
            type="button"
            className={styles.saveButton}
            onClick={() => void handleSave()}
            disabled={runOutcome.status === "invalid" || saveState.status === "saving"}
          >
            {saveState.status === "saving" ? "Saving…" : "Save"}
          </button>
          {savedVersionNumber ? (
            <span className={styles.savedIndicator}>Saved as version {savedVersionNumber}</span>
          ) : null}
          {saveState.status === "error" ? (
            <span className={styles.saveError} role="alert">
              {saveState.error}
            </span>
          ) : null}
        </div>
      ) : null}
      <DisclaimerBanner />

      <div className={styles.layout}>
        <section aria-labelledby="assumptions-heading">
          <h2 id="assumptions-heading" className={styles.sectionTitle}>
            Existing capitalization
          </h2>
          <p className={styles.sectionHint}>
            Simple percentage mode — educational, and not execution-ready (spec §6.4). Must total
            100%.
          </p>
          <div className={styles.existingCapGrid}>
            <NumberField
              label="Founders / legacy"
              kind="percent"
              value={existingCapitalization.founders}
              onChange={(value) => setExistingCapitalization((c) => ({ ...c, founders: value }))}
              required
            />
            <NumberField
              label="Granted options"
              kind="percent"
              value={existingCapitalization.grantedOptions}
              onChange={(value) =>
                setExistingCapitalization((c) => ({ ...c, grantedOptions: value }))
              }
              required
            />
            <NumberField
              label="Unissued option pool"
              kind="percent"
              value={existingCapitalization.unissuedPool}
              onChange={(value) =>
                setExistingCapitalization((c) => ({ ...c, unissuedPool: value }))
              }
              required
            />
          </div>

          <h2 className={styles.sectionTitle}>SAFEs</h2>
          {safeRows.length === 0 ? <p className={styles.emptyState}>No SAFEs added yet.</p> : null}
          {safeRows.map((row, index) => (
            <SafeRowEditor
              key={row.id}
              row={row}
              index={index}
              rowCount={safeRows.length}
              onChange={(patch) => updateSafeRow(row.id, patch)}
              onMoveUp={() => moveSafeRow(row.id, -1)}
              onMoveDown={() => moveSafeRow(row.id, 1)}
              onRemove={() => setSafeRows((rows) => rows.filter((r) => r.id !== row.id))}
            />
          ))}
          <button
            type="button"
            className={styles.addButton}
            onClick={() => setSafeRows((rows) => [...rows, newSafeRow()])}
          >
            + Add a SAFE
          </button>
        </section>

        <section className={styles.results} aria-labelledby="results-heading">
          <h2 id="results-heading" className={styles.sectionTitle}>
            Results
          </h2>
          {runOutcome.status === "invalid" ? (
            <ValidationErrors issues={runOutcome.issues} />
          ) : runOutcome.status === "unsupported" ? (
            <UnsupportedCaseNotice error={runOutcome.error} />
          ) : (
            <ScenarioResults result={runOutcome.result} safeRows={safeRows} />
          )}
          <p className={styles.versionFooter}>
            Engine v{ENGINE_VERSION} · Schema v
            {runOutcome.status === "succeeded" ? runOutcome.result.schemaVersion : 1}
          </p>
        </section>
      </div>
    </div>
  );
}

const SAFE_FIELD_LABELS: Record<string, string> = {
  purchaseAmount: "investment amount",
  valuationCap: "valuation cap",
  discountPercent: "discount",
};

function describeIssuePath(issue: SimpleIssue): string {
  const [first, second, third] = issue.path;
  if (first === "safes" && typeof second === "number") {
    const fieldLabel = typeof third === "string" ? SAFE_FIELD_LABELS[third] : undefined;
    return fieldLabel ? `SAFE ${second + 1} ${fieldLabel}` : `SAFE ${second + 1}`;
  }
  if (first === "existingCapitalization") return "Existing capitalization";
  return "";
}

function ValidationErrors({ issues }: { issues: SimpleIssue[] }) {
  if (issues.length === 0) {
    return <p className={styles.emptyState}>Enter your existing capitalization to begin.</p>;
  }
  // A single malformed field (e.g. left empty) fails more than one check in
  // its schema chain — a "must be a plain decimal number" format issue and
  // a "must be greater than zero" content issue, both individually true.
  // Showing every one is noisy for what's really one problem with one
  // field; keep only the first (most fundamental — format before content)
  // issue per field path.
  const seenPaths = new Set<string>();
  const dedupedIssues = issues.filter((issue) => {
    const key = issue.path.join(".");
    if (seenPaths.has(key)) return false;
    seenPaths.add(key);
    return true;
  });
  return (
    // role="alert" lives on this wrapper, not on the <li> elements below —
    // an ARIA role on an <li> overrides its implicit listitem role, which
    // then makes the parent <ul>'s own list semantics invalid (axe:
    // aria-allowed-role, list).
    <div role="alert">
      <ul className={styles.errorList}>
        {dedupedIssues.map((issue, index) => {
          const prefix = describeIssuePath(issue);
          return (
            <li key={index} className={styles.errorItem}>
              {prefix ? `${prefix}: ` : ""}
              {issue.message}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function UnsupportedCaseNotice({ error }: { error: UnsupportedCaseError }) {
  return (
    <div className={styles.errorList}>
      <p className={styles.errorItem} role="alert">
        This scenario can&apos;t be modelled: {error.message}
      </p>
    </div>
  );
}

function ScenarioResults({
  result,
  safeRows,
}: {
  result: ScenarioRunResult;
  safeRows: SafeRowFormState[];
}) {
  const founders = result.existingCapitalizationRows.find((row) => row.key === "founders");
  const grantedOptions = result.existingCapitalizationRows.find(
    (row) => row.key === "grantedOptions",
  );
  const unissuedPool = result.existingCapitalizationRows.find((row) => row.key === "unissuedPool");
  if (!founders || !grantedOptions || !unissuedPool) return null;

  const totalAfter = founders.ownershipAfterSafes
    .plus(grantedOptions.ownershipAfterSafes)
    .plus(unissuedPool.ownershipAfterSafes)
    .plus(result.totalCapSafeOwnership);

  const ownershipSegments: OwnershipSegment[] = [
    {
      id: "founders",
      label: "Founders / legacy",
      value: founders.ownershipAfterSafes.toString(),
      colorVar: "--gsk-color-bar-1",
      formattedValue: formatPercent(founders.ownershipAfterSafes.toString()),
    },
    {
      id: "grantedOptions",
      label: "Granted options",
      value: grantedOptions.ownershipAfterSafes.toString(),
      colorVar: "--gsk-color-bar-2",
      formattedValue: formatPercent(grantedOptions.ownershipAfterSafes.toString()),
    },
    {
      id: "unissuedPool",
      label: "Unissued option pool",
      value: unissuedPool.ownershipAfterSafes.toString(),
      colorVar: "--gsk-color-bar-3",
      formattedValue: formatPercent(unissuedPool.ownershipAfterSafes.toString()),
    },
    {
      id: "safes",
      label: "SAFE investors (indicative)",
      value: result.totalCapSafeOwnership.toString(),
      colorVar: "--gsk-color-bar-4",
      formattedValue: formatPercent(result.totalCapSafeOwnership.toString()),
    },
  ];

  const determinableCount = result.safeRows.filter((row) => row.determinable).length;
  const ownershipNarrative =
    determinableCount === 0
      ? `No cap SAFEs modelled yet. Founders and existing holders currently hold ${formatPercent(totalAfter.toString())} of the company.`
      : `${determinableCount} cap SAFE${determinableCount === 1 ? "" : "s"} represent${determinableCount === 1 ? "s" : ""} an indicative ${formatPercent(result.totalCapSafeOwnership.toString())} of the company before a priced round; existing holders are diluted to ${formatPercent(
          founders.ownershipAfterSafes
            .plus(grantedOptions.ownershipAfterSafes)
            .plus(unissuedPool.ownershipAfterSafes)
            .toString(),
        )} combined.`;

  interface SafeTableRow {
    id: string;
    label: string;
    instrumentTypeLabel: string;
    amountFormatted: string;
    ownershipFormatted: string;
  }

  const safeTableRows: SafeTableRow[] = result.safeRows.map((row) => {
    const formRow = safeRows.find((r) => r.id === row.id);
    return {
      id: row.id,
      label: formRow?.investorLabel.trim() || "—",
      instrumentTypeLabel: INSTRUMENT_LABELS[row.instrumentType],
      amountFormatted: formRow && formRow.purchaseAmount ? formatCad(formRow.purchaseAmount) : "—",
      ownershipFormatted: row.determinable
        ? formatPercent(row.ownership.toString())
        : "Not determinable before a priced round",
    };
  });

  return (
    <>
      <OwnershipBar
        segments={ownershipSegments}
        formattedTotal={formatPercent(totalAfter.toString(), 2)}
        narrative={ownershipNarrative}
        caption="Ownership by holder, indicative before a priced round"
        heroValue={{
          formattedValue: formatPercent(result.totalCapSafeOwnership.toString()),
          label: "Total indicative SAFE ownership",
        }}
      />

      {safeTableRows.length > 0 ? (
        <DataTable<SafeTableRow>
          caption="Each SAFE's indicative ownership"
          captionVisible
          columns={[
            { key: "label", header: "Investor", render: (row) => row.label },
            {
              key: "instrumentTypeLabel",
              header: "Instrument",
              render: (row) => row.instrumentTypeLabel,
            },
            {
              key: "amountFormatted",
              header: "Amount",
              align: "end",
              render: (row) => row.amountFormatted,
            },
            {
              key: "ownershipFormatted",
              header: "Ownership",
              align: "end",
              render: (row) => row.ownershipFormatted,
            },
          ]}
          rows={safeTableRows}
          getRowKey={(row) => row.id}
        />
      ) : null}

      <DilutionBridge
        before={{
          label: "Before SAFEs",
          segments: [
            {
              id: "founders",
              label: "Founders / legacy",
              value: founders.ownershipBeforeSafes.toString(),
              colorVar: "--gsk-color-bar-1",
              formattedValue: formatPercent(founders.ownershipBeforeSafes.toString()),
            },
            {
              id: "grantedOptions",
              label: "Granted options",
              value: grantedOptions.ownershipBeforeSafes.toString(),
              colorVar: "--gsk-color-bar-2",
              formattedValue: formatPercent(grantedOptions.ownershipBeforeSafes.toString()),
            },
            {
              id: "unissuedPool",
              label: "Unissued option pool",
              value: unissuedPool.ownershipBeforeSafes.toString(),
              colorVar: "--gsk-color-bar-3",
              formattedValue: formatPercent(unissuedPool.ownershipBeforeSafes.toString()),
            },
          ],
        }}
        after={{ label: "After SAFEs (indicative)", segments: ownershipSegments }}
        rows={[
          {
            id: "founders",
            label: "Founders / legacy",
            beforeValue: formatPercent(founders.ownershipBeforeSafes.toString()),
            afterValue: formatPercent(founders.ownershipAfterSafes.toString()),
            changeValue: formatPercentPointDelta(
              founders.ownershipBeforeSafes.toString(),
              founders.ownershipAfterSafes.toString(),
            ),
          },
          {
            id: "grantedOptions",
            label: "Granted options",
            beforeValue: formatPercent(grantedOptions.ownershipBeforeSafes.toString()),
            afterValue: formatPercent(grantedOptions.ownershipAfterSafes.toString()),
            changeValue: formatPercentPointDelta(
              grantedOptions.ownershipBeforeSafes.toString(),
              grantedOptions.ownershipAfterSafes.toString(),
            ),
          },
          {
            id: "unissuedPool",
            label: "Unissued option pool",
            beforeValue: formatPercent(unissuedPool.ownershipBeforeSafes.toString()),
            afterValue: formatPercent(unissuedPool.ownershipAfterSafes.toString()),
            changeValue: formatPercentPointDelta(
              unissuedPool.ownershipBeforeSafes.toString(),
              unissuedPool.ownershipAfterSafes.toString(),
            ),
          },
          {
            id: "safes",
            label: "SAFE investors",
            beforeValue: "—",
            afterValue: formatPercent(result.totalCapSafeOwnership.toString()),
            changeValue: formatPercentPointDelta("0", result.totalCapSafeOwnership.toString()),
          },
        ]}
        totalRow={{
          id: "total",
          label: "Total",
          beforeValue: formatPercent("1", 2),
          afterValue: formatPercent(totalAfter.toString(), 2),
          changeValue: formatPercentPointDelta("1", totalAfter.toString()),
        }}
        narrative={`Adding these SAFEs moves founder ownership from ${formatPercent(founders.ownershipBeforeSafes.toString())} to ${formatPercent(founders.ownershipAfterSafes.toString())}.`}
        caption="Dilution from existing capitalization to indicative post-SAFE ownership"
      />
    </>
  );
}
