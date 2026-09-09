import { z } from "zod";
import { uuidv7 } from "uuidv7";

/**
 * A permissive UUID pattern accepting any RFC 9562 version nibble (1-8),
 * not just 1-5 — needed because this project standardizes on UUIDv7 (see
 * docs/adr/0002-id-format.md) and some Zod builds' `.uuid()` historically
 * rejected version nibbles above 5.
 */
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const uuidSchema = z.string().regex(uuidPattern, "must be a UUID");

export const scenarioIdSchema = uuidSchema.brand<"ScenarioId">();
export type ScenarioId = z.infer<typeof scenarioIdSchema>;

export const safeIdSchema = uuidSchema.brand<"SafeId">();
export type SafeId = z.infer<typeof safeIdSchema>;

export const organizationIdSchema = uuidSchema.brand<"OrganizationId">();
export type OrganizationId = z.infer<typeof organizationIdSchema>;

export const companyIdSchema = uuidSchema.brand<"CompanyId">();
export type CompanyId = z.infer<typeof companyIdSchema>;

export function newScenarioId(): ScenarioId {
  return scenarioIdSchema.parse(uuidv7());
}

export function newSafeId(): SafeId {
  return safeIdSchema.parse(uuidv7());
}

/**
 * Generated client-side (unlike most other ids in this project, which
 * the database assigns via its own `uuidv7()` default): the
 * create_company command needs the company's id *before* calling the
 * database, to compute the audit event hash that describes it (ADR
 * 0006) — see supabase/migrations/20260908150800_create_company_command.sql.
 */
export function newCompanyId(): CompanyId {
  return companyIdSchema.parse(uuidv7());
}
