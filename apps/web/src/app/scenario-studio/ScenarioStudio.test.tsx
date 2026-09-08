import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ScenarioStudio } from "./ScenarioStudio.js";

describe("ScenarioStudio", () => {
  it("shows a valid, succeeded result with no SAFEs added yet (default 90/8/2 existing capitalization)", () => {
    render(<ScenarioStudio />);
    expect(screen.getByText("Succeeded")).toBeInTheDocument();
    expect(screen.getByText(/no safes added yet/i)).toBeInTheDocument();
    // Founders/legacy start at 90% with no dilution yet.
    expect(screen.getAllByText("90.0%").length).toBeGreaterThan(0);
  });

  it("computes indicative cap-SAFE ownership live as the user fills in a row (spec §8 test 1: 500,000/5,000,000 = 10%)", () => {
    render(<ScenarioStudio />);

    fireEvent.click(screen.getByRole("button", { name: /add a safe/i }));

    // Incomplete row: state should read Failed with a validation message,
    // not silently show a stale/zero result.
    expect(screen.getByText("Failed")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/investment amount/i), {
      target: { value: "500000" },
    });
    fireEvent.change(screen.getByLabelText(/post-money valuation cap/i), {
      target: { value: "5000000" },
    });

    expect(screen.getByText("Succeeded")).toBeInTheDocument();
    // Hero value: total indicative SAFE ownership (also repeated in the
    // per-SAFE table row and the ownership-by-holder table).
    expect(screen.getAllByText("10.0%").length).toBeGreaterThan(0);
    // Founders diluted from 90% to 81% (90% * (1 - 10%)).
    expect(screen.getAllByText("81.0%").length).toBeGreaterThan(0);
  });

  it("marks a discount-only SAFE as not determinable rather than showing a fabricated ownership number", () => {
    render(<ScenarioStudio />);
    fireEvent.click(screen.getByRole("button", { name: /add a safe/i }));
    fireEvent.change(screen.getByLabelText(/investment amount/i), {
      target: { value: "100000" },
    });
    fireEvent.change(screen.getByLabelText(/instrument type/i), {
      target: { value: "discount_only" },
    });
    fireEvent.change(screen.getByLabelText(/discount/i), { target: { value: "20" } });

    expect(screen.getByText("Succeeded")).toBeInTheDocument();
    expect(screen.getAllByText(/not determinable before a priced round/i).length).toBeGreaterThan(
      0,
    );
  });

  it("clears the valuation cap when switching a row away from post_money_cap (spec §6.5: no stale reuse)", () => {
    render(<ScenarioStudio />);
    fireEvent.click(screen.getByRole("button", { name: /add a safe/i }));
    fireEvent.change(screen.getByLabelText(/post-money valuation cap/i), {
      target: { value: "5000000" },
    });
    fireEvent.change(screen.getByLabelText(/instrument type/i), { target: { value: "mfn" } });

    expect(screen.queryByLabelText(/post-money valuation cap/i)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/instrument type/i), {
      target: { value: "post_money_cap" },
    });
    expect(screen.getByLabelText(/post-money valuation cap/i)).toHaveValue("");
  });

  it("blocks (rather than showing negative ownership) when cap SAFEs would sell the entire company or more", () => {
    render(<ScenarioStudio />);
    fireEvent.click(screen.getByRole("button", { name: /add a safe/i }));
    fireEvent.change(screen.getByLabelText(/investment amount/i), {
      target: { value: "5000000" },
    });
    fireEvent.change(screen.getByLabelText(/post-money valuation cap/i), {
      target: { value: "5000000" },
    });

    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.getByText(/can't be modelled/i)).toBeInTheDocument();
    expect(screen.getByText(/sells the entire company or more/i)).toBeInTheDocument();
  });

  it("rejects existing capitalization that does not sum to 100%", () => {
    render(<ScenarioStudio />);
    fireEvent.change(screen.getByLabelText(/founders \/ legacy/i), { target: { value: "50" } });

    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(
      within(screen.getByRole("alert")).getByText(/existing capitalization/i),
    ).toBeInTheDocument();
  });

  it("removes a SAFE row and reflects that in the results", () => {
    render(<ScenarioStudio />);
    fireEvent.click(screen.getByRole("button", { name: /add a safe/i }));
    fireEvent.change(screen.getByLabelText(/investment amount/i), {
      target: { value: "500000" },
    });
    fireEvent.change(screen.getByLabelText(/post-money valuation cap/i), {
      target: { value: "5000000" },
    });
    expect(screen.getAllByText("10.0%").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /remove safe 1/i }));

    expect(screen.getByText(/no safes added yet/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/investment amount/i)).not.toBeInTheDocument();
  });
});
