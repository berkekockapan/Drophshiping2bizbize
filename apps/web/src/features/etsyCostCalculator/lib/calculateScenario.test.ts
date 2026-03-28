import { describe, expect, it } from "vitest";

import { createDefaultDraft } from "./defaults";
import { calculateScenario } from "./calculateScenario";

describe("calculateScenario", () => {
  it("applies Etsy TR defaults when VAT ID is missing", () => {
    const draft = {
      ...createDefaultDraft(),
      usdTryRate: 40,
      salePriceUsd: 50,
      buyerPaidShippingUsd: 10,
      productCost: { amount: 20, currency: "USD" as const },
      actualShippingCost: { amount: 5, currency: "USD" as const },
      packagingCost: { amount: 1, currency: "USD" as const },
      shipentegraOperationCost: { amount: 2, currency: "USD" as const },
    };

    const result = calculateScenario(draft);
    expect(result.normalizedRevenueUsd).toBe(60);
    expect(result.totalEtsyFeesUsd).toBe(11.65);
    expect(result.totalOperationalCostsUsd).toBe(28);
    expect(result.netProfitUsd).toBe(20.35);
  });

  it("normalizes TRY costs, applies campaign inputs, and keeps profit math stable", () => {
    const draft = {
      ...createDefaultDraft(),
      usdTryRate: 40,
      salePriceUsd: 100,
      buyerPaidShippingUsd: 15,
      buyerPaidExtrasUsd: 5,
      buyerTaxCollectedByEtsyUsd: 8,
      saleDiscountPercent: 10,
      coupon: { type: "fixed_usd" as const, value: 5 },
      freeShipping: true,
      productCost: { amount: 1600, currency: "TRY" as const },
      actualShippingCost: { amount: 320, currency: "TRY" as const },
      packagingCost: { amount: 40, currency: "TRY" as const },
      shipentegraOperationCost: { amount: 4, currency: "USD" as const },
      customCosts: [
        { id: "custom_1", label: "Etiket", value: { amount: 80, currency: "TRY" as const }, enabled: true },
      ],
      overheadMode: "allocated_total" as const,
      overheadTotalLines: [
        { id: "over_1", label: "Reklam", value: { amount: 400, currency: "TRY" as const }, enabled: true },
        { id: "over_2", label: "Abonelik", value: { amount: 4, currency: "USD" as const }, enabled: true },
      ],
      overheadExpectedOrderCount: 7,
      vatMode: "vat_id_provided" as const,
      currencyConversionEnabled: true,
      offsiteAdsMode: "rate_15" as const,
    };

    const result = calculateScenario(draft);
    expect(result.normalizedRevenueUsd).toBe(90);
    expect(result.totalEtsyFeesUsd).toBe(30.56);
    expect(result.totalOperationalCostsUsd).toBe(57);
    expect(result.netProfitUsd).toBe(2.44);
  });

  it("caps offsite ads at 100 USD and adds deposit fee below the threshold", () => {
    const cappedAdsResult = calculateScenario({
      ...createDefaultDraft(),
      usdTryRate: 40,
      salePriceUsd: 1000,
      vatMode: "vat_id_provided",
      offsiteAdsMode: "rate_15",
    });

    expect(cappedAdsResult.breakdown.find((row) => row.key === "offsite_ads_fee")?.amountUsd).toBe(100);

    const depositResult = calculateScenario({
      ...createDefaultDraft(),
      usdTryRate: 40,
      salePriceUsd: 12,
      vatMode: "vat_id_provided",
      includeDepositFee: true,
    });

    expect(depositResult.breakdown.find((row) => row.key === "deposit_fee")?.amountTry).toBe(42);
  });
});
