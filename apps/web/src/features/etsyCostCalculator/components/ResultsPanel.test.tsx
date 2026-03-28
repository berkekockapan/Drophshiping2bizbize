import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import type { ScenarioSnapshot } from "../lib/types";
import { ResultsPanel } from "./ResultsPanel";

const scenario: ScenarioSnapshot = {
  normalizedRevenueUsd: 60,
  normalizedRevenueTry: 2400,
  totalEtsyFeesUsd: 11.65,
  totalEtsyFeesTry: 466,
  totalOperationalCostsUsd: 28,
  totalOperationalCostsTry: 1120,
  netProfitUsd: 20.35,
  netProfitTry: 814,
  netMarginPercent: 33.92,
  warnings: [{ key: "negative_profit", message: "Bu senaryoda net kar negatife dusuyor." }],
  breakdown: [],
};

it("shows quick mode labels and warning blocks together", () => {
  render(
    <ResultsPanel
      activeTab="analyze_price"
      recommendedSalePriceUsd={49.63}
      breakEvenPriceUsd={31.52}
      targetSafeListPriceUsd={49.63}
      recommendedScenario={scenario}
      enteredSalePriceUsd={39}
      enteredPriceScenario={scenario}
    />,
  );

  expect(screen.getByText(/onerilen satis fiyati/i)).toBeInTheDocument();
  expect(screen.getByText(/basa bas fiyat/i)).toBeInTheDocument();
  expect(screen.getByText(/girilen fiyat kiyasi/i)).toBeInTheDocument();
  expect(screen.getByText(/bu senaryoda net kar negatife dusuyor/i)).toBeInTheDocument();
});
