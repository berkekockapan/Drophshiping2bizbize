import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";

import {
  addSourceProductEtsyLink,
  addTrackedProductEtsyLink,
  createProductCategory,
  deleteProductCategory,
  deleteSourceProduct,
  deleteSourceProductEtsyLink,
  deleteTrackedProduct,
  deleteTrackedProductEtsyLink,
  fetchEtsyShops,
  fetchProductCategories,
  fetchSourceProductsView,
  fetchTrackingView,
  setSourceProductUserCategory,
  setTrackedProductCategory,
  type TrackingItem,
  updateSourceProductShops,
  updateProductShops,
  type TrackingViewResponse,
} from "../../../app/api";
import { LiveSyncStatus } from "../../shared/components/LiveSyncStatus";
import { StatCard } from "../../shared/components/StatCard";
import { liveSyncQueryOptions } from "../../shared/lib/liveQuery";
import { ownerOptions, type OwnerKey } from "../../shared/lib/ownerRouteState";
import { AddLinkForm } from "../components/AddLinkForm";
import { BulkRefreshControl } from "../components/BulkRefreshControl";
import { UnifiedDashboardCard } from "../components/UnifiedDashboardCard";
import { buildUnifiedDashboardItems, type UnifiedDashboardItem } from "../lib/buildUnifiedDashboardItems";

function isOwnerKey(value: string | undefined): value is OwnerKey {
  return ownerOptions.some((owner) => owner.key === value);
}

function normalizeCategoryName(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR");
}

function matchesSearch(item: UnifiedDashboardItem, search: string) {
  const normalizedSearch = search.trim().toLocaleLowerCase("tr-TR");
  if (!normalizedSearch) {
    return true;
  }

  const haystack = [
    item.title,
    item.brand,
    item.sourceUrl,
    item.platform,
    item.categoryLabel,
    item.sourceCategoryLabel,
    item.trackingCategoryLabel,
    ...item.assignedShops.map((shop) => shop.name),
    ...item.etsyLinks.map((etsyLink) => `${etsyLink.title} ${etsyLink.url}`),
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLocaleLowerCase("tr-TR");

  return haystack.includes(normalizedSearch);
}

function extractSourceProductIdFromUrl(rawUrl: string | null | undefined) {
  if (!rawUrl) {
    return null;
  }

  try {
    const match = new URL(rawUrl).pathname.match(/-p-(\d+)/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function normalizeComparableUrl(rawUrl: string | null | undefined) {
  if (!rawUrl) {
    return null;
  }

  try {
    const url = new URL(rawUrl);
    url.search = "";
    url.hash = "";
    url.protocol = url.protocol.toLowerCase();
    url.hostname = url.hostname.toLowerCase();
    if (url.pathname !== "/") {
      url.pathname = url.pathname.replace(/\/+$/, "");
    }
    return url.toString();
  } catch {
    return rawUrl.trim() || null;
  }
}

function findTrackedProductForSourceUrl(sourceUrl: string | null | undefined, trackingItems: TrackingItem[]) {
  if (!sourceUrl) {
    return null;
  }

  const sourceProductId = extractSourceProductIdFromUrl(sourceUrl);
  const normalizedSourceUrl = normalizeComparableUrl(sourceUrl);

  return (
    trackingItems.find((trackingItem) => {
      if (sourceProductId && trackingItem.sourceProductId === sourceProductId) {
        return true;
      }

      const normalizedTrackingUrl = normalizeComparableUrl(trackingItem.trendyolUrl ?? null);
      return Boolean(normalizedSourceUrl && normalizedTrackingUrl && normalizedSourceUrl === normalizedTrackingUrl);
    }) ?? null
  );
}

function findTrackedProductForItem(item: UnifiedDashboardItem, trackingItems: TrackingItem[]) {
  if (item.trackedProduct?.id) {
    const trackedById = trackingItems.find((trackingItem) => trackingItem.id === item.trackedProduct?.id);
    if (trackedById) {
      return trackedById;
    }
  }

  if (item.trackedProduct?.sourceProductId) {
    const trackedBySourceProductId = trackingItems.find(
      (trackingItem) => trackingItem.sourceProductId === item.trackedProduct?.sourceProductId,
    );
    if (trackedBySourceProductId) {
      return trackedBySourceProductId;
    }
  }

  const trackedBySourceUrl = findTrackedProductForSourceUrl(item.sourceUrl, trackingItems);
  if (trackedBySourceUrl) {
    return trackedBySourceUrl;
  }

  const normalizedTrackedUrlFromCard = normalizeComparableUrl(item.trackedProduct?.trendyolUrl ?? null);
  if (!normalizedTrackedUrlFromCard) {
    return null;
  }

  return (
    trackingItems.find((trackingItem) => normalizeComparableUrl(trackingItem.trendyolUrl ?? null) === normalizedTrackedUrlFromCard) ?? null
  );
}

function updateTrackingItemShops(
  previous: TrackingViewResponse | undefined,
  productId: string,
  shops: Array<{ id: string; name: string; etsyShopUrl: string; description: string | null }>,
) {
  if (!previous) {
    return previous;
  }

  return {
    ...previous,
    items: previous.items.map((trackingItem) =>
      trackingItem.id === productId
        ? {
            ...trackingItem,
            shops,
          }
        : trackingItem,
    ),
  };
}

function updateTrackingItemCategory(
  previous: TrackingViewResponse | undefined,
  productId: string,
  userCategory: TrackingItem["userCategory"],
) {
  if (!previous) {
    return previous;
  }

  return {
    ...previous,
    items: previous.items.map((trackingItem) =>
      trackingItem.id === productId
        ? {
            ...trackingItem,
            userCategory: userCategory ?? null,
          }
        : trackingItem,
    ),
  };
}

export function TrackingCenterPage() {
  const { ownerKey: ownerKeyParam } = useParams<{ ownerKey: string }>();
  const ownerKey = isOwnerKey(ownerKeyParam) ? ownerKeyParam : null;
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedTab, setSelectedTab] = useState<string>("all");
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [shopAssignmentError, setShopAssignmentError] = useState<string | null>(null);
  const [categoryMutationError, setCategoryMutationError] = useState<string | null>(null);
  const [etsyLinkMutationError, setEtsyLinkMutationError] = useState<{ itemKey: string; message: string } | null>(null);
  const [etsyLinkDeleteError, setEtsyLinkDeleteError] = useState<{ itemKey: string; message: string } | null>(null);
  const [cardDeleteError, setCardDeleteError] = useState<{ itemKey: string; message: string } | null>(null);
  const [categoryDeleteCandidate, setCategoryDeleteCandidate] = useState<{
    id: string;
    key: string;
    name: string;
  } | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");

  const trackingQuery = useQuery({
    queryKey: ["tracking-products", ownerKey, "dashboard"],
    enabled: Boolean(ownerKey),
    queryFn: () => fetchTrackingView(ownerKey as OwnerKey, {}),
    ...liveSyncQueryOptions,
  });

  const categoriesQuery = useQuery({
    queryKey: ["product-categories", ownerKey],
    enabled: Boolean(ownerKey),
    queryFn: async () => (await fetchProductCategories(ownerKey as OwnerKey)).items,
    ...liveSyncQueryOptions,
  });

  const createCategoryMutation = useMutation({
    mutationFn: (name: string) => createProductCategory(ownerKey as OwnerKey, name),
    onSuccess: async () => {
      setNewCategoryName("");
      await queryClient.invalidateQueries({ queryKey: ["product-categories", ownerKey] });
    },
  });

  const shopsQuery = useQuery({
    queryKey: ["etsy-shops", ownerKey],
    enabled: Boolean(ownerKey),
    queryFn: async () => (await fetchEtsyShops(ownerKey as OwnerKey)).items,
    ...liveSyncQueryOptions,
  });

  const sourceProductsQuery = useQuery({
    queryKey: ["source-products", ownerKey, "dashboard"],
    enabled: Boolean(ownerKey),
    queryFn: () =>
      fetchSourceProductsView(ownerKey as OwnerKey, {
        search: "",
        categoryId: null,
      }),
    ...liveSyncQueryOptions,
  });

  const shopAssignmentMutation = useMutation<
    {
      productId?: string;
      sourceProductId?: string;
      shops: Array<{ id: string; name: string; etsyShopUrl: string; description: string | null }>;
    } | null,
    Error,
    { item: UnifiedDashboardItem; shopId: string | null },
    { previousTrackingData?: TrackingViewResponse }
  >({
    mutationFn: async ({ item, shopId }) => {
      if (!ownerKey) {
        throw new Error("Geçersiz owner seçimi.");
      }

      const selectedShopIds = shopId ? [shopId] : [];

      const assignShopToTrackedProduct = async (trackedProductId: string) => {
        try {
          const response = await updateProductShops(ownerKey, trackedProductId, selectedShopIds);
          return { productId: response.productId, shops: response.shops };
        } catch (error) {
          const latestTracking = await fetchTrackingView(ownerKey, {});
          const refreshedTrackedProduct = findTrackedProductForItem(item, latestTracking.items);
          if (!refreshedTrackedProduct) {
            throw error;
          }

          const response = await updateProductShops(ownerKey, refreshedTrackedProduct.id, selectedShopIds);
          return { productId: response.productId, shops: response.shops };
        }
      };

      const existingTrackedProduct = findTrackedProductForItem(item, trackingQuery.data?.items ?? []);

      if (existingTrackedProduct) {
        return assignShopToTrackedProduct(existingTrackedProduct.id);
      }

      if (!item.sourceProduct?.id) {
        throw new Error("Kaynak ürün kaydı bulunamadı.");
      }

      const response = await updateSourceProductShops(ownerKey, item.sourceProduct.id, selectedShopIds);
      return { sourceProductId: response.sourceProductId, shops: response.shops };
    },
    onMutate: async ({ item, shopId }) => {
      if (!ownerKey) {
        return { previousTrackingData: undefined };
      }

      const optimisticTrackedProductId = findTrackedProductForItem(item, trackingQuery.data?.items ?? [])?.id;

      if (!optimisticTrackedProductId) {
        return { previousTrackingData: undefined };
      }

      const queryKey = ["tracking-products", ownerKey, "dashboard"] as const;
      await queryClient.cancelQueries({ queryKey });
      const previousTrackingData = queryClient.getQueryData<TrackingViewResponse>(queryKey);

      const selectedShop = (shopsQuery.data ?? []).find((shop) => shop.id === shopId);
      const optimisticShops = selectedShop
        ? [
            {
              id: selectedShop.id,
              name: selectedShop.name,
              etsyShopUrl: selectedShop.etsyShopUrl,
              description: selectedShop.description,
            },
          ]
        : [];

      queryClient.setQueryData<TrackingViewResponse>(queryKey, (current) =>
        updateTrackingItemShops(current, optimisticTrackedProductId, optimisticShops),
      );

      return { previousTrackingData };
    },
    onSuccess: async () => {
      setShopAssignmentError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tracking-products", ownerKey, "dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["tracking-products", ownerKey] }),
        queryClient.invalidateQueries({ queryKey: ["source-products", ownerKey, "dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["source-products", ownerKey] }),
        queryClient.invalidateQueries({ queryKey: ["etsy-shops", ownerKey] }),
      ]);
    },
    onError: (error, _variables, context) => {
      if (ownerKey && context?.previousTrackingData) {
        queryClient.setQueryData(["tracking-products", ownerKey, "dashboard"], context.previousTrackingData);
      }
      setShopAssignmentError(error instanceof Error ? error.message : "Mağaza ataması kaydedilemedi.");
    },
  });

  const categoryMutation = useMutation<
    { productId?: string; sourceProductId?: string; userCategory: TrackingItem["userCategory"] },
    Error,
    { item: UnifiedDashboardItem; categoryId: string | null },
    { previousTrackingData?: TrackingViewResponse }
  >({
    mutationFn: async ({ item, categoryId }) => {
      if (!ownerKey) {
        throw new Error("Geçersiz owner seçimi.");
      }

      const updateCategory = async (trackedProductId: string) => {
        try {
          return await setTrackedProductCategory(ownerKey, trackedProductId, categoryId);
        } catch (error) {
          const latestTracking = await fetchTrackingView(ownerKey, {});
          const refreshedTrackedProduct = findTrackedProductForItem(item, latestTracking.items);
          if (!refreshedTrackedProduct || refreshedTrackedProduct.id === trackedProductId) {
            throw error;
          }

          return setTrackedProductCategory(ownerKey, refreshedTrackedProduct.id, categoryId);
        }
      };

      const trackedProduct = findTrackedProductForItem(item, trackingQuery.data?.items ?? []);
      if (trackedProduct) {
        return updateCategory(trackedProduct.id);
      }

      if (!item.sourceProduct?.id) {
        throw new Error("Kategori güncellemesi için kaynak ürün kaydı bulunamadı.");
      }

      const response = await setSourceProductUserCategory(ownerKey, item.sourceProduct.id, categoryId);
      return {
        sourceProductId: response.sourceProductId,
        userCategory: response.userCategory,
      };
    },
    onMutate: async ({ item, categoryId }) => {
      if (!ownerKey) {
        return { previousTrackingData: undefined };
      }

      const optimisticTrackedProductId = findTrackedProductForItem(item, trackingQuery.data?.items ?? [])?.id;
      if (!optimisticTrackedProductId) {
        return { previousTrackingData: undefined };
      }

      const queryKey = ["tracking-products", ownerKey, "dashboard"] as const;
      await queryClient.cancelQueries({ queryKey });
      const previousTrackingData = queryClient.getQueryData<TrackingViewResponse>(queryKey);

      const selectedCategory =
        categoryId == null ? null : (categoriesQuery.data ?? []).find((category) => category.id === categoryId) ?? null;

      queryClient.setQueryData<TrackingViewResponse>(queryKey, (current) =>
        updateTrackingItemCategory(
          current,
          optimisticTrackedProductId,
          selectedCategory ? { id: selectedCategory.id, name: selectedCategory.name } : null,
        ),
      );

      return { previousTrackingData };
    },
    onSuccess: async () => {
      setCategoryMutationError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tracking-products", ownerKey, "dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["tracking-products", ownerKey] }),
        queryClient.invalidateQueries({ queryKey: ["source-products", ownerKey, "dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["source-products", ownerKey] }),
      ]);
    },
    onError: (error, _variables, context) => {
      if (ownerKey && context?.previousTrackingData) {
        queryClient.setQueryData(["tracking-products", ownerKey, "dashboard"], context.previousTrackingData);
      }
      setCategoryMutationError(error instanceof Error ? error.message : "Kategori güncellemesi kaydedilemedi.");
    },
  });

  const etsyLinkMutation = useMutation({
    mutationFn: async ({ item, etsyUrl }: { item: UnifiedDashboardItem; etsyUrl: string }) => {
      if (!ownerKey) {
        throw new Error("Geçersiz owner seçimi.");
      }

      if (item.sourceProduct) {
        return addSourceProductEtsyLink(ownerKey, item.sourceProduct.id, { etsyUrl });
      }

      if (item.trackedProduct) {
        return addTrackedProductEtsyLink(ownerKey, item.trackedProduct.id, etsyUrl);
      }

      throw new Error("Etsy linkinin bağlanacağı ürün kaydı bulunamadı.");
    },
    onSuccess: async () => {
      setEtsyLinkMutationError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tracking-products", ownerKey, "dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["tracking-products", ownerKey] }),
        queryClient.invalidateQueries({ queryKey: ["source-products", ownerKey, "dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["source-products", ownerKey] }),
      ]);
    },
    onError: (error, variables) => {
      setEtsyLinkMutationError({
        itemKey: variables.item.key,
        message: error instanceof Error ? error.message : "Etsy linki kaydedilemedi.",
      });
    },
  });

  const etsyLinkDeleteMutation = useMutation({
    mutationFn: async ({
      item,
      etsyLink,
    }: {
      item: UnifiedDashboardItem;
      etsyLink: UnifiedDashboardItem["etsyLinks"][number];
    }) => {
      if (!ownerKey) {
        throw new Error("Geçersiz owner seçimi.");
      }

      const belongsToSourceProduct = item.sourceProduct?.linkedEtsyItems.some((link) => link.id === etsyLink.id);
      if (belongsToSourceProduct && item.sourceProduct) {
        return deleteSourceProductEtsyLink(ownerKey, item.sourceProduct.id, etsyLink.id);
      }

      if (item.trackedProduct) {
        return deleteTrackedProductEtsyLink(ownerKey, item.trackedProduct.id, etsyLink.id);
      }

      if (item.sourceProduct) {
        return deleteSourceProductEtsyLink(ownerKey, item.sourceProduct.id, etsyLink.id);
      }

      throw new Error("Etsy linkinin bağlı olduğu ürün kaydı bulunamadı.");
    },
    onSuccess: async () => {
      setEtsyLinkDeleteError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tracking-products", ownerKey, "dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["tracking-products", ownerKey] }),
        queryClient.invalidateQueries({ queryKey: ["source-products", ownerKey, "dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["source-products", ownerKey] }),
      ]);
    },
    onError: (error, variables) => {
      setEtsyLinkDeleteError({
        itemKey: variables.item.key,
        message: error instanceof Error ? error.message : "Etsy linki silinemedi.",
      });
    },
  });

  const cardDeleteMutation = useMutation({
    mutationFn: async (item: UnifiedDashboardItem) => {
      if (!ownerKey) {
        throw new Error("Geçersiz owner seçimi.");
      }

      const operations: Array<Promise<void>> = [];
      if (item.trackedProduct) {
        operations.push(deleteTrackedProduct(ownerKey, item.trackedProduct.id));
      }
      if (item.sourceProduct) {
        operations.push(deleteSourceProduct(ownerKey, item.sourceProduct.id));
      }
      if (operations.length === 0) {
        throw new Error("Silinecek ürün kaydı bulunamadı.");
      }

      await Promise.all(operations);
    },
    onSuccess: async () => {
      setCardDeleteError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tracking-products", ownerKey, "dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["tracking-products", ownerKey] }),
        queryClient.invalidateQueries({ queryKey: ["source-products", ownerKey, "dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["source-products", ownerKey] }),
        queryClient.invalidateQueries({ queryKey: ["tracking-trash", ownerKey] }),
        queryClient.invalidateQueries({ queryKey: ["source-products-trash", ownerKey] }),
      ]);
    },
    onError: (error, item) => {
      setCardDeleteError({
        itemKey: item.key,
        message: error instanceof Error ? error.message : "Kart silinemedi.",
      });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: ({ id }: { id: string; key: string; name: string }) => deleteProductCategory(ownerKey as OwnerKey, id),
    onSuccess: async (_result, category) => {
      if (selectedTab === category.key) {
        setSelectedTab("all");
      }
      setCategoryDeleteCandidate(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["product-categories", ownerKey] }),
        queryClient.invalidateQueries({ queryKey: ["tracking-products", ownerKey] }),
        queryClient.invalidateQueries({ queryKey: ["source-products", ownerKey] }),
      ]);
    },
  });

  const dashboardItems = useMemo(
    () => buildUnifiedDashboardItems(sourceProductsQuery.data?.items ?? [], trackingQuery.data?.items ?? []),
    [sourceProductsQuery.data?.items, trackingQuery.data?.items],
  );

  const shopScopedItems = useMemo(() => {
    if (!selectedShopId) {
      return dashboardItems;
    }

    return dashboardItems.filter((item) => item.assignedShops.some((shop) => shop.id === selectedShopId));
  }, [dashboardItems, selectedShopId]);

  const tabs = useMemo(() => {
    const categoryMap = new Map<string, { key: string; label: string; count: number; categoryId: string | null }>();

    for (const item of shopScopedItems) {
      if (!item.categoryKey || !item.categoryLabel) {
        continue;
      }

      const current = categoryMap.get(item.categoryKey) ?? {
        key: item.categoryKey,
        label: item.categoryLabel,
        count: 0,
        categoryId:
          (categoriesQuery.data ?? []).find((category) => normalizeCategoryName(category.name) === item.categoryKey)?.id ?? null,
      };

      current.count += 1;
      categoryMap.set(item.categoryKey, current);
    }

    return [...categoryMap.values()].sort((left, right) => left.label.localeCompare(right.label, "tr"));
  }, [categoriesQuery.data, shopScopedItems]);

  const shopCounts = useMemo(() => {
    const counts = new Map<string, number>();

    for (const item of dashboardItems) {
      for (const shop of item.assignedShops) {
        counts.set(shop.id, (counts.get(shop.id) ?? 0) + 1);
      }
    }

    return counts;
  }, [dashboardItems]);

  const filteredItems = useMemo(() => {
    return shopScopedItems.filter((item) => {
      if (selectedTab === "uncategorized" && item.categoryKey !== null) {
        return false;
      }

      if (selectedTab !== "all" && selectedTab !== "uncategorized" && item.categoryKey !== selectedTab) {
        return false;
      }

      return matchesSearch(item, search);
    });
  }, [search, selectedTab, shopScopedItems]);

  const liveSyncHasData = Boolean(trackingQuery.data || sourceProductsQuery.data || shopsQuery.data || categoriesQuery.data);
  const liveSyncFetching = trackingQuery.isFetching || sourceProductsQuery.isFetching || shopsQuery.isFetching || categoriesQuery.isFetching;
  const liveSyncBackgroundError = Boolean(
    (trackingQuery.data && trackingQuery.failureCount > 0) ||
      (sourceProductsQuery.data && sourceProductsQuery.failureCount > 0) ||
      (shopsQuery.data && shopsQuery.failureCount > 0) ||
      (categoriesQuery.data && categoriesQuery.failureCount > 0),
  );

  const latestUpdatedAt = Math.max(
    trackingQuery.dataUpdatedAt || 0,
    sourceProductsQuery.dataUpdatedAt || 0,
    shopsQuery.dataUpdatedAt || 0,
    categoriesQuery.dataUpdatedAt || 0,
  );
  const uncategorizedCount = shopScopedItems.filter((item) => item.categoryKey === null).length;
  const linkedEtsyCount = shopScopedItems.filter((item) => item.etsyLinks.length > 0).length;
  const matchedRecordCount = shopScopedItems.filter((item) => item.sourceProduct && item.trackedProduct).length;
  const assigningItemKey = shopAssignmentMutation.isPending ? shopAssignmentMutation.variables?.item.key ?? null : null;
  const categoryUpdatingItemKey = categoryMutation.isPending ? categoryMutation.variables?.item.key ?? null : null;

  function handleCreateCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = newCategoryName.trim();
    if (!trimmedName || createCategoryMutation.isPending) {
      return;
    }

    createCategoryMutation.mutate(trimmedName);
  }

  if (!ownerKey) {
    return <p className="text-sm text-rose-600">Geçersiz owner seçimi.</p>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-7 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-slate-400">Ürün Dashboard</p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900">Birleşik ürün görünümü</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">
              Trendyol kaynak ürünlerini, Etsy linklerini ve takip kayıtlarını tek panelde kategori sekmeleriyle görüntüleyin.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              to={`/owners/${ownerKey}/source-products`}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300"
            >
              Kaynak ürünleri yönet
            </Link>
            <Link
              to={`/owners/${ownerKey}/source-products/trash`}
              className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
            >
              Kaynak ürün çöp kutusu
            </Link>
          </div>
        </div>
      </section>

      <AddLinkForm ownerKey={ownerKey} shops={shopsQuery.data ?? []} />

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-slate-900">Etsy mağazaları</p>
        <p className="mt-1 text-sm text-slate-500">
          Bir mağaza seçtiğinizde listede yalnızca o mağazaya atanan ürünleri görürsünüz.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedShopId(null)}
            className={[
              "rounded-2xl px-4 py-2 text-sm font-medium transition",
              selectedShopId === null
                ? "bg-[#F1641E] text-white"
                : "border border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300",
            ].join(" ")}
          >
            Tüm mağazalar ({dashboardItems.length})
          </button>
          {(shopsQuery.data ?? []).map((shop) => (
            <button
              key={shop.id}
              type="button"
              onClick={() => setSelectedShopId(shop.id)}
              className={[
                "rounded-2xl px-4 py-2 text-sm font-medium transition",
                selectedShopId === shop.id
                  ? "bg-[#051125] text-white"
                  : "border border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300",
              ].join(" ")}
            >
              {shop.name} ({shopCounts.get(shop.id) ?? 0})
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <StatCard label="Toplam kayıt" value={shopScopedItems.length} helper="Birleşik ürün kartı" />
        <StatCard label="Etsy bağlı" value={linkedEtsyCount} helper="En az 1 Etsy linki olan ürün" />
        <StatCard label="Eşleşen kayıt" value={matchedRecordCount} helper="Kaynak ve takip kaydı birlikte bulunan" />
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <label className="block text-sm font-medium text-slate-600" htmlFor="dashboard-search">
              Arama: ürün veya Etsy linki
            </label>
            <input
              id="dashboard-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Ürün, kategori, marka, kaynak URL veya Etsy linki ara"
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#F1641E]"
            />
            <p className="mt-2 text-xs text-slate-500">Etsy linkinin tamamı veya ilan numarasıyla eşleşen kartlar da listelenir.</p>
          </div>
          <BulkRefreshControl ownerKey={ownerKey} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedTab("all")}
            className={[
              "rounded-2xl px-4 py-2 text-sm font-medium transition",
              selectedTab === "all"
                ? "bg-[#F1641E] text-white"
                : "border border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300",
            ].join(" ")}
          >
            Tümü ({shopScopedItems.length})
          </button>
          {tabs.map((tab) => (
            <div
              key={tab.key}
              className={[
                "inline-flex overflow-hidden rounded-2xl border",
                selectedTab === tab.key ? "border-[#051125] bg-[#051125]" : "border-slate-200 bg-slate-50",
              ].join(" ")}
            >
              <button
                type="button"
                onClick={() => setSelectedTab(tab.key)}
                className={[
                  "px-4 py-2 text-sm font-medium transition",
                  selectedTab === tab.key ? "text-white" : "text-slate-700 hover:bg-white",
                ].join(" ")}
              >
                {tab.label} ({tab.count})
              </button>
              {tab.categoryId ? (
                <button
                  type="button"
                  aria-label={`${tab.label} kategorisini sil`}
                  onClick={() => setCategoryDeleteCandidate({ id: tab.categoryId as string, key: tab.key, name: tab.label })}
                  className={[
                    "border-l px-3 py-2 text-sm font-semibold transition",
                    selectedTab === tab.key
                      ? "border-white/20 text-rose-200 hover:bg-white/10"
                      : "border-slate-200 text-rose-700 hover:bg-rose-50",
                  ].join(" ")}
                >
                  ×
                </button>
              ) : null}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setSelectedTab("uncategorized")}
            className={[
              "rounded-2xl px-4 py-2 text-sm font-medium transition",
              selectedTab === "uncategorized"
                ? "bg-amber-500 text-slate-950"
                : "border border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-300",
            ].join(" ")}
          >
            Kategorisiz ({uncategorizedCount})
          </button>
        </div>

        {categoryDeleteCandidate ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-sm font-semibold text-rose-800">
              “{categoryDeleteCandidate.name}” kategorisi silinsin mi?
            </p>
            <p className="mt-1 text-xs text-rose-700">Bu kategorideki ürünler silinmez; Kategorisiz durumuna taşınır.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCategoryDeleteCandidate(null)}
                disabled={deleteCategoryMutation.isPending}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => deleteCategoryMutation.mutate(categoryDeleteCandidate)}
                disabled={deleteCategoryMutation.isPending}
                className="rounded-2xl bg-rose-700 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-rose-300"
              >
                {deleteCategoryMutation.isPending ? "Siliniyor..." : "Kategoriyi sil"}
              </button>
            </div>
            {deleteCategoryMutation.error instanceof Error ? (
              <p className="mt-2 text-sm text-rose-700">{deleteCategoryMutation.error.message}</p>
            ) : null}
          </div>
        ) : null}

        <form onSubmit={handleCreateCategory} className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <label className="block text-sm font-medium text-slate-600" htmlFor="dashboard-new-category">
              Yeni kategori adı
              <input
                id="dashboard-new-category"
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
                placeholder="Örn. Seramik takılar"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#F1641E]"
              />
            </label>
            <button
              type="submit"
              disabled={createCategoryMutation.isPending || newCategoryName.trim().length === 0}
              className="rounded-2xl bg-[#F1641E] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#d95518] disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {createCategoryMutation.isPending ? "Ekleniyor..." : "Kategori ekle"}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Oluşturduğunuz kategoriler, hem Trendyol takip kartlarında hem de kaynak ürün kartlarında kategori seçimi olarak görünür.
          </p>
          {createCategoryMutation.error instanceof Error ? (
            <p className="mt-2 text-sm text-rose-600">{createCategoryMutation.error.message}</p>
          ) : null}
        </form>
      </div>

      <LiveSyncStatus
        hasData={liveSyncHasData}
        isFetching={liveSyncFetching}
        hasBackgroundError={liveSyncBackgroundError}
        updatedAt={latestUpdatedAt}
      />

      {trackingQuery.isLoading || sourceProductsQuery.isLoading || shopsQuery.isLoading || categoriesQuery.isLoading ? (
        <p className="text-sm text-slate-500">Birleşik ürün dashboard&apos;ı yükleniyor...</p>
      ) : null}

      {(trackingQuery.isError && !trackingQuery.data) ||
      (sourceProductsQuery.isError && !sourceProductsQuery.data) ||
      (shopsQuery.isError && !shopsQuery.data) ||
      (categoriesQuery.isError && !categoriesQuery.data) ? (
        <p className="text-sm text-rose-600">Birleşik ürün dashboard&apos;ı yüklenemedi.</p>
      ) : null}

      {shopAssignmentError ? <p className="text-sm text-rose-600">{shopAssignmentError}</p> : null}
      {categoryMutationError ? <p className="text-sm text-rose-600">{categoryMutationError}</p> : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {filteredItems.map((item) => (
          <UnifiedDashboardCard
            key={item.key}
            ownerKey={ownerKey}
            item={item}
            shops={shopsQuery.data ?? []}
            categories={categoriesQuery.data ?? []}
            isCategoryListLoading={categoriesQuery.isLoading}
            hasCategoryListError={categoriesQuery.isError && !categoriesQuery.data}
            showAssignedShopLabel={!selectedShopId}
            isAssigningShop={assigningItemKey === item.key}
            isCategoryUpdating={categoryUpdatingItemKey === item.key}
            isEtsyLinkAdding={etsyLinkMutation.isPending && etsyLinkMutation.variables?.item.key === item.key}
            etsyLinkError={etsyLinkMutationError?.itemKey === item.key ? etsyLinkMutationError.message : null}
            deletingEtsyLinkId={
              etsyLinkDeleteMutation.isPending && etsyLinkDeleteMutation.variables?.item.key === item.key
                ? etsyLinkDeleteMutation.variables.etsyLink.id
                : null
            }
            etsyLinkDeleteError={etsyLinkDeleteError?.itemKey === item.key ? etsyLinkDeleteError.message : null}
            isCardDeleting={cardDeleteMutation.isPending && cardDeleteMutation.variables?.key === item.key}
            cardDeleteError={cardDeleteError?.itemKey === item.key ? cardDeleteError.message : null}
            onAssignShop={(selectedItem, shopId) => {
              setShopAssignmentError(null);
              shopAssignmentMutation.mutate({ item: selectedItem, shopId });
            }}
            onCategoryChange={(selectedItem, categoryId) => {
              setCategoryMutationError(null);
              categoryMutation.mutate({ item: selectedItem, categoryId });
            }}
            onAddEtsyLink={async (selectedItem, etsyUrl) => {
              setEtsyLinkMutationError(null);
              await etsyLinkMutation.mutateAsync({ item: selectedItem, etsyUrl });
            }}
            onDeleteEtsyLink={async (selectedItem, etsyLink) => {
              setEtsyLinkDeleteError(null);
              await etsyLinkDeleteMutation.mutateAsync({ item: selectedItem, etsyLink });
            }}
            onDeleteCard={async (selectedItem) => {
              setCardDeleteError(null);
              await cardDeleteMutation.mutateAsync(selectedItem);
            }}
          />
        ))}
      </div>

      {!trackingQuery.isLoading &&
      !sourceProductsQuery.isLoading &&
      !shopsQuery.isLoading &&
      !categoriesQuery.isLoading &&
      !trackingQuery.isError &&
      !sourceProductsQuery.isError &&
      !shopsQuery.isError &&
      !categoriesQuery.isError &&
      filteredItems.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-slate-200 bg-white px-5 py-6 text-sm text-slate-500">
          Seçili sekme ve arama filtresi için ürün bulunamadı.
        </p>
      ) : null}
    </div>
  );
}
