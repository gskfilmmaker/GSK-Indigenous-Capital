import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoA11yViolations } from "../../a11y/expectNoA11yViolations.js";
import { StateBadge } from "./StateBadge.js";
import { DOCUMENT_STATES, INVESTMENT_STATES, SCENARIO_STATES } from "./states.js";

describe("StateBadge a11y", () => {
  it("has no axe violations for every investment state", async () => {
    for (const state of Object.keys(INVESTMENT_STATES) as (keyof typeof INVESTMENT_STATES)[]) {
      const { container, unmount } = render(<StateBadge kind="investment" state={state} />);
      await expectNoA11yViolations(container);
      unmount();
    }
  });

  it("has no axe violations for every document state", async () => {
    for (const state of Object.keys(DOCUMENT_STATES) as (keyof typeof DOCUMENT_STATES)[]) {
      const { container, unmount } = render(<StateBadge kind="document" state={state} />);
      await expectNoA11yViolations(container);
      unmount();
    }
  });

  it("has no axe violations for every scenario state", async () => {
    for (const state of Object.keys(SCENARIO_STATES) as (keyof typeof SCENARIO_STATES)[]) {
      const { container, unmount } = render(<StateBadge kind="scenario" state={state} />);
      await expectNoA11yViolations(container);
      unmount();
    }
  });

  it("never renders a bare, unqualified claim like 'Compliant', 'Approved', or 'Eligible'", () => {
    // Spec §6.3: "Never render a financing as 'compliant,' 'eligible,' or
    // 'approved.'" That bans an unqualified system verdict — it does not
    // ban a factual record of someone else's action, which is exactly what
    // states like "Counsel approved" or "Counsel review recorded" are: a
    // record of what counsel did, not a system-declared verdict on the
    // financing itself.
    const allLabels = [
      ...Object.values(INVESTMENT_STATES),
      ...Object.values(DOCUMENT_STATES),
      ...Object.values(SCENARIO_STATES),
    ].map((meta) => meta.label);
    for (const label of allLabels) {
      expect(label).not.toBe("Compliant");
      expect(label).not.toBe("Approved");
      expect(label).not.toBe("Eligible");
    }
  });
});
