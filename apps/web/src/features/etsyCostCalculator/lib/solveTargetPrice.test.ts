import { describe, expect, it } from "vitest";

import { createDefaultDraft } from "./defaults";
import { solveTargetPrice } from "./solveTargetPrice";

const ZERO_FEE_OVERRIDES = {
  listingRelatedFeeUsd: 0,
  transactionFeeRate: 0,
  processingFeeRate: 0,
  processingFixedTry: 0,
  regulatoryFeeRate: 0,
  currencyConversionFeeRate: 0,
  offsiteAdsRate: 0,
  vatRate: 0,
  depositFeeTry: 42,
  depositMinimumTry: 50,
  depositThresholdTry: 600,
  vatApplicableFeeKeys: [],
};

describe("solveTargetPrice", () => {
  it("solves a pure USD profit target", () => {
    const result = solveTargetPrice({
      ...createDefaultDraft(),
      usdTryRate: 40,
      productCost: { amount: 30, currency: "USD" },
      targetProfitMode: "net_profit_usd",
      targetProfitValue: 20,
      vatMode: "vat_id_provided",
      feeProfileOverrides: ZERO_FEE_OVERRIDES,
    });

    expect(result).toBe(50);
  });

  it("solves a TRY profit target using the manual FX rate", () => {
    const result = solveTargetPrice({
      ...createDefaultDraft(),
      usdTryRate: 40,
      productCost: { amount: 20, currency: "USD" },
      targetProfitMode: "net_profit_try",
      targetProfitValue: 400,
      vatMode: "vat_id_provided",
      feeProfileOverrides: ZERO_FEE_OVERRIDES,
    });

    expect(result).toBe(30);
  });

  it("solves the minimum list price under discount and coupon for a margin target", () => {
    const result = solveTargetPrice({
      ...createDefaultDraft(),
      usdTryRate: 40,
      saleDiscountPercent: 20,
      coupon: { type: "fixed_usd", value: 10 },
      productCost: { amount: 30, currency: "USD" },
      targetProfitMode: "margin_percent",
      targetProfitValue: 25,
      vatMode: "vat_id_provided",
      feeProfileOverrides: ZERO_FEE_OVERRIDES,
    });

    expect(result).toBe(62.5);
  });
});
