import { MoneyInputField } from "./MoneyInputField";
import type { CalculatorDraft, ScenarioSnapshot } from "../lib/types";
import { HelpTooltip } from "./HelpTooltip";

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export function QuickModeForm({
  draft,
  shipentegraPreview,
  validationErrors,
  salePriceLabel,
  salePriceRequired,
  onChange,
}: {
  draft: CalculatorDraft;
  shipentegraPreview: ScenarioSnapshot | null;
  validationErrors: Record<string, string>;
  salePriceLabel: string;
  salePriceRequired: boolean;
  onChange: (patch: Partial<CalculatorDraft>) => void;
}) {
  const shipentegraSummary =
    draft.destinationProfile === "US"
      ? {
          basisUsd: shipentegraPreview?.shipentegraImportBasisUsd ?? shipentegraPreview?.dutyBaseUsd ?? 0,
          dutyUsd: shipentegraPreview?.shipentegraDutyUsd ?? 0,
          totalUsd: shipentegraPreview?.shipentegraImportTotalUsd ?? 0,
        }
      : null;

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">Hizli fiyat formu</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {([
          ["US", "ABD hedef profili"],
          ["OTHER", "Diger hedef profili"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={draft.destinationProfile === value}
            className={
              draft.destinationProfile === value
                ? "rounded-full bg-[#F1641E] px-4 py-2 text-sm font-semibold text-white"
                : "rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
            }
            onClick={() => onChange({ destinationProfile: value })}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm text-slate-700">
          <span className="inline-flex items-center gap-2">
            USD/TRY kuru
            <HelpTooltip label="USD/TRY kuru" description="Maliyetlerin TRY ve USD donusumunde kullanilan kur." />
          </span>
          <input
            aria-label="USD/TRY kuru"
            aria-invalid={Boolean(validationErrors.usdTryRate)}
            type="number"
            min={0}
            step="0.01"
            value={draft.usdTryRate}
            onChange={(event) => onChange({ usdTryRate: Number(event.target.value) })}
            className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#F1641E]"
          />
        </label>

        {draft.destinationProfile === "US" ? (
          <>
            <label className="grid gap-2 text-sm text-slate-700">
              <span className="inline-flex items-center gap-2">
                Manuel ithalat vergisi orani (%)
                <HelpTooltip
                  label="Manuel ithalat vergisi orani"
                  description="ShipEntegra'dan veya HTS/GTIP analizinden aldiginiz gercek ABD duty/tariff oranini girin. ShipEntegra kargo tutarina bu vergi zaten dahilse 0 girin; aksi halde sistem bu orani urun net satis geliri uzerinden maliyete ekler."
                />
              </span>
              <input
                aria-label="Manuel ithalat vergisi orani (%)"
                aria-invalid={Boolean(validationErrors.manualDutyPercent)}
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={draft.manualDutyPercent}
                onChange={(event) => onChange({ manualDutyPercent: Number(event.target.value) })}
                className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#F1641E]"
              />
            </label>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">ABD ithalat vergisi onizlemesi</p>
              <p className="mt-2">Matrah (liste fiyati - indirim - kupon): {formatUsd(shipentegraSummary?.basisUsd ?? 0)}</p>
              <p>Manuel duty tutari: {formatUsd(shipentegraSummary?.dutyUsd ?? 0)}</p>
              <p className="font-medium text-slate-900">Tahmini ithalat vergisi: {formatUsd(shipentegraSummary?.totalUsd ?? 0)}</p>
              <p className="mt-2 text-xs text-slate-600">
                ShipEntegra veya HTS/GTIP analizinden aldiginiz gercek duty/tariff oranini kullanin. Kargo tutarina bu vergi
                zaten dahilse orani 0 girin; kargo, Etsy fee ve sales tax bu matraha dahil edilmez.
              </p>
            </div>
          </>
        ) : null}

        <label className="grid gap-2 text-sm text-slate-700">
          <span className="inline-flex items-center gap-2">
            İndirim %
            <HelpTooltip
              label="İndirim"
              description="Liste fiyatına uygulanacak kampanya indirimi. Örnek: %30 indirim."
            />
          </span>
          <input
            aria-label="İndirim %"
            aria-invalid={Boolean(validationErrors.saleDiscountPercent)}
            type="number"
            min={0}
            max={99.99}
            step="0.01"
            value={draft.saleDiscountPercent}
            onChange={(event) => onChange({ saleDiscountPercent: Number(event.target.value) })}
            className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#F1641E]"
          />
        </label>

        <label className="grid gap-2 text-sm text-slate-700">
          <span className="inline-flex items-center gap-2">
            Alıcıdan alınan kargo (USD)
            <HelpTooltip
              label="Buyer shipping"
              description="Müşteriden ayrıca tahsil edilen kargo tutarı. Hedef fiyat hesabına eklenir."
            />
          </span>
          <input
            aria-label="Alıcıdan alınan kargo (USD)"
            type="number"
            min={0}
            step="0.01"
            value={draft.buyerPaidShippingUsd}
            onChange={(event) => onChange({ buyerPaidShippingUsd: Number(event.target.value) })}
            className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#F1641E]"
          />
        </label>

        <label className="grid gap-2 text-sm text-slate-700">
          <span className="inline-flex items-center gap-2">
            Ekstra tahsilat (USD)
            <HelpTooltip
              label="Ekstra tahsilat"
              description="Ürün bedeline ek olarak müşteriden alınan ekstra tutar. Hedef kar çözümünde dikkate alınır."
            />
          </span>
          <input
            aria-label="Ekstra tahsilat (USD)"
            type="number"
            min={0}
            step="0.01"
            value={draft.buyerPaidExtrasUsd}
            onChange={(event) => onChange({ buyerPaidExtrasUsd: Number(event.target.value) })}
            className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#F1641E]"
          />
        </label>

        <MoneyInputField
          label="Urun maliyeti"
          value={draft.productCost}
          onChange={(value) => onChange({ productCost: value })}
        />
        <MoneyInputField
          label="ShipEntegra kargo maliyeti"
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
