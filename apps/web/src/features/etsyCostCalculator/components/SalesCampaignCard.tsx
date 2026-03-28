import type { CalculatorDraft } from "../lib/types";

export function SalesCampaignCard({
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
      <p className="text-sm font-semibold text-slate-900">Satis ve kampanya karti</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm text-slate-700">
          Liste fiyati (USD)
          <input
            aria-invalid={Boolean(validationErrors.salePriceUsd)}
            type="number"
            min={0}
            step="0.01"
            value={draft.salePriceUsd}
            onChange={(event) => onChange({ salePriceUsd: Number(event.target.value) })}
            className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#F1641E]"
          />
        </label>
        <label className="grid gap-2 text-sm text-slate-700">
          Musteriden alinan kargo (USD)
          <input
            type="number"
            min={0}
            step="0.01"
            value={draft.buyerPaidShippingUsd}
            onChange={(event) => onChange({ buyerPaidShippingUsd: Number(event.target.value) })}
            className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#F1641E]"
          />
        </label>
        <label className="grid gap-2 text-sm text-slate-700">
          Yuzdesel indirim (%)
          <input
            aria-invalid={Boolean(validationErrors.saleDiscountPercent)}
            type="number"
            min={0}
            step="0.01"
            value={draft.saleDiscountPercent}
            onChange={(event) => onChange({ saleDiscountPercent: Number(event.target.value) })}
            className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#F1641E]"
          />
        </label>
        <label className="grid gap-2 text-sm text-slate-700">
          Kupon modu
          <select
            value={draft.coupon.type}
            onChange={(event) =>
              onChange({ coupon: { ...draft.coupon, type: event.target.value as CalculatorDraft["coupon"]["type"] } })
            }
            className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#F1641E]"
          >
            <option value="none">Yok</option>
            <option value="percent">Yuzde</option>
            <option value="fixed_usd">Sabit USD</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm text-slate-700">
          Kupon degeri
          <input
            type="number"
            min={0}
            step="0.01"
            value={draft.coupon.value}
            onChange={(event) => onChange({ coupon: { ...draft.coupon, value: Number(event.target.value) } })}
            className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#F1641E]"
          />
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={draft.freeShipping}
            onChange={(event) => onChange({ freeShipping: event.target.checked })}
          />
          Ucretsiz kargo
        </label>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm text-slate-700">
          Musteriden alinan ek bedeller (USD)
          <input
            type="number"
            min={0}
            step="0.01"
            value={draft.buyerPaidExtrasUsd}
            onChange={(event) => onChange({ buyerPaidExtrasUsd: Number(event.target.value) })}
            className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#F1641E]"
          />
        </label>
        <label className="grid gap-2 text-sm text-slate-700">
          Etsy tarafindan tahsil edilen musteri vergisi (USD)
          <input
            type="number"
            min={0}
            step="0.01"
            value={draft.buyerTaxCollectedByEtsyUsd}
            onChange={(event) => onChange({ buyerTaxCollectedByEtsyUsd: Number(event.target.value) })}
            className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#F1641E]"
          />
        </label>
      </div>
    </section>
  );
}
