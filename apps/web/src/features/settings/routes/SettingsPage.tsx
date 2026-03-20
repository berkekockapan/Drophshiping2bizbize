import { useMutation, useQuery } from "@tanstack/react-query";

import { fetchSettings, patchSettings } from "../../../app/api";
import { SettingsForm } from "../components/SettingsForm";

export function SettingsPage() {
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
  });

  const patchMutation = useMutation({
    mutationFn: patchSettings,
  });

  return (
    <div className="space-y-6">
      {settingsQuery.isLoading ? <p className="text-sm text-slate-500">Ayarlar yükleniyor...</p> : null}
      {settingsQuery.isError ? <p className="text-sm text-rose-600">Ayarlar yüklenemedi.</p> : null}

      {settingsQuery.data ? (
        <SettingsForm
          initialValue={settingsQuery.data}
          pending={patchMutation.isPending}
          onSubmit={(payload) => patchMutation.mutate(payload)}
        />
      ) : null}
    </div>
  );
}