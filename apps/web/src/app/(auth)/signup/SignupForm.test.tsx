import { expectNoA11yViolations } from "@gsk/ui";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SignupForm } from "./SignupForm.js";

// See LoginForm.test.tsx for why actions.ts is mocked wholesale.
vi.mock("../actions", () => ({
  signUpAction: vi.fn(() => Promise.resolve({})),
}));

describe("SignupForm", () => {
  it("renders labelled email, password, and confirm-password fields", () => {
    render(<SignupForm />);
    expect(screen.getByLabelText(/email/i)).toHaveAttribute("type", "email");
    expect(screen.getByLabelText(/^password$/i)).toHaveAttribute("type", "password");
    expect(screen.getByLabelText(/confirm password/i)).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
  });

  it("enforces a minimum password length on both password fields", () => {
    render(<SignupForm />);
    expect(screen.getByLabelText(/^password$/i)).toHaveAttribute("minlength", "8");
    expect(screen.getByLabelText(/confirm password/i)).toHaveAttribute("minlength", "8");
  });

  it("has no axe violations", async () => {
    const { container } = render(<SignupForm />);
    await expectNoA11yViolations(container);
  });
});
