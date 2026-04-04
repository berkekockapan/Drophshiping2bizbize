import { Link } from "react-router-dom";

import type { SourceProductCategory } from "../../../app/api";
import type { OwnerKey } from "../../shared/lib/ownerRouteState";
import { SourceProductCategorySelect } from "./SourceProductCategorySelect";

interface SourceProductFiltersProps {
  ownerKey: OwnerKey;
  search: string;
  selectedCategoryId: string | "uncategorized" | null;
  categories: SourceProductCategory[];
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string | "uncategorized" | null) => void;
  onManageCategories: () => void;
}

export function SourceProductFilters({
  ownerKey,
  search,
  selectedCategoryId,
  categories,
  onSearchChange,
  onCategoryChange,
  onManageCategories,
}: SourceProductFiltersProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(240px,1fr)_auto_auto] lg:items-end">
        <div>
          <label className="block text-sm font-medium text-slate-600" htmlFor="source-products-search">
            Arama
          </label>
          <input
            id="source-products-search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Ürün, not veya URL ara"
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#F1641E]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600" htmlFor="source-products-category-filter">
            Kategori filtresi
          </label>
          <select
            id="source-products-category-filter"
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

        <Link
          to={`/owners/${ownerKey}/source-products/trash`}
          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm font-medium text-slate-700"
        >
          Çöp kutusu
        </Link>
      </div>
    </div>
  );
}
