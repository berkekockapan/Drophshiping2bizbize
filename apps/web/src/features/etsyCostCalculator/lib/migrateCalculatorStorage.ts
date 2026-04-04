import { createDefaultCalculatorStorage } from "./defaults";
import type { CalculatorDraft, DestinationProfile, EtsyCostCalculatorPreset, EtsyCostCalculatorStorage } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeDestinationProfile(draft: Record<string, unknown>): DestinationProfile {
  if (draft.importDutyEnabled === true || typeof draft.importDutyRate === "number") {
    return "US";
  }

  if (draft.destinationProfile === "US" || draft.destinationProfile === "OTHER") {
    return draft.destinationProfile;
  }

  return "OTHER";
}

function migrateDraft(input: unknown, fallbackDraft: CalculatorDraft): CalculatorDraft {
  const draft = isRecord(input) ? input : {};
  const destinationProfile = normalizeDestinationProfile(draft);

  return {
    ...fallbackDraft,
    ...draft,
    destinationProfile,
    manualDutyPercent:
      typeof draft.importDutyRate === "number"
        ? Math.round(draft.importDutyRate * 10000) / 100
        : typeof draft.manualDutyPercent === "number"
          ? draft.manualDutyPercent
          : fallbackDraft.manualDutyPercent,
    resolvedDutyPercent: typeof draft.resolvedDutyPercent === "number" ? draft.resolvedDutyPercent : null,
    dutyLabel: typeof draft.dutyLabel === "string" ? draft.dutyLabel : typeof draft.importDutyLabel === "string" ? draft.importDutyLabel : null,
    linkedVariantId: typeof draft.linkedVariantId === "string" ? draft.linkedVariantId : null,
    valueSources: isRecord(draft.valueSources) ? (draft.valueSources as CalculatorDraft["valueSources"]) : {},
  };
}

function migratePreset(input: unknown, fallbackDraft: CalculatorDraft): EtsyCostCalculatorPreset | null {
  if (!isRecord(input) || typeof input.id !== "string" || typeof input.name !== "string") {
    return null;
  }

  return {
    id: input.id,
    name: input.name,
    input: migrateDraft(input.input, fallbackDraft),
    createdAt: typeof input.createdAt === "number" ? input.createdAt : Date.now(),
    updatedAt: typeof input.updatedAt === "number" ? input.updatedAt : Date.now(),
  };
}

export function migrateCalculatorStorage(input: unknown): EtsyCostCalculatorStorage {
  const fallback = createDefaultCalculatorStorage();
  if (!isRecord(input)) {
    return fallback;
  }

  const migratedPresets = Array.isArray(input.presets)
    ? input.presets
        .map((preset) => migratePreset(preset, fallback.draft))
        .filter((preset): preset is EtsyCostCalculatorPreset => preset !== null)
    : fallback.presets;

  return {
    ...fallback,
    ...(input as Partial<EtsyCostCalculatorStorage>),
    draft: migrateDraft(input.draft, fallback.draft),
    presets: migratedPresets,
    updatedAt: typeof input.updatedAt === "number" ? input.updatedAt : fallback.updatedAt,
  };
}
