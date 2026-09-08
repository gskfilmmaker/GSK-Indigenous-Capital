import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectNoA11yViolations } from "../../a11y/expectNoA11yViolations.js";
import { WatermarkOverlay } from "./WatermarkOverlay.js";

describe("WatermarkOverlay a11y", () => {
  it("has no axe violations", async () => {
    const { container } = render(
      <WatermarkOverlay>
        <p>Document preview content.</p>
      </WatermarkOverlay>,
    );
    await expectNoA11yViolations(container);
  });

  it("exposes the watermark text as real, non-hidden text (not only a decorative stamp)", () => {
    render(
      <WatermarkOverlay>
        <p>Document preview content.</p>
      </WatermarkOverlay>,
    );
    // getAllByText because the decorative stamp (aria-hidden) also carries
    // the same text — the accessible copy must exist independently of it.
    const matches = screen.getAllByText("DRAFT — NOT FOR SIGNATURE");
    expect(matches.length).toBeGreaterThanOrEqual(1);
    const accessibleCopy = matches.find((el) => el.closest('[aria-hidden="true"]') === null);
    expect(accessibleCopy).toBeDefined();
  });
});
