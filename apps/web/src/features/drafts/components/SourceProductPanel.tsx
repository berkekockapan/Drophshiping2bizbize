interface SourceProductPanelProps {
  title?: string;
  brand?: string;
  category?: string;
  variantSummary?: string;
}

export function SourceProductPanel({
  title = "Ürün seçildiğinde kaynak detay burada görünür.",
  brand = "-",
  category = "-",
  variantSummary = "0 varyasyon",
}: SourceProductPanelProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Kaynak Ürün</p>
      <h2 className="mt-3 text-lg font-semibold text-slate-900">{title}</h2>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-500">Marka</dt>
          <dd className="mt-1 font-medium text-slate-900">{brand}</dd>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-500">Kategori</dt>
          <dd className="mt-1 font-medium text-slate-900">{category}</dd>
        </div>
        <div className="col-span-2 rounded-xl bg-slate-50 p-3">
          <dt className="text-xs uppercase tracking-wide text-slate-500">Varyasyon</dt>
          <dd className="mt-1 font-medium text-slate-900">{variantSummary}</dd>
        </div>
      </dl>
    </section>
  );
}