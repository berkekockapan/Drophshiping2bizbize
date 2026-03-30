import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { createDefaultDraft } from "../lib/defaults";
import type { ScenarioSnapshot } from "../lib/types";
import { ResultsPanel } from "./ResultsPanel";

const recommendedScenario: ScenarioSnapshot = {
  normalizedRevenueUsd: 60,
  normalizedRevenueTry: 2400,
  totalEtsyFeesUsd: 11.65,
  totalEtsyFeesTry: 466,
  totalOperationalCostsUsd: 28,
  totalOperationalCostsTry: 1120,
  netProfitUsd: 20.35,
  netProfitTry: 814,
  netMarginPercent: 33.92,
  warnings: [{ key: "recommended_warning", message: "Onerilen senaryo uyarisi." }],
  breakdown: [],
};

const enteredScenario: ScenarioSnapshot = {
  normalizedRevenueUsd: 48,
  normalizedRevenueTry: 1920,
  totalEtsyFeesUsd: 9.4,
  totalEtsyFeesTry: 376,
  totalOperationalCostsUsd: 23,
  totalOperationalCostsTry: 920,
  netProfitUsd: 15.6,
  netProfitTry: 624,
  netMarginPercent: 32.5,
  warnings: [{ key: "negative_profit", message: "Bu senaryoda net kar negatife dusuyor." }],
  breakdown: [],
};

it("shows semantic result cards, revenue summary, and active warnings only", () => {
  render(
    <ResultsPanel
      activeTab="analyze_price"
      draft={createDefaultDraft()}
      recommendedSalePriceUsd={49.63}
      breakEvenPriceUsd={31.52}
      targetSafeListPriceUsd={54.8}
      recommendedScenario={recommendedScenario}
      enteredSalePriceUsd={39}
      enteredPriceScenario={enteredScenario}
    />,
  );

  expect(screen.getByText(/onerilen liste fiyati/i)).toBeInTheDocument();
  expect(screen.getByText(/indirim sonrasi satis fiyati/i)).toBeInTheDocument();
  expect(screen.getByText(/tahmini net kar/i)).toBeInTheDocument();
  expect(screen.getByText(/toplam gider ozeti/i)).toBeInTheDocument();
  expect(screen.getByText(/bu senaryoda net kar negatife dusuyor/i)).toBeInTheDocument();
  expect(screen.queryByText(/onerilen senaryo uyarisi/i)).not.toBeInTheDocument();
  expect(screen.getByText(/toplam tahsilat/i)).toBeInTheDocument();
  expect(screen.getByText(/urun geliri/i)).toBeInTheDocument();
});
