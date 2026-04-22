import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  assignShopBySourceUrl,
  fetchEtsyShops,
  fetchProductCategories,
  fetchSourceProductsView,
  fetchTrackingView,
  setTrackedProductCategory,
  type TrackingItem,
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

export function TrackingCenterPage() {
  const { ownerKey: ownerKeyParam } = useParams<{ ownerKey: string }>();
  const ownerKey = isOwnerKey(ownerKeyParam) ? ownerKeyParam : null;
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedTab, setSelectedTab] = useState<string>("all");
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [shopAssignmentError, setShopAssignmentError] = useState<string | null>(null);
  const [categoryMutationError, setCategoryMutationError] = useState<string | null>(null);

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
    { productId: string; shops: Array<{ id: string; name: string; etsyShopUrl: string; description: string | null }> } | null,
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

      if (!item.sourceUrl) {
        throw new Error("Kaynak ürün URL bilgisi bulunamadı.");
      }

      if (!shopId) {
        throw new Error("Kaynak ürün için bir mağaza seçmelisiniz.");
      }

      const response = await assignShopBySourceUrl(ownerKey, item.sourceUrl, shopId);
      return { productId: response.productId, shops: response.shops };
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

  const categoryMutation = useMutation<unknown, Error, { item: UnifiedDashboardItem; categoryId: string | null }>({
    mutationFn: async ({ item, categoryId }) => {
      if (!ownerKey || !item.trackedProduct) {
        throw new Error("Kategori güncellemesi için takip kaydı bulunamadı.");
      }

      return setTrackedProductCategory(ownerKey, item.trackedProduct.id, categoryId);
    },
    onSuccess: async () => {
      setCategoryMutationError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tracking-products", ownerKey, "dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["tracking-products", ownerKey] }),
      ]);
    },
    onError: (error) => {
      setCategoryMutationError(error instanceof Error ? error.message : "Kategori güncellemesi kaydedilemedi.");
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
    const categoryMap = new Map<string, { key: string; label: string; count: number }>();

    for (const item of shopScopedItems) {
      if (!item.categoryKey || !item.categoryLabel) {
        continue;
      }

      const current = categoryMap.get(item.categoryKey) ?? {
        key: item.categoryKey,
        label: item.categoryLabel,
        count: 0,
      };

      current.count += 1;
      categoryMap.set(item.categoryKey, current);
    }

    return [...categoryMap.values()].sort((left, right) => left.label.localeCompare(right.label, "tr"));
  }, [shopScopedItems]);

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
              Arama
            </label>
            <input
              id="dashboard-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Ürün, kategori, marka, kaynak URL veya Etsy linki ara"
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#F1641E]"
            />
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
            <button
              key={tab.key}
              type="button"
              onClick={() => setSelectedTab(tab.key)}
              className={[
                "rounded-2xl px-4 py-2 text-sm font-medium transition",
                selectedTab === tab.key
                  ? "bg-[#051125] text-white"
                  : "border border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300",
              ].join(" ")}
            >
              {tab.label} ({tab.count})
            </button>
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
            showAssignedShopLabel={!selectedShopId}
            isAssigningShop={assigningItemKey === item.key}
            isCategoryUpdating={categoryUpdatingItemKey === item.key}
            onAssignShop={(selectedItem, shopId) => {
              setShopAssignmentError(null);
              shopAssignmentMutation.mutate({ item: selectedItem, shopId });
            }}
            onCategoryChange={(selectedItem, categoryId) => {
              setCategoryMutationError(null);
              categoryMutation.mutate({ item: selectedItem, categoryId });
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
