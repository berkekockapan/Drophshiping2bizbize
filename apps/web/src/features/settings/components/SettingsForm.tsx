import { useState } from "react";

import type { AppSettingsResponse } from "../../../app/api";

interface SettingsFormProps {
  initialValue: AppSettingsResponse;
  pending?: boolean;
  onSubmit: (payload: {
    refreshIntervalHours: number;
    connectorHealthcheckEnabled: boolean;
  }) => void;
}

export function SettingsForm({ initialValue, pending = false, onSubmit }: SettingsFormProps) {
  const [refreshIntervalHours, setRefreshIntervalHours] = useState(initialValue.refreshIntervalHours);
  const [connectorHealthcheckEnabled, setConnectorHealthcheckEnabled] = useState(initialValue.connectorHealthcheckEnabled);

  return (
    <form
      className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          refreshIntervalHours,
          connectorHealthcheckEnabled,
        });
      }}
    >
      <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Ayarlar</p>
      <h1 className="mt-3 text-2xl font-semibold text-slate-900">Senkronizasyon tercihleri</h1>

      <label className="mt-5 flex flex-col gap-2 text-sm text-slate-700">
        Refresh interval (saat)
        <input
          type="number"
          min={1}
          value={refreshIntervalHours}
          onChange={(event) => setRefreshIntervalHours(Number(event.target.value))}
          className="w-40 rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#F1641E]"
        />
      </label>

      <label className="mt-4 inline-flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={connectorHealthcheckEnabled}
          onChange={(event) => setConnectorHealthcheckEnabled(event.target.checked)}
        />
        Connector healthcheck aktif
      </label>

      <div className="mt-6">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-[#051125] px-4 py-2 text-sm font-semibold text-white"
        >
          {pending ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </div>
    </form>
  );
}