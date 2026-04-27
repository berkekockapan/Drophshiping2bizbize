import { formatDateTime, formatPrice, type ProductDetailResponse } from "../../../app/api";
import { StatusBadge } from "../../shared/components/StatusBadge";
import { TrendyolExternalLink } from "../../shared/components/TrendyolExternalLink";
import {
  getVariantImageUrl,
  getVariantLabel,
  getVariantOptionCategories,
  getVariantOptions,
} from "../lib/variantPresentation";

interface VariantTableProps {
  variants: ProductDetailResponse["variants"];
  productTitle: string | null;
  productAttributes?: ProductDetailResponse["product"]["attributes"];
  productImages: Array<string | null | undefined> | null | undefined;
  selectedVariantId?: string | null;
  onVariantSelect?: (variantId: string) => void;
}

export function VariantTable({
  variants,
  productTitle,
  productAttributes = null,
  productImages,
  selectedVariantId = null,
  onVariantSelect,
}: VariantTableProps) {
  const displayProductTitle = productTitle?.trim() || "Başlıksız ürün";
  const variantOptionCategories = getVariantOptionCategories(variants, productAttributes);

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-slate-400">Varyasyonlar</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Varyasyon matrisi</h2>
        </div>
        <p className="text-sm text-slate-500">{variants.length} kayıt</p>
      </div>

      {variantOptionCategories.length > 0 ? (
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {variantOptionCategories.map((category) => (
            <div key={category.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{category.label}</p>
                <span className="text-xs font-medium text-slate-500">{category.values.length} değer</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {category.values.map((value) => (
                  <span
                    key={`${category.id}-${value}`}
                    className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700"
                  >
                    {value}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-5 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead>
            <tr className="text-slate-500">
              <th className="pb-3 font-medium">Görsel</th>
              <th className="pb-3 font-medium">Seçenekler</th>
              <th className="pb-3 font-medium">Ürün başlığı</th>
              <th className="pb-3 font-medium">Fiyat</th>
              <th className="pb-3 font-medium">Durum</th>
              <th className="pb-3 font-medium">Son görülme</th>
              <th className="pb-3 font-medium text-right">Link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {variants.map((variant) => {
              const variantLabel = getVariantLabel(variant);
              const imageUrl = getVariantImageUrl(variant, productImages);
              const isSelected = selectedVariantId === variant.id;
              const variantOptions = getVariantOptions(variant, variantOptionCategories);

              return (
                <tr key={variant.id} className={isSelected ? "bg-orange-50/40" : undefined}>
                  <td className="py-4">
                    <div className="h-14 w-14 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                      {imageUrl ? (
                        <img src={imageUrl} alt={variantLabel} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center px-1 text-center text-[10px] text-slate-500">Görsel yok</div>
                      )}
                    </div>
                  </td>
                  <td className="py-4">
                    {onVariantSelect ? (
                      <button
                        type="button"
                        onClick={() => onVariantSelect(variant.id)}
                        className="rounded-xl border border-transparent px-2 py-1 text-left transition hover:border-slate-200 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#F1641E]/40"
                      >
                        <span className="font-medium text-slate-900">{variantLabel}</span>
                      </button>
                    ) : (
                      <div className="font-medium text-slate-900">{variantLabel}</div>
                    )}
                    {variantOptions.length > 0 ? (
                      <div className="mt-2 flex max-w-xs flex-wrap gap-1.5">
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
                    <div className="text-xs text-slate-500">{variant.variantKey}</div>
                  </td>
                  <td className="py-4 text-slate-700">{displayProductTitle}</td>
                  <td className="py-4 text-slate-700">{formatPrice(variant.currentPrice)}</td>
                  <td className="py-4">
                    <StatusBadge status={variant.currentStockState} />
                  </td>
                  <td className="py-4 text-slate-500">{formatDateTime(variant.lastSeenAt)}</td>
                  <td className="py-4 text-right">
                    {variant.trendyolUrl ? (
                      <TrendyolExternalLink
                        href={variant.trendyolUrl}
                        label={`Trendyol varyasyon sayfasını yeni sekmede aç: ${variantLabel}`}
                        size="sm"
                      />
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
