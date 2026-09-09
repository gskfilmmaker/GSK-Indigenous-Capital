import { expectNoA11yViolations } from "@gsk/ui";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ResetPasswordForm } from "./ResetPasswordForm.js";

// See LoginForm.test.tsx for why actions.ts is mocked wholesale.
vi.mock("../actions", () => ({
  updatePasswordAction: vi.fn(() => Promise.resolve({})),
}));

describe("ResetPasswordForm", () => {
  it("renders labelled new-password and confirm-password fields with a minimum length", () => {
    render(<ResetPasswordForm />);
    expect(screen.getByLabelText(/^new password$/i)).toHaveAttribute("minlength", "8");
    expect(screen.getByLabelText(/confirm new password/i)).toHaveAttribute("minlength", "8");
    expect(screen.getByRole("button", { name: /update password/i })).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<ResetPasswordForm />);
    await expectNoA11yViolations(container);
  });
});
