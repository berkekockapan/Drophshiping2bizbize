interface ImportDutyCardProps {
  code: string | null;
  summary: string | null;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  helperHref: string;
}

export function ImportDutyCard({ code, summary, enabled, onToggle, helperHref }: ImportDutyCardProps) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">ABD Ithalat Vergisi</h2>
      {code ? (
        <>
          <p className="mt-3 text-sm text-slate-600">GTIP {code}</p>
          <p className="mt-1 text-sm font-medium text-slate-900">{summary ?? "Secili tarife ozeti bulunamadi."}</p>
          <label className="mt-4 flex items-center gap-3 text-sm text-slate-700">
            <input type="checkbox" checked={enabled} onChange={(event) => onToggle(event.target.checked)} />
            ABD ithalat vergisini dahil et
          </label>
        </>
      ) : (
        <p className="mt-3 text-sm text-slate-600">
          ABD vergi hesabi icin urun detayinda GTIP secimi yapabilirsiniz.{" "}
          <a className="font-medium text-[#F1641E]" href={helperHref}>
            Urun detayina git
          </a>
        </p>
      )}
    </section>
  );
}
