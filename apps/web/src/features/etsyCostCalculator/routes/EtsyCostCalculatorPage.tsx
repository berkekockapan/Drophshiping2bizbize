import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { fetchSettings, patchSettings } from "../../../app/api";
import { AdvancedSettingsDrawer } from "../components/AdvancedSettingsDrawer";
import { CalculatorHeader } from "../components/CalculatorHeader";
import { CostInputsCard } from "../components/CostInputsCard";
import { FeeBreakdownTable } from "../components/FeeBreakdownTable";
import { FeeProfileCard } from "../components/FeeProfileCard";
import { PresetToolbar } from "../components/PresetToolbar";
import { ProfitTargetCard } from "../components/ProfitTargetCard";
import { QuickModeForm } from "../components/QuickModeForm";
import { QuickModeToolbar } from "../components/QuickModeToolbar";
import { ResultsPanel } from "../components/ResultsPanel";
import { SalesCampaignCard } from "../components/SalesCampaignCard";
import { useEtsyCostCalculatorState } from "../hooks/useEtsyCostCalculatorState";
import { createDefaultCalculatorStorage } from "../lib/defaults";
import type { CalculatorQuickTab, EtsyCostCalculatorStorage } from "../lib/types";

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
  const [activeTab, setActiveTab] = useState<CalculatorQuickTab>("target_price");
  const [presetOpen, setPresetOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const quickFormPreview =
    activeTab === "analyze_price"
      ? calculator.quickMode.enteredPriceScenario ?? calculator.quickMode.recommendedScenario ?? calculator.result
      : calculator.quickMode.recommendedScenario ?? calculator.result;

  if (settingsQuery.isLoading) {
    return <p className="text-sm text-slate-500">Hesaplayici yukleniyor...</p>;
  }

  if (settingsQuery.isError) {
    return <p className="text-sm text-rose-600">Hesaplayici ayarlari yuklenemedi.</p>;
  }

  return (
    <div className="space-y-6">
      <CalculatorHeader
        profileLabel="Etsy TR varsayilanlari + hedef profil"
        saveState={calculator.saveState}
        saveErrorMessage={calculator.saveErrorMessage}
      />

      <div className="space-y-4">
        <QuickModeToolbar
          activeTab={activeTab}
          badges={[
            activeTab === "target_price" ? "Hedef fiyat modu" : "Fiyat analizi modu",
            calculator.quickMode.hasEnteredSalePrice ? "Girilen fiyat aktif" : "Girilen fiyat yok",
          ]}
          onTabChange={setActiveTab}
          onOpenPresets={() => setPresetOpen((value) => !value)}
          onOpenAdvanced={() => setAdvancedOpen(true)}
        />

        {presetOpen ? (
          <div className="relative">
            <div className="absolute right-0 top-0 z-20 w-full max-w-xl">
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
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_360px]">
          <div className="space-y-6">
            <QuickModeForm
              draft={calculator.draft}
              shipentegraPreview={quickFormPreview}
              validationErrors={calculator.validationErrors}
              salePriceLabel={activeTab === "analyze_price" ? "Mevcut satis fiyati (USD)" : "Opsiyonel satis fiyati (USD)"}
              salePriceRequired={activeTab === "analyze_price"}
              onChange={calculator.updateDraft}
            />
            <FeeBreakdownTable groups={activeTab === "analyze_price" ? calculator.analysisBreakdownGroups : calculator.recommendedBreakdownGroups} />
          </div>

          <ResultsPanel
            activeTab={activeTab}
            draft={calculator.draft}
            recommendedSalePriceUsd={calculator.quickMode.recommendedSalePriceUsd}
            breakEvenPriceUsd={calculator.quickMode.breakEvenPriceUsd}
            targetSafeListPriceUsd={calculator.quickMode.targetSafeListPriceUsd}
            recommendedScenario={calculator.quickMode.recommendedScenario}
            enteredSalePriceUsd={calculator.draft.salePriceUsd}
            enteredPriceScenario={calculator.quickMode.enteredPriceScenario}
          />
        </div>

        <AdvancedSettingsDrawer open={advancedOpen} onClose={() => setAdvancedOpen(false)}>
          <SalesCampaignCard draft={calculator.draft} validationErrors={calculator.validationErrors} onChange={calculator.updateDraft} />
          <CostInputsCard draft={calculator.draft} variant="advanced-only" onChange={calculator.updateDraft} />
          <ProfitTargetCard
            draft={calculator.draft}
            validationErrors={calculator.validationErrors}
            onChange={calculator.updateDraft}
            showTargetFields={false}
          />
          <FeeProfileCard
            draft={calculator.draft}
            validationErrors={calculator.validationErrors}
            onChange={calculator.updateDraft}
            onResetFeeProfileOverrides={calculator.resetFeeProfileOverrides}
          />
        </AdvancedSettingsDrawer>
      </div>
    </div>
  );
}
