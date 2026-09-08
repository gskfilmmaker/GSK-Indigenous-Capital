import { describe, expect, it } from "vitest";
import { CAP_TABLE_ENGINE_PLACEHOLDER } from "./index.js";

describe("packages/cap-table smoke", () => {
  it("loads (golden tests 1-6, 10-15 land in Step 2)", () => {
    expect(CAP_TABLE_ENGINE_PLACEHOLDER).toBe(true);
  });
});
