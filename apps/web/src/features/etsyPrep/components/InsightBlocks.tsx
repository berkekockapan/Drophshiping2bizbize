interface InsightBlocksProps {
  seoNotes: string;
  policyNotes: string;
  riskNotes: string;
  onSeoNotesChange: (value: string) => void;
  onPolicyNotesChange: (value: string) => void;
}

export function InsightBlocks({
  seoNotes,
  policyNotes,
  riskNotes,
  onSeoNotesChange,
  onPolicyNotesChange,
}: InsightBlocksProps) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-slate-400">Insight Blokları</p>
        <h3 className="mt-2 text-xl font-semibold text-slate-900">SEO, uyum ve risk notları</h3>
      </div>

      <div className="mt-5 space-y-4">
        <label className="block text-sm text-slate-700">
          <span className="mb-2 block font-semibold text-slate-900">SEO Notları</span>
          <textarea
            aria-label="SEO Notları"
            className="min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-[#F1641E]"
            value={seoNotes}
            onChange={(event) => onSeoNotesChange(event.target.value)}
          />
        </label>

        <label className="block text-sm text-slate-700">
          <span className="mb-2 block font-semibold text-slate-900">Etsy Uyum Kontrolleri</span>
          <textarea
            aria-label="Etsy Uyum Kontrolleri"
            className="min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-[#F1641E]"
            value={policyNotes}
            onChange={(event) => onPolicyNotesChange(event.target.value)}
          />
        </label>

        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Eksik Veri / Riskler</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
            {riskNotes || "Analiz tamamlandığında risk notları burada gösterilecek."}
          </p>
        </div>
      </div>
    </section>
  );
}
