import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { fetchProductCategories, fetchProductDetail, setTrackedProductCategory } from "../../../app/api";
import { EtsyPrepWorkspace } from "../../etsyPrep/components/EtsyPrepWorkspace";
import { ownerOptions, type OwnerKey } from "../../shared/lib/ownerRouteState";
import { ChangeTimeline } from "../components/ChangeTimeline";
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

  const categoriesQuery = useQuery({
    queryKey: ["product-categories", ownerKey],
    enabled: Boolean(ownerKey),
    queryFn: async () => (await fetchProductCategories(ownerKey as OwnerKey)).items,
  });

  const detailQuery = useQuery({
    queryKey: ["product-detail", ownerKey, productId],
    enabled: Boolean(ownerKey && productId),
    queryFn: () => fetchProductDetail(ownerKey as OwnerKey, productId as string),
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
      {detailQuery.isLoading ? <p className="text-sm text-slate-500">Ürün detayı yükleniyor...</p> : null}
      {detailQuery.isError ? <p className="text-sm text-rose-600">Ürün detayı yüklenemedi.</p> : null}

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
