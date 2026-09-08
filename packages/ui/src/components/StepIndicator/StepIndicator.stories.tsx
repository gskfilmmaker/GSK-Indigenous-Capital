import type { Meta, StoryObj } from "@storybook/react";
import { StepIndicator } from "./StepIndicator.js";

const steps = [
  { id: "model", label: "Model" },
  { id: "review", label: "Review" },
  { id: "record", label: "Record" },
];

const meta: Meta<typeof StepIndicator> = {
  title: "Components/StepIndicator",
  component: StepIndicator,
};
export default meta;

type Story = StoryObj<typeof StepIndicator>;

export const OnModel: Story = { args: { steps, currentStepId: "model" } };
export const OnReview: Story = { args: { steps, currentStepId: "review" } };
export const OnRecord: Story = { args: { steps, currentStepId: "record" } };
