import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { ResultsPanel } from "./ResultsPanel";

it("shows USD/TRY outputs and warning blocks together", () => {
  render(
    <ResultsPanel
      result={{
        normalizedRevenueUsd: 60,
        normalizedRevenueTry: 2400,
        totalEtsyFeesUsd: 11.65,
        totalEtsyFeesTry: 466,
        totalOperationalCostsUsd: 28,
        totalOperationalCostsTry: 1120,
        netProfitUsd: 20.35,
        netProfitTry: 814,
        netMarginPercent: 33.92,
        breakEvenPriceUsd: 31.52,
        targetSafeListPriceUsd: 49.63,
        warnings: [{ key: "negative_profit", message: "Bu senaryoda net kar negatife dusuyor." }],
        breakdown: [],
      }}
    />,
  );

  expect(screen.getByText(/net kar \(usd\)/i)).toBeInTheDocument();
  expect(screen.getByText(/net kar \(try\)/i)).toBeInTheDocument();
  expect(screen.getByText(/bu senaryoda net kar negatife dusuyor/i)).toBeInTheDocument();
});
