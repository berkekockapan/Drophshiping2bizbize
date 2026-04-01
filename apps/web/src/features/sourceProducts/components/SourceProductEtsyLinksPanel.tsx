import { useState } from "react";
import type { SourceProductEtsyLink } from "@trendyol-etsy/shared";

interface SourceProductEtsyLinksPanelProps {
  etsyLinks: SourceProductEtsyLink[];
  isAdding: boolean;
  isDeleting: boolean;
  error: string | null;
  onAdd: (etsyUrl: string) => void;
  onDelete: (etsyLink: SourceProductEtsyLink) => void;
}

export function SourceProductEtsyLinksPanel({
  etsyLinks,
  isAdding,
  isDeleting,
  error,
  onAdd,
  onDelete,
}: SourceProductEtsyLinksPanelProps) {
  const [etsyUrl, setEtsyUrl] = useState("");

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Etsy eslestirmesi</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-900">Etsy linkleri</h3>
        </div>
      </div>

      <form
        className="mt-5 flex flex-col gap-3 lg:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          const trimmed = etsyUrl.trim();
          if (!trimmed) {
            return;
          }

          onAdd(trimmed);
          setEtsyUrl("");
        }}
      >
        <label className="flex-1 space-y-2 text-sm font-medium text-slate-700">
          <span>Yeni Etsy linki</span>
          <input
            value={etsyUrl}
            onChange={(event) => setEtsyUrl(event.target.value)}
            placeholder="https://www.etsy.com/listing/..."
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#F1641E]"
          />
        </label>
        <button
          type="submit"
          className="self-end rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {isAdding ? "Ekleniyor..." : "Etsy linkini ekle"}
        </button>
      </form>

      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}

      <div className="mt-6 space-y-3">
        {etsyLinks.length ? (
          etsyLinks.map((etsyLink) => (
            <article key={etsyLink.id} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <a
                    href={etsyLink.etsyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-sm font-medium text-slate-900 underline decoration-slate-300 underline-offset-4"
                  >
                    {etsyLink.etsyListingId ?? etsyLink.etsyUrl}
                  </a>
                  <p className="mt-2 break-all text-xs text-slate-500">{etsyLink.etsyUrl}</p>
                </div>
                <button
                  type="button"
                  className="rounded-2xl border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isDeleting}
                  aria-label={`Etsy linkini sil: ${etsyLink.etsyListingId ?? etsyLink.etsyUrl}`}
                  onClick={() => onDelete(etsyLink)}
                >
                  Sil
                </button>
              </div>
            </article>
          ))
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
            Henüz bağlı Etsy linki yok.
          </p>
        )}
      </div>
    </section>
  );
}
