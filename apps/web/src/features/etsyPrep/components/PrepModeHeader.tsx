import { Link } from "react-router-dom";

interface PrepModeHeaderProps {
  isDirty: boolean;
  isSaving: boolean;
  saveMessage: string | null;
  saveError: string | null;
  connectorLabel: string | null;
  generationBlockedReason: string | null;
  onBack: () => void;
  onSave: () => void;
}

export function PrepModeHeader({
  isDirty,
  isSaving,
  saveMessage,
  saveError,
  connectorLabel,
  generationBlockedReason,
  onBack,
  onSave,
}: PrepModeHeaderProps) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-slate-400">Hazırlık</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Etsy Hazırlık Çalışma Alanı</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span
              className={[
                "inline-flex rounded-full px-3 py-1 font-semibold",
                isDirty ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700",
              ].join(" ")}
            >
              {isDirty ? "Kaydedilmemiş değişiklik var" : "Tüm değişiklikler kaydedildi"}
            </span>
            <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
              {connectorLabel ? `Aktif Bağlantı: ${connectorLabel}` : "Connector profili seçili değil"}
            </span>
          </div>

          {saveMessage ? <p className="text-sm font-medium text-emerald-700">{saveMessage}</p> : null}
          {saveError ? <p className="text-sm font-medium text-rose-600">{saveError}</p> : null}
          {generationBlockedReason ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p>{generationBlockedReason}</p>
              <Link className="mt-2 inline-flex font-semibold text-[#F1641E] hover:text-[#d95518]" to="/connections">
                AI Bağlantıları sayfasını aç
              </Link>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
            onClick={onBack}
          >
            Genel Bakışa Dön
          </button>
          <button
            type="button"
            className="rounded-2xl bg-[#051125] px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving || !isDirty}
            onClick={onSave}
          >
            {isSaving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>
    </section>
  );
}
