import { describe, expect, it } from "vitest";
import { EngineDecimal } from "./decimal.js";
import { computeOptionPoolTopUp } from "./poolTopUp.js";

describe("computeOptionPoolTopUp — spec §8 test 11 (isolated pool-sizing formula)", () => {
  it("tops up the difference when the target exceeds the surviving pool", () => {
    const topUp = computeOptionPoolTopUp(new EngineDecimal("0.10"), new EngineDecimal("0.08"));
    expect(topUp.toString()).toBe("0.02");
  });

  it("a target below the surviving pool does not create a negative top-up", () => {
    const topUp = computeOptionPoolTopUp(new EngineDecimal("0.05"), new EngineDecimal("0.08"));
    expect(topUp.toString()).toBe("0");
    expect(topUp.gte(0)).toBe(true);
  });

  it("a target equal to the surviving pool tops up by zero", () => {
    const topUp = computeOptionPoolTopUp(new EngineDecimal("0.08"), new EngineDecimal("0.08"));
    expect(topUp.toString()).toBe("0");
  });
});
