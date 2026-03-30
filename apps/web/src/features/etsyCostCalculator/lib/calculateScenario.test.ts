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
    expect(result.listedSalePriceUsd).toBe(50);
    expect(result.discountedSalePriceUsd).toBe(50);
    expect(result.productRevenueUsd).toBe(50);
    expect(result.collectedShippingUsd).toBe(10);
    expect(result.collectedExtrasUsd).toBe(0);
    expect(result.totalCollectedUsd).toBe(60);
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
    expect(result.listedSalePriceUsd).toBe(100);
    expect(result.discountedSalePriceUsd).toBe(90);
    expect(result.productRevenueUsd).toBe(85);
    expect(result.collectedShippingUsd).toBe(0);
    expect(result.collectedExtrasUsd).toBe(5);
    expect(result.totalCollectedUsd).toBe(90);
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

  it("uses post-discount post-coupon product revenue as the US duty base", () => {
    const us = calculateScenario({
      ...createDefaultDraft(),
      destinationProfile: "US",
      manualDutyPercent: 15,
      valueSources: { duty: "manual_override" },
      salePriceUsd: 50,
      buyerPaidShippingUsd: 10,
      buyerPaidExtrasUsd: 5,
      buyerTaxCollectedByEtsyUsd: 7,
      saleDiscountPercent: 20,
      coupon: { type: "fixed_usd", value: 4 },
      productCost: { amount: 18, currency: "USD" },
    });

    expect(us.productRevenueUsd).toBe(36);
    expect(us.totalCollectedUsd).toBe(51);
    expect(us.dutyBaseUsd).toBe(36);
    expect(us.breakdown.find((row) => row.key === "us_duty_fee")?.amountUsd).toBe(5.4);
    expect(us.breakdown.find((row) => row.key === "us_duty_fee")?.sourceType).toBe("manual_override");
    expect(us.breakdown.find((row) => row.key === "us_duty_fee")?.note).toMatch(/urun geliridir/i);
    expect(us.warnings.find((warning) => warning.key === "shipentegra_import")?.message).toMatch(/ShipEntegra ithalat modeli/i);

    const other = calculateScenario({
      ...createDefaultDraft(),
      destinationProfile: "OTHER",
      manualDutyPercent: 15,
      salePriceUsd: 50,
    });

    expect(other.dutyBaseUsd).toBe(0);
    expect(other.breakdown.find((row) => row.key === "us_duty_fee")).toBeUndefined();
  });

  it("models ShipEntegra import costs as separate operational rows for US scenarios", () => {
    const result = calculateScenario({
      ...createDefaultDraft(),
      usdTryRate: 40,
      destinationProfile: "US",
      salePriceUsd: 50,
      saleDiscountPercent: 20,
      coupon: { type: "fixed_usd", value: 4 },
      manualDutyPercent: 10,
      valueSources: { duty: "manual_override" },
      productCost: { amount: 18, currency: "USD" },
      actualShippingCost: { amount: 5, currency: "USD" },
      packagingCost: { amount: 1, currency: "USD" },
      shipentegraOperationCost: { amount: 2, currency: "USD" },
    });

    expect(result.shipentegraImportBasisUsd).toBe(36);
    expect(result.shipentegraDutyUsd).toBe(3.6);
    expect(result.shipentegraAdditionalDutyUsd).toBe(5.4);
    expect(result.shipentegraCarrierFeeUsd).toBe(1);
    expect(result.shipentegraImportTotalUsd).toBe(10);
    expect(result.totalOperationalCostsUsd).toBe(36);
    expect(result.breakdown.find((row) => row.key === "us_duty_fee")?.label).toBe("ShipEntegra gumruk vergisi");
    expect(result.breakdown.find((row) => row.key === "shipentegra_additional_duty_fee")?.amountUsd).toBe(5.4);
    expect(result.breakdown.find((row) => row.key === "shipentegra_carrier_fee")?.amountUsd).toBe(1);
    expect(result.breakdown.find((row) => row.key === "shipentegra_import_total")?.amountUsd).toBe(10);
    expect(result.warnings.find((warning) => warning.key === "shipentegra_import")?.message).toMatch(/ShipEntegra ithalat modeli/i);
  });
});
