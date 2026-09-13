import { z } from "zod";
import { investorThesisIdSchema } from "./ids.js";
import { decimalStringSchema, percentStringSchema, positiveDecimalStringSchema } from "./decimal.js";
import { moneySchema } from "./money.js";

/**
 * One investor-defined threshold on a single named metric (see
 * packages/deal-screening's thesisFit.ts, which this schema feeds).
 * `metric` must match a key this project's screening command actually
 * computes (enforced at the command layer, not here — this schema only
 * validates shape) — see apps/web's runScreeningCommand.
 */
export const thesisCriterionSchema = z.object({
  metric: z.string().trim().min(1).max(100),
  label: z.string().trim().min(1).max(200),
  comparator: z.enum(["gte", "lte"]),
  threshold: decimalStringSchema,
});
export type ThesisCriterion = z.infer<typeof thesisCriterionSchema>;

/**
 * Parameters the VC Method (packages/deal-screening's vcMethod.ts) needs
 * that are properties of the *fund*, not the startup — an investor sets
 * these once per thesis, not per screening.
 */
export const thesisFundContextSchema = z.object({
  fundSize: moneySchema,
  targetAnnualReturn: percentStringSchema,
  targetHoldYears: positiveDecimalStringSchema,
});
export type ThesisFundContext = z.infer<typeof thesisFundContextSchema>;

export const createInvestorThesisInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  criteria: z.array(thesisCriterionSchema).max(50),
  fundContext: thesisFundContextSchema.optional(),
});
export type CreateInvestorThesisInput = z.infer<typeof createInvestorThesisInputSchema>;

export const investorThesisSchema = createInvestorThesisInputSchema.extend({
  id: investorThesisIdSchema,
});
export type InvestorThesis = z.infer<typeof investorThesisSchema>;

export function parseCreateInvestorThesisInput(input: unknown) {
  return createInvestorThesisInputSchema.safeParse(input);
}
