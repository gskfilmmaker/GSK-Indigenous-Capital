import { DisclaimerBanner } from "@gsk/ui";
import styles from "../../screening.module.css";

interface RedFlag {
  code: string;
  description: string;
}

interface ThesisFitRow {
  metric: string;
  label: string;
  comparator: "gte" | "lte";
  threshold: string;
  actualValue: string;
  meetsThreshold: boolean;
}

/**
 * Renders one screening_snapshots.output as evidence, section by
 * section — no aggregate is computed or displayed here, matching
 * packages/deal-screening/CLAUDE.md's lead rule.
 */
export function ScreeningResultView({ output }: { output: Record<string, unknown> }) {
  const vcMethod = output.vcMethod as
    | { impliedMultiple: string; postMoneyValuation: string; preMoneyValuation: string; investorOwnership: string }
    | undefined;
  const fundReturnCheck = output.fundReturnCheck as
    | { requiredMultipleToReturnFund: string }
    | undefined;
  const scorecard = output.scorecard as
    | { weightedComparisonFactor: string; adjustedPreMoneyValuation: string }
    | undefined;
  const berkus = output.berkus as { preMoneyValuation: string; ceiling: string } | undefined;
  const ruleOf40 = output.ruleOf40 as { growthPlusMargin: string; meetsBar: boolean } | undefined;
  const unitEconomics = output.unitEconomics as
    | {
        lifetimeValue: string;
        ltvToCacRatio: string;
        meetsLtvCacFloor: boolean;
        cacPaybackMonths: string;
      }
    | undefined;
  const marketCredibility = output.marketCredibility as
    | { bottomUpEstimate: string; topDownEstimate: string; gapPercent: string; withinCredibleTolerance: boolean }
    | undefined;
  const redFlags = (output.redFlags as RedFlag[] | undefined) ?? [];
  const thesisFit = output.thesisFit as ThesisFitRow[] | undefined;

  const hasAnyResult =
    vcMethod || scorecard || berkus || ruleOf40 || unitEconomics || marketCredibility;

  if (!hasAnyResult) {
    return (
      <p className={styles.emptyState}>
        This intake didn&apos;t have enough data for any formula to run — add a section to the
        intake and run screening again.
      </p>
    );
  }

  return (
    <div>
      <DisclaimerBanner>
        This is computed evidence from publicly documented investor frameworks, not investment,
        legal, or tax advice, and not a recommendation to invest or pass on this startup.
      </DisclaimerBanner>

      {vcMethod ? (
        <div className={styles.resultSection}>
          <h3 className={styles.resultSectionTitle}>VC Method</h3>
          <div className={styles.metricRow}>
            <span className={styles.metricLabel}>Implied multiple</span>
            <span className={styles.metricValue}>{vcMethod.impliedMultiple}×</span>
          </div>
          <div className={styles.metricRow}>
            <span className={styles.metricLabel}>Post-money valuation</span>
            <span className={styles.metricValue}>CAD {vcMethod.postMoneyValuation}</span>
          </div>
          <div className={styles.metricRow}>
            <span className={styles.metricLabel}>Pre-money valuation</span>
            <span className={styles.metricValue}>CAD {vcMethod.preMoneyValuation}</span>
          </div>
          <div className={styles.metricRow}>
            <span className={styles.metricLabel}>Investor ownership at this price</span>
            <span className={styles.metricValue}>
              {(Number(vcMethod.investorOwnership) * 100).toFixed(1)}%
            </span>
          </div>
          {fundReturnCheck ? (
            <div className={styles.metricRow}>
              <span className={styles.metricLabel}>Multiple needed to return the whole fund</span>
              <span className={styles.metricValue}>{fundReturnCheck.requiredMultipleToReturnFund}×</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {scorecard ? (
        <div className={styles.resultSection}>
          <h3 className={styles.resultSectionTitle}>Payne Scorecard</h3>
          <div className={styles.metricRow}>
            <span className={styles.metricLabel}>Weighted comparison factor</span>
            <span className={styles.metricValue}>{scorecard.weightedComparisonFactor}×</span>
          </div>
          <div className={styles.metricRow}>
            <span className={styles.metricLabel}>Adjusted pre-money valuation</span>
            <span className={styles.metricValue}>CAD {scorecard.adjustedPreMoneyValuation}</span>
          </div>
        </div>
      ) : null}

      {berkus ? (
        <div className={styles.resultSection}>
          <h3 className={styles.resultSectionTitle}>Berkus Method</h3>
          <div className={styles.metricRow}>
            <span className={styles.metricLabel}>Pre-money valuation</span>
            <span className={styles.metricValue}>CAD {berkus.preMoneyValuation}</span>
          </div>
          <div className={styles.metricRow}>
            <span className={styles.metricLabel}>Method ceiling</span>
            <span className={styles.metricValue}>CAD {berkus.ceiling}</span>
          </div>
        </div>
      ) : null}

      {ruleOf40 || unitEconomics ? (
        <div className={styles.resultSection}>
          <h3 className={styles.resultSectionTitle}>Unit economics</h3>
          {ruleOf40 ? (
            <div className={styles.metricRow}>
              <span className={styles.metricLabel}>Rule of 40 (growth + margin)</span>
              <span className={styles.metricValue}>
                {(Number(ruleOf40.growthPlusMargin) * 100).toFixed(1)} —{" "}
                {ruleOf40.meetsBar ? "clears the bar" : "below the bar"}
              </span>
            </div>
          ) : null}
          {unitEconomics ? (
            <>
              <div className={styles.metricRow}>
                <span className={styles.metricLabel}>Lifetime value (gross profit)</span>
                <span className={styles.metricValue}>CAD {unitEconomics.lifetimeValue}</span>
              </div>
              <div className={styles.metricRow}>
                <span className={styles.metricLabel}>LTV : CAC ratio</span>
                <span className={styles.metricValue}>
                  {unitEconomics.ltvToCacRatio}× — {unitEconomics.meetsLtvCacFloor ? "at/above 3:1" : "below 3:1"}
                </span>
              </div>
              <div className={styles.metricRow}>
                <span className={styles.metricLabel}>CAC payback period</span>
                <span className={styles.metricValue}>{unitEconomics.cacPaybackMonths} months</span>
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {marketCredibility ? (
        <div className={styles.resultSection}>
          <h3 className={styles.resultSectionTitle}>Market-size credibility</h3>
          <div className={styles.metricRow}>
            <span className={styles.metricLabel}>Bottom-up estimate</span>
            <span className={styles.metricValue}>CAD {marketCredibility.bottomUpEstimate}</span>
          </div>
          <div className={styles.metricRow}>
            <span className={styles.metricLabel}>Top-down estimate (same layer)</span>
            <span className={styles.metricValue}>CAD {marketCredibility.topDownEstimate}</span>
          </div>
          <div className={styles.metricRow}>
            <span className={styles.metricLabel}>Gap between the two</span>
            <span className={styles.metricValue}>
              {marketCredibility.gapPercent}% —{" "}
              {marketCredibility.withinCredibleTolerance ? "within ~20%" : "diverges past ~20%"}
            </span>
          </div>
        </div>
      ) : null}

      {thesisFit && thesisFit.length > 0 ? (
        <div className={styles.resultSection}>
          <h3 className={styles.resultSectionTitle}>Fit against the selected thesis</h3>
          {thesisFit.map((row) => (
            <div className={styles.metricRow} key={row.metric}>
              <span className={styles.metricLabel}>
                {row.label} (must be {row.comparator === "gte" ? "at least" : "at most"} {row.threshold})
              </span>
              <span className={row.meetsThreshold ? styles.thesisFitMeets : styles.thesisFitMisses}>
                {row.actualValue} — {row.meetsThreshold ? "meets" : "does not meet"}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      <div className={styles.resultSection}>
        <h3 className={styles.resultSectionTitle}>Flags</h3>
        {redFlags.length > 0 ? (
          <ul className={styles.flagList}>
            {redFlags.map((flag) => (
              <li key={flag.code} className={styles.flagItem}>
                {flag.description}
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.notice}>
            None of the patterns this tool checks for were detected in the data supplied — this is
            not the same as a clean bill of health, only that these specific checks found nothing.
          </p>
        )}
      </div>
    </div>
  );
}
