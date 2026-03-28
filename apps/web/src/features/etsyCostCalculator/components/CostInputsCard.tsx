import { MoneyInputField } from "./MoneyInputField";
import type { CalculatorDraft, CostLineInput } from "../lib/types";

function createCostLine(): CostLineInput {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `cost_${Date.now()}`,
    label: "",
    value: { amount: 0, currency: "USD" },
    enabled: true,
  };
}

export function CostInputsCard({
  draft,
  onChange,
  variant = "all",
}: {
  draft: CalculatorDraft;
  onChange: (patch: Partial<CalculatorDraft>) => void;
  variant?: "all" | "advanced-only";
}) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">Maliyet karti</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {variant === "all" ? (
          <MoneyInputField label="Urun maliyeti" value={draft.productCost} onChange={(value) => onChange({ productCost: value })} />
        ) : null}
        <MoneyInputField
          label="Gercek kargo maliyeti"
          value={draft.actualShippingCost}
          onChange={(value) => onChange({ actualShippingCost: value })}
        />
        <MoneyInputField
          label="Paketleme maliyeti"
          value={draft.packagingCost}
          onChange={(value) => onChange({ packagingCost: value })}
        />
        <MoneyInputField
          label="ShipEntegra operasyon maliyeti"
          value={draft.shipentegraOperationCost}
          onChange={(value) => onChange({ shipentegraOperationCost: value })}
        />
      </div>

      <div className="mt-6 space-y-4">
        {draft.customCosts.map((line, index) => (
          <div key={line.id} className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-[1fr_220px_120px_auto]">
            <label className="grid gap-2 text-sm text-slate-700">
              Ozel gider adi
              <input
                aria-label="Ozel gider adi"
                value={line.label}
                onChange={(event) => {
                  const customCosts = [...draft.customCosts];
                  customCosts[index] = { ...line, label: event.target.value };
                  onChange({ customCosts });
                }}
                className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#F1641E]"
              />
            </label>
            <MoneyInputField
              label="Ozel gider tutari"
              amountAriaLabel="Ozel gider tutari"
              currencyAriaLabel="Ozel gider para birimi"
              value={line.value}
              onChange={(value) => {
                const customCosts = [...draft.customCosts];
                customCosts[index] = { ...line, value };
                onChange({ customCosts });
              }}
            />
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={line.enabled}
                onChange={(event) => {
                  const customCosts = [...draft.customCosts];
                  customCosts[index] = { ...line, enabled: event.target.checked };
                  onChange({ customCosts });
                }}
              />
              Etkin
            </label>
            <button
              type="button"
              className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700"
              onClick={() => onChange({ customCosts: draft.customCosts.filter((item) => item.id !== line.id) })}
            >
              Gider satiri sil
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <button
          type="button"
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
          onClick={() => onChange({ customCosts: [...draft.customCosts, createCostLine()] })}
        >
          Gider satiri ekle
        </button>
      </div>
    </section>
  );
}
