import type { CalculatorQuickTab } from "../lib/types";

export function QuickModeToolbar({
  activeTab,
  badges,
  onTabChange,
  onOpenPresets,
  onOpenAdvanced,
}: {
  activeTab: CalculatorQuickTab;
  badges: string[];
  onTabChange: (tab: CalculatorQuickTab) => void;
  onOpenPresets: () => void;
  onOpenAdvanced: () => void;
}) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">Hizli mod</p>
          <p className="mt-1 text-sm text-slate-600">Hedef fiyat bul veya mevcut fiyatı analiz et.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {badges.map((badge) => (
            <span key={badge} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              {badge}
            </span>
          ))}
        </div>
      </div>

      <div role="tablist" aria-label="Hizli mod sekmeleri" className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "target_price"}
          className="rounded-xl border px-4 py-2 text-sm font-semibold"
          onClick={() => onTabChange("target_price")}
        >
          Hedef kar icin satis fiyati bul
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "analyze_price"}
          className="rounded-xl border px-4 py-2 text-sm font-semibold"
          onClick={() => onTabChange("analyze_price")}
        >
          Mevcut fiyati analiz et
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
          onClick={onOpenPresets}
        >
          Preset
        </button>
        <button
          type="button"
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
          onClick={onOpenAdvanced}
        >
          Gelismis ayarlar
        </button>
      </div>
    </section>
  );
}
