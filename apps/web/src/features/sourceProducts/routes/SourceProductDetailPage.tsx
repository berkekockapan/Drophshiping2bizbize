import type { PatchSourceProductRequest } from "@trendyol-etsy/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import {
  addSourceProductEtsyLink,
  deleteSourceProductEtsyLink,
  fetchSourceProductDetail,
  updateSourceProduct,
} from "../../../app/api";
import { LiveSyncStatus } from "../../shared/components/LiveSyncStatus";
import { liveSyncQueryOptions } from "../../shared/lib/liveQuery";
import { ownerOptions, type OwnerKey } from "../../shared/lib/ownerRouteState";
import { SourceProductEditor } from "../components/SourceProductEditor";
import { SourceProductEtsyLinksPanel } from "../components/SourceProductEtsyLinksPanel";

function isOwnerKey(value: string | undefined): value is OwnerKey {
  return ownerOptions.some((owner) => owner.key === value);
}

export function SourceProductDetailPage() {
  const { ownerKey: ownerKeyParam, sourceProductId } = useParams<{ ownerKey: string; sourceProductId: string }>();
  const ownerKey = isOwnerKey(ownerKeyParam) ? ownerKeyParam : null;
  const queryClient = useQueryClient();

  const detailQuery = useQuery({
    queryKey: ["source-product", ownerKey, sourceProductId],
    enabled: Boolean(ownerKey && sourceProductId),
    queryFn: () => fetchSourceProductDetail(ownerKey as OwnerKey, sourceProductId as string),
    ...liveSyncQueryOptions,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: PatchSourceProductRequest) =>
      updateSourceProduct(ownerKey as OwnerKey, sourceProductId as string, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["source-product", ownerKey, sourceProductId] });
      await queryClient.invalidateQueries({ queryKey: ["source-products", ownerKey] });
    },
  });

  const addEtsyLinkMutation = useMutation({
    mutationFn: (etsyUrl: string) => addSourceProductEtsyLink(ownerKey as OwnerKey, sourceProductId as string, { etsyUrl }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["source-product", ownerKey, sourceProductId] });
      await queryClient.invalidateQueries({ queryKey: ["source-products", ownerKey] });
    },
  });

  const deleteEtsyLinkMutation = useMutation({
    mutationFn: (etsyLinkId: string) =>
      deleteSourceProductEtsyLink(ownerKey as OwnerKey, sourceProductId as string, etsyLinkId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["source-product", ownerKey, sourceProductId] });
      await queryClient.invalidateQueries({ queryKey: ["source-products", ownerKey] });
    },
  });

  if (!ownerKey || !sourceProductId) {
    return <p className="text-sm text-rose-600">Kaynak urun bulunamadi.</p>;
  }

  const mutationError =
    updateMutation.error instanceof Error
      ? updateMutation.error.message
      : addEtsyLinkMutation.error instanceof Error
        ? addEtsyLinkMutation.error.message
        : deleteEtsyLinkMutation.error instanceof Error
          ? deleteEtsyLinkMutation.error.message
          : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Link to={`/owners/${ownerKey}/source-products`} className="text-sm font-medium text-slate-600 transition hover:text-slate-900">
          ← Kaynak ürünler listesine dön
        </Link>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-600">
          {ownerKey}
        </span>
      </div>

      <LiveSyncStatus
        hasData={Boolean(detailQuery.data)}
        isFetching={detailQuery.isFetching}
        hasBackgroundError={Boolean(detailQuery.data && detailQuery.failureCount > 0)}
        updatedAt={detailQuery.dataUpdatedAt}
      />

      {detailQuery.isLoading ? <p className="text-sm text-slate-500">Kaynak urun detayi yukleniyor...</p> : null}
      {detailQuery.isError && !detailQuery.data ? (
        <p className="text-sm text-rose-600">Kaynak urun detayi yuklenemedi.</p>
      ) : null}

      {detailQuery.data ? (
        <>
          <header className="rounded-[28px] border border-slate-200 bg-white px-6 py-7 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Kaynak urun detayi</p>
            <h2 className="mt-2 text-3xl font-semibold text-slate-900">{detailQuery.data.product.sourceTitle}</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">
              Kaynak link, platform, not ve bagli Etsy linklerini bu ekrandan yonetebilirsin.
            </p>
          </header>

          <SourceProductEditor
            product={detailQuery.data.product}
            isSaving={updateMutation.isPending}
            error={updateMutation.error instanceof Error ? updateMutation.error.message : null}
            onSave={(payload) => updateMutation.mutate(payload)}
          />

          <SourceProductEtsyLinksPanel
            etsyLinks={detailQuery.data.etsyLinks}
            isAdding={addEtsyLinkMutation.isPending}
            isDeleting={deleteEtsyLinkMutation.isPending}
            error={mutationError}
            onAdd={(etsyUrl) => addEtsyLinkMutation.mutate(etsyUrl)}
            onDelete={(etsyLink) => deleteEtsyLinkMutation.mutate(etsyLink.id)}
          />
        </>
      ) : null}
    </div>
  );
}
