import { formatDateTime, type ProductDetailResponse } from "../../../app/api";

interface ChangeTimelineProps {
  items: ProductDetailResponse["changeTimeline"];
}

function formatRefreshSource(value: "MANUAL" | "SCHEDULED" | null) {
  if (value === "MANUAL") {
    return "Manuel";
  }

  if (value === "SCHEDULED") {
    return "Zamanlanmis";
  }

  return null;
}

export function ChangeTimeline({ items }: ChangeTimelineProps) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-slate-400">Takip Gecmisi</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Degisiklik Gecmisi</h2>
        </div>
        <p className="text-sm text-slate-500">{items.length} olay</p>
      </div>

      {items.length === 0 ? <p className="mt-5 text-sm text-slate-500">Henuz degisiklik kaydi yok.</p> : null}

      <div className="mt-5 space-y-3">
        {items.map((item) => {
          const refreshSource = formatRefreshSource(item.refreshSource);

          return (
            <article key={item.id} className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {refreshSource ? (
                      <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        {refreshSource}
                      </span>
                    ) : null}
                    {item.variantKey ? (
                      <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                        {item.variantKey}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{item.summary}</p>
                </div>
                <p className="text-xs text-slate-500">{formatDateTime(item.changedAt)}</p>
              </div>

              {item.details ? <p className="mt-3 text-sm text-slate-600">{item.details}</p> : null}

              {item.before || item.after ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl bg-white p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Once</p>
                    <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-slate-600">{item.before ?? "—"}</pre>
                  </div>
                  <div className="rounded-2xl bg-white p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Sonra</p>
                    <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-slate-700">{item.after ?? "—"}</pre>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
