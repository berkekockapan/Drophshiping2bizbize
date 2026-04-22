import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import { fetchEtsyShops, fetchProductDetail, updateProductShops } from "../../../app/api";
import { EtsyPrepWorkspace } from "../../etsyPrep/components/EtsyPrepWorkspace";
import { LiveSyncStatus } from "../../shared/components/LiveSyncStatus";
import { liveSyncQueryOptions } from "../../shared/lib/liveQuery";
import { ownerOptions, type OwnerKey } from "../../shared/lib/ownerRouteState";
import { ChangeTimeline } from "../components/ChangeTimeline";
import { ProductShopAssignmentPanel } from "../components/ProductShopAssignmentPanel";
import { ProductSummary } from "../components/ProductSummary";
import { ProductTariffPanel } from "../components/ProductTariffPanel";
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
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const detailHasLoadedRef = useRef(false);
  const [hasBackgroundRefreshError, setHasBackgroundRefreshError] = useState(false);
  const [shopMutationError, setShopMutationError] = useState<string | null>(null);

  const shopsQuery = useQuery({
    queryKey: ["etsy-shops", ownerKey],
    enabled: Boolean(ownerKey),
    queryFn: async () => (await fetchEtsyShops(ownerKey as OwnerKey)).items,
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

  useEffect(() => {
    setMode("overview");
    setHasOpenedPrep(false);
    setShopMutationError(null);
    setSelectedVariantId(null);
  }, [ownerKey, productId]);

  const shopsMutation = useMutation({
    mutationFn: (shopIds: string[]) => updateProductShops(ownerKey as OwnerKey, productId as string, shopIds),
    onSuccess: async () => {
      setShopMutationError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["product-detail", ownerKey, productId] }),
        queryClient.invalidateQueries({ queryKey: ["tracking-products", ownerKey] }),
        queryClient.invalidateQueries({ queryKey: ["etsy-shops", ownerKey] }),
      ]);
    },
    onError: (error) => {
      setShopMutationError(error instanceof Error ? error.message : "Magaza atamalari kaydedilemedi.");
    },
  });

  useEffect(() => {
    if (!detailQuery.data) {
      return;
    }

    detailHasLoadedRef.current = true;
    setHasBackgroundRefreshError(false);
  }, [detailQuery.dataUpdatedAt, detailQuery.data]);

  useEffect(() => {
    if (!detailQuery.data) {
      return;
    }

    const variants = detailQuery.data.variants;
    if (variants.length === 0) {
      if (selectedVariantId !== null) {
        setSelectedVariantId(null);
      }
      return;
    }

    const hasCurrent = selectedVariantId ? variants.some((variant) => variant.id === selectedVariantId) : false;
    if (hasCurrent) {
      return;
    }

    const preferredId =
      detailQuery.data.costContext.selectedVariantId &&
      variants.some((variant) => variant.id === detailQuery.data.costContext.selectedVariantId)
        ? detailQuery.data.costContext.selectedVariantId
        : variants[0].id;

    setSelectedVariantId(preferredId);
  }, [detailQuery.data, selectedVariantId]);

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
            selectedVariantId={selectedVariantId}
            onVariantSelect={setSelectedVariantId}
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

          <ProductShopAssignmentPanel
            shops={shopsQuery.data ?? []}
            assignedShops={detailQuery.data.product.shops ?? []}
            isPending={shopsMutation.isPending}
            errorMessage={shopMutationError}
            onSave={(shopIds) => shopsMutation.mutate(shopIds)}
          />

          <ProductTariffPanel ownerKey={ownerKey} productId={productId} analysis={detailQuery.data.tariffAnalysis} />

          <div className="space-y-6" hidden={mode !== "overview"} aria-hidden={mode !== "overview"}>
            <VariantTable
              variants={detailQuery.data.variants}
              productTitle={detailQuery.data.product.title}
              productImages={detailQuery.data.product.images}
              selectedVariantId={selectedVariantId}
              onVariantSelect={setSelectedVariantId}
            />
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
