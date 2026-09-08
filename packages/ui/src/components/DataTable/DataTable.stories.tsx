import type { Meta, StoryObj } from "@storybook/react";
import { DataTable } from "./DataTable.js";

interface DemoRow {
  id: string;
  holder: string;
  ownership: string;
}

const rows: DemoRow[] = [
  { id: "founders", holder: "Founders and legacy holders", ownership: "81.00%" },
  { id: "options", holder: "Granted options", ownership: "7.20%" },
  { id: "pool", holder: "Unissued option pool", ownership: "1.80%" },
  { id: "safe-1", holder: "Northline Ventures (SAFE)", ownership: "10.00%" },
  { id: "total", holder: "Total", ownership: "100.00%" },
];

const meta: Meta<typeof DataTable<DemoRow>> = {
  title: "Components/DataTable",
  component: DataTable,
};
export default meta;

type Story = StoryObj<typeof DataTable<DemoRow>>;

export const OwnershipResults: Story = {
  args: {
    caption: "Ownership by holder, with this SAFE",
    captionVisible: true,
    columns: [
      { key: "holder", header: "Holder", render: (row) => row.holder },
      { key: "ownership", header: "Ownership", align: "end", render: (row) => row.ownership },
    ],
    rows,
    getRowKey: (row) => row.id,
    totalRowKey: "total",
  },
};
