import { formatDateTime, formatPrice, type ProductDetailResponse } from "../../../app/api";
import { StatusBadge } from "../../shared/components/StatusBadge";
import { TrendyolExternalLink } from "../../shared/components/TrendyolExternalLink";
import { getVariantImageUrl, getVariantLabel } from "../lib/variantPresentation";

interface VariantTableProps {
  variants: ProductDetailResponse["variants"];
  productTitle: string | null;
  productImages: Array<string | null | undefined> | null | undefined;
  selectedVariantId?: string | null;
  onVariantSelect?: (variantId: string) => void;
}

export function VariantTable({
  variants,
  productTitle,
  productImages,
  selectedVariantId = null,
  onVariantSelect,
}: VariantTableProps) {
  const displayProductTitle = productTitle?.trim() || "Başlıksız ürün";

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-slate-400">Varyasyonlar</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Varyasyon matrisi</h2>
        </div>
        <p className="text-sm text-slate-500">{variants.length} kayıt</p>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead>
            <tr className="text-slate-500">
              <th className="pb-3 font-medium">Görsel</th>
              <th className="pb-3 font-medium">Varyasyon</th>
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
                        className="rounded-xl border border-transparent px-2 py-1 text-left font-medium text-slate-900 transition hover:border-slate-200 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#F1641E]/40"
                      >
                        {variantLabel}
                      </button>
                    ) : (
                      <div className="font-medium text-slate-900">{variantLabel}</div>
                    )}
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
