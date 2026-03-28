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
          label: "Etsy ucretleri",
          rows: [
            {
              key: "listing_related_fee",
              label: "Listeleme ucreti",
              formattedUsd: "$0.20",
              formattedTry: "8,00 ₺",
              badgeLabel: "Resmi varsayilan",
              note: "Varsayilan siparis basi listeleme varsayimi.",
            },
          ],
        },
        {
          key: "user_costs",
          label: "Kullanici maliyetleri",
          rows: [
            {
              key: "deposit_fee",
              label: "Odeme aktarim ucreti",
              formattedUsd: "$1.05",
              formattedTry: "42,00 ₺",
              badgeLabel: "Kosullu kalem",
              note: "Aktarim bazli kosullu ucret.",
            },
          ],
        },
        { key: "summary", label: "Sonuc ozeti", rows: [] },
      ]}
    />,
  );

  expect(screen.getByText(/etsy ucretleri/i)).toBeInTheDocument();
  expect(screen.getByText(/resmi varsayilan/i)).toBeInTheDocument();
  expect(screen.getByText(/kosullu kalem/i)).toBeInTheDocument();
  expect(screen.getByText(/aktarim bazli kosullu ucret/i)).toBeInTheDocument();
});
