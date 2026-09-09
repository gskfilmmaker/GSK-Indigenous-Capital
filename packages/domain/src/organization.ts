import { z } from "zod";

/** Mirrors organizations.slug's check constraint exactly (spec §6.2, §9.1). */
const ORGANIZATION_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const organizationNameSchema = z.string().trim().min(1).max(200);
export const organizationSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(ORGANIZATION_SLUG_PATTERN, "must be lowercase letters, numbers, and single hyphens only");

export const createOrganizationInputSchema = z.object({
  name: organizationNameSchema,
  slug: organizationSlugSchema,
});
export type CreateOrganizationInput = z.infer<typeof createOrganizationInputSchema>;

/**
 * Derives a slug suggestion from an organization name for onboarding —
 * never auto-submitted without the user seeing and being able to edit it,
 * since two organizations can derive the same slug and `organizations`
 * has a unique constraint on it.
 */
export function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
}
