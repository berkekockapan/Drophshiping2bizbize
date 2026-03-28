import { MoneyInputField } from "./MoneyInputField";
import type { CalculatorDraft } from "../lib/types";

export function QuickModeForm({
  draft,
  validationErrors,
  salePriceLabel,
  salePriceRequired,
  onChange,
}: {
  draft: CalculatorDraft;
  validationErrors: Record<string, string>;
  salePriceLabel: string;
  salePriceRequired: boolean;
  onChange: (patch: Partial<CalculatorDraft>) => void;
}) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">Hizli fiyat formu</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <MoneyInputField
          label="Urun maliyeti"
          value={draft.productCost}
          onChange={(value) => onChange({ productCost: value })}
        />
        <MoneyInputField
          label="Gercek kargo"
          value={draft.actualShippingCost}
          onChange={(value) => onChange({ actualShippingCost: value })}
        />
        <label className="grid gap-2 text-sm text-slate-700">
          Hedef kar modu
          <select
            aria-label="Hedef kar modu"
            value={draft.targetProfitMode}
            onChange={(event) => onChange({ targetProfitMode: event.target.value as CalculatorDraft["targetProfitMode"] })}
            className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#F1641E]"
          >
            <option value="margin_percent">% net kar</option>
            <option value="net_profit_usd">USD net kar</option>
            <option value="net_profit_try">TRY net kar</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm text-slate-700">
          Hedef kar degeri
          <input
            aria-label="Hedef kar degeri"
            aria-invalid={Boolean(validationErrors.targetProfitValue)}
            type="number"
            min={0}
            step="0.01"
            value={draft.targetProfitValue}
            onChange={(event) => onChange({ targetProfitValue: Number(event.target.value) })}
            className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#F1641E]"
          />
        </label>
      </div>

      <div className="mt-4">
        <label className="grid gap-2 text-sm text-slate-700">
          {salePriceLabel}
          <input
            aria-label={salePriceLabel}
            aria-required={salePriceRequired}
            aria-invalid={salePriceRequired && draft.salePriceUsd <= 0}
            type="number"
            min={0}
            step="0.01"
            value={draft.salePriceUsd > 0 ? draft.salePriceUsd : ""}
            onChange={(event) => onChange({ salePriceUsd: Number(event.target.value || 0) })}
            className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#F1641E]"
          />
        </label>
      </div>
    </section>
  );
}
