import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import type { AutoSelectedTariffProfile } from "../../../app/api";
import { fetchProductCategories, fetchProductDetail, setTrackedProductCategory } from "../../../app/api";
import { EtsyPrepWorkspace } from "../../etsyPrep/components/EtsyPrepWorkspace";
import { LiveSyncStatus } from "../../shared/components/LiveSyncStatus";
import { ownerOptions, type OwnerKey } from "../../shared/lib/ownerRouteState";
import { liveSyncQueryOptions } from "../../shared/lib/liveQuery";
import { ChangeTimeline } from "../components/ChangeTimeline";
import { ProductCostPanel } from "../components/ProductCostPanel";
import { ProductTariffPanel } from "../components/ProductTariffPanel";
import { ProductSummary } from "../components/ProductSummary";
import { VariantTable } from "../components/VariantTable";

function isOwnerKey(value: string | undefined): value is OwnerKey {
  return ownerOptions.some((owner) => owner.key === value);
}

export function ProductDetailPage() {
  const { ownerKey: ownerKeyParam, productId } = useParams<{ ownerKey: string; productId: string }>();
  const ownerKey = isOwnerKey(ownerKeyParam) ? ownerKeyParam : null;
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"overview" | "prep">("overview");
  const [hasOpenedPrep, setHasOpenedPrep] = useState(false);
  const detailHasLoadedRef = useRef(false);
  const [hasBackgroundRefreshError, setHasBackgroundRefreshError] = useState(false);

  const categoriesQuery = useQuery({
    queryKey: ["product-categories", ownerKey],
    enabled: Boolean(ownerKey),
    queryFn: async () => (await fetchProductCategories(ownerKey as OwnerKey)).items,
    ...liveSyncQueryOptions,
  });

  const detailQuery = useQuery({
    queryKey: ["product-detail", ownerKey, productId],
    enabled: Boolean(ownerKey && productId),
    queryFn: async () => {
      try {
        return await fetchProductDetail(ownerKey as OwnerKey, productId as string);
      } catch (error) {
        if (detailHasLoadedRef.current) {
          setHasBackgroundRefreshError(true);
        }

        throw error;
      }
    },
    ...liveSyncQueryOptions,
  });

  const categoryMutation = useMutation({
    mutationFn: (categoryId: string | null) =>
      setTrackedProductCategory(ownerKey as OwnerKey, productId as string, categoryId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["product-detail", ownerKey, productId] });
      await queryClient.invalidateQueries({ queryKey: ["tracking-products", ownerKey] });
    },
  });

  useEffect(() => {
    setMode("overview");
    setHasOpenedPrep(false);
  }, [ownerKey, productId]);

  useEffect(() => {
    if (!detailQuery.data) {
      return;
    }

    detailHasLoadedRef.current = true;
    setHasBackgroundRefreshError(false);
  }, [detailQuery.dataUpdatedAt, detailQuery.data]);

  if (!ownerKey) {
    return <p className="text-sm text-rose-600">Owner bulunamadı.</p>;
  }

  if (!productId) {
    return <p className="text-sm text-rose-600">Ürün kimliği bulunamadı.</p>;
  }

  function openPrepMode() {
    setHasOpenedPrep(true);
    setMode("prep");
  }

  const displayedCostContext = useMemo(() => {
    if (!detailQuery.data) {
      return null;
    }

    const existingProfile = detailQuery.data.costContext.usState.profile;
    const recommendedProfile = existingProfile
      ? null
      : detailQuery.data.tariffAnalysis.latestRun?.resultSnapshot?.selectedProfile
        ? detailQuery.data.tariffAnalysis.latestRun.resultSnapshot.selectedProfile
        : detailQuery.data.tariffAnalysis.recommendations[0]
          ? ({
              catalogId: detailQuery.data.tariffAnalysis.recommendations[0].catalogId,
              profileName: detailQuery.data.tariffAnalysis.recommendations[0].profileName,
              canonicalHs6: detailQuery.data.tariffAnalysis.recommendations[0].canonicalHs6,
              htsCode10: detailQuery.data.tariffAnalysis.recommendations[0].htsCode10,
              combinedDutyRate: detailQuery.data.tariffAnalysis.recommendations[0].combinedDutyRate,
              dutySummary: detailQuery.data.tariffAnalysis.recommendations[0].dutySummary,
              defaultShipentegraUsd: detailQuery.data.tariffAnalysis.recommendations[0].defaultShipentegraUsd,
            } satisfies AutoSelectedTariffProfile)
          : null;

    const profile = existingProfile ?? recommendedProfile;
    if (!profile) {
      return detailQuery.data.costContext;
    }

    const status: "automatic_confirmed" | "review_required" =
      detailQuery.data.costContext.usState.status === "automatic_confirmed" ? "automatic_confirmed" : "review_required";

    return {
      ...detailQuery.data.costContext,
      usState: {
        status,
        label: status === "automatic_confirmed" ? "otomatik dogrulandi" : "inceleme gerekli",
        lockedReason:
          status === "automatic_confirmed"
            ? null
            : detailQuery.data.costContext.usState.lockedReason ??
              "En uygun ABD profili otomatik secildi. Dilersen GTIP panelinden degistirebilirsin.",
        profile,
      },
    };
  }, [detailQuery.data]);

  return (
    <div className="space-y-6">
      <LiveSyncStatus
        hasData={Boolean(detailQuery.data)}
        isFetching={detailQuery.isFetching}
        hasBackgroundError={hasBackgroundRefreshError}
        updatedAt={detailQuery.dataUpdatedAt}
      />

      {detailQuery.isLoading ? <p className="text-sm text-slate-500">Ürün detayı yükleniyor...</p> : null}
      {detailQuery.isError && !detailQuery.data ? <p className="text-sm text-rose-600">Ürün detayı yüklenemedi.</p> : null}

      {detailQuery.data ? (
        <>
          <ProductSummary
            ownerKey={ownerKey}
            detail={detailQuery.data}
            categories={categoriesQuery.data ?? []}
            categoryPending={categoryMutation.isPending}
            onCategoryChange={(categoryId) => categoryMutation.mutate(categoryId)}
            action={
              mode === "overview" ? (
                <button
                  type="button"
                  className="rounded-2xl bg-[#F1641E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#d95518]"
                  onClick={openPrepMode}
                >
                  Etsy'e Yükle
                </button>
              ) : null
            }
          />

          <ProductCostPanel ownerKey={ownerKey} productId={productId} costContext={displayedCostContext ?? detailQuery.data.costContext} />

          <ProductTariffPanel ownerKey={ownerKey} productId={productId} analysis={detailQuery.data.tariffAnalysis} />

          <div className="space-y-6" hidden={mode !== "overview"} aria-hidden={mode !== "overview"}>
            <VariantTable variants={detailQuery.data.variants} />
            <ChangeTimeline items={detailQuery.data.changeTimeline} />
          </div>

          {hasOpenedPrep ? (
            <div hidden={mode !== "prep"} aria-hidden={mode !== "prep"}>
              <EtsyPrepWorkspace ownerKey={ownerKey} productId={productId} onBack={() => setMode("overview")} />
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
