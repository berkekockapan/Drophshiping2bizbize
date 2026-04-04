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
              label: "ShipEntegra gumruk vergisi",
              formattedUsd: "$1.05",
              formattedTry: "42,00 ₺",
              badgeLabel: "Manuel",
              note: "ShipEntegra modelindeki gumruk vergisi tutari.",
            },
            {
              key: "shipentegra_additional_duty_fee",
              label: "ShipEntegra ek vergi (%15)",
              formattedUsd: "$5.40",
              formattedTry: "216,00 ₺",
              badgeLabel: "Sistem",
              note: "Turkiye cikisli gonderiler icin sabit %15 ek vergi tutari.",
            },
            {
              key: "shipentegra_carrier_fee",
              label: "ShipEntegra tasiyici islem bedeli",
              formattedUsd: "$1.00",
              formattedTry: "40,00 ₺",
              badgeLabel: "Sistem",
            },
            {
              key: "shipentegra_import_total",
              label: "ShipEntegra toplam ithalat masrafi",
              formattedUsd: "$10.00",
              formattedTry: "400,00 ₺",
              badgeLabel: "Sistem",
            },
          ],
        },
        { key: "summary", label: "Sonuc ozeti", rows: [] },
      ]}
    />,
  );

  expect(screen.getByRole("heading", { name: /^Gelir$/i })).toBeInTheDocument();
  expect(screen.getByText(/etsy ucretleri/i)).toBeInTheDocument();
  expect(screen.getByText(/^ShipEntegra gumruk vergisi$/i)).toBeInTheDocument();
  expect(screen.getByText(/shipentegra ek vergi/i)).toBeInTheDocument();
  expect(screen.getByText(/shipentegra tasiyici islem bedeli/i)).toBeInTheDocument();
  expect(screen.getByText(/shipentegra toplam ithalat masrafi/i)).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: /yardim/i }).length).toBeGreaterThan(3);
  expect(screen.getAllByText(/shipentegra modelindeki gumruk vergisi tutari/i)).toHaveLength(2);
});