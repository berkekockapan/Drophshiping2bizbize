import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import { fetchTrashView, permanentlyDeleteTrackedProduct, restoreTrackedProduct } from "../../../app/api";
import { LiveSyncStatus } from "../../shared/components/LiveSyncStatus";
import { ownerOptions, type OwnerKey } from "../../shared/lib/ownerRouteState";
import { liveSyncQueryOptions } from "../../shared/lib/liveQuery";

function isOwnerKey(value: string | undefined): value is OwnerKey {
  return ownerOptions.some((owner) => owner.key === value);
}

export function TrashPage() {
  const { ownerKey: ownerKeyParam } = useParams<{ ownerKey: string }>();
  const ownerKey = isOwnerKey(ownerKeyParam) ? ownerKeyParam : null;
  const queryClient = useQueryClient();

  const trashQuery = useQuery({
    queryKey: ["tracking-trash", ownerKey],
    enabled: Boolean(ownerKey),
    queryFn: () => fetchTrashView(ownerKey as OwnerKey),
    ...liveSyncQueryOptions,
  });

  const restoreMutation = useMutation({
    mutationFn: (productId: string) => restoreTrackedProduct(ownerKey as OwnerKey, productId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tracking-trash", ownerKey] }),
        queryClient.invalidateQueries({ queryKey: ["tracking-products", ownerKey] }),
      ]);
    },
  });

  const hardDeleteMutation = useMutation({
    mutationFn: (productId: string) => permanentlyDeleteTrackedProduct(ownerKey as OwnerKey, productId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tracking-trash", ownerKey] });
    },
  });

  if (!ownerKey) {
    return <p className="text-sm text-rose-600">Geçersiz owner seçimi.</p>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-7 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-slate-400">Çöp Kutusu</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">Silinen ürünler</h1>
      </section>

      <LiveSyncStatus
        hasData={Boolean(trashQuery.data)}
        isFetching={trashQuery.isFetching}
        hasBackgroundError={Boolean(trashQuery.data && trashQuery.failureCount > 0)}
        updatedAt={trashQuery.dataUpdatedAt}
      />

      {trashQuery.isLoading ? <p className="text-sm text-slate-500">Çöp kutusu yükleniyor...</p> : null}
      {trashQuery.isError && !trashQuery.data ? <p className="text-sm text-rose-600">Çöp kutusu yüklenemedi.</p> : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {trashQuery.data?.items.map((item) => (
          <article key={item.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-lg font-semibold text-slate-900">{item.title ?? "Başlıksız ürün"}</p>
            <p className="mt-1 text-sm text-slate-500">{item.brand ?? "Marka yok"}</p>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => restoreMutation.mutate(item.id)}
                className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100"
              >
                Geri Yükle
              </button>
              <button
                type="button"
                onClick={() => hardDeleteMutation.mutate(item.id)}
                className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
              >
                Kalıcı Sil
              </button>
            </div>
          </article>
        ))}
      </div>

      {!trashQuery.isLoading && !trashQuery.isError && (trashQuery.data?.items.length ?? 0) === 0 ? (
        <p className="rounded-3xl border border-dashed border-slate-200 bg-white px-5 py-6 text-sm text-slate-500">
          Çöp kutusu boş.
        </p>
      ) : null}
    </div>
  );
}
