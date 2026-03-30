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

    expect(view.breakEvenPriceUsd).toBe(32.93);
    expect(view.targetSafeListPriceUsd).toBe(48.43);
    expect(view.recommendedSalePriceUsd).toBe(48.43);
    expect(view.recommendedScenario?.listedSalePriceUsd).toBe(48.43);
    expect(view.recommendedScenario?.discountedSalePriceUsd).toBe(43.59);
    expect(view.recommendedScenario?.productRevenueUsd).toBe(41.59);
    expect(view.recommendedScenario?.totalCollectedUsd).toBe(46.59);
    expect(view.recommendedScenario?.dutyBaseUsd).toBe(41.59);
    expect(view.recommendedScenario?.netProfitUsd).toBeGreaterThanOrEqual(10);
    expect(view.enteredPriceScenario?.listedSalePriceUsd).toBe(39);
    expect(view.enteredPriceScenario?.discountedSalePriceUsd).toBe(35.1);
    expect(view.enteredPriceScenario?.productRevenueUsd).toBe(33.1);
    expect(view.enteredPriceScenario?.totalCollectedUsd).toBe(38.1);
    expect(view.enteredPriceScenario?.dutyBaseUsd).toBe(33.1);
    expect(view.hasEnteredSalePrice).toBe(true);
  });
});
