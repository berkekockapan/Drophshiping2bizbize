import { useMemo, useState } from "react";

import { collectFilesFromDropItems, collectFilesFromInputList } from "../lib/fileCollection";
import type { UseImageMetadataCleanerResult } from "../hooks/useImageMetadataCleaner";

interface ImageMetadataCleanerWorkspaceProps {
  cleaner: UseImageMetadataCleanerResult;
}

const webkitDirectoryProps = { webkitdirectory: "true" } as any;

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let index = 0;

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[index]}`;
}

function statusLabel(status: string) {
  switch (status) {
    case "queued":
      return "Sirada";
    case "processing":
      return "Isleniyor";
    case "success":
      return "Basarili";
    case "error":
      return "Hatali";
    case "unsupported":
      return "Desteklenmiyor";
    case "cancelled":
      return "Iptal";
    default:
      return status;
  }
}

export function ImageMetadataCleanerWorkspace({ cleaner }: ImageMetadataCleanerWorkspaceProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const acceptedExtensions = useMemo(() => "JPG, PNG, WebP, HEIC ve AVIF", []);

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Bilgilendirme</p>
        <h2 className="mt-3 text-2xl font-semibold text-slate-900">Tarayici icinde, cihazda calisir</h2>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
          Bu arac gorselleri sunucuya gondermez. Dosyalarinizi surukleyip birakabilir ya da klasor olarak
          secebilirsiniz. Basarili dosyalar orijinal formatlarinda korunur; metadata guvenli sekilde
          temizlenemeyen dosyalar ise <span className="font-semibold text-slate-900">hatali/</span> klasorune
          orijinal halleriyle alinir.
        </p>

        <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="font-semibold text-slate-900">Desteklenen formatlar</p>
            <p className="mt-1">{acceptedExtensions}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="font-semibold text-slate-900">Korunanlar</p>
            <p className="mt-1">Piksel olculeri ve format, yeniden encode edilmeden korunur.</p>
          </div>
          <div className="rounded-2xl bg-amber-50 p-4 text-amber-900">
            <p className="font-semibold">Uyari</p>
            <p className="mt-1">ICC profili silindigi icin bazi goruntuleyiciler renkleri farkli yorumlayabilir.</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="font-semibold text-slate-900">Toplu kullanim</p>
            <p className="mt-1">Ortalama 50-60 dosya kuyrugu icin optimize edilmistir.</p>
          </div>
        </div>
      </section>

      <section
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={async (event) => {
          event.preventDefault();
          setIsDragging(false);
          setInputError(null);

          try {
            const files = await collectFilesFromDropItems(event.dataTransfer.items);
            cleaner.registerFiles(files);
          } catch {
            setInputError("Dosyalar okunamadi. Lutfen tekrar deneyin.");
          }
        }}
        className={[
          "rounded-[28px] border-2 border-dashed bg-white p-6 shadow-sm transition",
          isDragging ? "border-[#F1641E] bg-orange-50/60" : "border-slate-200",
        ].join(" ")}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Dosya ekle</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Dosyalari veya klasorleri birakin</h2>
            <p className="mt-2 text-sm text-slate-600">
              Surukle-birak, tek tek secim veya klasor secimi ile {acceptedExtensions} dosyalari ekleyin.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <label className="inline-flex cursor-pointer items-center rounded-xl bg-[#051125] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d1830]">
              Dosya sec
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(event) => {
                  const files = collectFilesFromInputList(event.target.files ?? []);
                  cleaner.registerFiles(files);
                  setInputError(null);
                  event.currentTarget.value = "";
                }}
              />
            </label>

            <label className="inline-flex cursor-pointer items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50">
              Klasor sec
              <input
                type="file"
                multiple
                {...webkitDirectoryProps}
                className="hidden"
                onChange={(event) => {
                  const files = collectFilesFromInputList(event.target.files ?? []);
                  cleaner.registerFiles(files);
                  setInputError(null);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center">
          <p className="text-base font-medium text-slate-900">Dosyalari buraya surukleyin</p>
          <p className="mt-2 text-sm text-slate-500">Klasor yapisi korunur, cikti tek ZIP olur.</p>
        </div>

        {inputError ? <p className="mt-3 text-sm text-rose-600">{inputError}</p> : null}
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Kuyruk</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">Islenecek dosyalar</h2>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                void cleaner.startCleaning();
              }}
              disabled={!cleaner.canStart}
              className="rounded-xl bg-[#F1641E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#d95716] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Temizlemeyi Baslat
            </button>
            <button
              type="button"
              onClick={cleaner.cancelCleaning}
              disabled={!cleaner.canCancel}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Iptal Et
            </button>
            <button
              type="button"
              onClick={cleaner.downloadZip}
              disabled={!cleaner.canDownloadZip}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              ZIP Indir
            </button>
            <button
              type="button"
              onClick={cleaner.clearItems}
              disabled={cleaner.isProcessing || cleaner.items.length === 0}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Listeyi Temizle
            </button>
          </div>
        </div>

        {cleaner.items.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
            Henuz dosya eklenmedi.
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Dosya</th>
                  <th className="px-4 py-3">Goreli yol</th>
                  <th className="px-4 py-3">Boyut</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3">Hata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {cleaner.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{item.name}</div>
                      <div className="text-xs uppercase tracking-[0.16em] text-slate-400">{item.extension || "?"}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.relativePath}</td>
                    <td className="px-4 py-3 text-slate-600">{formatFileSize(item.size)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={[
                          "inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]",
                          item.status === "success"
                            ? "bg-emerald-50 text-emerald-700"
                            : item.status === "error" || item.status === "unsupported"
                              ? "bg-rose-50 text-rose-700"
                              : item.status === "processing"
                                ? "bg-amber-50 text-amber-700"
                                : item.status === "cancelled"
                                  ? "bg-slate-200 text-slate-700"
                                  : "bg-slate-100 text-slate-600",
                        ].join(" ")}
                      >
                        {statusLabel(item.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.errorMessage ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Toplam</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{cleaner.summary.totalCount}</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Basarili</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-600">{cleaner.summary.successCount}</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Hatali</p>
          <p className="mt-2 text-3xl font-semibold text-rose-600">
            {cleaner.summary.errorCount + cleaner.summary.unsupportedCount + cleaner.summary.cancelledCount}
          </p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Siradaki</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{cleaner.summary.queuedCount}</p>
        </div>
      </section>

      {cleaner.isCancelling ? (
        <p className="text-sm text-slate-500">Iptal istegi alindi, calisan isler tamamlaninca duracak.</p>
      ) : null}

      {cleaner.zipErrorMessage ? <p className="text-sm text-rose-600">{cleaner.zipErrorMessage}</p> : null}
    </div>
  );
}
