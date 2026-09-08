import { render } from "@testing-library/react";
import { describe, it } from "vitest";
import { expectNoA11yViolations } from "../../a11y/expectNoA11yViolations.js";
import { DisclaimerBanner } from "./DisclaimerBanner.js";

describe("DisclaimerBanner a11y", () => {
  it("has no axe violations with the default text", async () => {
    const { container } = render(<DisclaimerBanner />);
    await expectNoA11yViolations(container);
  });

  it("has no axe violations with custom children", async () => {
    const { container } = render(<DisclaimerBanner>Custom disclaimer text.</DisclaimerBanner>);
    await expectNoA11yViolations(container);
  });
});
