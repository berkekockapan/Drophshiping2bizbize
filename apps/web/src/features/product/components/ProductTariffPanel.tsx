import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  runProductTariffAnalysis,
  saveProductTariffSelection,
  searchProductTariffCatalog,
  submitTariffKnowledgeCandidate,
  type ProductTariffAnalysisSummary,
  type ProductTariffRecommendation,
} from "../../../app/api";
import type { OwnerKey } from "../../shared/lib/ownerRouteState";
import { TariffRecommendationCard } from "./TariffRecommendationCard";

interface ProductTariffPanelProps {
  ownerKey: OwnerKey;
  productId: string;
  analysis: ProductTariffAnalysisSummary;
}

export function ProductTariffPanel({ ownerKey, productId, analysis }: ProductTariffPanelProps) {
  const queryClient = useQueryClient();
  const autoRunTriggeredRef = useRef(false);
  const [manualQuery, setManualQuery] = useState("");
  const [manualResults, setManualResults] = useState<ProductTariffRecommendation[]>([]);
  const [candidateMessage, setCandidateMessage] = useState<string | null>(null);
  const [selectionOverride, setSelectionOverride] = useState(analysis.selection);

  useEffect(() => {
    setSelectionOverride(analysis.selection);
  }, [analysis.selection]);

  const runMutation = useMutation({
    mutationFn: () => runProductTariffAnalysis(ownerKey, productId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["product-detail", ownerKey, productId] });
    },
  });

  const selectMutation = useMutation({
    mutationFn: (payload: { catalogId: string; usProfileId: string | null; selectionSource: string }) =>
      saveProductTariffSelection(ownerKey, productId, payload),
    onSuccess: async (response) => {
      setSelectionOverride(response.selection);
      await queryClient.invalidateQueries({ queryKey: ["product-detail", ownerKey, productId] });
    },
  });

  const searchMutation = useMutation({
    mutationFn: (query: string) => searchProductTariffCatalog(ownerKey, productId, query),
    onSuccess: (response) => {
      setManualResults(response.items);
    },
  });

  const candidateMutation = useMutation({
    mutationFn: (payload: { catalogId: string; usProfileId: string | null; candidateSource: string; notes?: string | null }) =>
      submitTariffKnowledgeCandidate(ownerKey, productId, payload),
    onSuccess: () => setCandidateMessage("Aday kuyruguna eklendi."),
  });

  useEffect(() => {
    if (analysis.latestRun || runMutation.isPending || autoRunTriggeredRef.current) {
      return;
    }

    autoRunTriggeredRef.current = true;
    runMutation.mutate();
  }, [analysis.latestRun, runMutation]);

  const displayedRecommendations = useMemo(() => {
    if (manualResults.length > 0) {
      return manualResults;
    }

    return runMutation.data?.recommendations ?? analysis.recommendations;
  }, [analysis.recommendations, manualResults, runMutation.data?.recommendations]);

  const persistedSelection = selectionOverride ?? analysis.selection;
  const autoSuggestedSelection = persistedSelection
    ? null
    : analysis.latestRun?.resultSnapshot?.selectedProfile
      ? analysis.latestRun.resultSnapshot.selectedProfile
      : displayedRecommendations[0] ?? null;
  const bannerCode = persistedSelection?.canonicalHs6 ?? autoSuggestedSelection?.canonicalHs6 ?? null;
  const bannerPrefix = bannerCode ? "Bu urun icin secilen GTIP" : null;
  const staleRevision = persistedSelection?.revisionLabel && !persistedSelection.revisionLabel.includes("2026 Revision 4");

  function handleSelect(recommendation: ProductTariffRecommendation) {
    selectMutation.mutate({
      catalogId: recommendation.catalogId,
      usProfileId: recommendation.usProfileId,
      selectionSource: manualResults.length > 0 ? "manual_search" : "recommended",
    });
  }

  function handleSubmitCandidate(recommendation: ProductTariffRecommendation) {
    setCandidateMessage(null);
    candidateMutation.mutate({
      catalogId: recommendation.catalogId,
      usProfileId: recommendation.usProfileId,
      candidateSource: manualResults.length > 0 ? "manual_search" : "recommended_accept",
    });
  }

  if (!analysis.latestRun && !runMutation.data) {
    return (
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">GTIP / ABD Vergi Analizi</h2>
        <p className="mt-3 text-sm text-slate-500">
          {runMutation.isError ? "Analiz baslatilamadi. Lutfen tekrar deneyin." : "Analiz ediliyor..."}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">GTIP / ABD Vergi Analizi</h2>
          <p className="mt-2 text-sm text-slate-500">{analysis.disclaimer}</p>
        </div>
        <button
          type="button"
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
          onClick={() => {
            setManualResults([]);
            runMutation.mutate();
          }}
        >
          Yeniden analiz
        </button>
      </div>

      {bannerCode ? (
        <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {bannerPrefix}: {bannerCode}
        </p>
      ) : null}
      {staleRevision ? (
        <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">Veri surumu guncel olmayabilir.</p>
      ) : null}
      {candidateMessage ? (
        <p className="mt-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{candidateMessage}</p>
      ) : null}

      {analysis.manualSearchEnabled ? (
        <form
          className="mt-5 flex flex-col gap-3 md:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            if (!manualQuery.trim()) {
              setManualResults([]);
              return;
            }

            searchMutation.mutate(manualQuery.trim());
          }}
        >
          <input
            value={manualQuery}
            onChange={(event) => setManualQuery(event.target.value)}
            placeholder="GTIP veya anahtar kelime ile ara"
            className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#F1641E]"
            aria-label="GTIP arama"
          />
          <button
            type="submit"
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
          >
            Katalog ara
          </button>
        </form>
      ) : null}

      {runMutation.isError ? <p className="mt-3 text-sm text-rose-600">Analiz calistirilamadi.</p> : null}
      {searchMutation.isError ? <p className="mt-3 text-sm text-rose-600">Tarife katalogu aranirken hata olustu.</p> : null}
      {selectMutation.isError ? <p className="mt-3 text-sm text-rose-600">GTIP secimi kaydedilemedi.</p> : null}
      {candidateMutation.isError ? <p className="mt-3 text-sm text-rose-600">Aday kuyrugu guncellenemedi.</p> : null}

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        {displayedRecommendations.map((recommendation) => (
          <TariffRecommendationCard
            key={`${manualResults.length > 0 ? "manual" : "auto"}-${recommendation.catalogId}`}
            recommendation={recommendation}
            onSelect={handleSelect}
            onSubmitCandidate={handleSubmitCandidate}
          />
        ))}
      </div>

      {!runMutation.isPending && displayedRecommendations.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Bu urun icin henuz bir GTIP onerisi bulunmuyor.</p>
      ) : null}
    </section>
  );
}
