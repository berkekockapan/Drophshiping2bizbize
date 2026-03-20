import { formatDateTime, formatPrice, type ProductDetailResponse } from "../../../app/api";
import { StatCard } from "../../shared/components/StatCard";
import { StatusBadge } from "../../shared/components/StatusBadge";

interface ProductSummaryProps {
  detail: ProductDetailResponse;
}

export function ProductSummary({ detail }: ProductSummaryProps) {
  return (
    <section className="space-y-5 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-slate-400">Ürün Özeti</p>
          <h1 className="text-3xl font-semibold text-slate-900">{detail.product.title ?? "Başlıksız ürün"}</h1>
          <p className="text-sm text-slate-500">
            {detail.product.brand ?? "Marka yok"}
            {detail.product.category ? ` • ${detail.product.category}` : ""}
          </p>
        </div>

        <div className="flex gap-2">
          <StatusBadge status={detail.product.status} />
          <StatusBadge status={detail.product.parseStatus} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Güncel" value={formatPrice(detail.currentState.currentPrice)} />
        <StatCard label="En düşük" value={formatPrice(detail.currentState.minPrice)} />
        <StatCard label="En yüksek" value={formatPrice(detail.currentState.maxPrice)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Takip Bilgisi</p>
          <dl className="mt-3 space-y-2 text-sm text-slate-600">
            <div className="flex items-center justify-between gap-3">
              <dt>Son kontrol</dt>
              <dd>{formatDateTime(detail.currentState.lastCheckedAt)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt>Son değişiklik</dt>
              <dd>{formatDateTime(detail.currentState.lastChangeAt)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt>Stokta olan varyasyon</dt>
              <dd>
                {detail.currentState.inStockVariantCount}/{detail.currentState.totalVariantCount}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-3xl bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Açıklama</p>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {detail.product.descriptionRaw ?? "Açıklama bilgisi bulunmuyor."}
          </p>
        </div>
      </div>
    </section>
  );
}
