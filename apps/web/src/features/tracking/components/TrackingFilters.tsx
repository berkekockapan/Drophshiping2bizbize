import type { ProductCategory } from "../../../app/api";

interface TrackingFiltersProps {
  search: string;
  selectedCategoryId: string | "uncategorized" | null;
  categories: ProductCategory[];
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string | "uncategorized" | null) => void;
  onManageCategories: () => void;
}

export function TrackingFilters({
  search,
  selectedCategoryId,
  categories,
  onSearchChange,
  onCategoryChange,
  onManageCategories,
}: TrackingFiltersProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(240px,1fr)_auto] lg:items-end">
        <div>
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

        <div>
          <label className="block text-sm font-medium text-slate-600" htmlFor="tracking-category-filter">
            Kategori filtresi
          </label>
          <select
            id="tracking-category-filter"
            value={selectedCategoryId ?? ""}
            onChange={(event) =>
              onCategoryChange(event.target.value === "" ? null : (event.target.value as string | "uncategorized"))
            }
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#F1641E]"
          >
            <option value="">Tümü</option>
            <option value="uncategorized">Kategorisiz</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={onManageCategories}
          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700"
        >
          Kategori yönet
        </button>
      </div>
    </div>
  );
}
