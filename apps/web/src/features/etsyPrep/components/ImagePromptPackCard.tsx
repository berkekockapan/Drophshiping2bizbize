interface ImagePromptPackCardProps {
  mainPrompt: string;
  variations: string[];
  guardrailSummary: string[];
  snapshotMeta?: string | null;
  onCopyMain: () => void;
  onCopyVariations: () => void;
}

export function ImagePromptPackCard({
  mainPrompt,
  variations,
  guardrailSummary,
  snapshotMeta,
  onCopyMain,
  onCopyVariations,
}: ImagePromptPackCardProps) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-slate-400">Prompt Pack</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-900">Gorsel Prompt Pack</h3>
          <p className="mt-1 text-sm text-slate-600">
            Etsy thumbnail ve listing galerisi icin daha dikkat cekici, urun sadakatini koruyan sahne varyasyonlari.
          </p>
          {snapshotMeta ? <p className="mt-2 text-xs text-slate-500">{snapshotMeta}</p> : null}
          <p className="mt-1 text-sm text-slate-600">
            Referans gorseli manuel yukleyip bu promptu kullandiginiz aracta ayni urun kimligini koruyarak daha tiklanabilir Etsy sahneleri isteyin.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
            onClick={onCopyMain}
          >
            Ana Promptu Kopyala
          </button>
          <button
            type="button"
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
            onClick={onCopyVariations}
          >
            10 Varyasyonu Kopyala
          </button>
        </div>
      </div>

      <ul className="mt-4 space-y-2 text-xs text-slate-600">
        {guardrailSummary.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <pre className="mt-4 whitespace-pre-wrap rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
        {mainPrompt}
      </pre>

      <div className="mt-4 space-y-2">
        {variations.map((variation, index) => (
          <p key={`${index + 1}-${variation}`} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {index + 1}. {variation}
          </p>
        ))}
      </div>
    </section>
  );
}