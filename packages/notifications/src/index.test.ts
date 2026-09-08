import { describe, expect, it } from "vitest";
import { NOTIFICATIONS_PACKAGE_PLACEHOLDER } from "./index.js";

describe("packages/notifications smoke", () => {
  it("loads", () => {
    expect(NOTIFICATIONS_PACKAGE_PLACEHOLDER).toBe(true);
  });
});
