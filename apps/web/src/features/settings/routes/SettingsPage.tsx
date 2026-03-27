import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

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
      {settingsQuery.isLoading ? <p className="text-sm text-slate-500">Ayarlar yukleniyor...</p> : null}
      {settingsQuery.isError ? <p className="text-sm text-rose-600">Ayarlar yuklenemedi.</p> : null}

      {settingsQuery.data ? (
        <SettingsForm
          initialValue={settingsQuery.data}
          pending={patchMutation.isPending}
          footer={
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Gorsel metadata temizleme</p>
              <p className="mt-1 text-sm text-slate-600">
                Dosyalari tarayicida isle, klasor yapisini koru ve sonucu tek ZIP olarak indir.
              </p>
              <Link
                to="/settings/image-metadata-cleaner"
                className="mt-3 inline-flex rounded-xl bg-[#F1641E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#d95716]"
              >
                Araci ac
              </Link>
            </div>
          }
          onSubmit={(payload) => patchMutation.mutate(payload)}
        />
      ) : null}
    </div>
  );
}
