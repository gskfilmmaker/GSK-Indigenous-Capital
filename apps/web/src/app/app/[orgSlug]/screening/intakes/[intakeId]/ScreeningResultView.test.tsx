import { expectNoA11yViolations } from "@gsk/ui";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ScreeningResultView } from "./ScreeningResultView.js";

const FULL_OUTPUT = {
  vcMethod: {
    impliedMultiple: "2.25",
    postMoneyValuation: "40000000",
    preMoneyValuation: "36000000",
    investorOwnership: "0.1",
  },
  fundReturnCheck: { requiredMultipleToReturnFund: "25" },
  ruleOf40: { growthPlusMargin: "0.5", meetsBar: true },
  unitEconomics: {
    lifetimeValue: "40000",
    ltvToCacRatio: "5",
    meetsLtvCacFloor: true,
    cacPaybackMonths: "10",
  },
  marketCredibility: {
    bottomUpEstimate: "30000000",
    topDownEstimate: "8000000",
    gapPercent: "73.3",
    withinCredibleTolerance: false,
  },
  redFlags: [{ code: "monthly_churn_above_five_percent", description: "Monthly churn is 6%." }],
  thesisFit: [
    {
      metric: "ltvToCacRatio",
      label: "LTV:CAC",
      comparator: "gte" as const,
      threshold: "3",
      actualValue: "5",
      meetsThreshold: true,
    },
  ],
};

describe("ScreeningResultView", () => {
  it("renders every present section, with no verdict/score field ever shown", () => {
    render(<ScreeningResultView output={FULL_OUTPUT} />);
    expect(screen.getByText("VC Method")).toBeInTheDocument();
    expect(screen.getByText("Unit economics")).toBeInTheDocument();
    expect(screen.getByText("Market-size credibility")).toBeInTheDocument();
    expect(screen.getByText("Fit against the selected thesis")).toBeInTheDocument();
    expect(screen.getByText(/Monthly churn is 6%/)).toBeInTheDocument();
    expect(screen.queryByText(/verdict/i)).not.toBeInTheDocument();
  });

  it("shows the not-advice disclaimer whenever any result renders", () => {
    render(<ScreeningResultView output={FULL_OUTPUT} />);
    expect(screen.getByText(/not investment, legal, or tax advice/i)).toBeInTheDocument();
  });

  it("shows a clean-check note, not a false all-clear, when no flags are present", () => {
    render(<ScreeningResultView output={{ ...FULL_OUTPUT, redFlags: [] }} />);
    expect(screen.getByText(/not the same as a clean bill of health/i)).toBeInTheDocument();
  });

  it("shows an explanatory empty state when no formula had enough data to run", () => {
    render(<ScreeningResultView output={{ redFlags: [] }} />);
    expect(screen.getByText(/didn't have enough data/i)).toBeInTheDocument();
  });

  it("has no axe violations", async () => {
    const { container } = render(<ScreeningResultView output={FULL_OUTPUT} />);
    await expectNoA11yViolations(container);
  });
});
