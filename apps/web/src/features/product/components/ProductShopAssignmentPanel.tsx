import { useEffect, useMemo, useState } from "react";

import type { EtsyShop } from "../../../app/api";

interface ProductShopAssignmentPanelProps {
  shops: EtsyShop[];
  assignedShops: EtsyShop[];
  isPending?: boolean;
  errorMessage?: string | null;
  onSave: (shopIds: string[]) => void;
}

export function ProductShopAssignmentPanel({
  shops = [],
  assignedShops = [],
  isPending = false,
  errorMessage = null,
  onSave,
}: ProductShopAssignmentPanelProps) {
  const [selectedShopIds, setSelectedShopIds] = useState<string[]>(assignedShops.map((shop) => shop.id));
  const [pendingShopIds, setPendingShopIds] = useState<string[] | null>(null);

  useEffect(() => {
    setSelectedShopIds(assignedShops.map((shop) => shop.id));
  }, [assignedShops]);

  const assignedSet = useMemo(() => new Set(assignedShops.map((shop) => shop.id)), [assignedShops]);
  const selectedSet = useMemo(() => new Set(selectedShopIds), [selectedShopIds]);
  const hasChanges = useMemo(() => {
    if (assignedSet.size !== selectedSet.size) {
      return true;
    }

    return assignedShops.some((shop) => !selectedSet.has(shop.id));
  }, [assignedSet, assignedShops, selectedSet]);

  function toggleShop(shopId: string) {
    setSelectedShopIds((current) =>
      current.includes(shopId) ? current.filter((item) => item !== shopId) : [...current, shopId],
    );
  }

  function handleSubmit() {
    const nextSet = new Set(selectedShopIds);
    const newlyAddedCount = selectedShopIds.filter((shopId) => !assignedSet.has(shopId)).length;
    const nextCount = nextSet.size;

    if (newlyAddedCount > 0 && nextCount > 1) {
      setPendingShopIds([...nextSet]);
      return;
    }

    onSave([...nextSet]);
  }

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-slate-400">Etsy Mağazaları</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">Ürünü mağazalara bağla</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-500">
            Aynı ürün kaydı birden fazla Etsy mağazasında paylaşılır. Ürün ikinci veya üçüncü mağazaya eklenecekse zorunlu onay istenir.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!hasChanges || isPending}
          className="rounded-2xl bg-[#051125] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#0a1831] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Kaydediliyor..." : "Mağazaları kaydet"}
        </button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {assignedShops.length === 0 ? (
          <span className="rounded-full border border-dashed border-slate-300 px-3 py-1 text-xs font-medium text-slate-500">
            Henüz mağaza ataması yok
          </span>
        ) : (
          assignedShops.map((shop) => (
            <span key={shop.id} className="rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-[#F1641E]">
              {shop.name}
            </span>
          ))
        )}
      </div>

      {shops.length === 0 ? (
        <p className="mt-5 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-5 py-6 text-sm text-slate-500">
          Ürünü bağlamak için önce en az bir Etsy mağazası oluştur.
        </p>
      ) : (
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {shops.map((shop) => {
            const checked = selectedSet.has(shop.id);

            return (
              <label
                key={shop.id}
                className={[
                  "flex cursor-pointer items-start gap-3 rounded-3xl border px-4 py-4 transition",
                  checked ? "border-[#F1641E] bg-orange-50" : "border-slate-200 bg-slate-50 hover:border-slate-300",
                ].join(" ")}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleShop(shop.id)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-[#F1641E] focus:ring-[#F1641E]"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-900">{shop.name}</span>
                  <span className="mt-1 block truncate text-xs text-slate-500">{shop.etsyShopUrl}</span>
                  <span className="mt-2 block text-xs leading-5 text-slate-500">{shop.description ?? "Açıklama yok"}</span>
                </span>
              </label>
            );
          })}
        </div>
      )}

      {errorMessage ? <p className="mt-4 text-sm text-rose-600">{errorMessage}</p> : null}

      {pendingShopIds ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="multi-shop-warning-title"
            className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-xl"
          >
            <h3 id="multi-shop-warning-title" className="text-xl font-semibold text-slate-900">
              Ürün birden fazla mağazaya eklenecek
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Bu ürün ilk mağaza dışında ek mağazalara da bağlanacak. Aynı ürün kaydı tüm mağazalarda ortak kullanılacak. Devam etmek istediğine emin misin?
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingShopIds(null)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => {
                  onSave(pendingShopIds);
                  setPendingShopIds(null);
                }}
                className="rounded-2xl bg-[#F1641E] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#d95518]"
              >
                Devam et
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
