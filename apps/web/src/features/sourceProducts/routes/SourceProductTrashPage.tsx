import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import { fetchSourceProductsTrash, permanentlyDeleteSourceProduct, restoreSourceProduct } from "../../../app/api";
import { LiveSyncStatus } from "../../shared/components/LiveSyncStatus";
import { ownerOptions, type OwnerKey } from "../../shared/lib/ownerRouteState";
import { liveSyncQueryOptions } from "../../shared/lib/liveQuery";
import { SourceProductTrashCard } from "../components/SourceProductTrashCard";

function isOwnerKey(value: string | undefined): value is OwnerKey {
  return ownerOptions.some((owner) => owner.key === value);
}

export function SourceProductTrashPage() {
  const { ownerKey: ownerKeyParam } = useParams<{ ownerKey: string }>();
  const ownerKey = isOwnerKey(ownerKeyParam) ? ownerKeyParam : null;
  const queryClient = useQueryClient();

  const trashQuery = useQuery({
    queryKey: ["source-products-trash", ownerKey],
    enabled: Boolean(ownerKey),
    queryFn: () => fetchSourceProductsTrash(ownerKey as OwnerKey),
    ...liveSyncQueryOptions,
  });

  const restoreMutation = useMutation({
    mutationFn: (sourceProductId: string) => restoreSourceProduct(ownerKey as OwnerKey, sourceProductId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["source-products-trash", ownerKey] }),
        queryClient.invalidateQueries({ queryKey: ["source-products", ownerKey] }),
      ]);
    },
  });

  const hardDeleteMutation = useMutation({
    mutationFn: (sourceProductId: string) => permanentlyDeleteSourceProduct(ownerKey as OwnerKey, sourceProductId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["source-products-trash", ownerKey] });
    },
  });

  if (!ownerKey) {
    return <p className="text-sm text-rose-600">Geçersiz owner seçimi.</p>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-7 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-slate-400">Kaynak Ürün Çöp Kutusu</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">Silinen kaynak ürünler</h1>
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
          <SourceProductTrashCard
            key={item.id}
            item={item}
            onRestore={() => restoreMutation.mutate(item.id)}
            onPermanentDelete={() => hardDeleteMutation.mutate(item.id)}
          />
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
