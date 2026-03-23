import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import {
  deleteTrackedProduct,
  fetchTrackingView,
  setTrackedProductFavorite,
  type TrackingItem,
} from "../../../app/api";
import { StatCard } from "../../shared/components/StatCard";
import { AddLinkForm } from "../components/AddLinkForm";
import { BulkRefreshControl } from "../components/BulkRefreshControl";
import { ProductCard } from "../components/ProductCard";
import { TrackingFilters } from "../components/TrackingFilters";

export function TrackingCenterPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"all" | "favorites">("all");
  const trackingQuery = useQuery({
    queryKey: ["tracking-products", view],
    queryFn: () => fetchTrackingView({ favoriteOnly: view === "favorites" }),
  });
  const trackingErrorMessage =
    trackingQuery.error instanceof Error ? trackingQuery.error.message : "Ürünler yüklenemedi.";
  const favoriteMutation = useMutation({
    mutationFn: ({ productId, isFavorite }: { productId: string; isFavorite: boolean }) =>
      setTrackedProductFavorite(productId, isFavorite),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tracking-products"] });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (productId: string) => deleteTrackedProduct(productId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tracking-products"] });
    },
  });

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
  const actionErrorMessage = favoriteMutation.error instanceof Error
    ? favoriteMutation.error.message
    : deleteMutation.error instanceof Error
      ? deleteMutation.error.message
      : null;

  function handleToggleFavorite(item: TrackingItem) {
    favoriteMutation.mutate({ productId: item.id, isFavorite: !item.isFavorite });
  }

  function handleDelete(item: TrackingItem) {
    const title = item.title ?? "Başlıksız ürün";
    if (!window.confirm(`"${title}" ürününü kalıcı olarak silmek istiyor musunuz?`)) {
      return;
    }

    deleteMutation.mutate(item.id);
  }

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setView("all")}
            className={[
              "rounded-2xl px-4 py-2 text-sm font-medium transition",
              view === "all" ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300",
            ].join(" ")}
          >
            Tüm Ürünler
          </button>
          <button
            type="button"
            onClick={() => setView("favorites")}
            className={[
              "rounded-2xl px-4 py-2 text-sm font-medium transition",
              view === "favorites"
                ? "bg-amber-500 text-slate-950"
                : "border border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-300",
            ].join(" ")}
          >
            Favoriler
          </button>
        </div>
        <BulkRefreshControl />
      </div>

      {trackingQuery.isLoading ? <p className="text-sm text-slate-500">Ürünler yükleniyor...</p> : null}
      {trackingQuery.isError ? <p className="text-sm text-rose-600">{trackingErrorMessage}</p> : null}
      {actionErrorMessage ? <p className="text-sm text-rose-600">{actionErrorMessage}</p> : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {filteredItems.map((item) => {
          const favoritePending =
            favoriteMutation.isPending && favoriteMutation.variables?.productId === item.id;
          const deletePending = deleteMutation.isPending && deleteMutation.variables === item.id;

          return (
            <ProductCard
              key={item.id}
              item={item}
              onToggleFavorite={handleToggleFavorite}
              onDelete={handleDelete}
              favoritePending={favoritePending}
              deletePending={deletePending}
            />
          );
        })}
      </div>
      {!trackingQuery.isLoading && !trackingQuery.isError && filteredItems.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-slate-200 bg-white px-5 py-6 text-sm text-slate-500">
          {view === "favorites" ? "Henüz favori ürün yok." : "Henüz takip edilen ürün yok."}
        </p>
      ) : null}
    </div>
  );
}
