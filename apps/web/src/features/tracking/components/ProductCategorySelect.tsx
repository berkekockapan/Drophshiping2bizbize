import type { ProductCategory } from "../../../app/api";

interface ProductCategorySelectProps {
  label: string;
  categories: ProductCategory[];
  value: string | null;
  disabled?: boolean;
  inputId: string;
  onChange: (categoryId: string | null) => void;
}

export function ProductCategorySelect({
  label,
  categories,
  value,
  disabled = false,
  inputId,
  onChange,
}: ProductCategorySelectProps) {
  return (
    <label className="flex min-w-[220px] flex-col gap-1 text-sm text-slate-600" htmlFor={inputId}>
      <span>{label}</span>
      <select
        id={inputId}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value === "" ? null : event.target.value)}
        disabled={disabled}
        className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#F1641E] disabled:cursor-not-allowed disabled:bg-slate-100"
      >
        <option value="">Kategorisiz</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
    </label>
  );
}
