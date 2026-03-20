interface StatusBadgeProps {
  status: string;
}

const statusMap: Record<string, string> = {
  OK: "bg-emerald-100 text-emerald-700",
  ACTIVE: "bg-sky-100 text-sky-700",
  REVIEW_NEEDED: "bg-amber-100 text-amber-700",
  PARSE_ERROR: "bg-rose-100 text-rose-700",
  IN_STOCK: "bg-emerald-100 text-emerald-700",
  OUT_OF_STOCK: "bg-rose-100 text-rose-700",
  warning: "bg-amber-100 text-amber-700",
  info: "bg-sky-100 text-sky-700",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusMap[status] ?? "bg-slate-100 text-slate-700"}`}>
      {status}
    </span>
  );
}
