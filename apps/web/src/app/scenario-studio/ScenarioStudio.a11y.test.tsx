import { expectNoA11yViolations } from "@gsk/ui";
import { fireEvent, render } from "@testing-library/react";
import { describe, it } from "vitest";
import { ScenarioStudio } from "./ScenarioStudio.js";

describe("ScenarioStudio a11y", () => {
  it("has no axe violations with no SAFEs added yet", async () => {
    const { container } = render(<ScenarioStudio />);
    await expectNoA11yViolations(container);
  });

  it("has no axe violations with a SAFE row added and results rendered", async () => {
    const { container, getByRole, getByLabelText } = render(<ScenarioStudio />);
    fireEvent.click(getByRole("button", { name: /add a safe/i }));
    fireEvent.change(getByLabelText(/investment amount/i), { target: { value: "500000" } });
    fireEvent.change(getByLabelText(/post-money valuation cap/i), {
      target: { value: "5000000" },
    });
    await expectNoA11yViolations(container);
  });

  it("has no axe violations while showing a validation error", async () => {
    const { container, getByLabelText } = render(<ScenarioStudio />);
    fireEvent.change(getByLabelText(/founders \/ legacy/i), { target: { value: "50" } });
    await expectNoA11yViolations(container);
  });
});
