import type { Meta, StoryObj } from "@storybook/react";
import { StateBadge } from "./StateBadge.js";

const meta: Meta<typeof StateBadge> = {
  title: "Components/StateBadge",
  component: StateBadge,
};
export default meta;

type Story = StoryObj<typeof StateBadge>;

export const InvestmentDraft: Story = { args: { kind: "investment", state: "draft" } };
export const InvestmentNeedsCounselReview: Story = {
  args: { kind: "investment", state: "counsel_review_pending" },
};
export const InvestmentFunded: Story = { args: { kind: "investment", state: "funded" } };
export const DocumentCounselApproved: Story = {
  args: { kind: "document", state: "counsel_approved_hash" },
};
export const ScenarioFailed: Story = { args: { kind: "scenario", state: "failed" } };
