import { describe, expect, it } from "vitest";
import { DOMAIN_PACKAGE_PLACEHOLDER } from "./index.js";

describe("packages/domain smoke", () => {
  it("loads", () => {
    expect(DOMAIN_PACKAGE_PLACEHOLDER).toBe(true);
  });
});
