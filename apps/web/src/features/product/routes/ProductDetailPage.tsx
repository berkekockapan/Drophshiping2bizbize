import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import { fetchProductDetail } from "../../../app/api";
import { HistoryTimeline } from "../components/HistoryTimeline";
import { ProductSummary } from "../components/ProductSummary";
import { VariantTable } from "../components/VariantTable";

export function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>();

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
          <ProductSummary detail={detailQuery.data} />
          <VariantTable variants={detailQuery.data.variants} />
          <div className="grid gap-6 xl:grid-cols-2">
            <HistoryTimeline
              title="Fiyat geçmişi"
              emptyText="Henüz fiyat değişimi kaydı yok."
              items={detailQuery.data.priceHistory}
              kind="price"
            />
            <HistoryTimeline
              title="Stok geçmişi"
              emptyText="Henüz stok değişimi kaydı yok."
              items={detailQuery.data.stockHistory}
              kind="stock"
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
