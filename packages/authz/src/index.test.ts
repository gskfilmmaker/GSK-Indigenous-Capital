import { describe, expect, it } from "vitest";
import { AUTHZ_PACKAGE_PLACEHOLDER } from "./index.js";

describe("packages/authz smoke", () => {
  it("loads", () => {
    expect(AUTHZ_PACKAGE_PLACEHOLDER).toBe(true);
  });
});
