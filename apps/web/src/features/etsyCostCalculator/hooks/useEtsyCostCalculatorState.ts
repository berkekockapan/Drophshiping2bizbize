import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { calculateScenario } from "../lib/calculateScenario";
import { createDefaultCalculatorStorage } from "../lib/defaults";
import { formatBreakdown } from "../lib/formatBreakdown";
import { buildQuickModeViewModel } from "../lib/buildQuickModeViewModel";
import { groupBreakdownRows } from "../lib/groupBreakdownRows";
import { migrateCalculatorStorage } from "../lib/migrateCalculatorStorage";
import { solveTargetPrice } from "../lib/solveTargetPrice";
import { validateDraft } from "../lib/validation";
import type { CalculatorDraft, EtsyCostCalculatorStorage } from "../lib/types";

function cloneDraft<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `preset_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function touchStorage(storage: EtsyCostCalculatorStorage): EtsyCostCalculatorStorage {
  return { ...storage, updatedAt: Date.now() };
}

export function useEtsyCostCalculatorState({
  initialStorage,
  onPersist,
  autosaveDelayMs = 500,
}: {
  initialStorage: EtsyCostCalculatorStorage | null | undefined;
  onPersist: (storage: EtsyCostCalculatorStorage) => Promise<void>;
  autosaveDelayMs?: number;
}) {
  const fallbackStorage = useMemo(() => createDefaultCalculatorStorage(), []);
  const normalizedInitialStorage = useMemo(
    () => (typeof initialStorage === "undefined" ? initialStorage : migrateCalculatorStorage(initialStorage)),
    [initialStorage],
  );
  const [storage, setStorage] = useState<EtsyCostCalculatorStorage>(() => normalizedInitialStorage ?? fallbackStorage);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [presetName, setPresetName] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  const hasHydratedRef = useRef(typeof normalizedInitialStorage !== "undefined");
  const persistedSnapshotRef = useRef(JSON.stringify(normalizedInitialStorage ?? fallbackStorage));

  useEffect(() => {
    if (typeof normalizedInitialStorage === "undefined" || hasHydratedRef.current) {
      return;
    }

    const nextStorage = normalizedInitialStorage ?? fallbackStorage;
    setStorage(nextStorage);
    persistedSnapshotRef.current = JSON.stringify(nextStorage);
    hasHydratedRef.current = true;
  }, [fallbackStorage, normalizedInitialStorage]);

  const updateStorage = useCallback((updater: (current: EtsyCostCalculatorStorage) => EtsyCostCalculatorStorage) => {
    setStorage((current) => touchStorage(updater(current)));
  }, []);

  const updateDraft = useCallback(
    (patch: Partial<CalculatorDraft>) => {
      updateStorage((current) => ({
        ...current,
        draft: {
          ...current.draft,
          ...patch,
        },
      }));
    },
    [updateStorage],
  );

  const resetFeeProfileOverrides = useCallback(() => {
    updateStorage((current) => ({
      ...current,
      draft: {
        ...current.draft,
        feeProfileOverrides: null,
      },
    }));
  }, [updateStorage]);

  const savePreset = useCallback(
    (name: string) => {
      const trimmedName = name.trim();
      if (!trimmedName) {
        return;
      }

      const presetId = createId();
      const now = Date.now();
      updateStorage((current) => ({
        ...current,
        presets: [
          ...current.presets,
          {
            id: presetId,
            name: trimmedName,
            input: cloneDraft(current.draft),
            createdAt: now,
            updatedAt: now,
          },
        ],
      }));
      setActivePresetId(presetId);
      setPresetName(trimmedName);
    },
    [updateStorage],
  );

  const loadPreset = useCallback((presetId: string) => {
    setActivePresetId(presetId || null);
    setStorage((current) => {
      const preset = current.presets.find((item) => item.id === presetId);
      if (!preset) {
        return current;
      }

      setPresetName(preset.name);
      return touchStorage({
        ...current,
        draft: cloneDraft(preset.input),
      });
    });
  }, []);

  const updateActivePreset = useCallback(() => {
    if (!activePresetId) {
      return;
    }

    updateStorage((current) => ({
      ...current,
      presets: current.presets.map((preset) =>
        preset.id === activePresetId
          ? {
              ...preset,
              name: presetName.trim() || preset.name,
              input: cloneDraft(current.draft),
              updatedAt: Date.now(),
            }
          : preset,
      ),
    }));
  }, [activePresetId, presetName, updateStorage]);

  const deletePreset = useCallback(
    (presetId: string) => {
      updateStorage((current) => ({
        ...current,
        presets: current.presets.filter((preset) => preset.id !== presetId),
      }));
      if (activePresetId === presetId) {
        setActivePresetId(null);
        setPresetName("");
      }
    },
    [activePresetId, updateStorage],
  );

  useEffect(() => {
    if (!hasHydratedRef.current) {
      return;
    }

    const snapshot = JSON.stringify(storage);
    if (snapshot === persistedSnapshotRef.current) {
      return;
    }

    setSaveState("idle");
    const timeoutId = globalThis.setTimeout(() => {
      void (async () => {
        setSaveState("saving");
        setSaveErrorMessage(null);

        try {
          await onPersist(storage);
          persistedSnapshotRef.current = snapshot;
          setSaveState("saved");
        } catch (error) {
          setSaveState("error");
          setSaveErrorMessage(error instanceof Error ? error.message : "Kayit sirasinda hata olustu.");
        }
      })();
    }, autosaveDelayMs);

    return () => globalThis.clearTimeout(timeoutId);
  }, [autosaveDelayMs, onPersist, storage]);

  const validationErrors = useMemo(() => validateDraft(storage.draft), [storage.draft]);
  const snapshot = useMemo(() => calculateScenario(storage.draft), [storage.draft]);
  const quickMode = useMemo(() => buildQuickModeViewModel(storage.draft), [storage.draft]);
  const recommendedBreakdownGroups = useMemo(
    () => groupBreakdownRows(quickMode.recommendedScenario ?? snapshot),
    [quickMode.recommendedScenario, snapshot],
  );
  const analysisBreakdownGroups = useMemo(
    () => groupBreakdownRows(quickMode.enteredPriceScenario ?? snapshot),
    [quickMode.enteredPriceScenario, snapshot],
  );
  const result = useMemo(
    () => ({
      ...snapshot,
      breakEvenPriceUsd: solveTargetPrice({
        ...storage.draft,
        targetProfitMode: "net_profit_usd",
        targetProfitValue: 0,
      }),
      targetSafeListPriceUsd: storage.draft.targetProfitValue > 0 ? solveTargetPrice(storage.draft) : null,
    }),
    [snapshot, storage.draft],
  );
  const formattedBreakdown = useMemo(() => formatBreakdown(result.breakdown), [result.breakdown]);

  return {
    draft: storage.draft,
    presets: storage.presets,
    presetName,
    activePresetId,
    saveState,
    saveErrorMessage,
    validationErrors,
    result,
    quickMode,
    recommendedBreakdownGroups,
    analysisBreakdownGroups,
    formattedBreakdown,
    updateDraft,
    resetFeeProfileOverrides,
    setPresetName,
    savePreset,
    loadPreset,
    updateActivePreset,
    deletePreset,
  };
}

