import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ProductTariffRecommendation } from "../../../app/api";
import { renderWithProviders } from "../../../test/test-utils";
import { TariffRecommendationCard } from "./TariffRecommendationCard";

const recommendation: ProductTariffRecommendation = {
  catalogId: "catalog_711790",
  canonicalHs6: "711790",
  profileName: "Taklit taki",
  title: "Imitation jewelry",
  rationale: "Eslesen urun sinyali bulundu.",
  score: 120,
  usProfileId: "us_711790_2026r4",
  htsCode10: "7117.90.7500",
  generalDutyRate: 0.11,
  additionalDutyRate: 0,
  combinedDutyRate: 0.11,
  dutySummary: "%11.0 temel vergi + %0.0 ek tarife = toplam %11.0",
  defaultShipentegraUsd: 4.9,
  sourceBadges: ["Kural eslesmesi"],
};

describe("TariffRecommendationCard", () => {
  it("renders recommendation details and fires actions", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onSubmitCandidate = vi.fn();

    renderWithProviders(
      <TariffRecommendationCard
        recommendation={recommendation}
        onSelect={onSelect}
        onSubmitCandidate={onSubmitCandidate}
      />,
    );

    expect(screen.getByText("711790")).toBeInTheDocument();
    expect(screen.getByText(/imitation jewelry/i)).toBeInTheDocument();
    expect(screen.getByText(/toplam %11.0/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /bu kodu sec/i }));
    await user.click(screen.getByRole("button", { name: /ortak bilgiye aday yap/i }));

    expect(onSelect).toHaveBeenCalledWith(recommendation);
    expect(onSubmitCandidate).toHaveBeenCalledWith(recommendation);
  });
});
