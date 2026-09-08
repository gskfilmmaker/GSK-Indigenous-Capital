import { describe, expect, it } from "vitest";
import { computeCapSafeOwnership } from "./capSafeOwnership.js";
import { EngineDecimal } from "./decimal.js";
import { allocateExistingCapitalization } from "./existingCapitalization.js";

describe("totals reconciliation — spec §8 test 14", () => {
  it("all ownership rows (existing holders + SAFEs) sum to exactly 1 (100.00%) at full precision", () => {
    const {
      rows: safeRows,
      totalSafeOwnership,
      legacyOwnership,
    } = computeCapSafeOwnership([
      {
        id: "a",
        purchaseAmount: new EngineDecimal(200_000),
        valuationCap: new EngineDecimal(4_000_000),
      },
      {
        id: "b",
        purchaseAmount: new EngineDecimal(800_000),
        valuationCap: new EngineDecimal(8_000_000),
      },
    ]);

    const existingRows = allocateExistingCapitalization(
      {
        founders: new EngineDecimal("0.90"),
        grantedOptions: new EngineDecimal("0.08"),
        unissuedPool: new EngineDecimal("0.02"),
      },
      legacyOwnership,
    );

    const total = existingRows
      .reduce((sum, row) => sum.plus(row.ownershipAfterSafes), new EngineDecimal(0))
      .plus(totalSafeOwnership);

    expect(total.toString()).toBe("1");
    // Every individual SAFE row is preserved at full, unrounded precision —
    // display-level rounding to "100.00%" is a separate, not-yet-decided
    // policy (spec §26 item 8; docs/adr/0001-numeric-arithmetic-library.md)
    // that this engine-level test does not need and does not invent.
    expect(safeRows).toHaveLength(2);
  });
});
