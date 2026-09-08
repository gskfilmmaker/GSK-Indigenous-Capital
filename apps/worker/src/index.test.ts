import { describe, expect, it } from "vitest";
import { workerPlaceholder } from "./index.js";

describe("apps/worker smoke", () => {
  it("exports a placeholder entrypoint", () => {
    expect(workerPlaceholder()).toBe("worker not yet implemented");
  });
});
