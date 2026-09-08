import { describe, expect, it } from "vitest";
import { moneySchema } from "./money.js";

describe("moneySchema", () => {
  it("accepts a positive CAD amount", () => {
    expect(moneySchema.safeParse({ amount: "500000", currency: "CAD" }).success).toBe(true);
  });

  it("rejects a non-CAD currency (spec §7.8: CAD only in MVP)", () => {
    expect(moneySchema.safeParse({ amount: "500000", currency: "USD" }).success).toBe(false);
  });

  it("rejects a zero amount", () => {
    expect(moneySchema.safeParse({ amount: "0", currency: "CAD" }).success).toBe(false);
  });
});
