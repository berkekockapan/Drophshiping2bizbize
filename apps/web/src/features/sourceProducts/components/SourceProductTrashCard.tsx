import type { SourceProductItem } from "../../../app/api";

interface SourceProductTrashCardProps {
  item: SourceProductItem;
  onRestore: () => void;
  onPermanentDelete: () => void;
}

export function SourceProductTrashCard({ item, onRestore, onPermanentDelete }: SourceProductTrashCardProps) {
  const title = item.title ?? "Başlıksız ürün";

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-slate-400">Silinmiş kaynak ürün</p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">{title}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {item.sourceCategory?.name ?? "Kategorisiz"}
            </span>
            <span>{item.platform ?? "Platform yok"}</span>
            <span>•</span>
            <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="text-slate-700 underline decoration-slate-300 underline-offset-2">
              Kaynak URL
            </a>
          </div>
        </div>
        <div className="rounded-2xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
          {item.deletedReason ?? "Çöpte"}
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={onRestore}
          className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100"
        >
          Geri yükle
        </button>
        <button
          type="button"
          onClick={onPermanentDelete}
          className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
        >
          Kalıcı sil
        </button>
      </div>
    </article>
  );
}
