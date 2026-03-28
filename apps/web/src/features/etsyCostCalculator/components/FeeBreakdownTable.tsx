export function FeeBreakdownTable({
  rows,
}: {
  rows: Array<{ key: string; label: string; formattedUsd: string; formattedTry: string; badgeLabel: string; note?: string }>;
}) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">Fee breakdown</p>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm text-slate-700">
          <thead className="text-xs uppercase tracking-[0.2em] text-slate-400">
            <tr>
              <th className="pb-3">Kalem</th>
              <th className="pb-3">USD</th>
              <th className="pb-3">TRY</th>
              <th className="pb-3">Kaynak</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t border-slate-100 align-top">
                <td className="py-3">
                  <div className="font-medium text-slate-900">{row.label}</div>
                  {row.note ? <div className="mt-1 text-xs text-slate-500">{row.note}</div> : null}
                </td>
                <td className="py-3">{row.formattedUsd}</td>
                <td className="py-3">{row.formattedTry}</td>
                <td className="py-3">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{row.badgeLabel}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
