import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { FeeBreakdownTable } from "./FeeBreakdownTable";

it("renders grouped breakdown labels, source badges, and notes", () => {
  render(
    <FeeBreakdownTable
      groups={[
        {
          key: "etsy_fees",
          label: "Etsy fee'leri",
          rows: [
            {
              key: "listing_related_fee",
              label: "Listing-related fee",
              formattedUsd: "$0.20",
              formattedTry: "8,00 ₺",
              badgeLabel: "Resmi varsayilan",
              note: "Varsayilan per-order listing varsayimi.",
            },
          ],
        },
        {
          key: "user_costs",
          label: "Kullanici maliyetleri",
          rows: [
            {
              key: "deposit_fee",
              label: "Deposit fee",
              formattedUsd: "$1.05",
              formattedTry: "42,00 ₺",
              badgeLabel: "Kosullu kalem",
              note: "Payout-bazli kosullu fee.",
            },
          ],
        },
        { key: "summary", label: "Sonuc ozeti", rows: [] },
      ]}
    />,
  );

  expect(screen.getByText(/etsy fee'leri/i)).toBeInTheDocument();
  expect(screen.getByText(/resmi varsayilan/i)).toBeInTheDocument();
  expect(screen.getByText(/kosullu kalem/i)).toBeInTheDocument();
  expect(screen.getByText(/payout-bazli kosullu fee/i)).toBeInTheDocument();
});
