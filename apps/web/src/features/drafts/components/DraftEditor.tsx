import { useEffect, useMemo, useState } from "react";

export interface DraftEditorState {
  englishTitle: string;
  shortDescription: string;
  longDescription: string;
}

interface DraftEditorProps {
  initialValue?: Partial<DraftEditorState>;
  generatedTitle?: string | null;
  isGeneratingTitle?: boolean;
  isSaving?: boolean;
  connectorOnline?: boolean;
  disabled?: boolean;
  onGenerateTitle?: () => void;
  onSave?: (state: DraftEditorState) => void;
  onMetaChange?: (meta: { manualEditsPresent: boolean; allowOverwrite: boolean }) => void;
}

export function DraftEditor({
  initialValue,
  generatedTitle,
  isGeneratingTitle = false,
  isSaving = false,
  connectorOnline = true,
  disabled = false,
  onGenerateTitle,
  onSave,
  onMetaChange,
}: DraftEditorProps) {
  const [state, setState] = useState<DraftEditorState>({
    englishTitle: initialValue?.englishTitle ?? "",
    shortDescription: initialValue?.shortDescription ?? "",
    longDescription: initialValue?.longDescription ?? "",
  });
  const [manualEditsPresent, setManualEditsPresent] = useState(false);
  const [allowOverwrite, setAllowOverwrite] = useState(true);

  useEffect(() => {
    if (generatedTitle == null) {
      return;
    }

    setState((current) => ({
      ...current,
      englishTitle: generatedTitle,
    }));
  }, [generatedTitle]);

  useEffect(() => {
    onMetaChange?.({ manualEditsPresent, allowOverwrite });
  }, [allowOverwrite, manualEditsPresent, onMetaChange]);

  const helperText = useMemo(() => {
    if (!manualEditsPresent) {
      return "Henüz manuel düzenleme yok";
    }

    return "Manuel düzenleme var";
  }, [manualEditsPresent]);

  function updateField(field: keyof DraftEditorState, value: string) {
    setState((current) => ({
      ...current,
      [field]: value,
    }));

    if (!manualEditsPresent) {
      setManualEditsPresent(true);
    }
    if (allowOverwrite) {
      setAllowOverwrite(false);
    }
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Etsy Taslak Editörü</h2>
        <span className={`text-xs font-semibold ${manualEditsPresent ? "text-amber-600" : "text-slate-500"}`}>
          {helperText}
        </span>
      </div>

      <div className="mt-4 space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex min-w-[16rem] flex-1 flex-col gap-2 text-sm text-slate-700">
            English Title
            <input
              aria-label="English Title"
              className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#F1641E]"
              value={state.englishTitle}
              disabled={disabled}
              onChange={(event) => updateField("englishTitle", event.target.value)}
            />
          </label>

          <button
            type="button"
            className="rounded-xl bg-[#F1641E] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={disabled || !connectorOnline || isGeneratingTitle}
            onClick={onGenerateTitle}
          >
            {isGeneratingTitle ? "Üretiliyor..." : "Başlık Üret"}
          </button>

          <button
            type="button"
            className="rounded-xl bg-[#051125] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={disabled || isSaving || !onSave}
            onClick={() => onSave?.(state)}
          >
            {isSaving ? "Kaydediliyor..." : "Taslağı Kaydet"}
          </button>
        </div>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Short Description
          <textarea
            aria-label="Short Description"
            className="min-h-20 rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#F1641E]"
            value={state.shortDescription}
            disabled={disabled}
            onChange={(event) => updateField("shortDescription", event.target.value)}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Long Description
          <textarea
            aria-label="Long Description"
            className="min-h-28 rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#F1641E]"
            value={state.longDescription}
            disabled={disabled}
            onChange={(event) => updateField("longDescription", event.target.value)}
          />
        </label>

        <label className="inline-flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={allowOverwrite}
            onChange={(event) => setAllowOverwrite(event.target.checked)}
            disabled={manualEditsPresent || disabled}
          />
          Sessiz üzerine yazmaya izin ver
        </label>
      </div>
    </section>
  );
}
