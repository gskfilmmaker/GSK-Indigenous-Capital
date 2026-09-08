import { describe, expect, it } from "vitest";
import { DOCUMENTS_PACKAGE_PLACEHOLDER } from "./index.js";

describe("packages/documents smoke", () => {
  it("loads", () => {
    expect(DOCUMENTS_PACKAGE_PLACEHOLDER).toBe(true);
  });
});
