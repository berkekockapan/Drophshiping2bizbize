import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { fetchEtsyShops, fetchSourceProductsView, fetchTrackingView } from "../../../app/api";
import { LiveSyncStatus } from "../../shared/components/LiveSyncStatus";
import { StatCard } from "../../shared/components/StatCard";
import { ownerOptions, type OwnerKey } from "../../shared/lib/ownerRouteState";
import { liveSyncQueryOptions } from "../../shared/lib/liveQuery";
import { AddLinkForm } from "../components/AddLinkForm";
import { BulkRefreshControl } from "../components/BulkRefreshControl";
import { UnifiedDashboardCard } from "../components/UnifiedDashboardCard";
import { buildUnifiedDashboardItems } from "../lib/buildUnifiedDashboardItems";

function isOwnerKey(value: string | undefined): value is OwnerKey {
  return ownerOptions.some((owner) => owner.key === value);
}

function matchesSearch(item: ReturnType<typeof buildUnifiedDashboardItems>[number], search: string) {
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
    ...item.etsyLinks.map((etsyLink) => `${etsyLink.title} ${etsyLink.url}`),
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLocaleLowerCase("tr-TR");

  return haystack.includes(normalizedSearch);
}

export function TrackingCenterPage() {
  const { ownerKey: ownerKeyParam } = useParams<{ ownerKey: string }>();
  const ownerKey = isOwnerKey(ownerKeyParam) ? ownerKeyParam : null;
  const [search, setSearch] = useState("");
  const [selectedTab, setSelectedTab] = useState<string>("all");

  const trackingQuery = useQuery({
    queryKey: ["tracking-products", ownerKey, "dashboard"],
    enabled: Boolean(ownerKey),
    queryFn: () => fetchTrackingView(ownerKey as OwnerKey, {}),
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

  const dashboardItems = useMemo(
    () => buildUnifiedDashboardItems(sourceProductsQuery.data?.items ?? [], trackingQuery.data?.items ?? []),
    [sourceProductsQuery.data?.items, trackingQuery.data?.items],
  );

  const tabs = useMemo(() => {
    const categoryMap = new Map<string, { key: string; label: string; count: number }>();

    for (const item of dashboardItems) {
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
  }, [dashboardItems]);

  const filteredItems = useMemo(() => {
    return dashboardItems.filter((item) => {
      if (selectedTab === "uncategorized" && item.categoryKey !== null) {
        return false;
      }

      if (selectedTab !== "all" && selectedTab !== "uncategorized" && item.categoryKey !== selectedTab) {
        return false;
      }

      return matchesSearch(item, search);
    });
  }, [dashboardItems, search, selectedTab]);

  const liveSyncHasData = Boolean(trackingQuery.data || sourceProductsQuery.data);
  const liveSyncFetching = trackingQuery.isFetching || sourceProductsQuery.isFetching;
  const liveSyncBackgroundError = Boolean(
    (trackingQuery.data && trackingQuery.failureCount > 0) ||
      (sourceProductsQuery.data && sourceProductsQuery.failureCount > 0),
  );

  const latestUpdatedAt = Math.max(trackingQuery.dataUpdatedAt || 0, sourceProductsQuery.dataUpdatedAt || 0);
  const uncategorizedCount = dashboardItems.filter((item) => item.categoryKey === null).length;
  const linkedEtsyCount = dashboardItems.filter((item) => item.etsyLinks.length > 0).length;
  const matchedRecordCount = dashboardItems.filter((item) => item.sourceProduct && item.trackedProduct).length;

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

      <div className="grid gap-4 lg:grid-cols-3">
        <StatCard label="Toplam kayıt" value={dashboardItems.length} helper="Birleşik ürün kartı" />
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
            Tümü ({dashboardItems.length})
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

      {trackingQuery.isLoading || sourceProductsQuery.isLoading ? (
        <p className="text-sm text-slate-500">Birleşik ürün dashboard&apos;ı yükleniyor...</p>
      ) : null}

      {(trackingQuery.isError && !trackingQuery.data) || (sourceProductsQuery.isError && !sourceProductsQuery.data) ? (
        <p className="text-sm text-rose-600">Birleşik ürün dashboard&apos;ı yüklenemedi.</p>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {filteredItems.map((item) => (
          <UnifiedDashboardCard key={item.key} ownerKey={ownerKey} item={item} />
        ))}
      </div>

      {!trackingQuery.isLoading &&
      !sourceProductsQuery.isLoading &&
      !trackingQuery.isError &&
      !sourceProductsQuery.isError &&
      filteredItems.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-slate-200 bg-white px-5 py-6 text-sm text-slate-500">
          Seçili sekme ve arama filtresi için ürün bulunamadı.
        </p>
      ) : null}
    </div>
  );
}
