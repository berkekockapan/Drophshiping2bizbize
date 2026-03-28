import type { EtsyCostCalculatorPreset } from "../lib/types";

export function PresetToolbar({
  presetName,
  activePresetId,
  presets,
  onPresetNameChange,
  onSavePreset,
  onLoadPreset,
  onUpdatePreset,
  onDeletePreset,
}: {
  presetName: string;
  activePresetId: string | null;
  presets: EtsyCostCalculatorPreset[];
  onPresetNameChange: (value: string) => void;
  onSavePreset: (name: string) => void;
  onLoadPreset: (presetId: string) => void;
  onUpdatePreset: () => void;
  onDeletePreset: (presetId: string) => void;
}) {
  return (
    <section aria-label="Hazir ayar araci" className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm font-semibold text-slate-900">Hazir ayar araci</p>
        <p className="mt-1 text-sm text-slate-600">Senaryolari kaydet, guncelle ve tekrar yukle.</p>
      </div>

      <label className="mt-4 flex flex-col gap-2 text-sm text-slate-700">
        Hazir ayar adi
        <input
          value={presetName}
          onChange={(event) => onPresetNameChange(event.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#F1641E]"
        />
      </label>

      <label className="mt-4 flex flex-col gap-2 text-sm text-slate-700">
        Kayitli hazir ayar
        <select
          aria-label="Kayitli hazir ayar"
          value={activePresetId ?? ""}
          onChange={(event) => onLoadPreset(event.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#F1641E]"
        >
          <option value="">Hazir ayar sec</option>
          {presets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-xl bg-[#051125] px-4 py-2 text-sm font-semibold text-white"
          onClick={() => onSavePreset(presetName)}
        >
          Hazir ayari kaydet
        </button>
        <button
          type="button"
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
          onClick={onUpdatePreset}
          disabled={!activePresetId}
        >
          Secili hazir ayari guncelle
        </button>
        <button
          type="button"
          className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700"
          onClick={() => activePresetId && onDeletePreset(activePresetId)}
          disabled={!activePresetId}
        >
          Hazir ayari sil
        </button>
      </div>
    </section>
  );
}
