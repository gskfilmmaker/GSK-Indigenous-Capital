import { expectNoA11yViolations } from "@gsk/ui";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LoginForm } from "./LoginForm.js";

// actions.ts imports lib/supabase/server.ts, which imports the
// `server-only` package (see its own comment) — that package throws
// unconditionally when loaded outside a real Next.js server build, which
// this Vitest environment is not. These UI tests only need signInAction
// to exist with the right call shape for useActionState, not to actually
// run — mock the whole module.
vi.mock("../actions", () => ({
  signInAction: vi.fn(() => Promise.resolve({})),
}));

describe("LoginForm", () => {
  it("renders labelled email and password fields and a submit button", () => {
    render(<LoginForm />);
    expect(screen.getByLabelText(/email/i)).toHaveAttribute("type", "email");
    expect(screen.getByLabelText(/^password$/i)).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("marks both fields required and sets autocomplete for a password manager", () => {
    render(<LoginForm />);
    expect(screen.getByLabelText(/email/i)).toBeRequired();
    expect(screen.getByLabelText(/^password$/i)).toBeRequired();
    expect(screen.getByLabelText(/email/i)).toHaveAttribute("autocomplete", "email");
    expect(screen.getByLabelText(/^password$/i)).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
  });

  it("has no axe violations", async () => {
    const { container } = render(<LoginForm />);
    await expectNoA11yViolations(container);
  });
});
