import { useEffect, useState } from "react";

interface AiTargetConfigPanelProps {
  initialValue: {
    baseUrl: string;
    label: string;
    managementKey: string;
    apiKey: string;
  };
  pending?: boolean;
  onSubmit: (payload: {
    baseUrl: string;
    label: string;
    managementKey: string;
    apiKey: string;
  }) => void;
}

export function AiTargetConfigPanel({ initialValue, pending = false, onSubmit }: AiTargetConfigPanelProps) {
  const [baseUrl, setBaseUrl] = useState(initialValue.baseUrl);
  const [label, setLabel] = useState(initialValue.label);
  const [managementKey, setManagementKey] = useState(initialValue.managementKey);
  const [apiKey, setApiKey] = useState(initialValue.apiKey);

  useEffect(() => {
    setBaseUrl(initialValue.baseUrl);
    setLabel(initialValue.label);
    setManagementKey(initialValue.managementKey);
    setApiKey(initialValue.apiKey);
  }, [initialValue.apiKey, initialValue.baseUrl, initialValue.label, initialValue.managementKey]);

  return (
    <form
      className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          baseUrl,
          label,
          managementKey,
          apiKey,
        });
      }}
    >
      <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Target Settings</p>
      <h1 className="mt-3 text-2xl font-semibold text-slate-900">CLIProxy hedefi</h1>
      <p className="mt-2 text-sm text-slate-600">
        Hedef bilgisi backend ayarlarında tutulur; URL ve etiket ilk render için local cache ile eşlenir.
      </p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Hedef URL
          <input
            type="url"
            value={baseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#F1641E]"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Etiket
          <input
            type="text"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#F1641E]"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Management Key
          <input
            type="password"
            value={managementKey}
            onChange={(event) => setManagementKey(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#F1641E]"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Inference API Key
          <input
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#F1641E]"
          />
        </label>
      </div>

      <div className="mt-6">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-[#051125] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {pending ? "Kaydediliyor..." : "Hedefi Kaydet"}
        </button>
      </div>
    </form>
  );
}
