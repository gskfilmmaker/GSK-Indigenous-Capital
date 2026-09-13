"use server";

import { redirect } from "next/navigation";
import { createClient } from "../../../../../lib/supabase/server";
import { submitStartupIntakeCommand } from "../../../../../server/commands/submitStartupIntake";
import { runScreeningCommand } from "../../../../../server/commands/runScreening";
import { percentPointsToFraction } from "../../../../../lib/scenario/percentInput";
import { newScreeningSnapshotId, type ThesisCriterion } from "@gsk/domain";

export interface IntakeActionState {
  error?: string;
}

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function readTriState(formData: FormData, key: string): boolean | undefined {
  const value = readString(formData, key);
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

const money = (amount: string) => ({ amount, currency: "CAD" as const });

export async function submitIntakeAction(
  _prevState: IntakeActionState,
  formData: FormData,
): Promise<IntakeActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const orgSlug = readString(formData, "orgSlug");
  const { data: organization } = await supabase
    .from("organizations")
    .select("id, slug")
    .eq("slug", orgSlug)
    .single();
  if (!organization) {
    return { error: "That organization could not be found." };
  }

  const intakeData: Record<string, unknown> = {};

  if (formData.get("includeUnitEconomics") === "on") {
    intakeData.unitEconomics = {
      monthlyRevenuePerCustomer: readString(formData, "monthlyRevenuePerCustomer"),
      grossMargin: percentPointsToFraction(readString(formData, "grossMarginPoints")),
      monthlyChurnRate: percentPointsToFraction(readString(formData, "monthlyChurnRatePoints")),
      customerAcquisitionCost: readString(formData, "customerAcquisitionCost"),
      annualGrowthRate: percentPointsToFraction(readString(formData, "annualGrowthRatePoints")),
      profitMargin: percentPointsToFraction(readString(formData, "profitMarginPoints")),
    };
  }

  if (formData.get("includeMarketSizing") === "on") {
    intakeData.marketSizing = {
      annualContractValue: readString(formData, "annualContractValue"),
      reachableCustomers: readString(formData, "reachableCustomers"),
      totalAddressableMarket: readString(formData, "totalAddressableMarket"),
      serviceableShare: percentPointsToFraction(readString(formData, "serviceableSharePoints")),
      nearTermCaptureRate: percentPointsToFraction(readString(formData, "nearTermCaptureRatePoints")),
    };
  }

  if (formData.get("includeBerkus") === "on") {
    intakeData.berkus = {
      soundIdea: readString(formData, "soundIdea") || "0",
      workingPrototype: readString(formData, "workingPrototype") || "0",
      qualityManagementTeam: readString(formData, "qualityManagementTeam") || "0",
      strategicRelationships: readString(formData, "strategicRelationships") || "0",
      productRolloutOrSales: readString(formData, "productRolloutOrSales") || "0",
    };
  }

  if (formData.get("includeScorecard") === "on") {
    intakeData.scorecard = {
      regionalMedianPreMoney: money(readString(formData, "regionalMedianPreMoney")),
      ratings: {
        team: readString(formData, "ratingTeam") || "100",
        marketSize: readString(formData, "ratingMarketSize") || "100",
        product: readString(formData, "ratingProduct") || "100",
        competitiveEnvironment: readString(formData, "ratingCompetitiveEnvironment") || "100",
        salesChannels: readString(formData, "ratingSalesChannels") || "100",
        needForFinancing: readString(formData, "ratingNeedForFinancing") || "100",
        other: readString(formData, "ratingOther") || "100",
      },
    };
  }

  if (formData.get("includeExitAssumption") === "on") {
    intakeData.exitAssumption = {
      exitValue: money(readString(formData, "exitValue")),
      yearsToExit: readString(formData, "yearsToExit"),
      proposedInvestment: money(readString(formData, "proposedInvestment")),
    };
  }

  const capTableEvenSplitFullyVested = readTriState(formData, "capTableEvenSplitFullyVested");
  const cohortRetentionDisclosed = readTriState(formData, "cohortRetentionDisclosed");
  if (capTableEvenSplitFullyVested !== undefined || cohortRetentionDisclosed !== undefined) {
    intakeData.redFlagInputs = { capTableEvenSplitFullyVested, cohortRetentionDisclosed };
  }

  const result = await submitStartupIntakeCommand(
    supabase,
    organization.id,
    user.id,
    {
      companyName: readString(formData, "companyName"),
      industry: readString(formData, "industry"),
      stage: readString(formData, "stage"),
      intakeData,
    },
    readString(formData, "idempotencyKey"),
  );

  if (!result.success) {
    return { error: result.error };
  }

  redirect(`/app/${organization.slug}/screening/intakes/${result.intakeId}`);
}

export interface RunScreeningActionState {
  error?: string;
  success?: boolean;
}

export async function runScreeningAction(
  organizationId: string,
  intakeId: string,
  thesisId: string | null,
  idempotencyKey: string,
  intakeDataRaw: unknown,
  thesisCriteria: ThesisCriterion[] | undefined,
  fundContext:
    | { fundSize: string; targetAnnualReturn: string; targetHoldYears: string }
    | undefined,
): Promise<RunScreeningActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Your session has expired. Sign in again." };
  }

  const result = await runScreeningCommand(
    supabase,
    organizationId,
    intakeId,
    thesisId,
    newScreeningSnapshotId(),
    intakeDataRaw,
    thesisCriteria,
    fundContext,
    idempotencyKey,
  );

  if (!result.success) {
    return { error: result.error };
  }
  return { success: true };
}
