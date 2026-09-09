import { expectNoA11yViolations } from "@gsk/ui";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ForgotPasswordForm } from "./ForgotPasswordForm.js";

// See LoginForm.test.tsx for why actions.ts is mocked wholesale.
vi.mock("../actions", () => ({
  requestPasswordResetAction: vi.fn(() => Promise.resolve({})),
}));

describe("ForgotPasswordForm", () => {
  it("renders a labelled, required email field and a submit button", () => {
    render(<ForgotPasswordForm />);
    const emailField = screen.getByLabelText(/email/i);
    expect(emailField).toHaveAttribute("type", "email");
    expect(emailField).toBeRequired();
    expect(screen.getByRole("button", { name: /send reset link/i })).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<ForgotPasswordForm />);
    await expectNoA11yViolations(container);
  });
});
