import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { createEtsyShop, fetchEtsyShops } from "../../../app/api";
import { LiveSyncStatus } from "../../shared/components/LiveSyncStatus";
import { ownerOptions, type OwnerKey } from "../../shared/lib/ownerRouteState";
import { liveSyncQueryOptions } from "../../shared/lib/liveQuery";

function isOwnerKey(value: string | undefined): value is OwnerKey {
  return ownerOptions.some((owner) => owner.key === value);
}

export function EtsyShopsPage() {
  const { ownerKey: ownerKeyParam } = useParams<{ ownerKey: string }>();
  const ownerKey = isOwnerKey(ownerKeyParam) ? ownerKeyParam : null;
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [etsyShopUrl, setEtsyShopUrl] = useState("");
  const [description, setDescription] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const shopsQuery = useQuery({
    queryKey: ["etsy-shops", ownerKey],
    enabled: Boolean(ownerKey),
    queryFn: async () => (await fetchEtsyShops(ownerKey as OwnerKey)).items,
    ...liveSyncQueryOptions,
  });

  const createShopMutation = useMutation({
    mutationFn: () =>
      createEtsyShop(ownerKey as OwnerKey, {
        name: name.trim(),
        etsyShopUrl: etsyShopUrl.trim(),
        description: description.trim() || null,
      }),
    onSuccess: async () => {
      setName("");
      setEtsyShopUrl("");
      setDescription("");
      setErrorMessage(null);
      await queryClient.invalidateQueries({ queryKey: ["etsy-shops", ownerKey] });
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : "Magaza olusturulamadi.");
    },
  });

  if (!ownerKey) {
    return <p className="text-sm text-rose-600">Gecersiz owner secimi.</p>;
  }

  return (
    <div className="space-y-6">
      <LiveSyncStatus
        hasData={Boolean(shopsQuery.data)}
        isFetching={shopsQuery.isFetching}
        hasBackgroundError={Boolean(shopsQuery.data && shopsQuery.failureCount > 0)}
        updatedAt={shopsQuery.dataUpdatedAt}
      />

      <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-7 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-slate-400">Etsy Magazalari</p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900">Coklu magaza yonetimi</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">
              Yeni Etsy magazalari olustur, her magazaya ait sayfayi ac ve urunleri istedigin magazalara bagla.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-slate-400">Magaza Olustur</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">Yeni Etsy magazasi ekle</h2>
          </div>
        </div>

        <form
          className="mt-5 grid gap-4 lg:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();

            if (!name.trim() || !etsyShopUrl.trim()) {
              setErrorMessage("Magaza adi ve Etsy shop URL gerekli.");
              return;
            }

            setErrorMessage(null);
            createShopMutation.mutate();
          }}
        >
          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="etsy-shop-name">
              Magaza adi
            </label>
            <input
              id="etsy-shop-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#F1641E]"
              placeholder="Ornek: CozyMinimalPrints"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700" htmlFor="etsy-shop-url">
              Etsy shop URL
            </label>
            <input
              id="etsy-shop-url"
              value={etsyShopUrl}
              onChange={(event) => setEtsyShopUrl(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#F1641E]"
              placeholder="https://www.etsy.com/shop/..."
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-slate-700" htmlFor="etsy-shop-description">
              Aciklama
            </label>
            <textarea
              id="etsy-shop-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-2 min-h-28 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#F1641E]"
              placeholder="Magazanin odagi, notlari veya ic satis stratejisi"
            />
          </div>

          <div className="lg:col-span-2 flex flex-wrap items-center justify-between gap-3">
            {errorMessage ? <p className="text-sm text-rose-600">{errorMessage}</p> : <span />}
            <button
              type="submit"
              disabled={createShopMutation.isPending}
              className="rounded-2xl bg-[#F1641E] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#d95518] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {createShopMutation.isPending ? "Magaza olusturuluyor..." : "Magaza olustur"}
            </button>
          </div>
        </form>
      </section>

      {shopsQuery.isLoading ? <p className="text-sm text-slate-500">Etsy magazalari yukleniyor...</p> : null}
      {shopsQuery.isError && !shopsQuery.data ? <p className="text-sm text-rose-600">Etsy magazalari yuklenemedi.</p> : null}

      <section className="grid gap-4 xl:grid-cols-2">
        {(shopsQuery.data ?? []).map((shop) => (
          <article key={shop.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-400">Magaza Sayfasi</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">{shop.name}</h2>
                <a
                  href={shop.etsyShopUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block truncate text-sm text-slate-600 underline decoration-slate-300 underline-offset-2"
                >
                  {shop.etsyShopUrl}
                </a>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {shop.productCount ?? 0} urun
              </span>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">{shop.description ?? "Aciklama yok."}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                to={`/owners/${ownerKey}/etsy-shops/${shop.id}`}
                className="rounded-2xl bg-[#051125] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0a1831]"
              >
                Magaza sayfasini ac
              </Link>
            </div>
          </article>
        ))}
      </section>

      {!shopsQuery.isLoading && !shopsQuery.isError && (shopsQuery.data ?? []).length === 0 ? (
        <p className="rounded-3xl border border-dashed border-slate-200 bg-white px-5 py-6 text-sm text-slate-500">
          Henuz Etsy magazasi yok. Yukaridaki formdan ilk magazani olustur.
        </p>
      ) : null}
    </div>
  );
}
