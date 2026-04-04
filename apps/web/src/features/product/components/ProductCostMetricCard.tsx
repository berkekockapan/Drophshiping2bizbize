interface ProductCostMetricCardProps {
  title: string;
  value: string;
  note?: string | null;
}

export function ProductCostMetricCard({ title, value, note }: ProductCostMetricCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      {note ? <p className="mt-2 text-sm text-slate-600">{note}</p> : null}
    </article>
  );
}
