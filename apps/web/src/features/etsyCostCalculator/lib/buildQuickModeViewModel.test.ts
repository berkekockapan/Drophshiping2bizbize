import { describe, expect, it } from "vitest";

import { createDefaultDraft } from "./defaults";
import { buildQuickModeViewModel } from "./buildQuickModeViewModel";

describe("buildQuickModeViewModel", () => {
  it("calculates recommended and entered scenario outputs for quick mode", () => {
    const draft = {
      ...createDefaultDraft(),
      usdTryRate: 40,
      productCost: { amount: 18, currency: "USD" as const },
      actualShippingCost: { amount: 5, currency: "USD" as const },
      targetProfitMode: "net_profit_usd" as const,
      targetProfitValue: 10,
      salePriceUsd: 39,
    };

    const view = buildQuickModeViewModel(draft);

    expect(view.breakEvenPriceUsd).not.toBeNull();
    expect(view.targetSafeListPriceUsd).not.toBeNull();
    expect(view.recommendedSalePriceUsd).not.toBeNull();
    expect(view.recommendedScenario?.netProfitUsd).toBeGreaterThanOrEqual(10);
    expect(view.enteredPriceScenario).not.toBeNull();
    expect(view.hasEnteredSalePrice).toBe(true);
  });
});
