import { describe, expect, it } from "vitest";

import { createDefaultDraft } from "./defaults";
import { buildQuickModeViewModel } from "./buildQuickModeViewModel";

describe("buildQuickModeViewModel", () => {
  it("separates listed price from discounted product revenue in quick mode scenarios", () => {
    const draft = {
      ...createDefaultDraft(),
      usdTryRate: 40,
      destinationProfile: "US" as const,
      manualDutyPercent: 10,
      productCost: { amount: 18, currency: "USD" as const },
      actualShippingCost: { amount: 5, currency: "USD" as const },
      targetProfitMode: "net_profit_usd" as const,
      targetProfitValue: 10,
      salePriceUsd: 39,
      saleDiscountPercent: 10,
      coupon: { type: "fixed_usd" as const, value: 2 },
      buyerPaidShippingUsd: 4,
      buyerPaidExtrasUsd: 1,
      buyerTaxCollectedByEtsyUsd: 3,
    };

    const view = buildQuickModeViewModel(draft);

    expect(view.breakEvenPriceUsd).toBe(43.02);
    expect(view.targetSafeListPriceUsd).toBe(62.62);
    expect(view.recommendedSalePriceUsd).toBe(62.62);
    expect(view.recommendedScenario?.listedSalePriceUsd).toBe(62.62);
    expect(view.recommendedScenario?.discountedSalePriceUsd).toBe(56.36);
    expect(view.recommendedScenario?.productRevenueUsd).toBe(54.36);
    expect(view.recommendedScenario?.shipentegraImportBasisUsd).toBe(54.36);
    expect(view.recommendedScenario?.shipentegraDutyUsd).toBe(5.44);
    expect(view.recommendedScenario?.shipentegraAdditionalDutyUsd).toBe(8.15);
    expect(view.recommendedScenario?.shipentegraCarrierFeeUsd).toBe(1);
    expect(view.recommendedScenario?.shipentegraImportTotalUsd).toBe(14.59);
    expect(view.recommendedScenario?.totalCollectedUsd).toBe(59.36);
    expect(view.recommendedScenario?.dutyBaseUsd).toBe(54.36);
    expect(view.recommendedScenario?.netProfitUsd).toBeGreaterThanOrEqual(10);
    expect(view.enteredPriceScenario?.listedSalePriceUsd).toBe(39);
    expect(view.enteredPriceScenario?.discountedSalePriceUsd).toBe(35.1);
    expect(view.enteredPriceScenario?.productRevenueUsd).toBe(33.1);
    expect(view.enteredPriceScenario?.shipentegraImportTotalUsd).toBe(9.28);
    expect(view.enteredPriceScenario?.totalCollectedUsd).toBe(38.1);
    expect(view.enteredPriceScenario?.dutyBaseUsd).toBe(33.1);
    expect(view.hasEnteredSalePrice).toBe(true);
  });
});
