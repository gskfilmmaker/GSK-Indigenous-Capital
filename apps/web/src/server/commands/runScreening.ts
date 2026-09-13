import "server-only";

import { canonicalHash } from "@gsk/audit";
import {
  computeBerkusMethod,
  computeFundReturnCheck,
  computeMarketCredibility,
  computeRuleOf40,
  computeScorecardMethod,
  computeUnitEconomics,
  computeVcMethod,
  evaluateRedFlags,
  evaluateThesisFit,
  EngineDecimal,
  type ThesisCriterion as EngineThesisCriterion,
} from "@gsk/deal-screening";
import type { Json, SupabaseServerClient } from "@gsk/db";
import {
  parseCreateStartupIntakeInput,
  type StartupIntakeData,
  type ThesisCriterion,
} from "@gsk/domain";

export type RunScreeningCommandResult =
  | { success: true; snapshotId: string; output: Record<string, unknown> }
  | { success: false; error: string };

function d(value: string): InstanceType<typeof EngineDecimal> {
  return new EngineDecimal(value);
}

/**
 * Runs every applicable packages/deal-screening formula against one
 * founder's intake data, conditionally on which groups the founder
 * actually filled in — never inventing a missing input (root CLAUDE.md
 * invariant 9). Returns a plain, JSON-safe object; nothing in this shape
 * is ever a collapsed score or verdict (packages/deal-screening/CLAUDE.md,
 * enforced a second time by screening_snapshots' own check constraint).
 */
export function computeScreeningOutput(
  intakeData: StartupIntakeData,
  thesisCriteria: ThesisCriterion[] | undefined,
  fundContext: { fundSize: string; targetAnnualReturn: string; targetHoldYears: string } | undefined,
): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  const thesisValues: Record<string, InstanceType<typeof EngineDecimal>> = {};

  if (intakeData.exitAssumption && fundContext) {
    const vcMethod = computeVcMethod({
      exitValue: d(intakeData.exitAssumption.exitValue.amount),
      yearsToExit: d(intakeData.exitAssumption.yearsToExit),
      targetAnnualReturn: d(fundContext.targetAnnualReturn),
      investment: d(intakeData.exitAssumption.proposedInvestment.amount),
    });
    output.vcMethod = {
      impliedMultiple: vcMethod.impliedMultiple.toString(),
      postMoneyValuation: vcMethod.postMoneyValuation.toString(),
      preMoneyValuation: vcMethod.preMoneyValuation.toString(),
      investorOwnership: vcMethod.investorOwnership.toString(),
    };
    thesisValues.investorOwnership = vcMethod.investorOwnership;

    const fundReturnCheck = computeFundReturnCheck({
      investment: d(intakeData.exitAssumption.proposedInvestment.amount),
      fundSize: d(fundContext.fundSize),
    });
    output.fundReturnCheck = {
      requiredMultipleToReturnFund: fundReturnCheck.requiredMultipleToReturnFund.toString(),
    };
  }

  if (intakeData.scorecard) {
    const scorecard = computeScorecardMethod({
      regionalMedianPreMoney: d(intakeData.scorecard.regionalMedianPreMoney.amount),
      ratings: {
        team: d(intakeData.scorecard.ratings.team),
        marketSize: d(intakeData.scorecard.ratings.marketSize),
        product: d(intakeData.scorecard.ratings.product),
        competitiveEnvironment: d(intakeData.scorecard.ratings.competitiveEnvironment),
        salesChannels: d(intakeData.scorecard.ratings.salesChannels),
        needForFinancing: d(intakeData.scorecard.ratings.needForFinancing),
        other: d(intakeData.scorecard.ratings.other),
      },
    });
    output.scorecard = {
      weightedComparisonFactor: scorecard.weightedComparisonFactor.toString(),
      adjustedPreMoneyValuation: scorecard.adjustedPreMoneyValuation.toString(),
    };
  }

  if (intakeData.berkus) {
    const berkus = computeBerkusMethod({
      soundIdea: d(intakeData.berkus.soundIdea),
      workingPrototype: d(intakeData.berkus.workingPrototype),
      qualityManagementTeam: d(intakeData.berkus.qualityManagementTeam),
      strategicRelationships: d(intakeData.berkus.strategicRelationships),
      productRolloutOrSales: d(intakeData.berkus.productRolloutOrSales),
    });
    output.berkus = {
      preMoneyValuation: berkus.preMoneyValuation.toString(),
      ceiling: berkus.ceiling.toString(),
    };
  }

  let ltvToCacRatio: InstanceType<typeof EngineDecimal> | undefined;
  let marketGapPercent: InstanceType<typeof EngineDecimal> | undefined;

  if (intakeData.unitEconomics) {
    const ruleOf40 = computeRuleOf40({
      annualGrowthRate: d(intakeData.unitEconomics.annualGrowthRate),
      profitMargin: d(intakeData.unitEconomics.profitMargin),
    });
    output.ruleOf40 = {
      growthPlusMargin: ruleOf40.score.toString(),
      meetsBar: ruleOf40.meetsBar,
    };
    thesisValues.ruleOf40GrowthPlusMargin = ruleOf40.score;

    const unitEconomics = computeUnitEconomics({
      monthlyRevenuePerCustomer: d(intakeData.unitEconomics.monthlyRevenuePerCustomer),
      grossMargin: d(intakeData.unitEconomics.grossMargin),
      monthlyChurnRate: d(intakeData.unitEconomics.monthlyChurnRate),
      customerAcquisitionCost: d(intakeData.unitEconomics.customerAcquisitionCost),
    });
    output.unitEconomics = {
      monthlyGrossProfitPerCustomer: unitEconomics.monthlyGrossProfitPerCustomer.toString(),
      lifetimeValue: unitEconomics.lifetimeValue.toString(),
      ltvToCacRatio: unitEconomics.ltvToCacRatio.toString(),
      meetsLtvCacFloor: unitEconomics.meetsLtvCacFloor,
      cacPaybackMonths: unitEconomics.cacPaybackMonths.toString(),
    };
    ltvToCacRatio = unitEconomics.ltvToCacRatio;
    thesisValues.ltvToCacRatio = unitEconomics.ltvToCacRatio;
    thesisValues.cacPaybackMonths = unitEconomics.cacPaybackMonths;
  }

  if (intakeData.marketSizing) {
    const marketCredibility = computeMarketCredibility({
      annualContractValue: d(intakeData.marketSizing.annualContractValue),
      reachableCustomers: d(intakeData.marketSizing.reachableCustomers),
      totalAddressableMarket: d(intakeData.marketSizing.totalAddressableMarket),
      serviceableShare: d(intakeData.marketSizing.serviceableShare),
      nearTermCaptureRate: d(intakeData.marketSizing.nearTermCaptureRate),
    });
    output.marketCredibility = {
      bottomUpEstimate: marketCredibility.bottomUpEstimate.toString(),
      topDownEstimate: marketCredibility.topDownEstimate.toString(),
      gapPercent: marketCredibility.gapPercent.toString(),
      withinCredibleTolerance: marketCredibility.withinCredibleTolerance,
    };
    marketGapPercent = marketCredibility.gapPercent;
    thesisValues.marketGapPercent = marketCredibility.gapPercent;
  }

  output.redFlags = evaluateRedFlags({
    capTableEvenSplitFullyVested: intakeData.redFlagInputs?.capTableEvenSplitFullyVested,
    monthlyChurnRate: intakeData.unitEconomics
      ? d(intakeData.unitEconomics.monthlyChurnRate)
      : undefined,
    cohortRetentionDisclosed: intakeData.redFlagInputs?.cohortRetentionDisclosed,
    marketSizingGapPercent: marketGapPercent,
    ltvToCacRatio,
  });

  if (thesisCriteria && thesisCriteria.length > 0) {
    const engineCriteria: EngineThesisCriterion[] = thesisCriteria.map((c) => ({
      metric: c.metric,
      label: c.label,
      comparator: c.comparator,
      threshold: d(c.threshold),
    }));
    const rows = evaluateThesisFit(engineCriteria, thesisValues);
    output.thesisFit = rows.map((row) => ({
      metric: row.metric,
      label: row.label,
      comparator: row.comparator,
      threshold: row.threshold.toString(),
      actualValue: row.actualValue.toString(),
      meetsThreshold: row.meetsThreshold,
    }));
  }

  return output;
}

export async function runScreeningCommand(
  supabase: SupabaseServerClient,
  organizationId: string,
  startupIntakeId: string,
  investorThesisId: string | null,
  snapshotId: string,
  rawIntakeData: unknown,
  thesisCriteria: ThesisCriterion[] | undefined,
  fundContext:
    | { fundSize: string; targetAnnualReturn: string; targetHoldYears: string }
    | undefined,
  idempotencyKey: string,
): Promise<RunScreeningCommandResult> {
  const parsed = parseCreateStartupIntakeInput({
    companyName: "_",
    industry: "_",
    stage: "seed",
    intakeData: rawIntakeData,
  });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "This intake data isn't valid yet.",
    };
  }
  const intakeData = parsed.data.intakeData;
  const output = computeScreeningOutput(intakeData, thesisCriteria, fundContext);
  const inputForHash = {
    intakeData,
    thesisCriteria: thesisCriteria ?? null,
    fundContext: fundContext ?? null,
  };
  const inputHash = canonicalHash(inputForHash);
  const outputHash = canonicalHash(output);

  const { data: prevEventHash, error: tipError } = await supabase.rpc("get_last_audit_event_hash", {
    p_organization_id: organizationId,
  });
  if (tipError) {
    return { success: false, error: tipError.message };
  }

  const eventHash = canonicalHash({
    prevEventHash: prevEventHash ?? null,
    action: "screening.run",
    resource: { type: "screening_snapshot", id: snapshotId },
    payload: { startupIntakeId },
    occurredAt: new Date().toISOString(),
  });

  const { data, error } = await supabase.rpc("run_screening", {
    p_startup_intake_id: startupIntakeId,
    p_investor_thesis_id: investorThesisId,
    p_snapshot_id: snapshotId,
    p_input: inputForHash as unknown as Json,
    p_output: output as unknown as Json,
    p_engine_version: "1",
    p_input_hash: inputHash,
    p_output_hash: outputHash,
    p_idempotency_key: idempotencyKey,
    p_request_hash: inputHash,
    p_prev_event_hash: prevEventHash ?? null,
    p_event_hash: eventHash,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, snapshotId: data.id, output };
}
