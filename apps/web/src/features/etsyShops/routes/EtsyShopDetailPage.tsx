import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { assignProductToShop, fetchEtsyShopDetail, fetchTrackingView } from "../../../app/api";
import { LiveSyncStatus } from "../../shared/components/LiveSyncStatus";
import { ownerOptions, type OwnerKey } from "../../shared/lib/ownerRouteState";
import { liveSyncQueryOptions } from "../../shared/lib/liveQuery";
import { AddLinkForm } from "../../tracking/components/AddLinkForm";

function isOwnerKey(value: string | undefined): value is OwnerKey {
  return ownerOptions.some((owner) => owner.key === value);
}

export function EtsyShopDetailPage() {
  const { ownerKey: ownerKeyParam, shopId } = useParams<{ ownerKey: string; shopId: string }>();
  const ownerKey = isOwnerKey(ownerKeyParam) ? ownerKeyParam : null;
  const queryClient = useQueryClient();
  const [selectedProductId, setSelectedProductId] = useState("");
  const [assignError, setAssignError] = useState<string | null>(null);

  const detailQuery = useQuery({
    queryKey: ["etsy-shop-detail", ownerKey, shopId],
    enabled: Boolean(ownerKey && shopId),
    queryFn: () => fetchEtsyShopDetail(ownerKey as OwnerKey, shopId as string),
    ...liveSyncQueryOptions,
  });

  const allProductsQuery = useQuery({
    queryKey: ["tracking-products", ownerKey, "all-for-shop-assignment"],
    enabled: Boolean(ownerKey),
    queryFn: () => fetchTrackingView(ownerKey as OwnerKey, {}),
    ...liveSyncQueryOptions,
  });

  const assignMutation = useMutation({
    mutationFn: (productId: string) => assignProductToShop(ownerKey as OwnerKey, shopId as string, productId),
    onSuccess: async () => {
      setSelectedProductId("");
      setAssignError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["etsy-shop-detail", ownerKey, shopId] }),
        queryClient.invalidateQueries({ queryKey: ["product-detail", ownerKey] }),
        queryClient.invalidateQueries({ queryKey: ["tracking-products", ownerKey] }),
        queryClient.invalidateQueries({ queryKey: ["etsy-shops", ownerKey] }),
      ]);
    },
    onError: (error) => {
      setAssignError(error instanceof Error ? error.message : "Urun magazaya eklenemedi.");
    },
  });

  const availableProducts = useMemo(() => {
    const assignedIds = new Set((detailQuery.data?.products.items ?? []).map((item) => item.id));
    return (allProductsQuery.data?.items ?? []).filter((item) => !assignedIds.has(item.id));
  }, [allProductsQuery.data?.items, detailQuery.data?.products.items]);

  if (!ownerKey) {
    return <p className="text-sm text-rose-600">Gecersiz owner secimi.</p>;
  }

  if (!shopId) {
    return <p className="text-sm text-rose-600">Magaza kimligi bulunamadi.</p>;
  }

  return (
    <div className="space-y-6">
      <LiveSyncStatus
        hasData={Boolean(detailQuery.data)}
        isFetching={detailQuery.isFetching || allProductsQuery.isFetching}
        hasBackgroundError={Boolean((detailQuery.data && detailQuery.failureCount > 0) || (allProductsQuery.data && allProductsQuery.failureCount > 0))}
        updatedAt={Math.max(detailQuery.dataUpdatedAt || 0, allProductsQuery.dataUpdatedAt || 0)}
      />

      {detailQuery.isLoading ? <p className="text-sm text-slate-500">Magaza detayi yukleniyor...</p> : null}
      {detailQuery.isError && !detailQuery.data ? <p className="text-sm text-rose-600">Magaza detayi yuklenemedi.</p> : null}

      {detailQuery.data ? (
        <>
          <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-7 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <Link to={`/owners/${ownerKey}/etsy-shops`} className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
                  ← Magaza listesine don
                </Link>
                <p className="mt-4 text-sm font-medium uppercase tracking-[0.28em] text-slate-400">Etsy Magaza Sayfasi</p>
                <h1 className="mt-3 text-3xl font-semibold text-slate-900">{detailQuery.data.shop.name}</h1>
                <a
                  href={detailQuery.data.shop.etsyShopUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block text-sm text-slate-600 underline decoration-slate-300 underline-offset-2"
                >
                  {detailQuery.data.shop.etsyShopUrl}
                </a>
                <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-500">
                  {detailQuery.data.shop.description ?? "Bu magaza icin aciklama girilmemis."}
                </p>
              </div>
              <div className="rounded-3xl bg-slate-50 px-5 py-4 text-right">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Bagli Urun</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{detailQuery.data.products.items.length}</p>
              </div>
            </div>
          </section>

          <AddLinkForm ownerKey={ownerKey} shops={[detailQuery.data.shop]} lockedShopId={detailQuery.data.shop.id} />

          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.28em] text-slate-400">Mevcut Urunu Ekle</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">Daha once eklenmis bir urunu bu magazaya bagla</h2>
              </div>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div>
                <label className="block text-sm font-medium text-slate-700" htmlFor="existing-product-select">
                  Urun sec
                </label>
                <select
                  id="existing-product-select"
                  value={selectedProductId}
                  onChange={(event) => setSelectedProductId(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#F1641E]"
                >
                  <option value="">Urun sec</option>
                  {availableProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.title ?? "Basliksiz urun"}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!selectedProductId) {
                    setAssignError("Lutfen bir urun sec.");
                    return;
                  }

                  setAssignError(null);
                  assignMutation.mutate(selectedProductId);
                }}
                disabled={assignMutation.isPending}
                className="rounded-2xl bg-[#051125] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#0a1831] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {assignMutation.isPending ? "Ekleniyor..." : "Magazaya bagla"}
              </button>
            </div>
            {assignError ? <p className="mt-3 text-sm text-rose-600">{assignError}</p> : null}
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.28em] text-slate-400">Magazadaki Urunler</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">Bagli urun listesi</h2>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {detailQuery.data.products.items.map((item) => (
                <article key={item.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-slate-900">{item.title ?? "Basliksiz urun"}</h3>
                      <p className="mt-2 text-sm text-slate-500">{item.brand ?? "Marka yok"}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      {item.currentPrice == null ? "Fiyat yok" : `${(item.currentPrice / 100).toFixed(2)} TRY`}
                    </span>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Link
                      to={`/owners/${ownerKey}/products/${item.id}`}
                      className="rounded-2xl bg-[#F1641E] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#d95518]"
                    >
                      Urun detayina git
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            {detailQuery.data.products.items.length === 0 ? (
              <p className="rounded-3xl border border-dashed border-slate-200 bg-white px-5 py-6 text-sm text-slate-500">
                Bu magazaya bagli urun yok. Yukaridan yeni urun ekleyebilir veya mevcut bir urunu baglayabilirsin.
              </p>
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  );
}
