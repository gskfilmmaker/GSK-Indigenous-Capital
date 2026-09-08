import { describe, expect, it } from "vitest";
import { UI_PACKAGE_PLACEHOLDER } from "./index.js";

describe("packages/ui smoke", () => {
  it("loads", () => {
    expect(UI_PACKAGE_PLACEHOLDER).toBe(true);
  });
});
