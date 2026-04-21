import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { createTrackedProduct, type EtsyShop } from "../../../app/api";
import type { OwnerKey } from "../../shared/lib/ownerRouteState";

interface AddLinkFormProps {
  ownerKey: OwnerKey;
  shops?: EtsyShop[];
  lockedShopId?: string;
}

export function AddLinkForm({ ownerKey, shops = [], lockedShopId }: AddLinkFormProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selectedShopIds, setSelectedShopIds] = useState<string[]>(lockedShopId ? [lockedShopId] : []);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (lockedShopId) {
      setSelectedShopIds([lockedShopId]);
    }
  }, [lockedShopId]);

  const selectedShopSet = useMemo(() => new Set(selectedShopIds), [selectedShopIds]);

  const mutation = useMutation({
    mutationFn: (url: string) => createTrackedProduct(ownerKey, url, { shopIds: selectedShopIds }),
    onSuccess: async () => {
      setValue("");
      setError(null);
      if (!lockedShopId) {
        setSelectedShopIds([]);
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tracking-products", ownerKey] }),
        queryClient.invalidateQueries({ queryKey: ["etsy-shops", ownerKey] }),
      ]);
    },
    onError: (mutationError) => {
      setError(mutationError instanceof Error ? mutationError.message : "Ürün eklenemedi");
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!value.trim()) {
      setError("Trendyol linki gerekli");
      return;
    }

    setError(null);
    mutation.mutate(value.trim());
  }

  function toggleShop(shopId: string) {
    if (lockedShopId) {
      return;
    }

    setSelectedShopIds((current) =>
      current.includes(shopId) ? current.filter((item) => item !== shopId) : [...current, shopId],
    );
  }

  return (
    <form className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-3 lg:flex-row">
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="https://www.trendyol.com/..."
          className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#F1641E]"
        />
        <button
          type="submit"
          className="rounded-2xl bg-[#F1641E] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#d95518]"
        >
          {mutation.isPending ? "Ekleniyor..." : lockedShopId ? "Mağazaya ekle" : "Ekle"}
        </button>
      </div>

      {shops.length > 0 ? (
        <div className="mt-4 rounded-3xl bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Etsy mağazaları</p>
          <p className="mt-1 text-sm text-slate-500">
            {lockedShopId
              ? "Bu ekleme doğrudan seçili mağazaya bağlanacak."
              : "İstersen ürünü eklerken bir veya birden fazla mağazaya bağlayabilirsin."}
          </p>
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {shops.map((shop) => {
              const checked = selectedShopSet.has(shop.id);

              return (
                <label
                  key={shop.id}
                  className={[
                    "flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 text-sm transition",
                    checked
                      ? "border-[#F1641E] bg-orange-50 text-slate-900"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                    lockedShopId ? "cursor-default" : "",
                  ].join(" ")}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleShop(shop.id)}
                    disabled={Boolean(lockedShopId)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-[#F1641E] focus:ring-[#F1641E]"
                  />
                  <span className="min-w-0">
                    <span className="block font-medium text-slate-900">{shop.name}</span>
                    <span className="mt-1 block truncate text-xs text-slate-500">{shop.etsyShopUrl}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
    </form>
  );
}
