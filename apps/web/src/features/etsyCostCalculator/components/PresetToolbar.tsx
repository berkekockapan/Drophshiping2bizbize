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
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm font-semibold text-slate-900">Preset araci</p>
        <p className="mt-1 text-sm text-slate-600">Senaryolari acikca kaydet, guncelle ve tekrar yukle.</p>
      </div>

      <label className="mt-4 flex flex-col gap-2 text-sm text-slate-700">
        Preset adi
        <input
          value={presetName}
          onChange={(event) => onPresetNameChange(event.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#F1641E]"
        />
      </label>

      <label className="mt-4 flex flex-col gap-2 text-sm text-slate-700">
        Kayitli preset
        <select
          aria-label="Kayitli preset"
          value={activePresetId ?? ""}
          onChange={(event) => onLoadPreset(event.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#F1641E]"
        >
          <option value="">Preset sec</option>
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
          Preset kaydet
        </button>
        <button
          type="button"
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
          onClick={onUpdatePreset}
          disabled={!activePresetId}
        >
          Mevcut preset'i guncelle
        </button>
        <button
          type="button"
          className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700"
          onClick={() => activePresetId && onDeletePreset(activePresetId)}
          disabled={!activePresetId}
        >
          Preset'i sil
        </button>
      </div>
    </section>
  );
}
