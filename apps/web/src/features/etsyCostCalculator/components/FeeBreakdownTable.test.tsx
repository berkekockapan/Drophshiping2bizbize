import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { FeeBreakdownTable } from "./FeeBreakdownTable";

it("renders grouped breakdown labels, source badges, notes, and help icons", () => {
  render(
    <FeeBreakdownTable
      groups={[
        {
          key: "revenue",
          label: "Gelir",
          rows: [
            {
              key: "total_collected",
              label: "Toplam tahsilat",
              formattedUsd: "$60.00",
              formattedTry: "2.400,00 ₺",
              badgeLabel: "Gelir",
            },
          ],
        },
        {
          key: "etsy_fees",
          label: "Etsy ucretleri",
          rows: [
            {
              key: "listing_related_fee",
              label: "Listeleme ucreti",
              formattedUsd: "$3.20",
              formattedTry: "128,00 ₺",
              badgeLabel: "Manuel",
              note: "Hizli formdaki listing ucreti uygulandi.",
            },
          ],
        },
        {
          key: "operational_costs",
          label: "Operasyonel maliyetler",
          rows: [
            {
              key: "us_duty_fee",
              label: "ABD duty",
              formattedUsd: "$1.05",
              formattedTry: "42,00 ₺",
              badgeLabel: "Manuel",
              note: "ABD ithalat vergisi etkisi.",
            },
          ],
        },
        { key: "summary", label: "Sonuc ozeti", rows: [] },
      ]}
    />,
  );

  expect(screen.getByRole("heading", { name: /^Gelir$/i })).toBeInTheDocument();
  expect(screen.getByText(/etsy ucretleri/i)).toBeInTheDocument();
  expect(screen.getByText(/^ABD duty$/i)).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: /yardim/i }).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/abd ithalat vergisi etkisi/i)).toHaveLength(2);
});
