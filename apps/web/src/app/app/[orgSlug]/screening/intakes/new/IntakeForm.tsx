"use client";

import { useActionState, useId, useRef, useState } from "react";
import type { StartupIntakeData } from "@gsk/domain";
import { submitIntakeAction, type IntakeActionState } from "../actions";
import { fractionToPercentPoints } from "../../../../../../lib/scenario/percentInput";
import styles from "../../screening.module.css";

const INITIAL_STATE: IntakeActionState = {};

/**
 * Extracted data is deliberately unvalidated (see ExtractionResult's own
 * doc comment) — a group being present doesn't guarantee every field
 * inside it actually is, so every percent prefill goes through this
 * guard rather than trusting the type checker's (compile-time-only)
 * assumption that a present group's fields are all non-empty strings.
 */
function safeFractionToPoints(value: string | undefined): string {
  return value ? fractionToPercentPoints(value) : "";
}

interface ExtractionResponse {
  data?: Partial<StartupIntakeData>;
  warnings?: string[];
  contradictions?: { description: string; sourceDocuments: string[] }[];
  error?: string;
}

function Toggle({
  id,
  checked,
  onChange,
  label,
}: {
  id: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <div className={styles.toggleRow}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <label htmlFor={id}>{label}</label>
    </div>
  );
}

export function IntakeForm({ orgSlug, idempotencyKey }: { orgSlug: string; idempotencyKey: string }) {
  const [state, formAction, isPending] = useActionState(submitIntakeAction, INITIAL_STATE);

  const [includeUnitEconomics, setIncludeUnitEconomics] = useState(false);
  const [includeMarketSizing, setIncludeMarketSizing] = useState(false);
  const [includeBerkus, setIncludeBerkus] = useState(false);
  const [includeScorecard, setIncludeScorecard] = useState(false);
  const [includeExitAssumption, setIncludeExitAssumption] = useState(false);

  const [prefill, setPrefill] = useState<Partial<StartupIntakeData> | null>(null);
  const [formVersion, setFormVersion] = useState(0);
  const [extraction, setExtraction] = useState<{
    warnings: string[];
    contradictions: { description: string; sourceDocuments: string[] }[];
    error?: string;
  } | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const companyNameId = useId();
  const industryId = useId();
  const stageId = useId();
  const capTableFlagId = useId();
  const cohortFlagId = useId();

  async function handleExtract() {
    const files = fileInputRef.current?.files;
    if (!files || files.length === 0) return;
    setIsExtracting(true);
    setExtraction(null);
    try {
      const body = new FormData();
      for (const file of Array.from(files)) body.append("documents", file);
      const response = await fetch("/api/screening/extract", { method: "POST", body });
      const result = (await response.json()) as ExtractionResponse;

      if (!response.ok) {
        setExtraction({ warnings: [], contradictions: [], error: result.error ?? "Extraction failed." });
        return;
      }

      const data = result.data ?? {};
      setPrefill(data);
      setFormVersion((v) => v + 1);
      setExtraction({ warnings: result.warnings ?? [], contradictions: result.contradictions ?? [] });

      if (data.unitEconomics) setIncludeUnitEconomics(true);
      if (data.marketSizing) setIncludeMarketSizing(true);
      if (data.berkus) setIncludeBerkus(true);
      if (data.scorecard) setIncludeScorecard(true);
      if (data.exitAssumption) setIncludeExitAssumption(true);
    } catch {
      setExtraction({ warnings: [], contradictions: [], error: "Extraction request failed." });
    } finally {
      setIsExtracting(false);
    }
  }

  return (
    <form className={styles.form} action={formAction} noValidate>
      {state.error ? (
        <p className={styles.error} role="alert">
          {state.error}
        </p>
      ) : null}

      <input type="hidden" name="orgSlug" value={orgSlug} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

      <div className={styles.uploadBox}>
        <label htmlFor="documentUpload" className={styles.label}>
          Prefill from documents (optional)
        </label>
        <p className={styles.hint}>
          Upload a pitch deck, financial statement, or cap table (PDF, PNG, or JPEG). This only drafts
          the fields below for you to review and correct — nothing is submitted until you click Submit,
          and nothing here evaluates or scores the startup.
        </p>
        <input
          id="documentUpload"
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg"
        />
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => void handleExtract()}
          disabled={isExtracting}
        >
          {isExtracting ? "Extracting…" : "Extract from documents"}
        </button>
        {extraction?.error ? <p className={styles.hint}>{extraction.error}</p> : null}
        {extraction && extraction.warnings.length > 0 ? (
          <ul className={styles.warningList}>
            {extraction.warnings.map((warning, i) => (
              <li key={i} className={styles.warningItem}>
                Couldn&apos;t find: {warning}
              </li>
            ))}
          </ul>
        ) : null}
        {extraction && extraction.contradictions.length > 0 ? (
          <ul className={styles.warningList}>
            {extraction.contradictions.map((c, i) => (
              <li key={i} className={styles.flagItem}>
                {c.description}
                {c.sourceDocuments.length > 0 ? ` (${c.sourceDocuments.join(", ")})` : ""}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className={styles.field}>
        <label htmlFor={companyNameId} className={styles.label}>
          Company name
        </label>
        <input id={companyNameId} name="companyName" type="text" required className={styles.input} />
      </div>
      <div className={styles.grid}>
        <div className={styles.field}>
          <label htmlFor={industryId} className={styles.label}>
            Industry
          </label>
          <input id={industryId} name="industry" type="text" required className={styles.input} />
        </div>
        <div className={styles.field}>
          <label htmlFor={stageId} className={styles.label}>
            Stage
          </label>
          <select id={stageId} name="stage" required className={styles.select} defaultValue="seed">
            <option value="pre_seed">Pre-seed</option>
            <option value="seed">Seed</option>
            <option value="series_a">Series A</option>
            <option value="growth">Growth</option>
          </select>
        </div>
      </div>

      <Toggle
        id="includeUnitEconomics"
        checked={includeUnitEconomics}
        onChange={setIncludeUnitEconomics}
        label="Unit economics (Rule of 40, LTV:CAC, CAC payback)"
      />
      {includeUnitEconomics ? (
        <fieldset className={styles.fieldset} key={`ue-${formVersion}`}>
          <input type="hidden" name="includeUnitEconomics" value="on" />
          <legend className={styles.legend}>Unit economics</legend>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label htmlFor="monthlyRevenuePerCustomer" className={styles.label}>
                Avg. monthly revenue per customer (CAD)
              </label>
              <input
                id="monthlyRevenuePerCustomer"
                name="monthlyRevenuePerCustomer"
                type="text"
                inputMode="decimal"
                className={styles.input}
                defaultValue={prefill?.unitEconomics?.monthlyRevenuePerCustomer ?? ""}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="grossMarginPoints" className={styles.label}>
                Gross margin (%)
              </label>
              <input
                id="grossMarginPoints"
                name="grossMarginPoints"
                type="text"
                inputMode="decimal"
                className={styles.input}
                defaultValue={safeFractionToPoints(prefill?.unitEconomics?.grossMargin)}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="monthlyChurnRatePoints" className={styles.label}>
                Monthly churn (%)
              </label>
              <input
                id="monthlyChurnRatePoints"
                name="monthlyChurnRatePoints"
                type="text"
                inputMode="decimal"
                className={styles.input}
                defaultValue={safeFractionToPoints(prefill?.unitEconomics?.monthlyChurnRate)}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="customerAcquisitionCost" className={styles.label}>
                CAC (CAD)
              </label>
              <input
                id="customerAcquisitionCost"
                name="customerAcquisitionCost"
                type="text"
                inputMode="decimal"
                className={styles.input}
                defaultValue={prefill?.unitEconomics?.customerAcquisitionCost ?? ""}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="annualGrowthRatePoints" className={styles.label}>
                Annual revenue growth (%)
              </label>
              <input
                id="annualGrowthRatePoints"
                name="annualGrowthRatePoints"
                type="text"
                inputMode="decimal"
                className={styles.input}
                defaultValue={safeFractionToPoints(prefill?.unitEconomics?.annualGrowthRate)}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="profitMarginPoints" className={styles.label}>
                Profit margin (%, may be negative)
              </label>
              <input
                id="profitMarginPoints"
                name="profitMarginPoints"
                type="text"
                inputMode="decimal"
                className={styles.input}
                defaultValue={safeFractionToPoints(prefill?.unitEconomics?.profitMargin)}
              />
            </div>
          </div>
        </fieldset>
      ) : null}

      <Toggle
        id="includeMarketSizing"
        checked={includeMarketSizing}
        onChange={setIncludeMarketSizing}
        label="Market sizing (TAM/SAM/SOM credibility check)"
      />
      {includeMarketSizing ? (
        <fieldset className={styles.fieldset} key={`ms-${formVersion}`}>
          <input type="hidden" name="includeMarketSizing" value="on" />
          <legend className={styles.legend}>Market sizing</legend>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label htmlFor="annualContractValue" className={styles.label}>
                Annual contract value (CAD)
              </label>
              <input
                id="annualContractValue"
                name="annualContractValue"
                type="text"
                inputMode="decimal"
                className={styles.input}
                defaultValue={prefill?.marketSizing?.annualContractValue ?? ""}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="reachableCustomers" className={styles.label}>
                Realistically reachable customers
              </label>
              <input
                id="reachableCustomers"
                name="reachableCustomers"
                type="text"
                inputMode="decimal"
                className={styles.input}
                defaultValue={prefill?.marketSizing?.reachableCustomers ?? ""}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="totalAddressableMarket" className={styles.label}>
                Total addressable market (CAD)
              </label>
              <input
                id="totalAddressableMarket"
                name="totalAddressableMarket"
                type="text"
                inputMode="decimal"
                className={styles.input}
                defaultValue={prefill?.marketSizing?.totalAddressableMarket ?? ""}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="serviceableSharePoints" className={styles.label}>
                Serviceable share of TAM (%)
              </label>
              <input
                id="serviceableSharePoints"
                name="serviceableSharePoints"
                type="text"
                inputMode="decimal"
                className={styles.input}
                defaultValue={safeFractionToPoints(prefill?.marketSizing?.serviceableShare)}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="nearTermCaptureRatePoints" className={styles.label}>
                Near-term capture rate (%)
              </label>
              <input
                id="nearTermCaptureRatePoints"
                name="nearTermCaptureRatePoints"
                type="text"
                inputMode="decimal"
                className={styles.input}
                defaultValue={safeFractionToPoints(prefill?.marketSizing?.nearTermCaptureRate)}
              />
            </div>
          </div>
        </fieldset>
      ) : null}

      <Toggle
        id="includeBerkus"
        checked={includeBerkus}
        onChange={setIncludeBerkus}
        label="Berkus Method (pre-revenue milestones, $0–$500,000 each)"
      />
      {includeBerkus ? (
        <fieldset className={styles.fieldset} key={`bk-${formVersion}`}>
          <input type="hidden" name="includeBerkus" value="on" />
          <legend className={styles.legend}>Berkus Method</legend>
          <div className={styles.grid}>
            {(
              [
                ["soundIdea", "Sound idea"],
                ["workingPrototype", "Working prototype"],
                ["qualityManagementTeam", "Quality management team"],
                ["strategicRelationships", "Strategic relationships"],
                ["productRolloutOrSales", "Product rollout / early sales"],
              ] as const
            ).map(([name, label]) => (
              <div className={styles.field} key={name}>
                <label htmlFor={name} className={styles.label}>
                  {label} (CAD, 0–500,000)
                </label>
                <input
                  id={name}
                  name={name}
                  type="text"
                  inputMode="decimal"
                  className={styles.input}
                  defaultValue={prefill?.berkus?.[name] ?? ""}
                />
              </div>
            ))}
          </div>
        </fieldset>
      ) : null}

      <Toggle
        id="includeScorecard"
        checked={includeScorecard}
        onChange={setIncludeScorecard}
        label="Payne Scorecard (comparison to regional median)"
      />
      {includeScorecard ? (
        <fieldset className={styles.fieldset} key={`sc-${formVersion}`}>
          <input type="hidden" name="includeScorecard" value="on" />
          <legend className={styles.legend}>Payne Scorecard</legend>
          <div className={styles.field}>
            <label htmlFor="regionalMedianPreMoney" className={styles.label}>
              Regional median pre-money for this stage (CAD)
            </label>
            <input
              id="regionalMedianPreMoney"
              name="regionalMedianPreMoney"
              type="text"
              inputMode="decimal"
              className={styles.input}
              defaultValue={prefill?.scorecard?.regionalMedianPreMoney?.amount ?? ""}
            />
          </div>
          <div className={styles.grid}>
            {(
              [
                ["ratingTeam", "team", "Management team & board"],
                ["ratingMarketSize", "marketSize", "Size of the opportunity"],
                ["ratingProduct", "product", "Product / technology"],
                ["ratingCompetitiveEnvironment", "competitiveEnvironment", "Competitive environment"],
                ["ratingSalesChannels", "salesChannels", "Sales channels / partnerships"],
                ["ratingNeedForFinancing", "needForFinancing", "Need for further financing"],
                ["ratingOther", "other", "Other (IP, legal, geography)"],
              ] as const
            ).map(([name, ratingKey, label]) => (
              <div className={styles.field} key={name}>
                <label htmlFor={name} className={styles.label}>
                  {label} (100 = average)
                </label>
                <input
                  id={name}
                  name={name}
                  type="text"
                  inputMode="decimal"
                  className={styles.input}
                  defaultValue={prefill?.scorecard?.ratings?.[ratingKey] ?? ""}
                />
              </div>
            ))}
          </div>
        </fieldset>
      ) : null}

      <Toggle
        id="includeExitAssumption"
        checked={includeExitAssumption}
        onChange={setIncludeExitAssumption}
        label="Exit assumption (VC Method)"
      />
      {includeExitAssumption ? (
        <fieldset className={styles.fieldset} key={`ea-${formVersion}`}>
          <input type="hidden" name="includeExitAssumption" value="on" />
          <legend className={styles.legend}>Exit assumption</legend>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label htmlFor="exitValue" className={styles.label}>
                Assumed exit value (CAD)
              </label>
              <input
                id="exitValue"
                name="exitValue"
                type="text"
                inputMode="decimal"
                className={styles.input}
                defaultValue={prefill?.exitAssumption?.exitValue?.amount ?? ""}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="yearsToExit" className={styles.label}>
                Years to that exit
              </label>
              <input
                id="yearsToExit"
                name="yearsToExit"
                type="text"
                inputMode="decimal"
                className={styles.input}
                defaultValue={prefill?.exitAssumption?.yearsToExit ?? ""}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="proposedInvestment" className={styles.label}>
                Proposed investment (CAD)
              </label>
              <input
                id="proposedInvestment"
                name="proposedInvestment"
                type="text"
                inputMode="decimal"
                className={styles.input}
                defaultValue={prefill?.exitAssumption?.proposedInvestment?.amount ?? ""}
              />
            </div>
          </div>
        </fieldset>
      ) : null}

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>A couple of direct questions (optional)</legend>
        <div className={styles.grid}>
          <div className={styles.field}>
            <label htmlFor={capTableFlagId} className={styles.label}>
              Is the cap table an even split between co-founders with no vesting left?
            </label>
            <select id={capTableFlagId} name="capTableEvenSplitFullyVested" className={styles.select} defaultValue="">
              <option value="">Not specified</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor={cohortFlagId} className={styles.label}>
              Has cohort-level retention (not just a blended figure) been disclosed?
            </label>
            <select id={cohortFlagId} name="cohortRetentionDisclosed" className={styles.select} defaultValue="">
              <option value="">Not specified</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
        </div>
      </fieldset>

      <button type="submit" className={styles.submit} disabled={isPending}>
        {isPending ? "Submitting…" : "Submit intake"}
      </button>
    </form>
  );
}
