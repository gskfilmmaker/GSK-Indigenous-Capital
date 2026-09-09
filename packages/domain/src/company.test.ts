import { describe, expect, it } from "vitest";
import { createCompanyInputSchema, parseCreateCompanyInput } from "./company.js";

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    legalName: "Example Startup Inc.",
    incorporationStatute: "OBCA",
    defaultCurrency: "CAD",
    ...overrides,
  };
}

describe("createCompanyInputSchema", () => {
  it("accepts a minimal, well-formed input", () => {
    expect(createCompanyInputSchema.safeParse(validInput()).success).toBe(true);
  });

  it("defaults incorporationStatute to UNKNOWN and defaultCurrency to CAD when omitted", () => {
    const result = createCompanyInputSchema.safeParse({ legalName: "Example Startup Inc." });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.incorporationStatute).toBe("UNKNOWN");
      expect(result.data.defaultCurrency).toBe("CAD");
    }
  });

  it("rejects an empty legal name", () => {
    expect(createCompanyInputSchema.safeParse(validInput({ legalName: "" })).success).toBe(false);
  });

  it("requires incorporationStatuteOther when incorporationStatute is OTHER", () => {
    const result = parseCreateCompanyInput(
      validInput({ incorporationStatute: "OTHER", incorporationStatuteOther: undefined }),
    );
    expect(result.success).toBe(false);
  });

  it("accepts OTHER when incorporationStatuteOther is provided", () => {
    const result = parseCreateCompanyInput(
      validInput({ incorporationStatute: "OTHER", incorporationStatuteOther: "Nova Scotia Act" }),
    );
    expect(result.success).toBe(true);
  });

  it("rejects incorporationStatuteOther when incorporationStatute is not OTHER", () => {
    const result = parseCreateCompanyInput(
      validInput({ incorporationStatute: "OBCA", incorporationStatuteOther: "Nova Scotia Act" }),
    );
    expect(result.success).toBe(false);
  });

  it("accepts a partial address with only some fields set", () => {
    const result = parseCreateCompanyInput(
      validInput({ registeredAddress: { city: "Toronto", country: "Canada" } }),
    );
    expect(result.success).toBe(true);
  });

  it("accepts governing-document flags", () => {
    const result = parseCreateCompanyInput(
      validInput({ hasShareholderAgreement: true, hasReservedMatters: true }),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hasShareholderAgreement).toBe(true);
    }
  });

  it("does not throw on a malformed nested address (defensive, matching scenario.ts's refine pattern)", () => {
    expect(() =>
      createCompanyInputSchema.safeParse(validInput({ registeredAddress: "not an object" })),
    ).not.toThrow();
  });
});
