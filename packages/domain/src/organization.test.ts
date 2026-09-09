import { describe, expect, it } from "vitest";
import {
  createOrganizationInputSchema,
  organizationSlugSchema,
  slugify,
} from "./organization.js";

describe("organizationSlugSchema", () => {
  it("accepts lowercase letters, numbers, and single hyphens", () => {
    expect(organizationSlugSchema.safeParse("gsk-indigenous-capital-2").success).toBe(true);
  });

  it("rejects uppercase letters", () => {
    expect(organizationSlugSchema.safeParse("GSK-Capital").success).toBe(false);
  });

  it("rejects consecutive or trailing hyphens", () => {
    expect(organizationSlugSchema.safeParse("gsk--capital").success).toBe(false);
    expect(organizationSlugSchema.safeParse("gsk-capital-").success).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(organizationSlugSchema.safeParse("").success).toBe(false);
  });
});

describe("createOrganizationInputSchema", () => {
  it("accepts a well-formed name and slug", () => {
    expect(
      createOrganizationInputSchema.safeParse({ name: "GSK Indigenous Capital", slug: "gsk-ic" })
        .success,
    ).toBe(true);
  });
});

describe("slugify", () => {
  it("lowercases and hyphenates a name", () => {
    expect(slugify("GSK Indigenous Capital")).toBe("gsk-indigenous-capital");
  });

  it("strips non-alphanumeric characters and collapses runs into single hyphens", () => {
    expect(slugify("Founders & Co. — Inc.")).toBe("founders-co-inc");
  });

  it("trims leading and trailing hyphens produced by punctuation at the edges", () => {
    expect(slugify("--Startup!!")).toBe("startup");
  });

  it("always produces a value that passes organizationSlugSchema, for any non-empty result", () => {
    const slug = slugify("Some Startup Inc.");
    expect(organizationSlugSchema.safeParse(slug).success).toBe(true);
  });
});
