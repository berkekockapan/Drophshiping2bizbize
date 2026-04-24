import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";

import { FeeBreakdownTable } from "./FeeBreakdownTable";

it("renders grouped breakdown inside a collapsible card", async () => {
  const user = userEvent.setup();

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
              label: "ABD ithalat vergisi",
              formattedUsd: "$1.05",
              formattedTry: "42,00 ₺",
              badgeLabel: "Manuel",
              note: "Girilen veya analizden gelen orana gore hesaplanan tahmini ABD ithalat vergisi.",
            },
          ],
        },
        { key: "summary", label: "Sonuc ozeti", rows: [] },
      ]}
    />,
  );

  const toggleButton = screen.getByRole("button", { name: /detaylari goster/i });
  expect(toggleButton).toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByRole("heading", { name: /^Gelir$/i })).not.toBeInTheDocument();

  await user.click(toggleButton);

  expect(screen.getByRole("button", { name: /detaylari gizle/i })).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByRole("heading", { name: /^Gelir$/i })).toBeInTheDocument();
  expect(screen.getByText(/etsy ucretleri/i)).toBeInTheDocument();
  expect(screen.getByText(/^ABD ithalat vergisi$/i)).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: /yardim/i }).length).toBeGreaterThan(1);
  expect(screen.getAllByText(/tahmini ABD ithalat vergisi/i)).toHaveLength(2);
});
