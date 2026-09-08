import { describe, expect, it } from "vitest";
import { AUDIT_PACKAGE_PLACEHOLDER } from "./index.js";

describe("packages/audit smoke", () => {
  it("loads", () => {
    expect(AUDIT_PACKAGE_PLACEHOLDER).toBe(true);
  });
});
