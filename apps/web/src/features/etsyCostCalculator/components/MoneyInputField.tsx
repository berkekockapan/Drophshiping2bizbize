import type { MoneyInput } from "../lib/types";

export function MoneyInputField({
  label,
  value,
  onChange,
  amountAriaLabel,
  currencyAriaLabel,
}: {
  label: string;
  value: MoneyInput;
  onChange: (value: MoneyInput) => void;
  amountAriaLabel?: string;
  currencyAriaLabel?: string;
}) {
  return (
    <label className="grid gap-2 text-sm text-slate-700">
      <span>{label}</span>
      <div className="grid grid-cols-[1fr_92px] gap-2">
        <input
          aria-label={amountAriaLabel ?? label}
          type="number"
          min={0}
          step="0.01"
          value={value.amount}
          onChange={(event) => onChange({ ...value, amount: Number(event.target.value) })}
          className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#F1641E]"
        />
        <select
          aria-label={currencyAriaLabel ?? `${label} para birimi`}
          value={value.currency}
          onChange={(event) => onChange({ ...value, currency: event.target.value as MoneyInput["currency"] })}
          className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#F1641E]"
        >
          <option value="USD">USD</option>
          <option value="TRY">TRY</option>
        </select>
      </div>
    </label>
  );
}
