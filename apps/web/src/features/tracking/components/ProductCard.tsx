import { Link } from "react-router-dom";

import { formatPrice, type TrackingItem } from "../../../app/api";
import { StatusBadge } from "../../shared/components/StatusBadge";

interface ProductCardProps {
  item: TrackingItem;
}

export function ProductCard({ item }: ProductCardProps) {
  const title = item.title ?? "Başlıksız ürün";
  const productHref = `/products/${item.id}`;

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
          </div>
        </div>

        <div className="flex gap-2">
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
