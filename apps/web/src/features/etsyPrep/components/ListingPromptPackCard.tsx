interface ListingPromptPackCardProps {
  prompt: string;
  rulebookVersion: string;
  snapshotMeta?: string | null;
  onCopy: () => void;
  onGenerate: () => void;
  copyMessage?: string | null;
  error?: string | null;
  provider?: string | null;
  isGenerating: boolean;
  generateDisabled: boolean;
}

export function ListingPromptPackCard({
  prompt,
  rulebookVersion,
  snapshotMeta,
  onCopy,
  onGenerate,
  copyMessage,
  error,
  provider,
  isGenerating,
  generateDisabled,
}: ListingPromptPackCardProps) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-slate-400">Prompt Pack</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-900">Listing Prompt Pack</h3>
          <p className="mt-1 text-sm text-slate-600">Tek prompt ile title, description ve tags uretir.</p>
          <p className="mt-2 text-xs text-slate-500">
            Rulebook: {rulebookVersion}
            {snapshotMeta ? ` • ${snapshotMeta}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
            onClick={onCopy}
          >
            Promptu Kopyala
          </button>
          <button
            type="button"
            className="rounded-2xl bg-[#F1641E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#d95518] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={generateDisabled || isGenerating}
            onClick={onGenerate}
          >
            {isGenerating ? "Uretiliyor..." : "AI ile Uret"}
          </button>
        </div>
      </div>

      {copyMessage ? <p className="mt-3 text-xs text-emerald-700">{copyMessage}</p> : null}
      {error ? <p className="mt-3 text-xs text-rose-600">{error}</p> : null}
      {provider ? <p className="mt-2 text-xs text-slate-500">Saglayici: {provider}</p> : null}

      <pre className="mt-4 max-h-80 overflow-auto whitespace-pre-wrap rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
        {prompt}
      </pre>
    </section>
  );
}
