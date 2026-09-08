import { render } from "@testing-library/react";
import { describe, it } from "vitest";
import { expectNoA11yViolations } from "../../a11y/expectNoA11yViolations.js";
import { DilutionBridge } from "./DilutionBridge.js";

describe("DilutionBridge a11y", () => {
  it("has no axe violations", async () => {
    const { container } = render(
      <DilutionBridge
        caption="Ownership today compared with this SAFE"
        before={{
          label: "Today",
          segments: [
            {
              id: "founders",
              label: "Founders",
              value: "0.90",
              colorVar: "--gsk-color-bar-1",
              formattedValue: "90.00%",
            },
          ],
        }}
        after={{
          label: "With this SAFE",
          segments: [
            {
              id: "founders",
              label: "Founders",
              value: "0.81",
              colorVar: "--gsk-color-bar-1",
              formattedValue: "81.00%",
            },
            {
              id: "safe-1",
              label: "SAFE",
              value: "0.10",
              colorVar: "--gsk-color-bar-4",
              formattedValue: "10.00%",
            },
          ],
        }}
        rows={[
          {
            id: "founders",
            label: "Founders",
            beforeValue: "90.00%",
            afterValue: "81.00%",
            changeValue: "−9.00 pts",
          },
          {
            id: "safe-1",
            label: "SAFE",
            beforeValue: "—",
            afterValue: "10.00%",
            changeValue: "+10.00 pts",
          },
        ]}
        totalRow={{
          id: "total",
          label: "Total",
          beforeValue: "100.00%",
          afterValue: "100.00%",
          changeValue: "—",
        }}
        narrative="Adding this SAFE reduces founder ownership from 90.0% to 81.0%."
      />,
    );
    await expectNoA11yViolations(container);
  });
});
