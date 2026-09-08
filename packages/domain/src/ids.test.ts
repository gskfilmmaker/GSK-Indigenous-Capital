import { describe, expect, it } from "vitest";
import { newSafeId, newScenarioId, safeIdSchema, scenarioIdSchema } from "./ids.js";

describe("branded ids", () => {
  it("newScenarioId returns a value that validates against scenarioIdSchema", () => {
    expect(scenarioIdSchema.safeParse(newScenarioId()).success).toBe(true);
  });

  it("newSafeId returns a value that validates against safeIdSchema", () => {
    expect(safeIdSchema.safeParse(newSafeId()).success).toBe(true);
  });

  it("generates unique ids across calls", () => {
    const ids = new Set(Array.from({ length: 50 }, () => newScenarioId()));
    expect(ids.size).toBe(50);
  });

  it("rejects a non-UUID string", () => {
    expect(scenarioIdSchema.safeParse("not-a-uuid").success).toBe(false);
  });
});
