import { render } from "@testing-library/react";
import { describe, it } from "vitest";
import { expectNoA11yViolations } from "../../a11y/expectNoA11yViolations.js";
import { OwnershipBar } from "./OwnershipBar.js";

describe("OwnershipBar a11y", () => {
  it("has no axe violations (decorative bar, accessible table, live narrative)", async () => {
    const { container } = render(
      <OwnershipBar
        heroValue={{ formattedValue: "81.0%", label: "Founder ownership with this SAFE" }}
        segments={[
          {
            id: "founders",
            label: "Founders",
            value: "0.81",
            colorVar: "--gsk-color-bar-1",
            formattedValue: "81.0%",
          },
          {
            id: "safe-1",
            label: "SAFE",
            value: "0.10",
            colorVar: "--gsk-color-bar-4",
            formattedValue: "10.0%",
          },
        ]}
        formattedTotal="91.0%"
        caption="Ownership by holder"
        narrative="Adding this SAFE reduces founder ownership from 90.0% to 81.0%."
      />,
    );
    await expectNoA11yViolations(container);
  });
});
