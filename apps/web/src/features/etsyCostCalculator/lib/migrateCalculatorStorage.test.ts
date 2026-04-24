import { describe, expect, it } from "vitest";

import { migrateCalculatorStorage } from "./migrateCalculatorStorage";

describe("migrateCalculatorStorage", () => {
  it("migrates legacy import duty fields into the new destination profile draft", () => {
    const migrated = migrateCalculatorStorage({
      version: 1,
      profileVersion: "etsy-tr-2026-03-28",
      draft: {
        usdTryRate: 40,
        salePriceUsd: 50,
        importDutyEnabled: true,
        importDutyRate: 0.11,
        importDutyLabel: "ABD duty",
        shipentegraOperationCost: { amount: 9, currency: "USD" },
        includeDepositFee: true,
        vatMode: "vat_id_provided",
        currencyConversionEnabled: false,
      },
      presets: [],
      updatedAt: 1,
    } as unknown);

    expect(migrated.draft.destinationProfile).toBe("US");
    expect(migrated.draft.manualDutyPercent).toBe(11);
    expect(migrated.draft.resolvedDutyPercent).toBeNull();
    expect(migrated.draft.shipentegraOperationCost.amount).toBe(0);
    expect(migrated.draft.includeDepositFee).toBe(false);
    expect(migrated.draft.vatMode).toBe("no_vat_id");
    expect(migrated.draft.currencyConversionEnabled).toBe(true);
  });
});
