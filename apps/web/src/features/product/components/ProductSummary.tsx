import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { formatDateTime, formatPrice, type ProductDetailResponse } from "../../../app/api";
import { StatCard } from "../../shared/components/StatCard";
import { StatusBadge } from "../../shared/components/StatusBadge";
import { TrendyolExternalLink } from "../../shared/components/TrendyolExternalLink";
import type { OwnerKey } from "../../shared/lib/ownerRouteState";
import { LinkedProductVariantsPanel } from "./LinkedProductVariantsPanel";
import { ProductImageGallery } from "./ProductImageGallery";

interface ProductSummaryProps {
  ownerKey: OwnerKey;
  detail: ProductDetailResponse;
  action?: ReactNode;
}

export function ProductSummary({ ownerKey, detail, action }: ProductSummaryProps) {
  const title = detail.product.title ?? "Başlıksız ürün";

  return (
    <section className="space-y-5 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <Link to={`/owners/${ownerKey}/products`} className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
          ← Ürün listesine dön
        </Link>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-600">
          {ownerKey}
        </span>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <ProductImageGallery productId={detail.product.id} ownerKey={ownerKey} title={detail.product.title} images={detail.product.images ?? []} />

        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium uppercase tracking-[0.28em] text-slate-400">Ürün Özeti</p>
              <h1 className="text-3xl font-semibold text-slate-900">{title}</h1>
              <p className="text-sm text-slate-500">{detail.product.brand ?? "Marka yok"}</p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              {action}
              <TrendyolExternalLink
                href={detail.product.trendyolUrl}
                label={`Trendyol ürün sayfasını yeni sekmede aç: ${title}`}
              />
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
              </dl>
            </div>

            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Açıklama</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {detail.product.descriptionRaw ?? "Açıklama bilgisi bulunmuyor."}
              </p>
            </div>
          </div>

          <LinkedProductVariantsPanel
            ownerKey={ownerKey}
            productId={detail.product.id}
            variants={detail.linkedVariants}
          />

        </div>
      </div>
    </section>
  );
}
