import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import {
  deleteSourceProduct,
  fetchSourceProductCategories,
  fetchSourceProductManagementDetail,
  permanentlyDeleteSourceProduct,
  restoreSourceProduct,
  setSourceProductCategory,
} from "../../../app/api";
import { LiveSyncStatus } from "../../shared/components/LiveSyncStatus";
import { ownerOptions, type OwnerKey } from "../../shared/lib/ownerRouteState";
import { liveSyncQueryOptions } from "../../shared/lib/liveQuery";
import { SourceProductCategorySelect } from "../components/SourceProductCategorySelect";

function isOwnerKey(value: string | undefined): value is OwnerKey {
  return ownerOptions.some((owner) => owner.key === value);
}

export function SourceProductDetailPage() {
  const { ownerKey: ownerKeyParam, sourceProductId } = useParams<{ ownerKey: string; sourceProductId: string }>();
  const ownerKey = isOwnerKey(ownerKeyParam) ? ownerKeyParam : null;
  const queryClient = useQueryClient();

  const categoriesQuery = useQuery({
    queryKey: ["source-product-categories", ownerKey],
    enabled: Boolean(ownerKey),
    queryFn: async () => (await fetchSourceProductCategories(ownerKey as OwnerKey)).items,
    ...liveSyncQueryOptions,
  });

  const detailQuery = useQuery({
    queryKey: ["source-product-detail", ownerKey, sourceProductId],
    enabled: Boolean(ownerKey && sourceProductId),
    queryFn: () => fetchSourceProductManagementDetail(ownerKey as OwnerKey, sourceProductId as string),
    ...liveSyncQueryOptions,
  });

  const categoryMutation = useMutation({
    mutationFn: (categoryId: string | null) =>
      setSourceProductCategory(ownerKey as OwnerKey, sourceProductId as string, categoryId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["source-product-detail", ownerKey, sourceProductId] }),
        queryClient.invalidateQueries({ queryKey: ["source-products", ownerKey] }),
        queryClient.invalidateQueries({ queryKey: ["source-products-trash", ownerKey] }),
      ]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteSourceProduct(ownerKey as OwnerKey, sourceProductId as string),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["source-product-detail", ownerKey, sourceProductId] }),
        queryClient.invalidateQueries({ queryKey: ["source-products", ownerKey] }),
        queryClient.invalidateQueries({ queryKey: ["source-products-trash", ownerKey] }),
      ]);
    },
  });

  const restoreMutation = useMutation({
    mutationFn: () => restoreSourceProduct(ownerKey as OwnerKey, sourceProductId as string),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["source-product-detail", ownerKey, sourceProductId] }),
        queryClient.invalidateQueries({ queryKey: ["source-products", ownerKey] }),
        queryClient.invalidateQueries({ queryKey: ["source-products-trash", ownerKey] }),
      ]);
    },
  });

  const hardDeleteMutation = useMutation({
    mutationFn: () => permanentlyDeleteSourceProduct(ownerKey as OwnerKey, sourceProductId as string),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["source-products-trash", ownerKey] });
    },
  });

  if (!ownerKey) {
    return <p className="text-sm text-rose-600">Owner bulunamadı.</p>;
  }

  if (!sourceProductId) {
    return <p className="text-sm text-rose-600">Kaynak ürün kimliği bulunamadı.</p>;
  }

  return (
    <div className="space-y-6">
      <LiveSyncStatus
        hasData={Boolean(detailQuery.data)}
        isFetching={detailQuery.isFetching}
        hasBackgroundError={Boolean(detailQuery.data && detailQuery.failureCount > 0)}
        updatedAt={detailQuery.dataUpdatedAt}
      />

      {detailQuery.isLoading ? <p className="text-sm text-slate-500">Kaynak ürün detayı yükleniyor...</p> : null}
      {detailQuery.isError && !detailQuery.data ? <p className="text-sm text-rose-600">Kaynak ürün detayı yüklenemedi.</p> : null}

      {detailQuery.data ? (
        <>
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.28em] text-slate-400">Kaynak Ürün Detayı</p>
                <h1 className="mt-2 text-3xl font-semibold text-slate-900">{detailQuery.data.sourceProduct.title}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    {detailQuery.data.sourceProduct.sourceCategory?.name ?? "Kategorisiz"}
                  </span>
                  <span>{detailQuery.data.sourceProduct.platform ?? "Platform yok"}</span>
                  <span>•</span>
                  <a
                    href={detailQuery.data.sourceProduct.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-700 underline decoration-slate-300 underline-offset-2"
                  >
                    Kaynak URL
                  </a>
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <SourceProductCategorySelect
                  label="Kaynak ürün kategorisi"
                  inputId="source-product-detail-category"
                  categories={categoriesQuery.data ?? []}
                  value={detailQuery.data.sourceProduct.sourceCategory?.id ?? null}
                  disabled={categoryMutation.isPending}
                  onChange={(categoryId) => categoryMutation.mutate(categoryId)}
                />
                {detailQuery.data.sourceProduct.deletedAt ? (
                  <>
                    <button
                      type="button"
                      onClick={() => restoreMutation.mutate()}
                      className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
                    >
                      Geri yükle
                    </button>
                    <button
                      type="button"
                      onClick={() => hardDeleteMutation.mutate()}
                      className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
                    >
                      Kalıcı sil
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate()}
                    className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
                  >
                    Çöpe taşı
                  </button>
                )}
              </div>
            </div>

            {detailQuery.data.sourceProduct.deletedAt ? (
              <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                Bu kaynak ürün çöp kutusunda.
              </p>
            ) : null}

            <dl className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl bg-slate-50 p-4">
                <dt className="text-sm font-medium text-slate-500">Notlar</dt>
                <dd className="mt-2 text-sm text-slate-900">{detailQuery.data.sourceProduct.notes ?? "Not yok"}</dd>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <dt className="text-sm font-medium text-slate-500">Sıra</dt>
                <dd className="mt-2 text-sm text-slate-900">{detailQuery.data.sourceProduct.sortOrder ?? "-"}</dd>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <dt className="text-sm font-medium text-slate-500">Etsy bağlantıları</dt>
                <dd className="mt-2 text-sm text-slate-900">{detailQuery.data.sourceProduct.linkedEtsyCount} bağlantı</dd>
              </div>
              <div className="rounded-3xl bg-slate-50 p-4">
                <dt className="text-sm font-medium text-slate-500">Çöp nedeni</dt>
                <dd className="mt-2 text-sm text-slate-900">{detailQuery.data.sourceProduct.deletedReason ?? "-"}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-slate-400">Bağlı Etsy Ürünleri</p>
            <div className="mt-4 space-y-3">
              {detailQuery.data.linkedEtsyItems.length === 0 ? (
                <p className="text-sm text-slate-500">Bağlı Etsy ürünü yok.</p>
              ) : (
                detailQuery.data.linkedEtsyItems.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-slate-200 p-4">
                    <h2 className="text-base font-semibold text-slate-900">{item.title}</h2>
                    <a href={item.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-slate-700 underline decoration-slate-300 underline-offset-2">
                      Etsy bağlantısı
                    </a>
                  </article>
                ))
              )}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
