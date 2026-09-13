import { z } from "zod";
import { startupIntakeIdSchema } from "./ids.js";
import {
  decimalStringSchema,
  nonNegativeDecimalStringSchema,
  percentStringSchema,
  positiveDecimalStringSchema,
} from "./decimal.js";
import { moneySchema } from "./money.js";

export const startupStageSchema = z.enum(["pre_seed", "seed", "series_a", "growth"]);
export type StartupStage = z.infer<typeof startupStageSchema>;

/**
 * Feeds packages/deal-screening's unitEconomics.ts. Optional as a group:
 * a pre-seed startup with no revenue yet has none of this, and the
 * screening command simply skips the metrics that need it rather than
 * inventing a number (root CLAUDE.md invariant 9).
 */
export const unitEconomicsInputsSchema = z.object({
  monthlyRevenuePerCustomer: positiveDecimalStringSchema,
  grossMargin: percentStringSchema,
  monthlyChurnRate: percentStringSchema,
  customerAcquisitionCost: positiveDecimalStringSchema,
  annualGrowthRate: decimalStringSchema,
  profitMargin: decimalStringSchema,
});
export type UnitEconomicsInputs = z.infer<typeof unitEconomicsInputsSchema>;

/** Feeds packages/deal-screening's marketCredibility.ts. */
export const marketSizingInputsSchema = z.object({
  annualContractValue: positiveDecimalStringSchema,
  reachableCustomers: positiveDecimalStringSchema,
  totalAddressableMarket: positiveDecimalStringSchema,
  serviceableShare: percentStringSchema,
  nearTermCaptureRate: percentStringSchema,
});
export type MarketSizingInputs = z.infer<typeof marketSizingInputsSchema>;

/** Feeds packages/deal-screening's berkusMethod.ts — pre-revenue only. */
export const berkusInputsSchema = z.object({
  soundIdea: nonNegativeDecimalStringSchema,
  workingPrototype: nonNegativeDecimalStringSchema,
  qualityManagementTeam: nonNegativeDecimalStringSchema,
  strategicRelationships: nonNegativeDecimalStringSchema,
  productRolloutOrSales: nonNegativeDecimalStringSchema,
});
export type BerkusInputs = z.infer<typeof berkusInputsSchema>;

/** Feeds packages/deal-screening's scorecardMethod.ts. */
export const scorecardInputsSchema = z.object({
  regionalMedianPreMoney: moneySchema,
  ratings: z.object({
    team: nonNegativeDecimalStringSchema,
    marketSize: nonNegativeDecimalStringSchema,
    product: nonNegativeDecimalStringSchema,
    competitiveEnvironment: nonNegativeDecimalStringSchema,
    salesChannels: nonNegativeDecimalStringSchema,
    needForFinancing: nonNegativeDecimalStringSchema,
    other: nonNegativeDecimalStringSchema,
  }),
});
export type ScorecardInputs = z.infer<typeof scorecardInputsSchema>;

/** Feeds packages/deal-screening's vcMethod.ts, alongside the investor thesis's fundContext. */
export const exitAssumptionSchema = z.object({
  exitValue: moneySchema,
  yearsToExit: positiveDecimalStringSchema,
  proposedInvestment: moneySchema,
});
export type ExitAssumption = z.infer<typeof exitAssumptionSchema>;

/** Feeds packages/deal-screening's redFlags.ts. */
export const redFlagInputsSchema = z.object({
  capTableEvenSplitFullyVested: z.boolean().optional(),
  cohortRetentionDisclosed: z.boolean().optional(),
});
export type RedFlagInputs = z.infer<typeof redFlagInputsSchema>;

/**
 * A founder's submitted data for one startup (ADR 0009). Every group is
 * optional so a pre-seed idea-stage submission and a Series A submission
 * both validate — the screening command computes whichever formulas
 * have the inputs they need and simply omits the rest, never
 * approximating a missing group (root CLAUDE.md invariant 9). Per ADR
 * 0009 rule 5, Indigenous identity/community data fields are never part
 * of this schema — they belong to a separate, disclosed feature, not
 * bundled into deal-screening intake.
 */
export const startupIntakeDataSchema = z.object({
  unitEconomics: unitEconomicsInputsSchema.optional(),
  marketSizing: marketSizingInputsSchema.optional(),
  berkus: berkusInputsSchema.optional(),
  scorecard: scorecardInputsSchema.optional(),
  exitAssumption: exitAssumptionSchema.optional(),
  redFlagInputs: redFlagInputsSchema.optional(),
});
export type StartupIntakeData = z.infer<typeof startupIntakeDataSchema>;

export const createStartupIntakeInputSchema = z.object({
  companyName: z.string().trim().min(1).max(200),
  industry: z.string().trim().min(1).max(100),
  stage: startupStageSchema,
  intakeData: startupIntakeDataSchema,
});
export type CreateStartupIntakeInput = z.infer<typeof createStartupIntakeInputSchema>;

export const startupIntakeSchema = createStartupIntakeInputSchema.extend({
  id: startupIntakeIdSchema,
});
export type StartupIntake = z.infer<typeof startupIntakeSchema>;

export function parseCreateStartupIntakeInput(input: unknown) {
  return createStartupIntakeInputSchema.safeParse(input);
}
