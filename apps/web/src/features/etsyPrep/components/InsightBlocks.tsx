interface InsightBlocksProps {
  seoNotes: string;
  policyNotes: string;
  riskNotes: string;
}

function ReadOnlyInsightCard({ title, value, fallback }: { title: string; value: string; fallback: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{value || fallback}</p>
    </div>
  );
}

export function InsightBlocks({ seoNotes, policyNotes, riskNotes }: InsightBlocksProps) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-slate-400">Insight Blokları</p>
        <h3 className="mt-2 text-xl font-semibold text-slate-900">SEO, uyum ve risk notları</h3>
      </div>

      <div className="mt-5 space-y-4">
        <ReadOnlyInsightCard
          title="SEO Notları"
          value={seoNotes}
          fallback="Analiz tamamlandığında SEO notları burada gösterilecek."
        />
        <ReadOnlyInsightCard
          title="Etsy Uyum Kontrolleri"
          value={policyNotes}
          fallback="Analiz tamamlandığında uyum notları burada gösterilecek."
        />
        <ReadOnlyInsightCard
          title="Eksik Veri / Riskler"
          value={riskNotes}
          fallback="Analiz tamamlandığında risk notları burada gösterilecek."
        />
      </div>
    </section>
  );
}
