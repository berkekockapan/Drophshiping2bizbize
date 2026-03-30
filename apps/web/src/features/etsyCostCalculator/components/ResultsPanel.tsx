import type { CalculatorDraft, CalculatorQuickTab, ScenarioResult, ScenarioSnapshot } from "../lib/types";

function formatUsd(value: number | null) {
  return value == null ? "-" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function formatTry(value: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(value);
}

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function resolveCouponUsd(productSubtotalUsd: number, draft: CalculatorDraft) {
  if (draft.coupon.type === "none") {
    return 0;
  }

  if (draft.coupon.type === "percent") {
    return round2(productSubtotalUsd * (draft.coupon.value / 100));
  }

  return round2(Math.min(draft.coupon.value, productSubtotalUsd));
}

function buildQuickModeRevenueMetrics(draft: CalculatorDraft, salePriceUsd: number | null) {
  const listedSalePriceUsd = salePriceUsd ?? draft.salePriceUsd;
  const discountedSalePriceUsd = round2(listedSalePriceUsd * (1 - draft.saleDiscountPercent / 100));
  const collectedShippingUsd = draft.freeShipping ? 0 : draft.buyerPaidShippingUsd;
  const collectedExtrasUsd = draft.buyerPaidExtrasUsd;
  const productRevenueUsd = round2(Math.max(0, discountedSalePriceUsd - resolveCouponUsd(discountedSalePriceUsd, draft)));
  const totalCollectedUsd = round2(productRevenueUsd + collectedShippingUsd + collectedExtrasUsd);

  return {
    listedSalePriceUsd,
    discountedSalePriceUsd,
    productRevenueUsd,
    collectedShippingUsd,
    collectedExtrasUsd,
    totalCollectedUsd,
  };
}

type ShipentegraScenarioSnapshot = ScenarioSnapshot & {
  shipentegraImportTotalUsd?: number;
};

function getBreakdownAmount(snapshot: ScenarioSnapshot | null, key: string) {
  return snapshot?.breakdown.find((row) => row.key === key)?.amountUsd ?? 0;
}

function getShipentegraImportTotalUsd(snapshot: ScenarioSnapshot | null) {
  return (snapshot as ShipentegraScenarioSnapshot | null)?.shipentegraImportTotalUsd ?? null;
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
  draft,
  recommendedSalePriceUsd,
  breakEvenPriceUsd,
  targetSafeListPriceUsd,
  recommendedScenario,
  enteredSalePriceUsd,
  enteredPriceScenario,
}: {
  activeTab: CalculatorQuickTab;
  draft: CalculatorDraft;
  recommendedSalePriceUsd: number | null;
  breakEvenPriceUsd: number | null;
  targetSafeListPriceUsd: number | null;
  recommendedScenario: ScenarioSnapshot | null;
  enteredSalePriceUsd: number;
  enteredPriceScenario: ScenarioSnapshot | null;
}) {
  const activeScenario = activeTab === "analyze_price" ? enteredPriceScenario ?? recommendedScenario : recommendedScenario;
  const displayedSalePriceUsd =
    activeTab === "analyze_price"
      ? enteredSalePriceUsd > 0
        ? enteredSalePriceUsd
        : recommendedSalePriceUsd
      : recommendedSalePriceUsd;
  const revenueMetrics = buildQuickModeRevenueMetrics(draft, displayedSalePriceUsd);
  const activeWarnings = activeScenario?.warnings ?? [];
  const actualShippingCostUsd = getBreakdownAmount(activeScenario, "actual_shipping_cost");
  const shipentegraImportTotalUsd = getShipentegraImportTotalUsd(activeScenario);

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">Sonuc paneli</p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <QuickStat label="Onerilen liste fiyati" value={formatUsd(recommendedSalePriceUsd)} />
        <QuickStat label="Indirim sonrasi satis fiyati" value={formatUsd(revenueMetrics.discountedSalePriceUsd)} />
        <QuickStat label="Basa bas liste fiyati" value={formatUsd(breakEvenPriceUsd)} />
        <QuickStat label="Tahmini net kar" value={formatUsd(activeScenario?.netProfitUsd ?? 0)} />
      </div>

      <div className="mt-4 rounded-2xl border border-slate-100 p-4 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">Toplam gider ozeti</p>
        <p className="mt-2">Toplam tahsilat: {formatUsd(revenueMetrics.totalCollectedUsd)}</p>
        <p>Urun geliri: {formatUsd(revenueMetrics.productRevenueUsd)}</p>
        <p>Gercek tasima maliyeti: {formatUsd(actualShippingCostUsd)}</p>
        {shipentegraImportTotalUsd != null ? <p>ShipEntegra ithalat masrafi: {formatUsd(shipentegraImportTotalUsd)}</p> : null}
        <p>Toplam Etsy ucreti: {formatUsd(activeScenario?.totalEtsyFeesUsd ?? 0)}</p>
        <p>Toplam operasyonel maliyet: {formatUsd(activeScenario?.totalOperationalCostsUsd ?? 0)}</p>
        <p>Toplam gider: {formatUsd((activeScenario?.totalOperationalCostsUsd ?? 0) + (activeScenario?.totalEtsyFeesUsd ?? 0))}</p>
      </div>

      {activeWarnings.length > 0 ? (
        <div className="mt-4 space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          {activeWarnings.map((warning) => (
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
        draft: CalculatorDraft;
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
