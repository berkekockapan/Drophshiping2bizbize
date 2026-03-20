import { formatDateTime, formatPrice, type ProductDetailResponse } from "../../../app/api";

type PriceHistoryItem = ProductDetailResponse["priceHistory"][number];
type StockHistoryItem = ProductDetailResponse["stockHistory"][number];

interface HistoryTimelineProps {
  title: string;
  emptyText: string;
  items: PriceHistoryItem[] | StockHistoryItem[];
  kind: "price" | "stock";
}

function isPriceItem(item: PriceHistoryItem | StockHistoryItem): item is PriceHistoryItem {
  return "newPrice" in item;
}

export function HistoryTimeline({ title, emptyText, items, kind }: HistoryTimelineProps) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>

      {items.length === 0 ? <p className="mt-4 text-sm text-slate-500">{emptyText}</p> : null}

      <div className="mt-5 space-y-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-2xl bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900">
                {isPriceItem(item)
                  ? `${formatPrice(item.previousPrice)} → ${formatPrice(item.newPrice)}`
                  : `${item.previousStockState ?? "Bilinmiyor"} → ${item.newStockState}`}
              </p>
              <p className="text-xs text-slate-500">{formatDateTime(item.changedAt)}</p>
            </div>
            {kind === "price" && isPriceItem(item) && item.changeReason ? (
              <p className="mt-2 text-sm text-slate-500">{item.changeReason}</p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
