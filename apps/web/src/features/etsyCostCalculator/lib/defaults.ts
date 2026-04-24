import type { CalculatorDraft, EtsyCostCalculatorStorage, FeeProfileOverrides, MoneyInput } from "./types";

export const ETSY_TR_PROFILE_VERSION = "etsy-tr-2026-04-24";

export const ETSY_TR_DEFAULT_FEE_PROFILE = {
  listingRelatedFeeUsd: 0.2,
  transactionFeeRate: 0.065,
  processingFeeRate: 0.065,
  processingFixedTry: 14,
  regulatoryFeeRate: 0.0227,
  currencyConversionFeeRate: 0.025,
  offsiteAdsRate: 0.15,
} satisfies Required<
  Pick<
    FeeProfileOverrides,
    | "listingRelatedFeeUsd"
    | "transactionFeeRate"
    | "processingFeeRate"
    | "processingFixedTry"
    | "regulatoryFeeRate"
    | "currencyConversionFeeRate"
    | "offsiteAdsRate"
  >
>;

function createMoney(currency: MoneyInput["currency"] = "USD"): MoneyInput {
  return { amount: 0, currency };
}

export function createDefaultDraft(): CalculatorDraft {
  return {
    destinationProfile: "OTHER",
    manualDutyPercent: 0,
    resolvedDutyPercent: null,
    dutyLabel: null,
    linkedVariantId: null,
    valueSources: {},
    usdTryRate: 40,
    salePriceUsd: 0,
    buyerPaidShippingUsd: 0,
    buyerPaidExtrasUsd: 0,
    buyerTaxCollectedByEtsyUsd: 0,
    linkedOwnerKey: null,
    linkedProductId: null,
    selectedTariffCode: null,
    importDutyEnabled: false,
    importDutyRate: null,
    importDutyLabel: null,
    saleDiscountPercent: 0,
    coupon: { type: "none", value: 0 },
    freeShipping: false,
    productCost: createMoney("USD"),
    actualShippingCost: createMoney("USD"),
    packagingCost: createMoney("USD"),
    shipentegraOperationCost: createMoney("USD"),
    customCosts: [],
    overheadMode: "off",
    overheadPerOrder: createMoney("USD"),
    overheadTotalLines: [],
    overheadExpectedOrderCount: 1,
    targetProfitMode: "net_profit_usd",
    targetProfitValue: 0,
    vatMode: "no_vat_id",
    currencyConversionEnabled: true,
    offsiteAdsMode: "off",
    includeDepositFee: false,
    feeProfileOverrides: null,
  };
}

export function createDefaultCalculatorStorage(): EtsyCostCalculatorStorage {
  return {
    version: 1,
    profileVersion: ETSY_TR_PROFILE_VERSION,
    draft: createDefaultDraft(),
    presets: [],
    updatedAt: Date.now(),
  };
}
