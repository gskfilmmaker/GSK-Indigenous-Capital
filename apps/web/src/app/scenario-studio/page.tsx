import type { Metadata } from "next";
import { ScenarioStudio } from "./ScenarioStudio";

export const metadata: Metadata = {
  title: "SAFE Scenario Studio — GSK Indigenous Capital",
  description:
    "Model cap-SAFE dilution before a priced round. Not legal, tax, accounting, or investment advice.",
};

export default function ScenarioStudioPage() {
  return <ScenarioStudio />;
}
