import "@gsk/ui/tokens.css";
import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "GSK Indigenous Capital — SAFE Studio",
  description:
    "Canadian SAFE modelling and financing workflow for Indigenous founders and Canadian startups. Not legal, tax, accounting, or investment advice.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
