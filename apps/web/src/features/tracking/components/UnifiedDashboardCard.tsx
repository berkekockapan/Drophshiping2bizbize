import { useState, type FormEvent } from "react";
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
  isCategoryListLoading?: boolean;
  hasCategoryListError?: boolean;
  showAssignedShopLabel: boolean;
  isAssigningShop?: boolean;
  isCategoryUpdating?: boolean;
  isEtsyLinkAdding?: boolean;
  etsyLinkError?: string | null;
  deletingEtsyLinkId?: string | null;
  etsyLinkDeleteError?: string | null;
  isCardDeleting?: boolean;
  cardDeleteError?: string | null;
  onAssignShop: (item: UnifiedDashboardItem, shopId: string | null) => void;
  onCategoryChange: (item: UnifiedDashboardItem, categoryId: string | null) => void;
  onAddEtsyLink: (item: UnifiedDashboardItem, etsyUrl: string) => Promise<void>;
  onDeleteEtsyLink: (item: UnifiedDashboardItem, etsyLink: UnifiedDashboardItem["etsyLinks"][number]) => Promise<void>;
  onDeleteCard: (item: UnifiedDashboardItem) => Promise<void>;
}

export function UnifiedDashboardCard({
  ownerKey,
  item,
  shops,
  categories,
  isCategoryListLoading = false,
  hasCategoryListError = false,
  showAssignedShopLabel,
  isAssigningShop = false,
  isCategoryUpdating = false,
  isEtsyLinkAdding = false,
  etsyLinkError = null,
  deletingEtsyLinkId = null,
  etsyLinkDeleteError = null,
  isCardDeleting = false,
  cardDeleteError = null,
  onAssignShop,
  onCategoryChange,
  onAddEtsyLink,
  onDeleteEtsyLink,
  onDeleteCard,
}: UnifiedDashboardCardProps) {
  const [isEtsyFormOpen, setIsEtsyFormOpen] = useState(false);
  const [etsyUrl, setEtsyUrl] = useState("");
  const [etsyLinkToDelete, setEtsyLinkToDelete] = useState<UnifiedDashboardItem["etsyLinks"][number] | null>(null);
  const [isCardDeleteConfirmOpen, setIsCardDeleteConfirmOpen] = useState(false);
  const sourceDetailHref = item.sourceProduct ? `/owners/${ownerKey}/source-products/${item.sourceProduct.id}` : null;
  const trackedDetailHref = item.trackedProduct ? `/owners/${ownerKey}/products/${item.trackedProduct.id}` : null;
  const primaryDetailHref = trackedDetailHref ?? sourceDetailHref;
  const assignedShopId = item.assignedShops[0]?.id ?? "";
  const assignedShopNames = item.assignedShops.map((shop) => shop.name).join(", ");
  const canClearAssignment = Boolean(item.trackedProduct || item.sourceProduct);
  const canSetCategory = Boolean(item.trackedProduct || item.sourceProduct);
  const categoryValue = item.trackedProduct?.userCategory?.id ?? item.sourceProduct?.userCategory?.id ?? null;
  const categoryInputId = item.trackedProduct
    ? `tracking-category-${item.trackedProduct.id}`
    : `source-product-category-${item.sourceProduct?.id ?? item.key}`;
  const categoryLabel = item.trackedProduct ? "Takip kategorisi" : "Kategori";

  async function handleAddEtsyLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedUrl = etsyUrl.trim();
    if (!trimmedUrl || isEtsyLinkAdding) {
      return;
    }

    try {
      await onAddEtsyLink(item, trimmedUrl);
      setEtsyUrl("");
      setIsEtsyFormOpen(false);
    } catch {
      // Hata, kart içindeki kalıcı geri bildirim alanında gösterilir.
    }
  }

  async function handleDeleteEtsyLink() {
    if (!etsyLinkToDelete || deletingEtsyLinkId) {
      return;
    }

    try {
      await onDeleteEtsyLink(item, etsyLinkToDelete);
      setEtsyLinkToDelete(null);
    } catch {
      // Hata, Etsy linkleri alanında gösterilir.
    }
  }

  async function handleDeleteCard() {
    if (isCardDeleting) {
      return;
    }

    try {
      await onDeleteCard(item);
    } catch {
      // Hata, kart silme onay alanında gösterilir.
    }
  }

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
          <div className="mb-1 flex justify-end">
            <button
              type="button"
              aria-expanded={isCardDeleteConfirmOpen}
              onClick={() => setIsCardDeleteConfirmOpen((current) => !current)}
              className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
            >
              Kartı sil
            </button>
          </div>
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

          {canSetCategory ? (
            isCategoryListLoading ? (
              <p className="text-xs text-slate-500">Kategori listesi yükleniyor...</p>
            ) : (
              <div className="space-y-1">
                <ProductCategorySelect
                  label={categoryLabel}
                  inputId={categoryInputId}
                  categories={categories}
                  value={categoryValue}
                  disabled={isCategoryUpdating || hasCategoryListError}
                  onChange={(categoryId) => onCategoryChange(item, categoryId)}
                />
                {hasCategoryListError ? <p className="text-xs text-rose-600">Kategori listesi yüklenemedi.</p> : null}
                {!hasCategoryListError && categories.length === 0 ? (
                  <p className="text-xs text-slate-500">Henüz kategori yok. Yukarıdan kategori oluşturun.</p>
                ) : null}
              </div>
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

      {isCardDeleteConfirmOpen ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm font-semibold text-rose-800">Bu kartı silmek istediğinizden emin misiniz?</p>
          <p className="mt-1 text-xs text-rose-700">
            Varsa kaynak ve takip kayıtları çöp kutusuna taşınır; gerektiğinde geri yükleyebilirsiniz.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setIsCardDeleteConfirmOpen(false)}
              disabled={isCardDeleting}
              className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={handleDeleteCard}
              disabled={isCardDeleting}
              className="rounded-2xl bg-rose-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-800 disabled:cursor-not-allowed disabled:bg-rose-300"
            >
              {isCardDeleting ? "Siliniyor..." : "Kartı çöp kutusuna taşı"}
            </button>
          </div>
          {cardDeleteError ? <p className="mt-2 text-sm text-rose-700">{cardDeleteError}</p> : null}
        </div>
      ) : null}

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
                <span key={etsyLink.id} className="inline-flex overflow-hidden rounded-2xl border border-amber-200 bg-amber-50">
                  <a
                    href={etsyLink.url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 text-xs font-medium text-amber-800 transition hover:bg-amber-100"
                  >
                    {etsyLink.title}
                  </a>
                  <button
                    type="button"
                    aria-label={`${etsyLink.title} Etsy linkini sil`}
                    onClick={() => setEtsyLinkToDelete(etsyLink)}
                    className="border-l border-amber-200 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                  >
                    Sil
                  </button>
                </span>
              ))}
            </div>
          )}

          {etsyLinkToDelete ? (
            <div className="mt-3 rounded-2xl border border-rose-200 bg-white p-3">
              <p className="text-xs font-semibold text-rose-800">Bu Etsy linki silinsin mi?</p>
              <p className="mt-1 break-all text-xs text-slate-500">{etsyLinkToDelete.url}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setEtsyLinkToDelete(null)}
                  disabled={Boolean(deletingEtsyLinkId)}
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={handleDeleteEtsyLink}
                  disabled={Boolean(deletingEtsyLinkId)}
                  className="rounded-2xl bg-rose-700 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-rose-300"
                >
                  {deletingEtsyLinkId === etsyLinkToDelete.id ? "Siliniyor..." : "Linki sil"}
                </button>
              </div>
              {etsyLinkDeleteError ? <p className="mt-2 text-xs text-rose-700">{etsyLinkDeleteError}</p> : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          aria-expanded={isEtsyFormOpen}
          onClick={() => setIsEtsyFormOpen((current) => !current)}
          className="rounded-2xl bg-[#F1641E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#d95518]"
        >
          {isEtsyFormOpen ? "Etsy linki eklemeyi kapat" : "Etsy linki ekle"}
        </button>
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

      {isEtsyFormOpen ? (
        <form onSubmit={handleAddEtsyLink} className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <label className="block text-sm font-medium text-slate-600" htmlFor={`etsy-link-${item.key}`}>
              Etsy ürün linki
              <input
                id={`etsy-link-${item.key}`}
                type="url"
                required
                value={etsyUrl}
                onChange={(event) => setEtsyUrl(event.target.value)}
                placeholder="https://www.etsy.com/listing/..."
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#F1641E]"
              />
            </label>
            <button
              type="submit"
              disabled={isEtsyLinkAdding || etsyUrl.trim().length === 0}
              className="rounded-2xl bg-[#051125] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0a1831] disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isEtsyLinkAdding ? "Kaydediliyor..." : "Etsy linkini kaydet"}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">Etsy ürün sayfasının bağlantısını yapıştırın; bağlantı bu kartta kalıcı olarak gösterilir.</p>
          {etsyLinkError ? <p className="mt-2 text-sm text-rose-600">{etsyLinkError}</p> : null}
        </form>
      ) : null}
    </article>
  );
}
