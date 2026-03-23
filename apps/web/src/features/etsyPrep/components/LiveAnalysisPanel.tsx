import type { LiveAnalysisStep } from "../hooks/useEtsyPrepWorkspace";

interface LiveAnalysisPanelProps {
  status: "idle" | "running" | "completed" | "error";
  steps: LiveAnalysisStep[];
  error: string | null;
  summary: {
    title?: string;
    keywordAngles?: string[];
    audienceThemes?: string[];
    policyNotes?: string[];
  } | null;
  onRetry: () => void;
}

function statusLabel(status: LiveAnalysisPanelProps["status"]) {
  if (status === "running") {
    return "Analiz sürüyor";
  }

  if (status === "completed") {
    return "Analiz tamamlandı";
  }

  if (status === "error") {
    return "Analiz hatası";
  }

  return "Analiz bekleniyor";
}

function statusClassName(status: LiveAnalysisPanelProps["status"]) {
  if (status === "running") {
    return "bg-sky-100 text-sky-700";
  }

  if (status === "completed") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "error") {
    return "bg-rose-100 text-rose-700";
  }

  return "bg-slate-100 text-slate-600";
}

export function LiveAnalysisPanel({ status, steps, error, summary, onRetry }: LiveAnalysisPanelProps) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-slate-400">Canlı Analiz</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-900">Listing sinyalleri ve araştırma akışı</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClassName(status)}`}>
            {statusLabel(status)}
          </span>
          <button
            type="button"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300"
            onClick={onRetry}
          >
            Yeniden Analiz Et
          </button>
        </div>
      </div>

      {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}

      <div className="mt-5 space-y-3">
        {steps.length === 0 ? <p className="text-sm text-slate-500">Analiz sonuçları bekleniyor...</p> : null}
        {steps.map((step) => (
          <article key={step.id} className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900">{step.label}</p>
              <span
                className={[
                  "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                  step.status === "completed"
                    ? "bg-emerald-100 text-emerald-700"
                    : step.status === "error"
                      ? "bg-rose-100 text-rose-700"
                      : "bg-sky-100 text-sky-700",
                ].join(" ")}
              >
                {step.status === "completed" ? "Tamamlandı" : step.status === "error" ? "Hata" : "İşleniyor"}
              </span>
            </div>
            {step.detail ? <p className="mt-2 text-sm text-slate-600">{step.detail}</p> : null}
          </article>
        ))}
      </div>

      {summary ? (
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          <div className="rounded-3xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Başlık Odağı</p>
            <p className="mt-2 text-sm text-slate-700">{summary.title ?? "Kaynak ürün başlığı kullanılacak."}</p>
          </div>
          <div className="rounded-3xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Keyword Angles</p>
            <p className="mt-2 text-sm text-slate-700">{summary.keywordAngles?.join(", ") || "Henüz özet yok."}</p>
          </div>
          <div className="rounded-3xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Audience Themes</p>
            <p className="mt-2 text-sm text-slate-700">{summary.audienceThemes?.join(", ") || "Henüz özet yok."}</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
