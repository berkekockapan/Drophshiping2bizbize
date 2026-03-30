export function HelpTooltip({ label, description }: { label: string; description: string }) {
  const tooltipId = `help-${label.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase()}`;

  return (
    <span className="group relative inline-flex items-center">
      <button
        type="button"
        aria-label="Yardim"
        aria-describedby={tooltipId}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-xs font-semibold text-slate-600"
      >
        ?
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 hidden w-56 -translate-x-1/2 rounded-xl bg-slate-900 px-3 py-2 text-xs text-white group-hover:block"
      >
        {description}
      </span>
    </span>
  );
}
