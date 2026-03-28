export function CalculatorHeader({
  saveState,
  saveErrorMessage,
  profileLabel,
}: {
  saveState: "idle" | "saving" | "saved" | "error";
  saveErrorMessage: string | null;
  profileLabel: string;
}) {
  const saveLabel =
    saveState === "saving"
      ? "Kaydediliyor..."
      : saveState === "saved"
        ? "Kaydedildi"
        : saveState === "error"
          ? "Kaydedilemedi"
          : "Degisiklikler hazir";

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Karar destegi</p>
      <h1 className="mt-3 text-3xl font-semibold text-slate-900">Etsy Maliyet Hesaplayici</h1>
      <p className="mt-2 text-sm text-slate-600">{profileLabel}</p>
      <p className="mt-4 text-sm font-medium text-slate-700">{saveLabel}</p>
      {saveErrorMessage ? <p className="mt-2 text-sm text-rose-600">{saveErrorMessage}</p> : null}
    </section>
  );
}
