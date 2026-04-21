import { Link } from "react-router-dom";

import { formatDateTime } from "../../../app/api";
import { StatusBadge } from "../../shared/components/StatusBadge";
import { TrendyolExternalLink } from "../../shared/components/TrendyolExternalLink";
import type { OwnerKey } from "../../shared/lib/ownerRouteState";
import type { UnifiedDashboardItem } from "../lib/buildUnifiedDashboardItems";

interface UnifiedDashboardCardProps {
  ownerKey: OwnerKey;
  item: UnifiedDashboardItem;
}

export function UnifiedDashboardCard({ ownerKey, item }: UnifiedDashboardCardProps) {
  const sourceDetailHref = item.sourceProduct ? `/owners/${ownerKey}/source-products/${item.sourceProduct.id}` : null;
  const trackedDetailHref = item.trackedProduct ? `/owners/${ownerKey}/products/${item.trackedProduct.id}` : null;

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-400">Birleşik Ürün Kaydı</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">{item.title}</h3>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {item.categoryLabel ?? "Kategorisiz"}
            </span>
            {item.platform ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{item.platform}</span>
            ) : null}
            {item.brand ? <span>{item.brand}</span> : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {item.trackedProduct ? <StatusBadge status={item.trackedProduct.status} /> : null}
          {item.trackedProduct ? <StatusBadge status={item.trackedProduct.parseStatus} /> : null}
          {item.sourceUrl ? (
            <TrendyolExternalLink
              href={item.sourceUrl}
              label={`Kaynak ürün sayfasını yeni sekmede aç: ${item.title}`}
              size="sm"
            />
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Kayıt Durumu</p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <span className={item.sourceProduct ? "rounded-full bg-emerald-100 px-3 py-1 font-medium text-emerald-700" : "rounded-full bg-slate-200 px-3 py-1 font-medium text-slate-600"}>
              {item.sourceProduct ? "Kaynak kaydı var" : "Kaynak kaydı yok"}
            </span>
            <span className={item.trackedProduct ? "rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-800" : "rounded-full bg-slate-200 px-3 py-1 font-medium text-slate-600"}>
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
          <Link
            to={trackedDetailHref}
            className="rounded-2xl bg-[#051125] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0a1831]"
          >
            Takip detayı
          </Link>
        ) : null}
      </div>
    </article>
  );
}
