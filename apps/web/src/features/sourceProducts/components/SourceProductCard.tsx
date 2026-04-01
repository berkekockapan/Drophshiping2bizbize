import { Link } from "react-router-dom";
import type { SourceProductSummary } from "@trendyol-etsy/shared";

import type { OwnerKey } from "../../shared/lib/ownerRouteState";

interface SourceProductCardProps {
  ownerKey: OwnerKey;
  item: SourceProductSummary;
}

function formatDateTime(value: number) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function platformLabel(value: SourceProductSummary["sourcePlatform"]) {
  switch (value) {
    case "SHOPIER":
      return "Shopier";
    case "CUSTOM_SITE":
      return "Kendi sitesi";
    default:
      return "Diger";
  }
}

export function SourceProductCard({ ownerKey, item }: SourceProductCardProps) {
  const href = `/owners/${ownerKey}/source-products/${item.id}`;
  const title = item.sourceTitle || "Basliksiz kaynak urun";

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-600">
                {platformLabel(item.sourcePlatform)}
              </span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                {item.etsyLinkCount} Etsy link
              </span>
            </div>
            <h3 className="text-lg font-semibold text-slate-900">
              <Link to={href} className="transition hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300">
                {title}
              </Link>
            </h3>
            <p className="break-all text-sm text-slate-500">{item.sourceUrl}</p>
          </div>

          <a
            href={item.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Kaynak linki aç
          </a>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Not</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">{item.notePreview ?? "Not yok"}</p>
        </div>

        <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
          <span>Güncellendi: {formatDateTime(item.updatedAt)}</span>
          <Link to={href} className="font-medium text-slate-700 transition hover:text-slate-900">
            Detaya git →
          </Link>
        </div>
      </div>
    </article>
  );
}
