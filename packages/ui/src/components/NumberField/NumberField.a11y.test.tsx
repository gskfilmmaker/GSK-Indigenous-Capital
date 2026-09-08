import { render } from "@testing-library/react";
import { describe, it, vi } from "vitest";
import { expectNoA11yViolations } from "../../a11y/expectNoA11yViolations.js";
import { NumberField } from "./NumberField.js";

describe("NumberField a11y", () => {
  it("has no axe violations for a plain field", async () => {
    const { container } = render(
      <NumberField label="Investment amount" value="500000" onChange={vi.fn()} kind="money" />,
    );
    await expectNoA11yViolations(container);
  });

  it("has no axe violations with a hint", async () => {
    const { container } = render(
      <NumberField
        label="Discount"
        value="10"
        onChange={vi.fn()}
        kind="percent"
        hint="Expressed as a percentage of the round price."
      />,
    );
    await expectNoA11yViolations(container);
  });

  it("has no axe violations with an error (aria-invalid + associated message)", async () => {
    const { container } = render(
      <NumberField
        label="Valuation cap"
        value="0"
        onChange={vi.fn()}
        kind="money"
        error="Valuation cap must be greater than zero."
      />,
    );
    await expectNoA11yViolations(container);
  });
});
