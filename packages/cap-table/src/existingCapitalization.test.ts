import { describe, expect, it } from "vitest";
import { computeCapSafeOwnership } from "./capSafeOwnership.js";
import { EngineDecimal } from "./decimal.js";
import { allocateExistingCapitalization } from "./existingCapitalization.js";

describe("allocateExistingCapitalization — spec §8 test 6", () => {
  it("founders 90%, granted options 8%, pool 2%, plus 500,000/5,000,000 SAFE yields founders 81%, options 7.2%, pool 1.8%, SAFE 10%", () => {
    const { legacyOwnership, totalSafeOwnership } = computeCapSafeOwnership([
      {
        id: "safe-1",
        purchaseAmount: new EngineDecimal(500_000),
        valuationCap: new EngineDecimal(5_000_000),
      },
    ]);

    const rows = allocateExistingCapitalization(
      {
        founders: new EngineDecimal("0.90"),
        grantedOptions: new EngineDecimal("0.08"),
        unissuedPool: new EngineDecimal("0.02"),
      },
      legacyOwnership,
    );

    const founders = rows.find((r) => r.key === "founders")!;
    const options = rows.find((r) => r.key === "grantedOptions")!;
    const pool = rows.find((r) => r.key === "unissuedPool")!;

    expect(founders.ownershipAfterSafes.toString()).toBe("0.81");
    expect(options.ownershipAfterSafes.toString()).toBe("0.072");
    expect(pool.ownershipAfterSafes.toString()).toBe("0.018");
    expect(totalSafeOwnership.toString()).toBe("0.1");

    // Spec §8 test 14: totals reconcile to exactly 100% (unrounded).
    const total = founders.ownershipAfterSafes
      .plus(options.ownershipAfterSafes)
      .plus(pool.ownershipAfterSafes)
      .plus(totalSafeOwnership);
    expect(total.toString()).toBe("1");
  });
});
