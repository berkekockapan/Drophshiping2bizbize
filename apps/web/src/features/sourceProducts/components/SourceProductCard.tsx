import { Link } from "react-router-dom";
import type { DraggableAttributes, DraggableSyntheticListeners } from "@dnd-kit/core";
import { CSS, type Transform } from "@dnd-kit/utilities";

import type { SourceProductCategory, SourceProductItem } from "../../../app/api";
import type { OwnerKey } from "../../shared/lib/ownerRouteState";
import { SourceProductCategorySelect } from "./SourceProductCategorySelect";

interface SortableState {
  setNodeRef: (element: HTMLElement | null) => void;
  attributes: DraggableAttributes;
  listeners?: DraggableSyntheticListeners;
  setActivatorNodeRef: (element: HTMLElement | null) => void;
  transform: Transform | null;
  transition?: string;
  isDragging?: boolean;
}

interface SourceProductCardProps {
  ownerKey: OwnerKey;
  item: SourceProductItem;
  categories: SourceProductCategory[];
  onDelete: (item: SourceProductItem) => void;
  onCategoryChange: (item: SourceProductItem, categoryId: string | null) => void;
  sortable?: SortableState;
}

function formatSourceUrl(sourceUrl: string) {
  try {
    return new URL(sourceUrl).hostname.replace(/^www\./, "");
  } catch {
    return sourceUrl;
  }
}

export function SourceProductCard({ ownerKey, item, categories, onDelete, onCategoryChange, sortable }: SourceProductCardProps) {
  const title = item.title || "Başlıksız ürün";
  const productHref = `/owners/${ownerKey}/source-products/${item.id}`;
  const style = sortable?.transform
    ? {
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
        opacity: sortable.isDragging ? 0.7 : undefined,
      }
    : undefined;

  return (
    <article ref={sortable?.setNodeRef} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" style={style}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Kaynak ürün</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">
            <Link to={productHref} className="inline-block hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300">
              {title}
            </Link>
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {item.sourceCategory?.name ?? "Kategorisiz"}
            </span>
            <span>{item.platform ?? "Platform yok"}</span>
            <span>•</span>
            <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="text-slate-700 underline decoration-slate-300 underline-offset-2">
              {formatSourceUrl(item.sourceUrl)}
            </a>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {sortable ? (
            <button
              type="button"
              ref={sortable.setActivatorNodeRef}
              {...sortable.attributes}
              {...sortable.listeners}
              aria-label={`Sırala ${title}`}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700"
            >
              ⇅
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onDelete(item)}
            className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
          >
            Sil
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(220px,1fr)]">
        <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
          <p className="text-xs uppercase tracking-wide text-slate-500">Notlar</p>
          <p className="mt-2 text-slate-900">{item.notes ?? "Not yok"}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
          <p className="text-xs uppercase tracking-wide text-slate-500">Etsy bağlantıları</p>
          <p className="mt-2 text-slate-900">{item.linkedEtsyCount} bağlantı</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-4">
        <SourceProductCategorySelect
          label="Kaynak ürün kategorisi"
          inputId={`source-product-category-${item.id}`}
          categories={categories}
          value={item.sourceCategory?.id ?? null}
          onChange={(categoryId) => onCategoryChange(item, categoryId)}
        />
        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <p className="text-xs uppercase tracking-wide text-slate-500">Sıra</p>
          <p className="mt-2 text-slate-900">{item.sortOrder ?? "-"}</p>
        </div>
      </div>
    </article>
  );
}
