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
          <p className="text-sm font-semibold text-slate-900">Resmi ucret profili</p>
          <p className="mt-1 text-sm text-slate-600">
            Türkiye saticisi icin USD listeleme ve TRY odeme modelindeki kur, para donusumu ve reklam secimlerini yonet.
          </p>
        </div>
        <button
          type="button"
          className="text-sm font-medium text-[#F1641E]"
          onClick={() => setAdvancedOpen((value) => !value)}
        >
          Gelismis ucret ayarlari
        </button>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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

        <label className="inline-flex items-start gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <input
            className="mt-1"
            type="checkbox"
            checked={draft.currencyConversionEnabled}
            onChange={(event) => onChange({ currencyConversionEnabled: event.target.checked })}
          />
          <span>
            <span className="block font-semibold text-slate-900">Para donusumunu dahil et (%2.5)</span>
            <span className="mt-1 block text-slate-600">
              Etsy satis/listing USD, odeme TRY hesaba geldigi icin varsayilan olarak aciktir; farkli bir kurulumda kapatabilirsiniz.
            </span>
          </span>
        </label>

        <label className="grid gap-2 text-sm text-slate-700">
          Site disi reklam modu
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

      {advancedOpen ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm text-slate-700">
            Islem ucreti (%)
            <input
              aria-label="Islem ucreti"
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
            Sabit islem ucreti (TRY)
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

