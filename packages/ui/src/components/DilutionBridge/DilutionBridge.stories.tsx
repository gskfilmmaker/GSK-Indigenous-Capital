import type { Meta, StoryObj } from "@storybook/react";
import { DilutionBridge } from "./DilutionBridge.js";

const meta: Meta<typeof DilutionBridge> = {
  title: "Components/DilutionBridge",
  component: DilutionBridge,
};
export default meta;

type Story = StoryObj<typeof DilutionBridge>;

export const TodayVsWithSafe: Story = {
  args: {
    caption: "Ownership today compared with this SAFE",
    before: {
      label: "Today",
      segments: [
        {
          id: "founders",
          label: "Founders",
          value: "0.90",
          colorVar: "--gsk-color-bar-1",
          formattedValue: "90.00%",
        },
        {
          id: "options",
          label: "Options",
          value: "0.08",
          colorVar: "--gsk-color-bar-2",
          formattedValue: "8.00%",
        },
        {
          id: "pool",
          label: "Pool",
          value: "0.02",
          colorVar: "--gsk-color-bar-3",
          formattedValue: "2.00%",
        },
      ],
    },
    after: {
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
          id: "options",
          label: "Options",
          value: "0.072",
          colorVar: "--gsk-color-bar-2",
          formattedValue: "7.20%",
        },
        {
          id: "pool",
          label: "Pool",
          value: "0.018",
          colorVar: "--gsk-color-bar-3",
          formattedValue: "1.80%",
        },
        {
          id: "safe-1",
          label: "SAFE",
          value: "0.10",
          colorVar: "--gsk-color-bar-4",
          formattedValue: "10.00%",
        },
      ],
    },
    rows: [
      {
        id: "founders",
        label: "Founders and legacy holders",
        beforeValue: "90.00%",
        afterValue: "81.00%",
        changeValue: "−9.00 pts",
      },
      {
        id: "options",
        label: "Granted options",
        beforeValue: "8.00%",
        afterValue: "7.20%",
        changeValue: "−0.80 pts",
      },
      {
        id: "pool",
        label: "Unissued option pool",
        beforeValue: "2.00%",
        afterValue: "1.80%",
        changeValue: "−0.20 pts",
      },
      {
        id: "safe-1",
        label: "Northline Ventures (SAFE)",
        beforeValue: "—",
        afterValue: "10.00%",
        changeValue: "+10.00 pts",
      },
    ],
    totalRow: {
      id: "total",
      label: "Total",
      beforeValue: "100.00%",
      afterValue: "100.00%",
      changeValue: "—",
    },
    narrative:
      "Adding the Northline Ventures SAFE reduces founder ownership from 90.0% to 81.0%, before any priced round.",
  },
};
