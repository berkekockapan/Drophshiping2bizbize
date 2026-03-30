import type { CalculatorQuickTab, ScenarioResult, ScenarioSnapshot } from "../lib/types";

function formatUsd(value: number | null) {
  return value == null ? "-" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function formatTry(value: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(value);
}

function LegacyResultsPanel({ result }: { result: ScenarioResult }) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">Sonuc paneli</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Net kar (USD)</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{formatUsd(result.netProfitUsd)}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Net kar (TRY)</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{formatTry(result.netProfitTry)}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm text-slate-700">
        <p>Net marj: %{result.netMarginPercent.toFixed(2)}</p>
        <p>Toplam Etsy ucreti: {formatUsd(result.totalEtsyFeesUsd)}</p>
        <p>Toplam operasyonel gider: {formatUsd(result.totalOperationalCostsUsd)}</p>
        <p>Basa bas fiyat: {formatUsd(result.breakEvenPriceUsd)}</p>
        <p>Kampanyali minimum guvenli fiyat: {formatUsd(result.targetSafeListPriceUsd)}</p>
      </div>

      {result.warnings.length > 0 ? (
        <div className="mt-4 space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          {result.warnings.map((warning) => (
            <p key={warning.key}>{warning.message}</p>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function QuickModeResultsPanel({
  activeTab,
  recommendedSalePriceUsd,
  breakEvenPriceUsd,
  targetSafeListPriceUsd,
  recommendedScenario,
  enteredPriceScenario,
}: {
  activeTab: CalculatorQuickTab;
  recommendedSalePriceUsd: number | null;
  breakEvenPriceUsd: number | null;
  targetSafeListPriceUsd: number | null;
  recommendedScenario: ScenarioSnapshot | null;
  enteredSalePriceUsd: number;
  enteredPriceScenario: ScenarioSnapshot | null;
}) {
  const activeScenario = activeTab === "analyze_price" ? enteredPriceScenario ?? recommendedScenario : recommendedScenario;

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">Sonuc paneli</p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <QuickStat label="Onerilen Etsy satis fiyati" value={formatUsd(recommendedSalePriceUsd)} />
        <QuickStat label="Indirimli liste fiyati" value={formatUsd(targetSafeListPriceUsd)} />
        <QuickStat label="Basa bas fiyat" value={formatUsd(breakEvenPriceUsd)} />
        <QuickStat label="Tahmini net kar" value={formatUsd(activeScenario?.netProfitUsd ?? 0)} />
      </div>

      <div className="mt-4 rounded-2xl border border-slate-100 p-4 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">Toplam gider ozeti</p>
        <p className="mt-2">Operasyonel toplam: {formatUsd(activeScenario?.totalOperationalCostsUsd ?? 0)}</p>
        <p>Etsy etkisi: {formatUsd(activeScenario?.totalEtsyFeesUsd ?? 0)}</p>
        <p>Toplam maliyet: {formatUsd((activeScenario?.totalOperationalCostsUsd ?? 0) + (activeScenario?.totalEtsyFeesUsd ?? 0))}</p>
      </div>

      {(recommendedScenario ?? enteredPriceScenario)?.warnings.length ? (
        <div className="mt-4 space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          {(recommendedScenario ?? enteredPriceScenario)?.warnings.map((warning) => (
            <p key={warning.key}>{warning.message}</p>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function ResultsPanel(
  props:
    | { result: ScenarioResult }
    | {
        activeTab: CalculatorQuickTab;
        recommendedSalePriceUsd: number | null;
        breakEvenPriceUsd: number | null;
        targetSafeListPriceUsd: number | null;
        recommendedScenario: ScenarioSnapshot | null;
        enteredSalePriceUsd: number;
        enteredPriceScenario: ScenarioSnapshot | null;
      },
) {
  return "result" in props ? <LegacyResultsPanel result={props.result} /> : <QuickModeResultsPanel {...props} />;
}
