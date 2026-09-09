import { expectNoA11yViolations } from "@gsk/ui";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// actions.ts imports lib/supabase/server.ts, which imports `server-only`
// — see LoginForm.test.tsx for why this is stubbed.
vi.mock("server-only", () => ({}));
vi.mock("./actions", () => ({
  createOrganizationAction: vi.fn(() => Promise.resolve({})),
}));

import { OrganizationForm } from "./OrganizationForm.js";

describe("OrganizationForm", () => {
  it("renders labelled name and URL fields and a submit button", () => {
    render(<OrganizationForm />);
    expect(screen.getByLabelText(/organization name/i)).toBeRequired();
    expect(screen.getByLabelText(/organization url/i)).toBeRequired();
    expect(screen.getByRole("button", { name: /continue/i })).toBeInTheDocument();
  });

  it("derives the URL slug from the name until the user edits it directly", () => {
    render(<OrganizationForm />);
    fireEvent.change(screen.getByLabelText(/organization name/i), {
      target: { value: "GSK Indigenous Capital" },
    });
    expect(screen.getByLabelText(/organization url/i)).toHaveValue("gsk-indigenous-capital");
  });

  it("stops auto-deriving the slug once the user edits it by hand", () => {
    render(<OrganizationForm />);
    fireEvent.change(screen.getByLabelText(/organization name/i), {
      target: { value: "GSK Indigenous Capital" },
    });
    fireEvent.change(screen.getByLabelText(/organization url/i), {
      target: { value: "my-custom-url" },
    });
    fireEvent.change(screen.getByLabelText(/organization name/i), {
      target: { value: "A Totally Different Name" },
    });
    expect(screen.getByLabelText(/organization url/i)).toHaveValue("my-custom-url");
  });

  it("has no axe violations", async () => {
    const { container } = render(<OrganizationForm />);
    await expectNoA11yViolations(container);
  });
});
