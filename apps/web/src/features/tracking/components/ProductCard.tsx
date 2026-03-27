import { Link } from "react-router-dom";

import { formatPrice, type ProductCategory, type TrackingItem } from "../../../app/api";
import type { OwnerKey } from "../../shared/lib/ownerRouteState";
import { StatusBadge } from "../../shared/components/StatusBadge";
import { TrendyolExternalLink } from "../../shared/components/TrendyolExternalLink";
import { ProductCategorySelect } from "./ProductCategorySelect";

interface ProductCardProps {
  ownerKey: OwnerKey;
  item: TrackingItem;
  categories?: ProductCategory[];
  onToggleFavorite?: (item: TrackingItem) => void;
  onDelete?: (item: TrackingItem) => void;
  onCategoryChange?: (item: TrackingItem, categoryId: string | null) => void;
  favoritePending?: boolean;
  deletePending?: boolean;
  categoryPending?: boolean;
}

export function ProductCard({
  ownerKey,
  item,
  categories,
  onToggleFavorite,
  onDelete,
  favoritePending = false,
  deletePending = false,
  onCategoryChange,
  categoryPending = false,
}: ProductCardProps) {
  const title = item.title ?? "Başlıksız ürün";
  const productHref = `/owners/${ownerKey}/products/${item.id}`;
  const favoriteLabel = item.isFavorite ? "Favoriden çıkar" : "Favoriye ekle";
  const actionsDisabled = favoritePending || deletePending || categoryPending;

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-4">
          <Link
            to={productHref}
            aria-label={`Ürün görseli: ${title}`}
            className="block h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            {item.thumbnailImage ? (
              <img src={item.thumbnailImage} alt={title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">Görsel yok</div>
            )}
          </Link>

          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-slate-900">
              <Link
                to={productHref}
                className="inline-block hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                {title}
              </Link>
            </h3>
            <p className="mt-1 text-sm text-slate-500">{item.brand ?? "Marka yok"}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {item.userCategory?.name ?? "Kategorisiz"}
              </span>
              {categories?.length ? (
                <ProductCategorySelect
                  label="Takip kategorisi"
                  inputId={`product-category-${item.id}`}
                  categories={categories}
                  value={item.userCategory?.id ?? null}
                  disabled={actionsDisabled}
                  onChange={(categoryId) => onCategoryChange?.(item, categoryId)}
                />
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {item.trendyolUrl ? (
            <TrendyolExternalLink
              href={item.trendyolUrl}
              label={`Trendyol ürün sayfasını yeni sekmede aç: ${title}`}
              size="sm"
            />
          ) : null}
          <button
            type="button"
            onClick={() => onToggleFavorite?.(item)}
            disabled={actionsDisabled}
            aria-pressed={item.isFavorite}
            className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 transition hover:border-amber-300 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {favoritePending ? "Kaydediliyor..." : favoriteLabel}
          </button>
          <button
            type="button"
            onClick={() => onDelete?.(item)}
            disabled={actionsDisabled}
            className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deletePending ? "Siliniyor..." : "Sil"}
          </button>
          <StatusBadge status={item.status} />
          <StatusBadge status={item.parseStatus} />
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Güncel</p>
          <p className="mt-2 text-base font-semibold text-slate-900">{formatPrice(item.currentPrice)}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">En düşük</p>
          <p className="mt-2 text-base font-semibold text-slate-900">{formatPrice(item.minPrice)}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Stok</p>
          <p className="mt-2 text-base font-semibold text-slate-900">
            {item.inStockVariantCount ?? 0}/{item.totalVariantCount ?? 0}
          </p>
        </div>
      </div>
    </article>
  );
}
