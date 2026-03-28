import { useMemo, useState } from "react";

import { ETSY_TR_DEFAULT_FEE_PROFILE } from "../lib/defaults";
import type { CalculatorDraft } from "../lib/types";

export function FeeProfileCard({
  draft,
  validationErrors,
  onChange,
  onResetFeeProfileOverrides,
}: {
  draft: CalculatorDraft;
  validationErrors: Record<string, string>;
  onChange: (patch: Partial<CalculatorDraft>) => void;
  onResetFeeProfileOverrides: () => void;
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const effectiveProfile = useMemo(
    () => ({ ...ETSY_TR_DEFAULT_FEE_PROFILE, ...(draft.feeProfileOverrides ?? {}) }),
    [draft.feeProfileOverrides],
  );

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Resmi fee profili</p>
          <p className="mt-1 text-sm text-slate-600">Kur, VAT modu, conversion ve ads secimlerini burada yonet.</p>
        </div>
        <button
          type="button"
          className="text-sm font-medium text-[#F1641E]"
          onClick={() => setAdvancedOpen((value) => !value)}
        >
          Gelismis fee ayarlari
        </button>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="grid gap-2 text-sm text-slate-700">
          USD/TRY kuru
          <input
            aria-invalid={Boolean(validationErrors.usdTryRate)}
            type="number"
            min={0}
            step="0.01"
            value={draft.usdTryRate}
            onChange={(event) => onChange({ usdTryRate: Number(event.target.value) })}
            className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#F1641E]"
          />
        </label>

        <label className="grid gap-2 text-sm text-slate-700">
          VAT modu
          <select
            value={draft.vatMode}
            onChange={(event) => onChange({ vatMode: event.target.value as CalculatorDraft["vatMode"] })}
            className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#F1641E]"
          >
            <option value="no_vat_id">VAT ID yok</option>
            <option value="vat_id_provided">VAT ID var</option>
          </select>
        </label>

        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={draft.currencyConversionEnabled}
            onChange={(event) => onChange({ currencyConversionEnabled: event.target.checked })}
          />
          Currency conversion dahil et
        </label>

        <label className="grid gap-2 text-sm text-slate-700">
          Offsite Ads modu
          <select
            value={draft.offsiteAdsMode}
            onChange={(event) => onChange({ offsiteAdsMode: event.target.value as CalculatorDraft["offsiteAdsMode"] })}
            className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#F1641E]"
          >
            <option value="off">Kapali</option>
            <option value="rate_12">%12</option>
            <option value="rate_15">%15</option>
          </select>
        </label>
      </div>

      <label className="mt-4 inline-flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={draft.includeDepositFee}
          onChange={(event) => onChange({ includeDepositFee: event.target.checked })}
        />
        Bu senaryoda deposit fee'yi dahil et
      </label>

      {advancedOpen ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm text-slate-700">
            Transaction fee (%)
            <input
              aria-label="Transaction fee"
              type="number"
              min={0}
              step="0.01"
              value={effectiveProfile.transactionFeeRate * 100}
              onChange={(event) =>
                onChange({
                  feeProfileOverrides: {
                    ...(draft.feeProfileOverrides ?? {}),
                    transactionFeeRate: Number(event.target.value) / 100,
                  },
                })
              }
              className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#F1641E]"
            />
          </label>
          <label className="grid gap-2 text-sm text-slate-700">
            Processing fixed (TRY)
            <input
              type="number"
              min={0}
              step="0.01"
              value={effectiveProfile.processingFixedTry}
              onChange={(event) =>
                onChange({
                  feeProfileOverrides: {
                    ...(draft.feeProfileOverrides ?? {}),
                    processingFixedTry: Number(event.target.value),
                  },
                })
              }
              className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#F1641E]"
            />
          </label>
        </div>
      ) : null}

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
          onClick={onResetFeeProfileOverrides}
        >
          Varsayilan ayarlara don
        </button>
      </div>
    </section>
  );
}

