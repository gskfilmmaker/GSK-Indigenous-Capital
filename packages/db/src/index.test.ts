import { describe, expect, it } from "vitest";
import { DB_PACKAGE_PLACEHOLDER } from "./index.js";

describe("packages/db smoke", () => {
  it("loads", () => {
    expect(DB_PACKAGE_PLACEHOLDER).toBe(true);
  });
});
