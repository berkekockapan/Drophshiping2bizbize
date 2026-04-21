import { useEffect, useState } from "react";

interface AiTargetConfigPanelProps {
  initialValue: {
    baseUrl: string;
  };
  pending?: boolean;
  onSubmit: (payload: {
    baseUrl: string;
  }) => void;
}

export function AiTargetConfigPanel({ initialValue, pending = false, onSubmit }: AiTargetConfigPanelProps) {
  const [baseUrl, setBaseUrl] = useState(initialValue.baseUrl);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setBaseUrl(initialValue.baseUrl);
  }, [initialValue.baseUrl]);

  return (
    <details
      open={isOpen}
      onToggle={(event) => setIsOpen((event.currentTarget as HTMLDetailsElement).open)}
      className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm"
    >
      <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">
        Gelişmiş Ayarlar
      </summary>

      {isOpen ? (
        <form
          className="mt-4 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit({
              baseUrl,
            });
          }}
        >
          <p className="text-sm text-slate-600">
            Bu alan yalnızca masaüstü bağlantı servisi için manuel override veya hata ayıklama gerektiğinde kullanılır.
          </p>

          <label className="flex flex-col gap-2 text-sm text-slate-700">
            Bağlantı Servisi URL
            <input
              type="url"
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#F1641E]"
              placeholder="http://127.0.0.1:4318"
            />
          </label>

          <div>
            <button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-[#051125] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {pending ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </form>
      ) : null}
    </details>
  );
}

