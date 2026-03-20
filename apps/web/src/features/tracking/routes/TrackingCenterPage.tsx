import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { fetchTrackingView } from "../../../app/api";
import { StatCard } from "../../shared/components/StatCard";
import { AddLinkForm } from "../components/AddLinkForm";
import { ProductCard } from "../components/ProductCard";
import { TrackingFilters } from "../components/TrackingFilters";

export function TrackingCenterPage() {
  const [search, setSearch] = useState("");
  const trackingQuery = useQuery({
    queryKey: ["tracking-products"],
    queryFn: fetchTrackingView,
  });
  const trackingErrorMessage =
    trackingQuery.error instanceof Error ? trackingQuery.error.message : "Ürünler yüklenemedi.";

  const filteredItems = useMemo(() => {
    const items = trackingQuery.data?.items ?? [];
    if (!search.trim()) {
      return items;
    }

    const normalizedSearch = search.toLowerCase();
    return items.filter((item) =>
      [item.title ?? "", item.brand ?? ""].some((value) => value.toLowerCase().includes(normalizedSearch)),
    );
  }, [search, trackingQuery.data?.items]);

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-7 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-slate-400">Dashboard</p>
        <h2 className="mt-3 text-3xl font-semibold text-slate-900">Link Tracking Center</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Trendyol linklerinizi takip edin, fiyat/stok hareketlerini görün ve Etsy hazırlık işlerinizi bu panelden başlatın.
        </p>
      </section>

      <AddLinkForm />

      <div className="grid gap-4 lg:grid-cols-3">
        <StatCard label="Takipte" value={trackingQuery.data?.summary.trackedCount ?? 0} helper="Ürün sayısı" />
        <StatCard label="Aktif" value={trackingQuery.data?.summary.activeCount ?? 0} helper="Aktif kayıtlar" />
        <StatCard
          label="İnceleme gerekli"
          value={trackingQuery.data?.summary.reviewNeededCount ?? 0}
          helper="Parse veya veri kontrolü bekleyen ürünler"
        />
      </div>

      <TrackingFilters search={search} onSearchChange={setSearch} />

      {trackingQuery.isLoading ? <p className="text-sm text-slate-500">Ürünler yükleniyor...</p> : null}
      {trackingQuery.isError ? <p className="text-sm text-rose-600">{trackingErrorMessage}</p> : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {filteredItems.map((item) => (
          <ProductCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
