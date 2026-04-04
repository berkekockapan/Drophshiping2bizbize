import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useParams } from "react-router-dom";

import {
  createSourceProductCategory,
  deleteSourceProduct,
  deleteSourceProductCategory,
  fetchSourceProductCategories,
  fetchSourceProductsView,
  reorderSourceProducts,
  renameSourceProductCategory,
  setSourceProductCategory,
  type SourceProductsViewResponse,
} from "../../../app/api";
import { LiveSyncStatus } from "../../shared/components/LiveSyncStatus";
import { ownerOptions, type OwnerKey } from "../../shared/lib/ownerRouteState";
import { liveSyncQueryOptions } from "../../shared/lib/liveQuery";
import { SourceProductCategoryManagerDialog } from "../components/SourceProductCategoryManagerDialog";
import { SourceProductFilters } from "../components/SourceProductFilters";
import { SortableSourceProductSection } from "../components/SortableSourceProductSection";
import { groupSourceProductsByCategory } from "../lib/groupSourceProductsByCategory";
import { reorderSourceProductsInCategory } from "../lib/reorderSourceProductsInCategory";

function isOwnerKey(value: string | undefined): value is OwnerKey {
  return ownerOptions.some((owner) => owner.key === value);
}

export function SourceProductsPage() {
  const { ownerKey: ownerKeyParam } = useParams<{ ownerKey: string }>();
  const ownerKey = isOwnerKey(ownerKeyParam) ? ownerKeyParam : null;
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | "uncategorized" | null>(null);
  const [isCategoryManagerOpen, setCategoryManagerOpen] = useState(false);

  const categoriesQuery = useQuery({
    queryKey: ["source-product-categories", ownerKey],
    enabled: Boolean(ownerKey),
    queryFn: async () => (await fetchSourceProductCategories(ownerKey as OwnerKey)).items,
    ...liveSyncQueryOptions,
  });

  const sourceProductsQuery = useQuery({
    queryKey: ["source-products", ownerKey, selectedCategoryId, search],
    enabled: Boolean(ownerKey),
    queryFn: () =>
      fetchSourceProductsView(ownerKey as OwnerKey, {
        search,
        categoryId: selectedCategoryId,
      }),
    ...liveSyncQueryOptions,
  });

  const categoryAssignmentMutation = useMutation({
    mutationFn: ({ sourceProductId, categoryId }: { sourceProductId: string; categoryId: string | null }) =>
      setSourceProductCategory(ownerKey as OwnerKey, sourceProductId, categoryId),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["source-products", ownerKey] }),
        queryClient.invalidateQueries({ queryKey: ["source-product-detail", ownerKey, variables.sourceProductId] }),
      ]);
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: (name: string) => createSourceProductCategory(ownerKey as OwnerKey, name),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["source-product-categories", ownerKey] });
    },
  });

  const renameCategoryMutation = useMutation({
    mutationFn: ({ categoryId, name }: { categoryId: string; name: string }) =>
      renameSourceProductCategory(ownerKey as OwnerKey, categoryId, name),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["source-product-categories", ownerKey] }),
        queryClient.invalidateQueries({ queryKey: ["source-products", ownerKey] }),
      ]);
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (categoryId: string) => deleteSourceProductCategory(ownerKey as OwnerKey, categoryId),
    onSuccess: async (_data, categoryId) => {
      if (selectedCategoryId === categoryId) {
        setSelectedCategoryId(null);
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["source-product-categories", ownerKey] }),
        queryClient.invalidateQueries({ queryKey: ["source-products", ownerKey] }),
      ]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (sourceProductId: string) => deleteSourceProduct(ownerKey as OwnerKey, sourceProductId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["source-products", ownerKey] }),
        queryClient.invalidateQueries({ queryKey: ["source-products-trash", ownerKey] }),
      ]);
    },
  });

  const reorderMutation = useMutation({
    mutationFn: ({ categoryId, orderedIds }: { categoryId: string | null; orderedIds: string[] }) =>
      reorderSourceProducts(ownerKey as OwnerKey, { categoryId, orderedIds }),
    onMutate: async ({ categoryId, orderedIds }) => {
      await queryClient.cancelQueries({ queryKey: ["source-products", ownerKey] });
      const previous = queryClient.getQueriesData<SourceProductsViewResponse>({ queryKey: ["source-products", ownerKey] });

      for (const [queryKey, cached] of previous) {
        if (!cached) {
          continue;
        }

        queryClient.setQueryData<SourceProductsViewResponse>(queryKey, {
          ...cached,
          items: reorderSourceProductsInCategory(cached.items, categoryId, orderedIds),
        });
      }

      return { previous };
    },
    onError: async (_error, _variables, context) => {
      for (const [queryKey, cached] of context?.previous ?? []) {
        queryClient.setQueryData(queryKey, cached);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["source-products", ownerKey] });
    },
  });

  const sections = groupSourceProductsByCategory(sourceProductsQuery.data?.items ?? [], selectedCategoryId);
  const categoryErrorMessage =
    createCategoryMutation.error instanceof Error
      ? createCategoryMutation.error.message
      : renameCategoryMutation.error instanceof Error
        ? renameCategoryMutation.error.message
        : deleteCategoryMutation.error instanceof Error
          ? deleteCategoryMutation.error.message
          : null;

  if (!ownerKey) {
    return <p className="text-sm text-rose-600">Geçersiz owner seçimi.</p>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-7 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-slate-400">Kaynak Ürünler</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">Kaynak ürünler</h1>
      </section>

      <SourceProductFilters
        ownerKey={ownerKey}
        search={search}
        selectedCategoryId={selectedCategoryId}
        categories={categoriesQuery.data ?? []}
        onSearchChange={setSearch}
        onCategoryChange={setSelectedCategoryId}
        onManageCategories={() => setCategoryManagerOpen(true)}
      />

      <LiveSyncStatus
        hasData={Boolean(sourceProductsQuery.data)}
        isFetching={sourceProductsQuery.isFetching}
        hasBackgroundError={Boolean(sourceProductsQuery.data && sourceProductsQuery.failureCount > 0)}
        updatedAt={sourceProductsQuery.dataUpdatedAt}
      />

      {sourceProductsQuery.isLoading ? <p className="text-sm text-slate-500">Kaynak ürünler yükleniyor...</p> : null}
      {sourceProductsQuery.isError && !sourceProductsQuery.data ? (
        <p className="text-sm text-rose-600">Kaynak ürünler yüklenemedi.</p>
      ) : null}

      {sections.map((section) => (
        <section key={section.key} className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-slate-900">{section.title}</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{section.items.length} kayıt</span>
          </div>
          <SortableSourceProductSection
            ownerKey={ownerKey}
            section={section}
            categories={categoriesQuery.data ?? []}
            onCategoryChange={(item, categoryId) =>
              categoryAssignmentMutation.mutate({ sourceProductId: item.id, categoryId })
            }
            onDelete={(item) => deleteMutation.mutate(item.id)}
            onReorder={(categoryId, orderedIds) => reorderMutation.mutate({ categoryId, orderedIds })}
          />
        </section>
      ))}

      {!sourceProductsQuery.isLoading && !sourceProductsQuery.isError && sections.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-slate-200 bg-white px-5 py-6 text-sm text-slate-500">
          Kaynak ürün bulunamadı.
        </p>
      ) : null}

      <SourceProductCategoryManagerDialog
        open={isCategoryManagerOpen}
        categories={categoriesQuery.data ?? []}
        errorMessage={categoryErrorMessage}
        onClose={() => setCategoryManagerOpen(false)}
        onCreate={(name) => createCategoryMutation.mutate(name)}
        onRename={(categoryId, name) => renameCategoryMutation.mutate({ categoryId, name })}
        onDelete={(categoryId) => deleteCategoryMutation.mutate(categoryId)}
      />
    </div>
  );
}
