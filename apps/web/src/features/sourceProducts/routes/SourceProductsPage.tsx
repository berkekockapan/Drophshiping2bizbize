import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useParams } from "react-router-dom";

import { createSourceProduct, fetchSourceProducts } from "../../../app/api";
import type { CreateSourceProductRequest } from "@trendyol-etsy/shared";
import { LiveSyncStatus } from "../../shared/components/LiveSyncStatus";
import { ownerOptions, type OwnerKey } from "../../shared/lib/ownerRouteState";
import { liveSyncQueryOptions } from "../../shared/lib/liveQuery";
import { SourceProductCard } from "../components/SourceProductCard";
import { SourceProductForm } from "../components/SourceProductForm";

function isOwnerKey(value: string | undefined): value is OwnerKey {
  return ownerOptions.some((owner) => owner.key === value);
}

export function SourceProductsPage() {
  const { ownerKey: ownerKeyParam } = useParams<{ ownerKey: string }>();
  const ownerKey = isOwnerKey(ownerKeyParam) ? ownerKeyParam : null;
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const sourceProductsQuery = useQuery({
    queryKey: ["source-products", ownerKey, appliedSearch],
    enabled: Boolean(ownerKey),
    queryFn: () => fetchSourceProducts(ownerKey as OwnerKey, appliedSearch || null),
    ...liveSyncQueryOptions,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateSourceProductRequest) => createSourceProduct(ownerKey as OwnerKey, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["source-products", ownerKey] });
    },
  });

  if (!ownerKey) {
    return <p className="text-sm text-rose-600">Gecersiz owner secimi.</p>;
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2 rounded-[28px] border border-slate-200 bg-white px-6 py-7 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-slate-400">Kaynak arsivi</p>
        <h2 className="text-3xl font-semibold text-slate-900">Kaynak Urunler</h2>
        <p className="max-w-3xl text-sm text-slate-500">
          Shopier, kisisel site ve diger manuel kaynak kayitlarini burada bulutta saklayip Etsy linkleriyle eslestirebilirsin.
        </p>
      </header>

      <SourceProductForm
        onSubmit={(payload) => createMutation.mutate(payload)}
        isSubmitting={createMutation.isPending}
        error={createMutation.error instanceof Error ? createMutation.error.message : null}
      />

      <form
        className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault();
          setAppliedSearch(searchInput.trim());
        }}
      >
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          <span>Arama</span>
          <div className="flex flex-col gap-3 lg:flex-row">
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Başlık, link, not veya Etsy linki ara"
              className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#F1641E]"
            />
            <button
              type="submit"
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Ara
            </button>
          </div>
        </label>
      </form>

      <LiveSyncStatus
        hasData={Boolean(sourceProductsQuery.data)}
        isFetching={sourceProductsQuery.isFetching}
        hasBackgroundError={Boolean(sourceProductsQuery.data && sourceProductsQuery.failureCount > 0)}
        updatedAt={sourceProductsQuery.dataUpdatedAt}
      />

      {sourceProductsQuery.isLoading ? <p className="text-sm text-slate-500">Kaynak urunler yukleniyor...</p> : null}
      {sourceProductsQuery.isError && !sourceProductsQuery.data ? (
        <p className="text-sm text-rose-600">Kaynak urunler yuklenemedi.</p>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {(sourceProductsQuery.data?.items ?? []).map((item) => (
          <SourceProductCard key={item.id} ownerKey={ownerKey} item={item} />
        ))}
      </div>

      {!sourceProductsQuery.isLoading && !sourceProductsQuery.isError && (sourceProductsQuery.data?.items ?? []).length === 0 ? (
        <p className="rounded-3xl border border-dashed border-slate-200 bg-white px-5 py-6 text-sm text-slate-500">
          Henüz kaynak ürün yok.
        </p>
      ) : null}
    </div>
  );
}
