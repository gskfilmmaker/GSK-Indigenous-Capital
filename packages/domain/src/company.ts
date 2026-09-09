import { z } from "zod";
import { currencyCodeSchema } from "./money.js";

/**
 * Issuer/company profile onboarding fields (spec §6.2, companies table).
 * `registered_address`/`head_office_address` are jsonb in the database —
 * the companies migration's own comment defers their shape validation to
 * "the application layer (Zod), not the database"; this is that layer.
 * All fields are optional here for the same reason they're optional
 * columns: the database does not require any of them to be present.
 */
export const companyAddressSchema = z.object({
  line1: z.string().trim().min(1).max(200).optional(),
  line2: z.string().trim().min(1).max(200).optional(),
  city: z.string().trim().min(1).max(100).optional(),
  provinceOrTerritory: z.string().trim().min(1).max(100).optional(),
  postalCode: z.string().trim().min(1).max(20).optional(),
  country: z.string().trim().min(1).max(100).optional(),
});
export type CompanyAddress = z.infer<typeof companyAddressSchema>;

/** Mirrors companies.incorporation_statute exactly (spec §6.2). */
export const incorporationStatuteSchema = z.enum(["OBCA", "CBCA", "OTHER", "UNKNOWN"]);
export type IncorporationStatute = z.infer<typeof incorporationStatuteSchema>;

const optionalName = z.string().trim().min(1).max(200).optional();

/**
 * Governing-document/reserved-matter flags (spec §6.2): coarse booleans
 * recording "review this before drafting," not what a review would find
 * — see the companies migration's own comment for why nothing more
 * specific is modelled here (root CLAUDE.md's stop-and-ask rule on
 * inventing legal-term structure that isn't in the spec).
 */
export const companyGoverningDocumentFlagsSchema = z.object({
  hasShareholderAgreement: z.boolean(),
  hasUnanimousShareholderAgreement: z.boolean(),
  hasInvestorRightsAgreement: z.boolean(),
  hasDebtCovenant: z.boolean(),
  hasReservedMatters: z.boolean(),
});
export type CompanyGoverningDocumentFlags = z.infer<typeof companyGoverningDocumentFlagsSchema>;

export const createCompanyInputSchema = z
  .object({
    legalName: z.string().trim().min(1).max(200),
    operatingName: optionalName,
    incorporationStatute: incorporationStatuteSchema.default("UNKNOWN"),
    incorporationStatuteOther: optionalName,
    corporationNumber: z.string().trim().min(1).max(100).optional(),
    incorporationDate: z.string().date().optional(),
    registeredAddress: companyAddressSchema.optional(),
    headOfficeAddress: companyAddressSchema.optional(),
    defaultCurrency: currencyCodeSchema.default("CAD"),
  })
  .merge(companyGoverningDocumentFlagsSchema.partial())
  .superRefine((value, ctx) => {
    // Mirrors companies_statute_other_consistency exactly (spec §6.2):
    // required when OTHER, disallowed otherwise, so this never reaches
    // the database in a shape the constraint would reject anyway — this
    // is app-layer validation for a clear error message, not a
    // relaxation of the database's own check.
    if (value.incorporationStatute === "OTHER" && !value.incorporationStatuteOther) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["incorporationStatuteOther"],
        message: "required when incorporation statute is Other",
      });
    }
    if (value.incorporationStatute !== "OTHER" && value.incorporationStatuteOther) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["incorporationStatuteOther"],
        message: "must be empty unless incorporation statute is Other",
      });
    }
  });
export type CreateCompanyInput = z.infer<typeof createCompanyInputSchema>;

export function parseCreateCompanyInput(input: unknown) {
  return createCompanyInputSchema.safeParse(input);
}
