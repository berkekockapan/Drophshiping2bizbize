import "@testing-library/jest-dom/vitest";

import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createDefaultCalculatorStorage } from "../lib/defaults";
import { useEtsyCostCalculatorState } from "./useEtsyCostCalculatorState";

describe("useEtsyCostCalculatorState", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("hydrates, autosaves changes, and keeps fee profile resets scoped", async () => {
    vi.useFakeTimers();
    const onPersist = vi.fn().mockResolvedValue(undefined);

    const initialStorage = createDefaultCalculatorStorage();
    initialStorage.draft.feeProfileOverrides = { transactionFeeRate: 0.07 };

    const { result } = renderHook(() =>
      useEtsyCostCalculatorState({
        initialStorage,
        onPersist,
        autosaveDelayMs: 500,
      }),
    );

    act(() => {
      result.current.updateDraft({
        salePriceUsd: 55,
        productCost: { amount: 20, currency: "USD" },
      });
    });

    await act(async () => {
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(500);
      await Promise.resolve();
    });

    expect(onPersist).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.resetFeeProfileOverrides();
    });

    expect(result.current.draft.salePriceUsd).toBe(55);
    expect(result.current.draft.productCost.amount).toBe(20);
    expect(result.current.draft.feeProfileOverrides).toBeNull();
  });

  it("hydrates legacy duty fields into destination profiles and adds the US duty row", () => {
    const onPersist = vi.fn().mockResolvedValue(undefined);
    const initialStorage = createDefaultCalculatorStorage();
    initialStorage.updatedAt = 1;
    Object.assign(initialStorage.draft, {
      usdTryRate: 40,
      salePriceUsd: 0,
      importDutyEnabled: true,
      importDutyRate: 0.11,
      importDutyLabel: "ABD GTIP vergisi",
    });

    const { result } = renderHook(() =>
      useEtsyCostCalculatorState({
        initialStorage,
        onPersist,
        autosaveDelayMs: 0,
      }),
    );

    expect(result.current.draft.destinationProfile).toBe("US");
    expect(result.current.draft.manualDutyPercent).toBe(11);

    act(() => {
      result.current.updateDraft({
        salePriceUsd: 50,
      });
    });

    expect(result.current.result.breakdown.map((row) => row.key)).toContain("us_duty_fee");
  });

  it("creates, updates, loads and deletes presets explicitly", () => {
    const onPersist = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useEtsyCostCalculatorState({
        initialStorage: createDefaultCalculatorStorage(),
        onPersist,
        autosaveDelayMs: 0,
      }),
    );

    act(() => {
      result.current.setPresetName("ABD basic");
      result.current.updateDraft({ salePriceUsd: 49 });
      result.current.savePreset("ABD basic");
    });

    expect(result.current.presets).toHaveLength(1);
    expect(result.current.presets[0]?.name).toBe("ABD basic");

    act(() => {
      result.current.updateDraft({ salePriceUsd: 59 });
      result.current.updateActivePreset();
    });

    act(() => {
      result.current.loadPreset(result.current.presets[0]!.id);
    });

    expect(result.current.draft.salePriceUsd).toBe(59);

    act(() => {
      result.current.deletePreset(result.current.presets[0]!.id);
    });

    expect(result.current.presets).toEqual([]);
  });

  it("exposes quick-mode outputs and grouped breakdowns", () => {
    const onPersist = vi.fn().mockResolvedValue(undefined);
    const initialStorage = createDefaultCalculatorStorage();
    initialStorage.draft = {
      ...initialStorage.draft,
      usdTryRate: 40,
      destinationProfile: "US",
      manualDutyPercent: 10,
      salePriceUsd: 39,
      saleDiscountPercent: 10,
      coupon: { type: "fixed_usd", value: 2 },
      buyerPaidShippingUsd: 4,
      buyerPaidExtrasUsd: 1,
      buyerTaxCollectedByEtsyUsd: 3,
      productCost: { amount: 18, currency: "USD" },
      actualShippingCost: { amount: 5, currency: "USD" },
      targetProfitMode: "net_profit_usd",
      targetProfitValue: 10,
    };

    const { result } = renderHook(() =>
      useEtsyCostCalculatorState({
        initialStorage,
        onPersist,
        autosaveDelayMs: 0,
      }),
    );

    expect(result.current.quickMode.recommendedSalePriceUsd).toBe(62.62);
    expect(result.current.quickMode.breakEvenPriceUsd).toBe(43.02);
    expect(result.current.quickMode.recommendedScenario?.shipentegraImportBasisUsd).toBe(54.36);
    expect(result.current.quickMode.recommendedScenario?.shipentegraImportTotalUsd).toBe(14.59);
    expect(result.current.quickMode.enteredPriceScenario?.shipentegraImportTotalUsd).toBe(9.28);
    expect(result.current.recommendedBreakdownGroups.map((group) => group.label)).toContain("Etsy ucretleri");
    expect(result.current.analysisBreakdownGroups.flatMap((group) => group.rows.map((row) => row.key))).toContain(
      "shipentegra_import_total",
    );
    expect(result.current.analysisBreakdownGroups.at(-1)?.rows.map((row) => row.label)).toContain("Net kar");
  });
});
