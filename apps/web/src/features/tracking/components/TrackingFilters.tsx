interface TrackingFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
}

export function TrackingFilters({ search, onSearchChange }: TrackingFiltersProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <label className="block text-sm font-medium text-slate-600" htmlFor="tracking-search">
        Arama
      </label>
      <input
        id="tracking-search"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Ürün veya marka ara"
        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#F1641E]"
      />
    </div>
  );
}
