import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useParams } from "react-router-dom";

import { fetchProductDetail } from "../../../app/api";
import { EtsyPrepWorkspace } from "../../etsyPrep/components/EtsyPrepWorkspace";
import { ChangeTimeline } from "../components/ChangeTimeline";
import { ProductSummary } from "../components/ProductSummary";
import { VariantTable } from "../components/VariantTable";

export function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const [mode, setMode] = useState<"overview" | "prep">("overview");

  const detailQuery = useQuery({
    queryKey: ["product-detail", productId],
    enabled: Boolean(productId),
    queryFn: () => fetchProductDetail(productId as string),
  });

  if (!productId) {
    return <p className="text-sm text-rose-600">Ürün kimliği bulunamadı.</p>;
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
              <button
                type="button"
                className={[
                  "rounded-2xl px-4 py-2 text-sm font-semibold transition",
                  mode === "prep"
                    ? "border border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    : "bg-[#F1641E] text-white hover:bg-[#d95518]",
                ].join(" ")}
                onClick={() => setMode((current) => (current === "overview" ? "prep" : "overview"))}
              >
                {mode === "overview" ? "Etsy'e Yükle" : "Genel Bakışa Dön"}
              </button>
            }
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={[
                "rounded-2xl px-4 py-2 text-sm font-medium transition",
                mode === "overview" ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300",
              ].join(" ")}
              onClick={() => setMode("overview")}
            >
              Genel Bakış
            </button>
            <button
              type="button"
              className={[
                "rounded-2xl px-4 py-2 text-sm font-medium transition",
                mode === "prep" ? "bg-amber-500 text-slate-950" : "border border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-300",
              ].join(" ")}
              onClick={() => setMode("prep")}
            >
              Hazırlık
            </button>
          </div>

          {mode === "overview" ? (
            <>
              <VariantTable variants={detailQuery.data.variants} />
              <ChangeTimeline items={detailQuery.data.changeTimeline} />
            </>
          ) : (
            <EtsyPrepWorkspace productId={productId} />
          )}
        </>
      ) : null}
    </div>
  );
}
