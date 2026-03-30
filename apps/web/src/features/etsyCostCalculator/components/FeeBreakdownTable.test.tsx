import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { FeeBreakdownTable } from "./FeeBreakdownTable";

it("renders grouped breakdown labels, source badges, notes, and help icons", () => {
  render(
    <FeeBreakdownTable
      groups={[
        {
          key: "etsy_fees",
          label: "Etsy ucretleri",
          rows: [
            {
              key: "us_duty_fee",
              label: "Duty",
              formattedUsd: "$3.20",
              formattedTry: "128,00 ₺",
              badgeLabel: "Manuel",
              note: "Hizli formdaki duty yuzdesi uygulandi.",
            },
          ],
        },
        {
          key: "user_costs",
          label: "Kullanici maliyetleri",
          rows: [
            {
              key: "overhead_cost",
              label: "Genel gider payi",
              formattedUsd: "$1.05",
              formattedTry: "42,00 ₺",
              badgeLabel: "Manuel",
              note: "Aktarim bazli kosullu ucret.",
            },
          ],
        },
        { key: "summary", label: "Sonuc ozeti", rows: [] },
      ]}
    />,
  );

  expect(screen.getByText(/etsy ucretleri/i)).toBeInTheDocument();
  expect(screen.getByText(/^Duty$/i)).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: /yardim/i }).length).toBeGreaterThan(0);
  expect(screen.getByText(/aktarim bazli kosullu ucret/i)).toBeInTheDocument();
});
