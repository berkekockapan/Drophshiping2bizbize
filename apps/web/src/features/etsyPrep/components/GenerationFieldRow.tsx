interface GenerationFieldRowProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onGenerate: () => void;
  generateLabel: string;
  isGenerating: boolean;
  disabled?: boolean;
  helperText?: string | null;
  error?: string | null;
  multiline?: boolean;
  placeholder?: string;
}

export function GenerationFieldRow({
  label,
  value,
  onChange,
  onGenerate,
  generateLabel,
  isGenerating,
  disabled = false,
  helperText,
  error,
  multiline = false,
  placeholder,
}: GenerationFieldRowProps) {
  const baseInputClassName =
    "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-[#F1641E]";

  return (
    <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{label}</p>
          {helperText ? <p className="mt-1 text-xs text-slate-500">{helperText}</p> : null}
          {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
        </div>
        <button
          type="button"
          className="rounded-2xl bg-[#F1641E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#d95518] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled || isGenerating}
          onClick={onGenerate}
        >
          {isGenerating ? "Üretiliyor..." : generateLabel}
        </button>
      </div>

      <div className="mt-4">
        {multiline ? (
          <label className="block text-sm text-slate-700">
            <span className="sr-only">{label}</span>
            <textarea
              aria-label={label}
              className={`${baseInputClassName} min-h-28`}
              value={value}
              disabled={disabled}
              placeholder={placeholder}
              onChange={(event) => onChange(event.target.value)}
            />
          </label>
        ) : (
          <label className="block text-sm text-slate-700">
            <span className="sr-only">{label}</span>
            <input
              aria-label={label}
              className={baseInputClassName}
              value={value}
              disabled={disabled}
              placeholder={placeholder}
              onChange={(event) => onChange(event.target.value)}
            />
          </label>
        )}
      </div>
    </article>
  );
}
