import type { ProductTariffRecommendation } from "../../../app/api";

interface TariffRecommendationCardProps {
  recommendation: ProductTariffRecommendation;
  onSelect: (recommendation: ProductTariffRecommendation) => void;
  onSubmitCandidate: (recommendation: ProductTariffRecommendation) => void;
}

export function TariffRecommendationCard({
  recommendation,
  onSelect,
  onSubmitCandidate,
}: TariffRecommendationCardProps) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">GTIP / HS</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">{recommendation.canonicalHs6}</h3>
          <p className="mt-1 text-sm text-slate-600">{recommendation.title}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {recommendation.sourceBadges.map((badge) => (
            <span key={badge} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
              {badge}
            </span>
          ))}
        </div>
      </div>

      <p className="mt-3 text-sm text-slate-600">{recommendation.rationale}</p>
      <p className="mt-2 text-sm font-medium text-slate-900">{recommendation.dutySummary}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-xl bg-[#F1641E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#d95518]"
          onClick={() => onSelect(recommendation)}
        >
          Bu kodu sec
        </button>
        <button
          type="button"
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
          onClick={() => onSubmitCandidate(recommendation)}
        >
          Ortak bilgiye aday yap
        </button>
      </div>
    </article>
  );
}
