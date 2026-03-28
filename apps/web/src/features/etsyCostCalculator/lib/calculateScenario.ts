import { ETSY_TR_DEFAULT_FEE_PROFILE } from "./defaults";
import type { BreakdownRow, CalculatorDraft, FeeProfileOverrides, MoneyInput, ScenarioSnapshot } from "./types";

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toUsd(value: MoneyInput, usdTryRate: number) {
  return round2(value.currency === "USD" ? value.amount : value.amount / usdTryRate);
}

function toTry(amountUsd: number, usdTryRate: number) {
  return round2(amountUsd * usdTryRate);
}

function resolveCouponUsd(productSubtotalUsd: number, draft: CalculatorDraft) {
  if (draft.coupon.type === "none") {
    return 0;
  }

  if (draft.coupon.type === "percent") {
    return round2(productSubtotalUsd * (draft.coupon.value / 100));
  }

  return round2(Math.min(draft.coupon.value, productSubtotalUsd));
}

function resolveOverheadUsd(draft: CalculatorDraft) {
  if (draft.overheadMode === "off") {
    return 0;
  }

  if (draft.overheadMode === "per_order") {
    return toUsd(draft.overheadPerOrder, draft.usdTryRate);
  }

  const totalOverheadUsd = draft.overheadTotalLines
    .filter((line) => line.enabled)
    .reduce((sum, line) => sum + toUsd(line.value, draft.usdTryRate), 0);

  return round2(totalOverheadUsd / draft.overheadExpectedOrderCount);
}

function sourceTypeForOfficial(overrideValue: number | undefined) {
  return typeof overrideValue === "number" ? "official_override" : "official_default";
}

export function calculateScenario(draft: CalculatorDraft): ScenarioSnapshot {
  const feeProfile: Required<FeeProfileOverrides> = {
    ...ETSY_TR_DEFAULT_FEE_PROFILE,
    ...(draft.feeProfileOverrides ?? {}),
  };

  const discountedSubtotalUsd = round2(draft.salePriceUsd * (1 - draft.saleDiscountPercent / 100));
  const couponUsd = resolveCouponUsd(discountedSubtotalUsd, draft);
  const productRevenueUsd = round2(Math.max(0, discountedSubtotalUsd - couponUsd));
  const buyerPaidShippingUsd = draft.freeShipping ? 0 : draft.buyerPaidShippingUsd;
  const revenueExcludingTaxUsd = round2(productRevenueUsd + buyerPaidShippingUsd + draft.buyerPaidExtrasUsd);
  const processingBaseUsd = round2(revenueExcludingTaxUsd + draft.buyerTaxCollectedByEtsyUsd);

  const listingRelatedFeeUsd = round2(feeProfile.listingRelatedFeeUsd);
  const transactionFeeUsd = round2(revenueExcludingTaxUsd * feeProfile.transactionFeeRate);
  const processingFeeUsd = round2(
    processingBaseUsd * feeProfile.processingFeeRate + feeProfile.processingFixedTry / draft.usdTryRate,
  );
  const regulatoryFeeUsd = round2(revenueExcludingTaxUsd * feeProfile.regulatoryFeeRate);
  const currencyConversionFeeUsd = draft.currencyConversionEnabled
    ? round2(revenueExcludingTaxUsd * feeProfile.currencyConversionFeeRate)
    : 0;

  const offsiteAdsRate =
    draft.offsiteAdsMode === "off"
      ? 0
      : typeof draft.feeProfileOverrides?.offsiteAdsRate === "number"
        ? draft.feeProfileOverrides.offsiteAdsRate
        : draft.offsiteAdsMode === "rate_12"
          ? 0.12
          : 0.15;
  const offsiteAdsFeeUsd = offsiteAdsRate > 0 ? round2(Math.min(revenueExcludingTaxUsd * offsiteAdsRate, 100)) : 0;

  const revenueTry = toTry(revenueExcludingTaxUsd, draft.usdTryRate);
  const depositFeeTry =
    draft.includeDepositFee &&
    revenueTry >= feeProfile.depositMinimumTry &&
    revenueTry < feeProfile.depositThresholdTry
      ? feeProfile.depositFeeTry
      : 0;
  const depositFeeUsd = round2(depositFeeTry / draft.usdTryRate);

  const vatApplicableFeeKeys = new Set(feeProfile.vatApplicableFeeKeys);
  const vatFeeRows: Array<[string, number]> = [
    ["listing_related_fee", listingRelatedFeeUsd],
    ["transaction_fee", transactionFeeUsd],
    ["processing_fee", processingFeeUsd],
    ["regulatory_operating_fee", regulatoryFeeUsd],
    ["offsite_ads_fee", offsiteAdsFeeUsd],
    ["currency_conversion_fee", currencyConversionFeeUsd],
    ["deposit_fee", depositFeeUsd],
  ];
  const vatBaseUsd =
    draft.vatMode === "no_vat_id"
      ? round2(vatFeeRows.filter(([key]) => vatApplicableFeeKeys.has(key)).reduce((sum, [, value]) => sum + value, 0))
      : 0;
  const sellerFeeVatUsd = draft.vatMode === "no_vat_id" ? round2(vatBaseUsd * feeProfile.vatRate) : 0;

  const operationalCostsUsd = round2(
    toUsd(draft.productCost, draft.usdTryRate) +
      toUsd(draft.actualShippingCost, draft.usdTryRate) +
      toUsd(draft.packagingCost, draft.usdTryRate) +
      toUsd(draft.shipentegraOperationCost, draft.usdTryRate) +
      draft.customCosts.filter((line) => line.enabled).reduce((sum, line) => sum + toUsd(line.value, draft.usdTryRate), 0) +
      resolveOverheadUsd(draft),
  );

  const totalEtsyFeesUsd = round2(
    listingRelatedFeeUsd +
      transactionFeeUsd +
      processingFeeUsd +
      regulatoryFeeUsd +
      currencyConversionFeeUsd +
      offsiteAdsFeeUsd +
      sellerFeeVatUsd +
      depositFeeUsd,
  );

  const warnings = [];
  if (draft.feeProfileOverrides) {
    warnings.push({
      key: "fee_profile_override",
      message: "Resmi ucret profili ozellestirildigi icin sonuc varsayilan Etsy TR profilinden sapabilir.",
    });
  }
  if (draft.includeDepositFee) {
    warnings.push({
      key: "deposit_fee",
      message: "Odeme aktarim ucreti aktarim bazli kosullu bir kalemdir; senaryo dahil etse de gercek hayatta her sipariste olusmayabilir.",
    });
  }
  if (draft.currencyConversionEnabled === false) {
    warnings.push({
      key: "currency_conversion",
      message: "Para donusumu kapali. Odeme para birimi farkliysa gercek ucret daha yuksek olabilir.",
    });
  }
  if (round2(revenueExcludingTaxUsd - totalEtsyFeesUsd - operationalCostsUsd) < 0) {
    warnings.push({ key: "negative_profit", message: "Bu senaryoda net kar negatife dusuyor." });
  }

  const breakdown: BreakdownRow[] = [
    {
      key: "listing_related_fee",
      label: "Listeleme ucreti",
      amountUsd: listingRelatedFeeUsd,
      amountTry: toTry(listingRelatedFeeUsd, draft.usdTryRate),
      sourceType: sourceTypeForOfficial(draft.feeProfileOverrides?.listingRelatedFeeUsd),
      note: "Varsayilan siparis basi listeleme varsayimi.",
    },
    {
      key: "transaction_fee",
      label: "Islem ucreti",
      amountUsd: transactionFeeUsd,
      amountTry: toTry(transactionFeeUsd, draft.usdTryRate),
      sourceType: sourceTypeForOfficial(draft.feeProfileOverrides?.transactionFeeRate),
    },
    {
      key: "processing_fee",
      label: "Odeme isleme ucreti",
      amountUsd: processingFeeUsd,
      amountTry: toTry(processingFeeUsd, draft.usdTryRate),
      sourceType: sourceTypeForOfficial(draft.feeProfileOverrides?.processingFeeRate),
    },
    {
      key: "regulatory_operating_fee",
      label: "Yasal isletim ucreti",
      amountUsd: regulatoryFeeUsd,
      amountTry: toTry(regulatoryFeeUsd, draft.usdTryRate),
      sourceType: sourceTypeForOfficial(draft.feeProfileOverrides?.regulatoryFeeRate),
    },
    {
      key: "currency_conversion_fee",
      label: "Para donusum ucreti",
      amountUsd: currencyConversionFeeUsd,
      amountTry: toTry(currencyConversionFeeUsd, draft.usdTryRate),
      sourceType: draft.currencyConversionEnabled
        ? sourceTypeForOfficial(draft.feeProfileOverrides?.currencyConversionFeeRate)
        : "conditional",
    },
    {
      key: "offsite_ads_fee",
      label: "Site disi reklam ucreti",
      amountUsd: offsiteAdsFeeUsd,
      amountTry: toTry(offsiteAdsFeeUsd, draft.usdTryRate),
      sourceType:
        draft.offsiteAdsMode === "off" ? "conditional" : sourceTypeForOfficial(draft.feeProfileOverrides?.offsiteAdsRate),
    },
    {
      key: "seller_fee_vat",
      label: "Satici ucretleri KDV'si",
      amountUsd: sellerFeeVatUsd,
      amountTry: toTry(sellerFeeVatUsd, draft.usdTryRate),
      sourceType: draft.vatMode === "vat_id_provided" ? "conditional" : sourceTypeForOfficial(draft.feeProfileOverrides?.vatRate),
    },
    {
      key: "deposit_fee",
      label: "Odeme aktarim ucreti",
      amountUsd: depositFeeUsd,
      amountTry: depositFeeTry,
      sourceType: "conditional",
      note: "Aktarim bazli kosullu ucret.",
    },
    {
      key: "product_cost",
      label: "Urun maliyeti",
      amountUsd: toUsd(draft.productCost, draft.usdTryRate),
      amountTry: toTry(toUsd(draft.productCost, draft.usdTryRate), draft.usdTryRate),
      sourceType: "user_input",
    },
    {
      key: "actual_shipping_cost",
      label: "Gercek kargo maliyeti",
      amountUsd: toUsd(draft.actualShippingCost, draft.usdTryRate),
      amountTry: toTry(toUsd(draft.actualShippingCost, draft.usdTryRate), draft.usdTryRate),
      sourceType: "user_input",
    },
    {
      key: "packaging_cost",
      label: "Paketleme maliyeti",
      amountUsd: toUsd(draft.packagingCost, draft.usdTryRate),
      amountTry: toTry(toUsd(draft.packagingCost, draft.usdTryRate), draft.usdTryRate),
      sourceType: "user_input",
    },
    {
      key: "shipentegra_operation_cost",
      label: "ShipEntegra operasyon maliyeti",
      amountUsd: toUsd(draft.shipentegraOperationCost, draft.usdTryRate),
      amountTry: toTry(toUsd(draft.shipentegraOperationCost, draft.usdTryRate), draft.usdTryRate),
      sourceType: "user_input",
    },
  ];

  for (const line of draft.customCosts.filter((cost) => cost.enabled)) {
    const lineUsd = toUsd(line.value, draft.usdTryRate);
    breakdown.push({
      key: `custom_cost_${line.id}`,
      label: line.label || "Ozel gider",
      amountUsd: lineUsd,
      amountTry: toTry(lineUsd, draft.usdTryRate),
      sourceType: "user_input",
    });
  }

  const overheadUsd = resolveOverheadUsd(draft);
  if (overheadUsd > 0) {
    breakdown.push({
      key: "overhead_cost",
      label: "Genel gider payi",
      amountUsd: overheadUsd,
      amountTry: toTry(overheadUsd, draft.usdTryRate),
      sourceType: "user_input",
    });
  }

  const netProfitUsd = round2(revenueExcludingTaxUsd - totalEtsyFeesUsd - operationalCostsUsd);
  const netProfitTry = toTry(netProfitUsd, draft.usdTryRate);

  return {
    normalizedRevenueUsd: revenueExcludingTaxUsd,
    normalizedRevenueTry: revenueTry,
    totalEtsyFeesUsd,
    totalEtsyFeesTry: toTry(totalEtsyFeesUsd, draft.usdTryRate),
    totalOperationalCostsUsd: operationalCostsUsd,
    totalOperationalCostsTry: toTry(operationalCostsUsd, draft.usdTryRate),
    netProfitUsd,
    netProfitTry,
    netMarginPercent: revenueExcludingTaxUsd > 0 ? round2((netProfitUsd / revenueExcludingTaxUsd) * 100) : 0,
    breakdown,
    warnings,
  };
}
