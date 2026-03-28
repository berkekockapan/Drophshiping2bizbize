import { useMutation, useQuery } from "@tanstack/react-query";

import { fetchSettings, patchSettings } from "../../../app/api";
import { CalculatorHeader } from "../components/CalculatorHeader";
import { CostInputsCard } from "../components/CostInputsCard";
import { FeeBreakdownTable } from "../components/FeeBreakdownTable";
import { FeeProfileCard } from "../components/FeeProfileCard";
import { PresetToolbar } from "../components/PresetToolbar";
import { ProfitTargetCard } from "../components/ProfitTargetCard";
import { ResultsPanel } from "../components/ResultsPanel";
import { SalesCampaignCard } from "../components/SalesCampaignCard";
import { useEtsyCostCalculatorState } from "../hooks/useEtsyCostCalculatorState";
import { createDefaultCalculatorStorage } from "../lib/defaults";
import type { EtsyCostCalculatorStorage } from "../lib/types";

export function EtsyCostCalculatorPage() {
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
  });

  const patchMutation = useMutation({
    mutationFn: async (storage: EtsyCostCalculatorStorage) => {
      await patchSettings({ etsyCostCalculator: storage });
    },
  });

  const calculator = useEtsyCostCalculatorState({
    initialStorage: settingsQuery.data?.etsyCostCalculator ?? (settingsQuery.data ? createDefaultCalculatorStorage() : undefined),
    onPersist: patchMutation.mutateAsync,
  });

  if (settingsQuery.isLoading) {
    return <p className="text-sm text-slate-500">Hesaplayici yukleniyor...</p>;
  }

  if (settingsQuery.isError) {
    return <p className="text-sm text-rose-600">Hesaplayici ayarlari yuklenemedi.</p>;
  }

  return (
    <div className="space-y-6">
      <CalculatorHeader
        profileLabel="Etsy Turkiye varsayilani (2026-03-28)"
        saveState={calculator.saveState}
        saveErrorMessage={calculator.saveErrorMessage}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <div className="space-y-6">
          <FeeProfileCard
            draft={calculator.draft}
            validationErrors={calculator.validationErrors}
            onChange={calculator.updateDraft}
            onResetFeeProfileOverrides={calculator.resetFeeProfileOverrides}
          />
          <SalesCampaignCard draft={calculator.draft} validationErrors={calculator.validationErrors} onChange={calculator.updateDraft} />
          <CostInputsCard draft={calculator.draft} onChange={calculator.updateDraft} />
          <ProfitTargetCard draft={calculator.draft} validationErrors={calculator.validationErrors} onChange={calculator.updateDraft} />
          <FeeBreakdownTable rows={calculator.formattedBreakdown} />
        </div>

        <div className="space-y-6">
          <ResultsPanel result={calculator.result} />
          <PresetToolbar
            presetName={calculator.presetName}
            activePresetId={calculator.activePresetId}
            presets={calculator.presets}
            onPresetNameChange={calculator.setPresetName}
            onSavePreset={calculator.savePreset}
            onLoadPreset={calculator.loadPreset}
            onUpdatePreset={calculator.updateActivePreset}
            onDeletePreset={calculator.deletePreset}
          />
        </div>
      </div>
    </div>
  );
}
