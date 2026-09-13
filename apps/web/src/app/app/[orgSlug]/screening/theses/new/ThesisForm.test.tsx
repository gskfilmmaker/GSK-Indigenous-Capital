import { expectNoA11yViolations } from "@gsk/ui";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("../actions", () => ({
  createThesisAction: vi.fn(() => Promise.resolve({})),
}));

import { ThesisForm } from "./ThesisForm.js";

describe("ThesisForm", () => {
  it("renders a required name field and carries the org slug + idempotency key as hidden fields", () => {
    const { container } = render(<ThesisForm orgSlug="alice-capital" idempotencyKey="idem-abc" />);
    expect(screen.getByLabelText(/thesis name/i)).toBeRequired();
    expect(container.querySelector('input[name="orgSlug"]')).toHaveValue("alice-capital");
    expect(container.querySelector('input[name="idempotencyKey"]')).toHaveValue("idem-abc");
  });

  it("starts with one criterion row and can add/remove rows", () => {
    render(<ThesisForm orgSlug="alice-capital" idempotencyKey="idem-abc" />);
    expect(screen.getAllByLabelText(/^threshold$/i)).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: /add criterion/i }));
    expect(screen.getAllByLabelText(/^threshold$/i)).toHaveLength(2);

    const [firstRemoveButton] = screen.getAllByRole("button", { name: /remove/i });
    fireEvent.click(firstRemoveButton!);
    expect(screen.getAllByLabelText(/^threshold$/i)).toHaveLength(1);
  });

  it("only shows fund context fields once the toggle is checked", () => {
    render(<ThesisForm orgSlug="alice-capital" idempotencyKey="idem-abc" />);
    expect(screen.queryByLabelText(/fund size/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/set fund context/i));
    expect(screen.getByLabelText(/fund size/i)).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<ThesisForm orgSlug="alice-capital" idempotencyKey="idem-abc" />);
    await expectNoA11yViolations(container);
  });
});
