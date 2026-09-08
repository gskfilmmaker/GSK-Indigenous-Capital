import type { Meta, StoryObj } from "@storybook/react";
import { WatermarkOverlay } from "./WatermarkOverlay.js";

const meta: Meta<typeof WatermarkOverlay> = {
  title: "Components/WatermarkOverlay",
  component: WatermarkOverlay,
};
export default meta;

type Story = StoryObj<typeof WatermarkOverlay>;

export const AroundADocumentPreview: Story = {
  render: (args) => (
    <WatermarkOverlay {...args}>
      <div
        style={{ padding: 32, fontFamily: "var(--gsk-font-body)", color: "var(--gsk-color-ink)" }}
      >
        <p>POST-MONEY SIMPLE AGREEMENT FOR FUTURE EQUITY</p>
        <p>This certifies that in exchange for the payment by [Investor Name] of CAD [Amount]...</p>
      </div>
    </WatermarkOverlay>
  ),
};
