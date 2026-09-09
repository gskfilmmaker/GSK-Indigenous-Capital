import { parseScenario, type SafeId } from "@gsk/domain";
import { describe, expect, it } from "vitest";
import {
  buildScenarioInput,
  hydrateFormStateFromScenario,
  type SafeRowFormState,
} from "./buildScenario.js";

function row(overrides: Partial<SafeRowFormState> = {}): SafeRowFormState {
  return {
    id: "018e5b3a-0000-7000-8000-000000000002" as SafeId,
    investorLabel: "",
    purchaseAmount: "500000",
    instrumentType: "post_money_cap",
    valuationCap: "5000000",
    discountPercent: "",
    ...overrides,
  };
}

const existingCapitalization = { founders: "90", grantedOptions: "8", unissuedPool: "2" };

describe("buildScenarioInput", () => {
  it("produces a scenario that parses successfully for a valid cap SAFE row", () => {
    const input = buildScenarioInput(
      "018e5b3a-0000-7000-8000-000000000001",
      existingCapitalization,
      [row()],
    );
    const parsed = parseScenario(input);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.existingCapitalization.founders).toBe("0.9");
    expect(parsed.data.safes[0]).toMatchObject({ instrumentType: "post_money_cap", sequence: 0 });
  });

  it("omits investorLabel when blank rather than sending an empty string", () => {
    const input = buildScenarioInput(
      "018e5b3a-0000-7000-8000-000000000001",
      existingCapitalization,
      [row({ investorLabel: "  " })],
    ) as { safes: Array<Record<string, unknown>> };
    expect(input.safes[0]).not.toHaveProperty("investorLabel");
  });

  it("converts discountPercent from percent-points to a fraction for a discount-only row", () => {
    const input = buildScenarioInput(
      "018e5b3a-0000-7000-8000-000000000001",
      existingCapitalization,
      [row({ instrumentType: "discount_only", discountPercent: "20", valuationCap: "" })],
    );
    const parsed = parseScenario(input);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    const safe = parsed.data.safes[0];
    expect(safe?.instrumentType).toBe("discount_only");
    expect(safe && "discountPercent" in safe && safe.discountPercent).toBe("0.2");
  });

  it("assigns sequence from array order, so reordering rows changes sequence without a separate field", () => {
    const input = buildScenarioInput(
      "018e5b3a-0000-7000-8000-000000000001",
      existingCapitalization,
      [
        row({ id: "018e5b3a-0000-7000-8000-000000000002" as SafeId }),
        row({
          id: "018e5b3a-0000-7000-8000-000000000003" as SafeId,
          instrumentType: "mfn",
          valuationCap: "",
        }),
      ],
    );
    const parsed = parseScenario(input);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.safes.map((safe) => safe.sequence)).toEqual([0, 1]);
  });

  it("fails validation (rather than throwing) when existing capitalization does not sum to 100%", () => {
    const input = buildScenarioInput(
      "018e5b3a-0000-7000-8000-000000000001",
      {
        founders: "50",
        grantedOptions: "8",
        unissuedPool: "2",
      },
      [row()],
    );
    const parsed = parseScenario(input);
    expect(parsed.success).toBe(false);
  });

  it("fails validation (rather than throwing) on an incomplete/empty amount field", () => {
    const input = buildScenarioInput(
      "018e5b3a-0000-7000-8000-000000000001",
      existingCapitalization,
      [row({ purchaseAmount: "" })],
    );
    const parsed = parseScenario(input);
    expect(parsed.success).toBe(false);
  });
});

describe("hydrateFormStateFromScenario", () => {
  it("round-trips a cap SAFE, a discount-only SAFE, and an MFN row back to equivalent form state", () => {
    const rows = [
      row({ id: "018e5b3a-0000-7000-8000-000000000002" as SafeId, investorLabel: "Acme Fund" }),
      row({
        id: "018e5b3a-0000-7000-8000-000000000003" as SafeId,
        instrumentType: "discount_only",
        discountPercent: "20",
        valuationCap: "",
      }),
      row({
        id: "018e5b3a-0000-7000-8000-000000000004" as SafeId,
        instrumentType: "mfn",
        valuationCap: "",
      }),
    ];
    const input = buildScenarioInput(
      "018e5b3a-0000-7000-8000-000000000001",
      existingCapitalization,
      rows,
    );
    const parsed = parseScenario(input);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    const hydrated = hydrateFormStateFromScenario(parsed.data);
    expect(hydrated.existingCapitalization).toEqual(existingCapitalization);
    expect(hydrated.safeRows).toEqual(rows);
  });

  it("restores SAFE row order from sequence, even if the persisted array itself is out of order", () => {
    const scenario = parseScenario(
      buildScenarioInput("018e5b3a-0000-7000-8000-000000000001", existingCapitalization, [
        row({ id: "018e5b3a-0000-7000-8000-000000000002" as SafeId }),
        row({
          id: "018e5b3a-0000-7000-8000-000000000003" as SafeId,
          instrumentType: "mfn",
          valuationCap: "",
        }),
      ]),
    );
    if (!scenario.success) throw new Error("fixture must be valid");
    const reordered = { ...scenario.data, safes: [...scenario.data.safes].reverse() };

    const hydrated = hydrateFormStateFromScenario(reordered);
    expect(hydrated.safeRows.map((r) => r.id)).toEqual([
      "018e5b3a-0000-7000-8000-000000000002",
      "018e5b3a-0000-7000-8000-000000000003",
    ]);
  });
});
