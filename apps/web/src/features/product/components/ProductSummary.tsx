import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { formatDateTime, formatPrice, type ProductDetailResponse } from "../../../app/api";
import { StatCard } from "../../shared/components/StatCard";
import { StatusBadge } from "../../shared/components/StatusBadge";
import { TrendyolExternalLink } from "../../shared/components/TrendyolExternalLink";
import type { OwnerKey } from "../../shared/lib/ownerRouteState";
import {
  getVariantImageUrl,
  getVariantLabel,
  getVariantOptionCategories,
  getVariantOptions,
} from "../lib/variantPresentation";
import { ProductImageGallery } from "./ProductImageGallery";

interface ProductSummaryProps {
  ownerKey: OwnerKey;
  detail: ProductDetailResponse;
  selectedVariantId: string | null;
  onVariantSelect: (variantId: string) => void;
  action?: ReactNode;
}

export function ProductSummary({ ownerKey, detail, selectedVariantId, onVariantSelect, action }: ProductSummaryProps) {
  const title = detail.product.title ?? "Başlıksız ürün";
  const variants = detail.variants;
  const selectedVariant =
    variants.find((variant) => variant.id === selectedVariantId) ??
    variants.find((variant) => variant.id === detail.costContext.selectedVariantId) ??
    variants[0] ??
    null;
  const selectedVariantLabel = selectedVariant ? getVariantLabel(selectedVariant) : null;
  const selectedVariantImage = selectedVariant ? getVariantImageUrl(selectedVariant, detail.product.images) : null;
  const variantOptionCategories = getVariantOptionCategories(variants, detail.product.attributes);
  const selectedVariantOptions = selectedVariant ? getVariantOptions(selectedVariant, variantOptionCategories) : [];

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

          <div className="rounded-3xl bg-slate-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Varyant Görünümü</p>
                {variantOptionCategories.length > 0 ? (
                  <p className="mt-1 text-xs text-slate-500">
                    Seçenekler kategori bazlı gruplanır; renk, beden veya diğer boyutlar birlikte görünür.
                  </p>
                ) : null}
              </div>
              {variantOptionCategories.length > 0 ? (
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                  {variantOptionCategories.length} kategori
                </span>
              ) : null}
            </div>
            {variants.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Bu ürün için varyant kaydı bulunamadı.</p>
            ) : (
              <>
                {variantOptionCategories.length > 0 ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {variantOptionCategories.map((category) => (
                      <div key={category.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{category.label}</p>
                          <span className="text-xs font-medium text-slate-500">{category.values.length} değer</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {category.values.map((value) => (
                            <span
                              key={`${category.id}-${value}`}
                              className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700"
                            >
                              {value}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {variants.map((variant) => {
                    const variantLabel = getVariantLabel(variant);
                    const imageUrl = getVariantImageUrl(variant, detail.product.images);
                    const isSelected = variant.id === selectedVariant?.id;
                    const variantOptions = getVariantOptions(variant, variantOptionCategories);

                    return (
                      <button
                        key={variant.id}
                        type="button"
                        aria-label={`Varyant sec: ${variantLabel}`}
                        aria-pressed={isSelected}
                        onClick={() => onVariantSelect(variant.id)}
                        className={[
                          "flex items-center gap-3 rounded-2xl border bg-white p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-[#F1641E]/40",
                          isSelected
                            ? "border-[#F1641E] ring-1 ring-[#F1641E]/30"
                            : "border-slate-200 hover:border-slate-300",
                        ].join(" ")}
                      >
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                          {imageUrl ? (
                            <img src={imageUrl} alt={variantLabel} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-500">Yok</div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900">{variantLabel}</p>
                          {variantOptions.length > 0 ? (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {variantOptions.map((option) => (
                                <span
                                  key={`${variant.id}-${option.id}`}
                                  className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                                >
                                  <span className="text-slate-400">{option.label}: </span>
                                  {option.value}
                                </span>
                              ))}
                            </div>
                          ) : null}
                          <p className="mt-2 text-xs text-slate-500">{formatPrice(variant.currentPrice)}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {selectedVariant ? (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                          {selectedVariantImage ? (
                            <img src={selectedVariantImage} alt={selectedVariantLabel ?? "Seçili varyant"} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">Görsel yok</div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Seçili varyant</p>
                          <p className="mt-1 truncate text-lg font-semibold text-slate-900">{selectedVariantLabel}</p>
                          {selectedVariantOptions.length > 0 ? (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {selectedVariantOptions.map((option) => (
                                <span
                                  key={`selected-${option.id}`}
                                  className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700"
                                >
                                  <span className="text-slate-400">{option.label}: </span>
                                  {option.value}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      {selectedVariant.trendyolUrl ? (
                        <TrendyolExternalLink
                          href={selectedVariant.trendyolUrl}
                          label={`Trendyol varyasyon sayfasını yeni sekmede aç: ${selectedVariantLabel ?? "Varyant"}`}
                          size="sm"
                        />
                      ) : null}
                    </div>
                    <dl className="mt-4 space-y-2 text-sm text-slate-600">
                      <div className="flex items-center justify-between gap-3">
                        <dt>Ürün başlığı</dt>
                        <dd className="text-right text-slate-900">{title}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt>Fiyat</dt>
                        <dd className="text-right text-slate-900">{formatPrice(selectedVariant.currentPrice)}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt>Durum</dt>
                        <dd>
                          <StatusBadge status={selectedVariant.currentStockState} />
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt>Son görülme</dt>
                        <dd className="text-right text-slate-900">{formatDateTime(selectedVariant.lastSeenAt)}</dd>
                      </div>
                    </dl>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
