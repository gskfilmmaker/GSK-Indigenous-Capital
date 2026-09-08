import { render } from "@testing-library/react";
import { describe, it } from "vitest";
import { expectNoA11yViolations } from "../../a11y/expectNoA11yViolations.js";
import { DataTable } from "./DataTable.js";

interface DemoRow {
  id: string;
  holder: string;
  ownership: string;
}

const rows: DemoRow[] = [
  { id: "founders", holder: "Founders and legacy holders", ownership: "81.00%" },
  { id: "total", holder: "Total", ownership: "100.00%" },
];

describe("DataTable a11y", () => {
  it("has no axe violations with a hidden caption", async () => {
    const { container } = render(
      <DataTable<DemoRow>
        caption="Ownership by holder"
        columns={[
          { key: "holder", header: "Holder", render: (row) => row.holder },
          { key: "ownership", header: "Ownership", align: "end", render: (row) => row.ownership },
        ]}
        rows={rows}
        getRowKey={(row) => row.id}
        totalRowKey="total"
      />,
    );
    await expectNoA11yViolations(container);
  });

  it("has no axe violations with a visible caption", async () => {
    const { container } = render(
      <DataTable<DemoRow>
        caption="Ownership by holder"
        captionVisible
        columns={[{ key: "holder", header: "Holder", render: (row) => row.holder }]}
        rows={rows}
        getRowKey={(row) => row.id}
      />,
    );
    await expectNoA11yViolations(container);
  });
});
