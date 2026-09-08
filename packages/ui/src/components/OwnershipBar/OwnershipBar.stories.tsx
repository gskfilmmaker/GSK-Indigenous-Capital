import type { Meta, StoryObj } from "@storybook/react";
import { OwnershipBar } from "./OwnershipBar.js";

const meta: Meta<typeof OwnershipBar> = {
  title: "Components/OwnershipBar",
  component: OwnershipBar,
};
export default meta;

type Story = StoryObj<typeof OwnershipBar>;

export const AfterOneSafe: Story = {
  args: {
    heroValue: { formattedValue: "81.0%", label: "Founder ownership with this SAFE" },
    segments: [
      {
        id: "founders",
        label: "Founders and legacy",
        value: "0.81",
        colorVar: "--gsk-color-bar-1",
        formattedValue: "81.0%",
      },
      {
        id: "options",
        label: "Granted options",
        value: "0.072",
        colorVar: "--gsk-color-bar-2",
        formattedValue: "7.2%",
      },
      {
        id: "pool",
        label: "Unissued pool",
        value: "0.018",
        colorVar: "--gsk-color-bar-3",
        formattedValue: "1.8%",
      },
      {
        id: "safe-1",
        label: "Northline Ventures (SAFE)",
        value: "0.10",
        colorVar: "--gsk-color-bar-4",
        formattedValue: "10.0%",
      },
    ],
    formattedTotal: "100.0%",
    caption: "Ownership by holder, with this SAFE",
    narrative:
      "Adding the Northline Ventures SAFE (CAD 500,000 at a CAD 5,000,000 cap) reduces founder ownership from 90.0% to 81.0%, before any priced round.",
  },
};
