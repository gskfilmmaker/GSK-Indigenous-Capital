import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "./page.js";

describe("HomePage", () => {
  it("states the outcome, not legal certainty, in the headline", () => {
    render(<HomePage />);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /model dilution\. organize the financing\. prepare for professional review\./i,
      }),
    ).toBeInTheDocument();
  });

  it("states Ontario-first and CAD-first scope", () => {
    render(<HomePage />);
    expect(screen.getByText(/ontario-first/i)).toBeInTheDocument();
    expect(screen.getByText(/cad-first/i)).toBeInTheDocument();
  });

  it("shows the not-legal-advice disclaimer prominently, more than once", () => {
    render(<HomePage />);
    expect(
      screen.getAllByText(/not legal, tax, accounting, or investment advice/i).length,
    ).toBeGreaterThan(0);
  });

  it("never claims to be legally compliant, a lawyer replacement, or an official YC calculator", () => {
    render(<HomePage />);
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/legally compliant/i);
    expect(text).not.toMatch(/lawyer replacement/i);
    expect(text).not.toMatch(/guaranteed closing/i);
    expect(text).not.toMatch(/official yc calculator/i);
  });

  it('never calls the instrument an "Indigenous SAFE" (root CLAUDE.md naming rule)', () => {
    render(<HomePage />);
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/indigenous safe/i);
  });

  it("shows the Model -> Review -> Record three-step diagram", () => {
    render(<HomePage />);
    expect(screen.getByRole("navigation", { name: /progress/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Model" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Review" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Record" })).toBeInTheDocument();
  });

  it("links to the Scenario Studio", () => {
    render(<HomePage />);
    const links = screen.getAllByRole("link", { name: /scenario studio|model a safe scenario/i });
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link).toHaveAttribute("href", "/scenario-studio");
    }
  });
});
