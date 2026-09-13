import { expectNoA11yViolations } from "@gsk/ui";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("../actions", () => ({
  submitIntakeAction: vi.fn(() => Promise.resolve({})),
}));

import { IntakeForm } from "./IntakeForm.js";

describe("IntakeForm", () => {
  it("renders the always-required fields and carries hidden fields", () => {
    const { container } = render(<IntakeForm orgSlug="alice-capital" idempotencyKey="idem-abc" />);
    expect(screen.getByLabelText(/company name/i)).toBeRequired();
    expect(screen.getByLabelText(/^industry$/i)).toBeRequired();
    expect(container.querySelector('input[name="orgSlug"]')).toHaveValue("alice-capital");
    expect(container.querySelector('input[name="idempotencyKey"]')).toHaveValue("idem-abc");
  });

  it("only shows a section's fields once its toggle is checked", () => {
    render(<IntakeForm orgSlug="alice-capital" idempotencyKey="idem-abc" />);
    expect(screen.queryByLabelText(/monthly churn/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/unit economics/i));
    expect(screen.getByLabelText(/monthly churn/i)).toBeInTheDocument();
  });

  it("has no axe violations with no sections toggled on", async () => {
    const { container } = render(<IntakeForm orgSlug="alice-capital" idempotencyKey="idem-abc" />);
    await expectNoA11yViolations(container);
  });

  it("has no axe violations with every section toggled on", async () => {
    const { container } = render(<IntakeForm orgSlug="alice-capital" idempotencyKey="idem-abc" />);
    fireEvent.click(screen.getByLabelText(/unit economics/i));
    fireEvent.click(screen.getByLabelText(/market sizing/i));
    fireEvent.click(screen.getByLabelText(/berkus method/i));
    fireEvent.click(screen.getByLabelText(/payne scorecard/i));
    fireEvent.click(screen.getByLabelText(/exit assumption/i));
    await expectNoA11yViolations(container);
  });
});
