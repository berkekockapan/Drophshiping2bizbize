import type { PropsWithChildren } from "react";

export function AdvancedSettingsDrawer({
  open,
  onClose,
  children,
}: PropsWithChildren<{
  open: boolean;
  onClose: () => void;
}>) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-30 bg-slate-950/40">
      <div className="absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto bg-white p-6 shadow-2xl">
        <div role="dialog" aria-label="Gelismis ayarlar" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-semibold text-slate-900">Gelismis ayarlar</p>
            <button
              type="button"
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
              onClick={onClose}
            >
              Gelismis ayarlari kapat
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
