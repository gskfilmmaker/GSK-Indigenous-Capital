import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { NumberField } from "./NumberField.js";

const meta: Meta<typeof NumberField> = {
  title: "Components/NumberField",
  component: NumberField,
};
export default meta;

type Story = StoryObj<typeof NumberField>;

export const Money: Story = {
  render: (args) => {
    const [value, setValue] = useState("500000");
    return <NumberField {...args} value={value} onChange={setValue} />;
  },
  args: {
    label: "Investment amount",
    kind: "money",
    currency: "CAD",
  },
};

export const Percent: Story = {
  render: (args) => {
    const [value, setValue] = useState("10");
    return <NumberField {...args} value={value} onChange={setValue} />;
  },
  args: {
    label: "Discount",
    kind: "percent",
    hint: "Expressed as a percentage of the round price.",
  },
};

export const WithError: Story = {
  render: (args) => {
    const [value, setValue] = useState("0");
    return <NumberField {...args} value={value} onChange={setValue} />;
  },
  args: {
    label: "Valuation cap",
    kind: "money",
    error: "Valuation cap must be greater than zero.",
  },
};
