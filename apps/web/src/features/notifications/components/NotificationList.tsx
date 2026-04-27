import { Link } from "react-router-dom";

import { formatDateTime, type NotificationItem } from "../../../app/api";
import type { OwnerKey } from "../../shared/lib/ownerRouteState";

interface NotificationListProps {
  items: NotificationItem[];
  ownerKey: OwnerKey;
  markingId?: string | null;
  onMarkRead: (item: NotificationItem) => void;
}

const typeLabels: Record<string, string> = {
  PRICE_INCREASED: "Fiyat arttı",
  PRICE_DECREASED: "Fiyat düştü",
  OUT_OF_STOCK: "Stok bitti",
  BACK_IN_STOCK: "Stok geri geldi",
  PARSE_ERROR: "Okuma hatası",
};

function getSeverityClass(item: NotificationItem) {
  if (item.severity === "warning") {
    return {
      row: item.readAt ? "border-amber-100 bg-white" : "border-amber-200 bg-amber-50",
      badge: "bg-amber-100 text-amber-800",
      dot: "bg-amber-500",
    };
  }

  return {
    row: item.readAt ? "border-slate-200 bg-white" : "border-sky-200 bg-sky-50",
    badge: "bg-sky-100 text-sky-700",
    dot: "bg-sky-500",
  };
}

export function NotificationList({ items, ownerKey, markingId = null, onMarkRead }: NotificationListProps) {
  if (items.length === 0) {
    return (
      <section className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
        <p className="text-base font-semibold text-slate-900">Henüz bildirim yok</p>
        <p className="mt-2 text-sm text-slate-500">
          Kaydettiğiniz ürünler yenilendiğinde fiyat, stok ve okuma hatası değişiklikleri burada satır satır görünür.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Bildirimler</h2>
          <p className="mt-1 text-sm text-slate-500">En yeni değişiklikler üstte olacak şekilde listelenir.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {items.filter((item) => item.readAt === null).length} yeni / {items.length} toplam
        </span>
      </div>

      <div className="mt-4 divide-y divide-slate-100">
        {items.map((item) => {
          const classes = getSeverityClass(item);
          const isUnread = item.readAt === null;
          const productHref = item.productId ? `/owners/${ownerKey}/products/${item.productId}` : null;

          return (
            <article
              key={item.id}
              className={`grid gap-3 rounded-2xl border p-4 transition hover:border-slate-300 md:grid-cols-[minmax(0,1fr)_auto] ${classes.row}`}
            >
              <button
                type="button"
                onClick={() => onMarkRead(item)}
                disabled={!isUnread || markingId === item.id}
                className="min-w-0 text-left disabled:cursor-default"
                aria-label={isUnread ? `${item.title} bildirimini okundu yap` : `${item.title} bildirimi okundu`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  {isUnread ? <span className={`h-2.5 w-2.5 rounded-full ${classes.dot}`} aria-hidden="true" /> : null}
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${classes.badge}`}>
                    {typeLabels[item.type] ?? item.type}
                  </span>
                  {isUnread ? <span className="rounded-full bg-[#F1641E] px-2.5 py-1 text-xs font-semibold text-white">Yeni</span> : null}
                  <time className="text-xs text-slate-500">{formatDateTime(item.createdAt)}</time>
                </div>
                <h3 className="mt-3 text-base font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">{item.body}</p>
                {item.productTitle ? <p className="mt-2 text-xs font-medium text-slate-500">Ürün: {item.productTitle}</p> : null}
              </button>

              <div className="flex flex-wrap items-center gap-2 md:justify-end">
                {isUnread ? (
                  <button
                    type="button"
                    onClick={() => onMarkRead(item)}
                    disabled={markingId === item.id}
                    className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:bg-slate-100"
                  >
                    {markingId === item.id ? "??leniyor..." : "Okundu yap"}
                  </button>
                ) : (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">Okundu</span>
                )}
                {productHref ? (
                  <Link
                    to={productHref}
                    className="rounded-2xl bg-[#051125] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#0a1831]"
                  >
                    Ürüne git
                  </Link>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
