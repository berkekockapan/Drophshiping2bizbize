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
    const initialStorage = {
      version: 1,
      profileVersion: "etsy-tr-2026-03-28",
      draft: {
        usdTryRate: 40,
        salePriceUsd: 0,
        importDutyEnabled: true,
        importDutyRate: 0.11,
        importDutyLabel: "ABD GTIP vergisi",
      },
      presets: [],
      updatedAt: 1,
    } as const;

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
      salePriceUsd: 39,
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

    expect(result.current.quickMode.recommendedSalePriceUsd).not.toBeNull();
    expect(result.current.quickMode.recommendedScenario?.netProfitUsd).toBeGreaterThanOrEqual(10);
    expect(result.current.recommendedBreakdownGroups[0]?.label).toMatch(/etsy ucret/i);
    expect(result.current.analysisBreakdownGroups[2]?.rows.map((row) => row.label)).toContain("Net kar");
  });
});
