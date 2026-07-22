import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import {
  addProductLinkedVariant,
  deleteProductLinkedVariant,
  downloadProductImage,
  formatDateTime,
  formatPrice,
  type ProductLinkedVariant,
} from "../../../app/api";
import { StatusBadge } from "../../shared/components/StatusBadge";
import { TrendyolExternalLink } from "../../shared/components/TrendyolExternalLink";
import type { OwnerKey } from "../../shared/lib/ownerRouteState";

interface LinkedProductVariantsPanelProps {
  ownerKey: OwnerKey;
  productId: string;
  variants: ProductLinkedVariant[];
}

export function LinkedProductVariantsPanel({ ownerKey, productId, variants }: LinkedProductVariantsPanelProps) {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [trendyolUrl, setTrendyolUrl] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingImage, setDownloadingImage] = useState<string | null>(null);

  const invalidateDetail = () =>
    queryClient.invalidateQueries({ queryKey: ["product-detail", ownerKey, productId] });

  const addMutation = useMutation({
    mutationFn: (url: string) => addProductLinkedVariant(ownerKey, productId, url),
    onSuccess: async () => {
      setErrorMessage(null);
      setTrendyolUrl("");
      setIsFormOpen(false);
      await invalidateDetail();
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : "Varyant eklenemedi.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (linkedVariantId: string) => deleteProductLinkedVariant(ownerKey, productId, linkedVariantId),
    onSuccess: async (_, linkedVariantId) => {
      setErrorMessage(null);
      setDeletingId(null);
      setExpandedIds((current) => {
        const next = new Set(current);
        next.delete(linkedVariantId);
        return next;
      });
      await invalidateDetail();
    },
    onError: (error) => {
      setDeletingId(null);
      setErrorMessage(error instanceof Error ? error.message : "Varyant silinemedi.");
    },
  });

  const downloadMutation = useMutation({
    mutationFn: ({ image }: { image: string; downloadKey: string }) =>
      downloadProductImage(ownerKey, productId, image),
    onSuccess: ({ blob, filename }) => {
      setErrorMessage(null);
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      setDownloadingImage(null);
    },
    onError: (error) => {
      setDownloadingImage(null);
      setErrorMessage(error instanceof Error ? error.message : "Görsel indirilemedi.");
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedUrl = trendyolUrl.trim();
    if (!normalizedUrl) {
      setErrorMessage("Trendyol ürün linkini girin.");
      return;
    }

    setErrorMessage(null);
    addMutation.mutate(normalizedUrl);
  }

  function toggleVariant(variantId: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(variantId)) {
        next.delete(variantId);
      } else {
        next.add(variantId);
      }
      return next;
    });
  }

  function requestDelete(variant: ProductLinkedVariant) {
    const confirmed = window.confirm(`“${variant.title}” varyantını silmek istediğinize emin misiniz?`);
    if (!confirmed) {
      return;
    }

    setDeletingId(variant.id);
    deleteMutation.mutate(variant.id);
  }

  function requestImageDownload(image: string, downloadKey: string) {
    setErrorMessage(null);
    setDownloadingImage(downloadKey);
    downloadMutation.mutate({ image, downloadKey });
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Renk varyantları</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Aynı ürünün farklı renklerdeki Trendyol kayıtlarını manuel olarak ekleyin.
          </p>
        </div>
        <button
          type="button"
          aria-expanded={isFormOpen}
          onClick={() => {
            setErrorMessage(null);
            setIsFormOpen((current) => !current);
          }}
          className="rounded-2xl bg-[#F1641E] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#d95518]"
        >
          {isFormOpen ? "Formu kapat" : "+ Varyant ekle"}
        </button>
      </div>

      {isFormOpen ? (
        <form onSubmit={handleSubmit} className="mt-4 rounded-2xl border border-slate-200 bg-white p-3">
          <label htmlFor="linked-variant-url" className="text-xs font-semibold text-slate-700">
            Trendyol ürün linki
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              id="linked-variant-url"
              type="url"
              required
              value={trendyolUrl}
              onChange={(event) => setTrendyolUrl(event.target.value)}
              placeholder="https://www.trendyol.com/..."
              className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#F1641E] focus:ring-2 focus:ring-[#F1641E]/20"
            />
            <button
              type="submit"
              disabled={addMutation.isPending}
              className="rounded-xl bg-[#051125] px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {addMutation.isPending ? "Ekleniyor..." : "Kaydet"}
            </button>
          </div>
        </form>
      ) : null}

      {errorMessage ? <p role="alert" className="mt-3 text-sm text-rose-700">{errorMessage}</p> : null}

      {variants.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white px-3 py-4 text-center text-xs text-slate-500">
          Henüz manuel renk varyantı eklenmedi.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {variants.map((variant) => {
            const isExpanded = expandedIds.has(variant.id);
            const coverImage = variant.images.find((image) => Boolean(image));
            const isDeleting = deletingId === variant.id && deleteMutation.isPending;

            return (
              <article key={variant.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-3 p-3">
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    aria-controls={`linked-variant-details-${variant.id}`}
                    onClick={() => toggleVariant(variant.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left outline-none focus:ring-2 focus:ring-[#F1641E]/30"
                  >
                    <span className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                      {coverImage ? (
                        <img src={coverImage} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">Görsel yok</span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-900">{variant.title}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>{formatPrice(variant.currentPrice)}</span>
                        <span aria-hidden="true">•</span>
                        <span>{isExpanded ? "Detayları gizle" : "Detayları göster"}</span>
                      </span>
                    </span>
                    <span aria-hidden="true" className="text-lg text-slate-400">{isExpanded ? "−" : "+"}</span>
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => requestDelete(variant)}
                    className="shrink-0 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isDeleting ? "Siliniyor..." : "Sil"}
                  </button>
                </div>

                {isExpanded ? (
                  <div id={`linked-variant-details-${variant.id}`} className="space-y-4 border-t border-slate-100 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <StatusBadge status={variant.currentStockState} />
                      <TrendyolExternalLink
                        href={variant.trendyolUrl}
                        label={`Trendyol varyant sayfasını yeni sekmede aç: ${variant.title}`}
                        size="sm"
                      />
                    </div>

                    {variant.images.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {variant.images.map((image, index) => {
                          const downloadKey = `${variant.id}-image-${index}`;
                          const isDownloading = downloadMutation.isPending && downloadingImage === downloadKey;

                          return (
                            <div key={downloadKey} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                              <div className="aspect-square overflow-hidden bg-slate-100">
                                <img src={image} alt={`${variant.title} görsel ${index + 1}`} className="h-full w-full object-cover" />
                              </div>
                              <button
                                type="button"
                                disabled={downloadMutation.isPending}
                                onClick={() => requestImageDownload(image, downloadKey)}
                                aria-label={`${variant.title} ${index + 1}. görseli JPG indir`}
                                className="w-full border-t border-slate-200 bg-white px-2 py-2 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-[#F1641E] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isDownloading ? "İndiriliyor..." : "JPG indir"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}

                    <dl className="space-y-2 text-sm text-slate-600">
                      <div className="flex items-start justify-between gap-3">
                        <dt>Başlık</dt>
                        <dd className="max-w-[70%] text-right font-medium text-slate-900">{variant.title}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt>Marka</dt>
                        <dd className="text-right text-slate-900">{variant.brand ?? "Marka yok"}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt>Fiyat</dt>
                        <dd className="text-right font-semibold text-slate-900">{formatPrice(variant.currentPrice)}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt>Son kontrol</dt>
                        <dd className="text-right text-slate-900">{formatDateTime(variant.lastCheckedAt)}</dd>
                      </div>
                    </dl>

                    {variant.descriptionRaw ? (
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Açıklama</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{variant.descriptionRaw}</p>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
