import { Decimal } from "decimal.js";
import { z } from "zod";
import { safeIdSchema, scenarioIdSchema } from "./ids.js";
import { moneySchema } from "./money.js";
import { percentStringSchema } from "./decimal.js";

/**
 * Existing capitalization, simple-percentage mode (spec §6.5 "Existing
 * capitalization fields — Simple mode"). Detailed share-ledger mode (spec
 * §7.3) is deferred to Step 4's detailed cap-table work.
 */
export const existingCapitalizationSimpleSchema = z
  .object({
    founders: percentStringSchema,
    grantedOptions: percentStringSchema,
    unissuedPool: percentStringSchema,
  })
  .refine(
    (value) => {
      // Same defensive pattern as decimal.ts's own `.refine()`s: Zod does
      // not abort this refine when a nested field (founders/grantedOptions/
      // unissuedPool) already failed its own percentStringSchema check — the
      // predicate below still runs against the raw, possibly-malformed
      // value. An empty string reaches here from completely normal editing
      // (e.g. select-all-and-retype in a live form), and `new Decimal("")`
      // throws a raw DecimalError rather than deferring to the field-level
      // validation issue already reported. Catch it and treat it as "can't
      // confirm the sum is 1" rather than letting it crash the caller.
      try {
        const sum = new Decimal(value.founders).plus(value.grantedOptions).plus(value.unissuedPool);
        return sum.equals(1);
      } catch {
        return false;
      }
    },
    { message: "founders, grantedOptions, and unissuedPool must sum to exactly 1 (100%)" },
  );
export type ExistingCapitalizationSimple = z.infer<typeof existingCapitalizationSimpleSchema>;

/**
 * Step 2/4 scope (this project's phased build, not spec MVP scope): the
 * engine computes indicative ownership only for `post_money_cap` rows.
 * `discount_only` and `mfn` are represented here because the Scenario
 * Studio UI needs to capture them without silently dropping data (spec
 * §6.5's SAFE row fields include all three instrument types), but per spec
 * §7.6 a discount-only SAFE has no determinable ownership before a priced
 * round, and per spec §7.7 MFN conversion is priced-round-dependent — both
 * are computed once the priced-round solver lands (spec §7.4-§7.7, deferred
 * past this block). See packages/cap-table/CLAUDE.md's unsupported-case
 * rules.
 */
export const safeInstrumentTypeSchema = z.enum(["post_money_cap", "discount_only", "mfn"]);
export type SafeInstrumentType = z.infer<typeof safeInstrumentTypeSchema>;

const safeBaseSchema = z.object({
  id: safeIdSchema,
  /** Chronological order; material for MFN candidate eligibility (spec §7.7). */
  sequence: z.number().int().nonnegative(),
  investorLabel: z.string().trim().min(1).max(200).optional(),
  purchaseAmount: moneySchema,
  issueDate: z.string().date().optional(),
});

export const capSafeSchema = safeBaseSchema.extend({
  instrumentType: z.literal("post_money_cap"),
  valuationCap: moneySchema,
});
export type CapSafe = z.infer<typeof capSafeSchema>;

export const discountOnlySafeSchema = safeBaseSchema.extend({
  instrumentType: z.literal("discount_only"),
  discountPercent: percentStringSchema,
});
export type DiscountOnlySafe = z.infer<typeof discountOnlySafeSchema>;

export const mfnSafeSchema = safeBaseSchema.extend({
  instrumentType: z.literal("mfn"),
});
export type MfnSafe = z.infer<typeof mfnSafeSchema>;

export const safeSchema = z.discriminatedUnion("instrumentType", [
  capSafeSchema,
  discountOnlySafeSchema,
  mfnSafeSchema,
]);
export type Safe = z.infer<typeof safeSchema>;

export const scenarioSchema = z
  .object({
    id: scenarioIdSchema,
    schemaVersion: z.literal(1),
    currency: z.literal("CAD"),
    existingCapitalization: existingCapitalizationSimpleSchema,
    safes: z.array(safeSchema),
  })
  .superRefine((scenario, ctx) => {
    // Unsupported-case policy (spec §7.9): fail closed at the schema
    // boundary rather than let the engine silently approximate.
    const seenIds = new Set<string>();
    const seenSequences = new Set<number>();
    let mfnCount = 0;

    for (const safe of scenario.safes) {
      if (seenIds.has(safe.id)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `duplicate SAFE id: ${safe.id}` });
      }
      seenIds.add(safe.id);

      if (seenSequences.has(safe.sequence)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `duplicate SAFE sequence number: ${safe.sequence}`,
        });
      }
      seenSequences.add(safe.sequence);

      if (safe.instrumentType === "mfn") {
        mfnCount += 1;
      }

      if (safe.purchaseAmount.currency !== scenario.currency) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `SAFE ${safe.id} purchase amount currency does not match the scenario currency (spec §7.8: never add CAD and USD)`,
        });
      }
      if (
        safe.instrumentType === "post_money_cap" &&
        safe.valuationCap.currency !== scenario.currency
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `SAFE ${safe.id} valuation cap currency does not match the scenario currency`,
        });
      }
    }

    // Complex MFN chains are blocked in MVP unless counsel-approved
    // fixtures exist (spec §7.7, §7.9) — more than one MFN instrument in a
    // scenario is exactly that case.
    if (mfnCount > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "more than one MFN instrument in a scenario is an unsupported case (complex MFN chain) unless counsel-approved fixtures exist",
      });
    }
  });
export type Scenario = z.infer<typeof scenarioSchema>;

export function parseScenario(input: unknown) {
  return scenarioSchema.safeParse(input);
}
