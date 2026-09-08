import { describe, expect, it } from "vitest";
import {
  decimalStringSchema,
  nonNegativeDecimalStringSchema,
  percentStringSchema,
  positiveDecimalStringSchema,
} from "./decimal.js";

describe("decimalStringSchema", () => {
  it("accepts integers and decimals", () => {
    expect(decimalStringSchema.safeParse("500000").success).toBe(true);
    expect(decimalStringSchema.safeParse("12.50").success).toBe(true);
    expect(decimalStringSchema.safeParse("-3.2").success).toBe(true);
  });

  it("rejects JS-number-unsafe or ambiguous formats", () => {
    expect(decimalStringSchema.safeParse("1e10").success).toBe(false);
    expect(decimalStringSchema.safeParse("1,000").success).toBe(false);
    expect(decimalStringSchema.safeParse("").success).toBe(false);
    expect(decimalStringSchema.safeParse("abc").success).toBe(false);
  });
});

describe("positiveDecimalStringSchema", () => {
  it("rejects zero and negative values", () => {
    expect(positiveDecimalStringSchema.safeParse("0").success).toBe(false);
    expect(positiveDecimalStringSchema.safeParse("-1").success).toBe(false);
    expect(positiveDecimalStringSchema.safeParse("0.01").success).toBe(true);
  });
});

describe("nonNegativeDecimalStringSchema", () => {
  it("accepts zero but rejects negative values", () => {
    expect(nonNegativeDecimalStringSchema.safeParse("0").success).toBe(true);
    expect(nonNegativeDecimalStringSchema.safeParse("-0.01").success).toBe(false);
  });
});

describe("percentStringSchema", () => {
  it("accepts values between 0 and 1 inclusive", () => {
    expect(percentStringSchema.safeParse("0").success).toBe(true);
    expect(percentStringSchema.safeParse("1").success).toBe(true);
    expect(percentStringSchema.safeParse("0.905").success).toBe(true);
  });

  it("rejects values outside [0, 1]", () => {
    expect(percentStringSchema.safeParse("1.01").success).toBe(false);
    expect(percentStringSchema.safeParse("-0.01").success).toBe(false);
  });
});
