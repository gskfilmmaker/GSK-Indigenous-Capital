import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoA11yViolations } from "../../a11y/expectNoA11yViolations.js";
import { StepIndicator } from "./StepIndicator.js";

const steps = [
  { id: "model", label: "Model" },
  { id: "review", label: "Review" },
  { id: "record", label: "Record" },
];

describe("StepIndicator a11y", () => {
  it("has no axe violations", async () => {
    const { container } = render(<StepIndicator steps={steps} currentStepId="review" />);
    await expectNoA11yViolations(container);
  });

  it('marks exactly the current step with aria-current="step"', () => {
    render(<StepIndicator steps={steps} currentStepId="review" />);
    const current = screen.getByText("Review");
    expect(current.getAttribute("aria-current")).toBe("step");
    expect(screen.getByText("Model").getAttribute("aria-current")).toBeNull();
    expect(screen.getByText("Record").getAttribute("aria-current")).toBeNull();
  });
});
