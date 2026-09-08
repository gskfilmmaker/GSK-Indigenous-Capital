import { describe, expect, it } from "vitest";
import { fractionToPercentPoints, percentPointsToFraction } from "./percentInput.js";

describe("percentPointsToFraction", () => {
  it("converts a whole percent-point value to a fraction", () => {
    expect(percentPointsToFraction("90")).toBe("0.9");
  });

  it("converts a fractional percent-point value to a fraction", () => {
    expect(percentPointsToFraction("12.5")).toBe("0.125");
  });

  it("passes through an empty string unchanged rather than throwing", () => {
    expect(percentPointsToFraction("")).toBe("");
  });

  it("passes through a mid-keystroke partial value (trailing decimal point) unchanged", () => {
    expect(percentPointsToFraction("12.")).toBe("12.");
  });
});

describe("fractionToPercentPoints", () => {
  it("converts a fraction to whole percent points", () => {
    expect(fractionToPercentPoints("0.9")).toBe("90");
  });

  it("converts a fractional fraction to fractional percent points", () => {
    expect(fractionToPercentPoints("0.125")).toBe("12.5");
  });

  it("round-trips through percentPointsToFraction", () => {
    expect(fractionToPercentPoints(percentPointsToFraction("33.33"))).toBe("33.33");
  });

  it("passes through an empty string unchanged rather than throwing", () => {
    expect(fractionToPercentPoints("")).toBe("");
  });
});
