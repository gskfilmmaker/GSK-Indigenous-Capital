import { expectNoA11yViolations } from "@gsk/ui";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// actions.ts imports lib/supabase/server.ts, which imports `server-only`
// — see LoginForm.test.tsx for why this is stubbed.
vi.mock("server-only", () => ({}));
vi.mock("./actions", () => ({
  createCompanyAction: vi.fn(() => Promise.resolve({})),
}));

import { CompanyForm } from "./CompanyForm.js";

describe("CompanyForm", () => {
  it("renders a required legal name field and carries the org slug + idempotency key as hidden fields", () => {
    const { container } = render(<CompanyForm orgSlug="gsk-ic" idempotencyKey="idem-abc" />);
    expect(screen.getByLabelText(/legal company name/i)).toBeRequired();
    expect(container.querySelector('input[name="orgSlug"]')).toHaveValue("gsk-ic");
    expect(container.querySelector('input[name="idempotencyKey"]')).toHaveValue("idem-abc");
  });

  it("only shows the statute-other field when Other is selected", () => {
    render(<CompanyForm orgSlug="gsk-ic" idempotencyKey="idem-abc" />);
    expect(screen.queryByLabelText(/statute name/i)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/incorporation statute/i), {
      target: { value: "OTHER" },
    });
    expect(screen.getByLabelText(/statute name/i)).toBeRequired();
  });

  it("hides the head office address fields when marked same as registered", () => {
    render(<CompanyForm orgSlug="gsk-ic" idempotencyKey="idem-abc" />);
    expect(screen.getByText(/head office address \(optional\)/i)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/head office address is the same/i));
    expect(screen.queryByText(/head office address \(optional\)/i)).not.toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<CompanyForm orgSlug="gsk-ic" idempotencyKey="idem-abc" />);
    await expectNoA11yViolations(container);
  });
});
