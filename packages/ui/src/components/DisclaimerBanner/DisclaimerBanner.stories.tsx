import type { Meta, StoryObj } from "@storybook/react";
import { DisclaimerBanner } from "./DisclaimerBanner.js";

const meta: Meta<typeof DisclaimerBanner> = {
  title: "Components/DisclaimerBanner",
  component: DisclaimerBanner,
};
export default meta;

type Story = StoryObj<typeof DisclaimerBanner>;

export const Default: Story = {};
