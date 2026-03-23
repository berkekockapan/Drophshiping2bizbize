import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { downloadProductImage } from "../../../app/api";

interface ProductImageGalleryProps {
  productId: string;
  title: string | null;
  images: Array<string | null | undefined> | null | undefined;
}

function normalizeImages(images: Array<string | null | undefined> | null | undefined) {
  return (images ?? [])
    .map((image) => image?.trim() ?? "")
    .filter((image): image is string => image.length > 0);
}

export function ProductImageGallery({ productId, title, images }: ProductImageGalleryProps) {
  const normalizedImages = useMemo(() => normalizeImages(images), [images]);
  const [selectedImage, setSelectedImage] = useState<string | null>(normalizedImages[0] ?? null);

  useEffect(() => {
    setSelectedImage(normalizedImages[0] ?? null);
  }, [normalizedImages]);

  const displayTitle = title?.trim() || "Ürün";
  const downloadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedImage) {
        throw new Error("Görsel indirilemedi.");
      }

      return downloadProductImage(productId, selectedImage);
    },
    onSuccess: ({ blob, filename }) => {
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    },
  });
  const downloadErrorMessage =
    downloadMutation.error instanceof Error ? downloadMutation.error.message : null;

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-slate-400">Görseller</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Ürün görseli</h2>
          </div>
          <div className="flex items-center gap-3">
            {normalizedImages.length > 1 ? <p className="text-sm text-slate-500">{normalizedImages.length} görsel</p> : null}
            {selectedImage ? (
              <button
                type="button"
                onClick={() => downloadMutation.mutate()}
                disabled={downloadMutation.isPending}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {downloadMutation.isPending ? "İndiriliyor..." : "JPG indir"}
              </button>
            ) : null}
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
          {selectedImage ? (
            <img src={selectedImage} alt={`${displayTitle} ana görsel`} className="h-[24rem] w-full object-cover" />
          ) : (
            <div className="flex min-h-[24rem] items-center justify-center px-6 text-sm text-slate-400">
              Görsel bulunamadı
            </div>
          )}
        </div>

        {normalizedImages.length > 1 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {normalizedImages.map((image, index) => {
              const isSelected = image === selectedImage;

              return (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  aria-label={`Görsel ${index + 1}`}
                  onClick={() => setSelectedImage(image)}
                  className={[
                    "overflow-hidden rounded-2xl border transition focus:outline-none focus:ring-2 focus:ring-slate-300",
                    isSelected ? "border-slate-400 ring-1 ring-slate-300" : "border-slate-200 hover:border-slate-300",
                  ].join(" ")}
                >
                  <img src={image} alt="" className="h-20 w-full object-cover" />
                </button>
              );
            })}
          </div>
        ) : null}
        {downloadErrorMessage ? <p className="text-sm text-rose-600">{downloadErrorMessage}</p> : null}
      </div>
    </section>
  );
}
