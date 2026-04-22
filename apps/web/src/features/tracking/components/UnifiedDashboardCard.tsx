import { Link } from "react-router-dom";

import { formatDateTime, type EtsyShop, type ProductCategory } from "../../../app/api";
import { StatusBadge } from "../../shared/components/StatusBadge";
import { TrendyolExternalLink } from "../../shared/components/TrendyolExternalLink";
import type { OwnerKey } from "../../shared/lib/ownerRouteState";
import type { UnifiedDashboardItem } from "../lib/buildUnifiedDashboardItems";
import { ProductCategorySelect } from "./ProductCategorySelect";

interface UnifiedDashboardCardProps {
  ownerKey: OwnerKey;
  item: UnifiedDashboardItem;
  shops: EtsyShop[];
  categories: ProductCategory[];
  showAssignedShopLabel: boolean;
  isAssigningShop?: boolean;
  isCategoryUpdating?: boolean;
  onAssignShop: (item: UnifiedDashboardItem, shopId: string | null) => void;
  onCategoryChange: (item: UnifiedDashboardItem, categoryId: string | null) => void;
}

export function UnifiedDashboardCard({
  ownerKey,
  item,
  shops,
  categories,
  showAssignedShopLabel,
  isAssigningShop = false,
  isCategoryUpdating = false,
  onAssignShop,
  onCategoryChange,
}: UnifiedDashboardCardProps) {
  const sourceDetailHref = item.sourceProduct ? `/owners/${ownerKey}/source-products/${item.sourceProduct.id}` : null;
  const trackedDetailHref = item.trackedProduct ? `/owners/${ownerKey}/products/${item.trackedProduct.id}` : null;
  const primaryDetailHref = trackedDetailHref ?? sourceDetailHref;
  const assignedShopId = item.assignedShops[0]?.id ?? "";
  const assignedShopNames = item.assignedShops.map((shop) => shop.name).join(", ");
  const canClearAssignment = Boolean(item.trackedProduct);

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          {primaryDetailHref ? (
            <Link
              to={primaryDetailHref}
              aria-label={`Ürün görseli: ${item.title}`}
              className="block h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              {item.thumbnailImage ? (
                <img src={item.thumbnailImage} alt={item.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center px-2 text-center text-xs text-slate-400">
                  Görsel yok
                </div>
              )}
            </Link>
          ) : (
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-2 text-center text-xs text-slate-400">
              {item.thumbnailImage ? <img src={item.thumbnailImage} alt={item.title} className="h-full w-full object-cover" /> : "Görsel yok"}
            </div>
          )}

          <div className="min-w-0">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-400">Birleşik Ürün Kaydı</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-900">
              {primaryDetailHref ? (
                <Link
                  to={primaryDetailHref}
                  className="inline-block hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
                >
                  {item.title}
                </Link>
              ) : (
                item.title
              )}
            </h3>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {item.categoryLabel ?? "Kategorisiz"}
              </span>
              {item.platform ? (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{item.platform}</span>
              ) : null}
              {item.brand ? <span>{item.brand}</span> : null}
            </div>
            {showAssignedShopLabel ? (
              <p className="mt-3 text-xs font-medium text-slate-600">
                {assignedShopNames ? `Etsy mağazası: ${assignedShopNames}` : "Etsy mağazası: Atanmadı"}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex min-w-[240px] flex-col items-stretch gap-2">
          <label className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400" htmlFor={`shop-assign-${item.key}`}>
            Etsy mağazası
          </label>
          <select
            id={`shop-assign-${item.key}`}
            value={assignedShopId}
            disabled={isAssigningShop || shops.length === 0}
            onChange={(event) => onAssignShop(item, event.target.value ? event.target.value : null)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-[#F1641E] disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            <option value="" disabled={!canClearAssignment}>
              {canClearAssignment ? "Mağaza ataması yok" : "Mağaza seçin"}
            </option>
            {shops.map((shop) => (
              <option key={shop.id} value={shop.id}>
                {shop.name}
              </option>
            ))}
          </select>
          {shops.length === 0 ? <p className="text-xs text-slate-500">Atama için önce Etsy mağazası ekleyin.</p> : null}

          {item.trackedProduct ? (
            categories.length > 0 ? (
              <ProductCategorySelect
                label="Takip kategorisi"
                inputId={`tracking-category-${item.trackedProduct.id}`}
                categories={categories}
                value={item.trackedProduct.userCategory?.id ?? null}
                disabled={isCategoryUpdating}
                onChange={(categoryId) => onCategoryChange(item, categoryId)}
              />
            ) : (
              <p className="text-xs text-slate-500">Kategori listesi yükleniyor...</p>
            )
          ) : (
            <p className="text-xs text-slate-500">Kategori seçimi için önce takip kaydı oluşturun.</p>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2">
            {item.trackedProduct ? <StatusBadge status={item.trackedProduct.status} /> : null}
            {item.trackedProduct ? <StatusBadge status={item.trackedProduct.parseStatus} /> : null}
            {item.sourceUrl ? (
              <TrendyolExternalLink href={item.sourceUrl} label={`Kaynak ürün sayfasını yeni sekmede aç: ${item.title}`} size="sm" />
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Kayıt Durumu</p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <span
              className={
                item.sourceProduct
                  ? "rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-700"
                  : "rounded-full bg-slate-200 px-3 py-1 font-medium text-slate-600"
              }
            >
              {item.sourceProduct ? "Kaynak kaydı var" : "Kaynak kaydı yok"}
            </span>
            <span
              className={
                item.trackedProduct
                  ? "rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-800"
                  : "rounded-full bg-slate-200 px-3 py-1 font-medium text-slate-600"
              }
            >
              {item.trackedProduct ? "Takip kaydı var" : "Takip kaydı yok"}
            </span>
          </div>
          <dl className="mt-4 space-y-2 text-sm text-slate-600">
            <div className="flex items-center justify-between gap-3">
              <dt>Kaynak kategorisi</dt>
              <dd className="text-right text-slate-900">{item.sourceCategoryLabel ?? "—"}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt>Takip kategorisi</dt>
              <dd className="text-right text-slate-900">{item.trackingCategoryLabel ?? "—"}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt>Son kontrol</dt>
              <dd className="text-right text-slate-900">{formatDateTime(item.trackedProduct?.lastCheckedAt ?? null)}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Etsy Linkleri</p>
          {item.etsyLinks.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Henüz Etsy linki yok.</p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {item.etsyLinks.map((etsyLink) => (
                <a
                  key={etsyLink.id}
                  href={etsyLink.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 transition hover:border-amber-300 hover:bg-amber-100"
                >
                  {etsyLink.title}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {sourceDetailHref ? (
          <Link
            to={sourceDetailHref}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300"
          >
            Kaynak detayı
          </Link>
        ) : null}
        {trackedDetailHref ? (
          <Link to={trackedDetailHref} className="rounded-2xl bg-[#051125] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0a1831]">
            Takip detayı
          </Link>
        ) : null}
      </div>
    </article>
  );
}
