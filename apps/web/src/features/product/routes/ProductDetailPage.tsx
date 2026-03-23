import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { fetchProductDetail } from "../../../app/api";
import { EtsyPrepWorkspace } from "../../etsyPrep/components/EtsyPrepWorkspace";
import { ChangeTimeline } from "../components/ChangeTimeline";
import { ProductSummary } from "../components/ProductSummary";
import { VariantTable } from "../components/VariantTable";

export function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const [mode, setMode] = useState<"overview" | "prep">("overview");
  const [hasOpenedPrep, setHasOpenedPrep] = useState(false);

  const detailQuery = useQuery({
    queryKey: ["product-detail", productId],
    enabled: Boolean(productId),
    queryFn: () => fetchProductDetail(productId as string),
  });

  if (!productId) {
    return <p className="text-sm text-rose-600">Ürün kimliği bulunamadı.</p>;
  }

  useEffect(() => {
    setMode("overview");
    setHasOpenedPrep(false);
  }, [productId]);

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
            detail={detailQuery.data}
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
            {detailQuery.data ? (
              <>
              <VariantTable variants={detailQuery.data.variants} />
              <ChangeTimeline items={detailQuery.data.changeTimeline} />
              </>
            ) : null}
          </div>

          {hasOpenedPrep ? (
            <div hidden={mode !== "prep"} aria-hidden={mode !== "prep"}>
              <EtsyPrepWorkspace productId={productId} onBack={() => setMode("overview")} />
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
