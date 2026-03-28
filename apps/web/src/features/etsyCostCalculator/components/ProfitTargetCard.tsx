import { MoneyInputField } from "./MoneyInputField";
import type { CalculatorDraft } from "../lib/types";

export function ProfitTargetCard({
  draft,
  validationErrors,
  onChange,
}: {
  draft: CalculatorDraft;
  validationErrors: Record<string, string>;
  onChange: (patch: Partial<CalculatorDraft>) => void;
}) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">Genel gider ve hedef kar karti</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm text-slate-700">
          Hedef kar modu
          <select
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
            aria-invalid={Boolean(validationErrors.targetProfitValue)}
            type="number"
            min={0}
            step="0.01"
            value={draft.targetProfitValue}
            onChange={(event) => onChange({ targetProfitValue: Number(event.target.value) })}
            className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#F1641E]"
          />
        </label>
        <label className="grid gap-2 text-sm text-slate-700">
          Genel gider modu
          <select
            value={draft.overheadMode}
            onChange={(event) => onChange({ overheadMode: event.target.value as CalculatorDraft["overheadMode"] })}
            className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#F1641E]"
          >
            <option value="off">Kapali</option>
            <option value="per_order">Siparis basi sabit gider</option>
            <option value="allocated_total">Toplam gider / siparis adedi</option>
          </select>
        </label>
      </div>

      {draft.overheadMode === "per_order" ? (
        <div className="mt-4">
          <MoneyInputField
            label="Siparis basi genel gider"
            value={draft.overheadPerOrder}
            onChange={(value) => onChange({ overheadPerOrder: value })}
          />
        </div>
      ) : null}

      {draft.overheadMode === "allocated_total" ? (
        <div className="mt-4 space-y-4">
          <label className="grid gap-2 text-sm text-slate-700">
            Beklenen siparis adedi
            <input
              aria-invalid={Boolean(validationErrors.overheadExpectedOrderCount)}
              type="number"
              min={1}
              step="1"
              value={draft.overheadExpectedOrderCount}
              onChange={(event) => onChange({ overheadExpectedOrderCount: Number(event.target.value) })}
              className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#F1641E]"
            />
          </label>
        </div>
      ) : null}
    </section>
  );
}
