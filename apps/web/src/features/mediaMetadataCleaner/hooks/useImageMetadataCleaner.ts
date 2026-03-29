import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { type CollectedMediaFile } from "../lib/fileCollection";
import { resolveRelativePathForFormat } from "../lib/pathUtils";
import { buildMediaMetadataZip, type MediaMetadataZipSourceItem } from "../lib/zipBuilder";
import {
  getImageExtensionFromFileName,
  getMimeTypeForSupportedImageFormat,
  isSupportedImageExtension,
  type SupportedImageFormat,
} from "../lib/supportedImageFormats";
import type { MetadataCleanerWorkerRequest, MetadataCleanerWorkerResponse } from "../workers/metadataCleaner.worker";

export type CleanerStatus = "queued" | "processing" | "success" | "error" | "unsupported" | "cancelled";

export interface CleanerItem {
  id: string;
  file: File;
  name: string;
  relativePath: string;
  extension: string;
  size: number;
  status: CleanerStatus;
  errorCode: string | null;
  errorMessage: string | null;
  zipTargetPath: string | null;
  outputBlob: Blob | null;
}

export interface CleanerSummary {
  totalCount: number;
  queuedCount: number;
  processingCount: number;
  successCount: number;
  errorCount: number;
  unsupportedCount: number;
  cancelledCount: number;
}

export interface UseImageMetadataCleanerResult {
  items: CleanerItem[];
  summary: CleanerSummary;
  isProcessing: boolean;
  isCancelling: boolean;
  zipErrorMessage: string | null;
  canStart: boolean;
  canCancel: boolean;
  canDownloadZip: boolean;
  registerFiles: (files: CollectedMediaFile[]) => void;
  startCleaning: () => Promise<void>;
  cancelCleaning: () => void;
  clearItems: () => void;
  downloadZip: () => void;
}

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `item_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function createMetadataWorker() {
  return new Worker(new URL("../workers/metadataCleaner.worker.ts", import.meta.url), {
    type: "module",
  });
}

function readFileArrayBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === "function") {
    return file.arrayBuffer();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Dosya okunamadi."));
    reader.onload = () => {
      const result = reader.result;

      if (result instanceof ArrayBuffer) {
        resolve(result);
        return;
      }

      reject(new Error("Dosya okunamadi."));
    };
    reader.readAsArrayBuffer(file);
  });
}

function runWorkerJob(worker: Worker, request: MetadataCleanerWorkerRequest) {
  return new Promise<MetadataCleanerWorkerResponse>((resolve, reject) => {
    const handleMessage = (event: MessageEvent<MetadataCleanerWorkerResponse>) => {
      if (!event.data || event.data.id !== request.id) {
        return;
      }

      cleanup();
      resolve(event.data);
    };

    const handleError = (event: ErrorEvent) => {
      cleanup();
      reject(new Error(event.message || "Worker hata verdi."));
    };

    const cleanup = () => {
      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", handleError);
    };

    worker.addEventListener("message", handleMessage);
    worker.addEventListener("error", handleError);
    worker.postMessage(request, [request.bytes]);
  });
}

function getMimeType(file: File, format?: SupportedImageFormat | null) {
  if (format) {
    return getMimeTypeForSupportedImageFormat(format);
  }

  if (file.type) {
    return file.type;
  }

  const extension = getImageExtensionFromFileName(file.name);
  if (!extension || !isSupportedImageExtension(extension)) {
    return "application/octet-stream";
  }

  return getMimeTypeForSupportedImageFormat(extension === "jpg" || extension === "jpeg" ? "jpeg" : extension);
}

function buildZipItems(items: CleanerItem[]): MediaMetadataZipSourceItem[] {
  const zipItems: MediaMetadataZipSourceItem[] = [];

  for (const item of items) {
    if (item.status === "success") {
      zipItems.push({
        sourcePath: item.zipTargetPath ?? item.relativePath,
        status: "success",
        blob: item.outputBlob ?? item.file,
        errorCode: item.errorCode,
        errorMessage: item.errorMessage,
      });
      continue;
    }

    if (item.status === "error" || item.status === "unsupported" || item.status === "cancelled") {
      zipItems.push({
        sourcePath: item.relativePath,
        status: item.status,
        blob: item.file,
        errorCode: item.errorCode,
        errorMessage: item.errorMessage,
      });
    }
  }

  return zipItems;
}

export function useImageMetadataCleaner(): UseImageMetadataCleanerResult {
  const [items, setItems] = useState<CleanerItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [zipBlob, setZipBlob] = useState<Blob | null>(null);
  const [zipErrorMessage, setZipErrorMessage] = useState<string | null>(null);

  const cancelRequestedRef = useRef(false);
  const itemsRef = useRef<CleanerItem[]>([]);
  const cancelSignalResolveRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const registerFiles = useCallback((files: CollectedMediaFile[]) => {
    if (files.length === 0) {
      return;
    }

    setZipBlob(null);
    setZipErrorMessage(null);

    const next = [...itemsRef.current];

    for (const collected of files) {
      const extension = (collected.extension ?? getImageExtensionFromFileName(collected.relativePath) ?? "").toLowerCase();
      const supported = extension.length > 0 && isSupportedImageExtension(extension);

      next.push({
        id: createId(),
        file: collected.file,
        name: collected.file.name,
        relativePath: collected.relativePath,
        extension,
        size: collected.file.size,
        status: supported ? "queued" : "unsupported",
        errorCode: supported ? null : "UNSUPPORTED_EXTENSION",
        errorMessage: supported ? null : "Bu uzanti desteklenmiyor.",
        zipTargetPath: null,
        outputBlob: null,
      });
    }

    itemsRef.current = next;
    setItems(next);
  }, []);

  const patchItem = useCallback((id: string, updater: (item: CleanerItem) => CleanerItem) => {
    const next = itemsRef.current.map((item) => (item.id === id ? updater(item) : item));
    itemsRef.current = next;
    setItems(next);
  }, []);

  const startCleaning = useCallback(async () => {
    if (isProcessing) {
      return;
    }

    const snapshot = itemsRef.current;
    if (snapshot.length === 0) {
      return;
    }

    setIsProcessing(true);
    setIsCancelling(false);
    setZipBlob(null);
    setZipErrorMessage(null);
    cancelRequestedRef.current = false;
    const cancelSignal = new Promise<void>((resolve) => {
      cancelSignalResolveRef.current = resolve;
    });

    const queuedIds = snapshot.filter((item) => item.status === "queued").map((item) => item.id);
    const workerTarget = Math.max(1, Math.min(4, globalThis.navigator?.hardwareConcurrency ?? 4));
    const workerCount = Math.min(workerTarget, Math.max(queuedIds.length, 1));
    let queueIndex = 0;

    const workers = Array.from({ length: workerCount }, () => createMetadataWorker());

    try {
      await Promise.all(
        workers.map(async (worker) => {
          while (!cancelRequestedRef.current) {
            const id = queuedIds[queueIndex];
            queueIndex += 1;

            if (!id) {
              return;
            }

            const itemSnapshot = itemsRef.current.find((item) => item.id === id);
            if (!itemSnapshot) {
              continue;
            }

            patchItem(id, (item) => ({
              ...item,
              status: "processing",
              errorCode: null,
              errorMessage: null,
            }));

            try {
              const request: MetadataCleanerWorkerRequest = {
                id,
                fileName: itemSnapshot.file.name,
                bytes: await readFileArrayBuffer(itemSnapshot.file),
              };

              const result = await Promise.race([
                runWorkerJob(worker, request).then((response) => ({ kind: "response" as const, response })),
                cancelSignal.then(() => ({ kind: "cancelled" as const })),
              ]);

              if (result.kind === "cancelled" || cancelRequestedRef.current) {
                patchItem(id, (item) => ({
                  ...item,
                  status: "cancelled",
                  outputBlob: null,
                  errorCode: "CANCELLED",
                  errorMessage: "Islem kullanici tarafindan iptal edildi.",
                  zipTargetPath: null,
                }));
                continue;
              }

              const { response } = result;

              if (response.status === "success") {
                const zipTargetPath = resolveRelativePathForFormat(itemSnapshot.relativePath, response.format);
                const outputBlob = new Blob([response.cleanedBytes], {
                  type: getMimeType(itemSnapshot.file, response.format),
                });

                patchItem(id, (item) => ({
                  ...item,
                  status: "success",
                  outputBlob,
                  errorCode: null,
                  errorMessage: null,
                  zipTargetPath,
                }));
                continue;
              }

              patchItem(id, (item) => ({
                ...item,
                status: "error",
                outputBlob: null,
                errorCode: response.code,
                errorMessage: response.message,
                zipTargetPath: null,
              }));
            } catch (error) {
              const message = error instanceof Error ? error.message : "Dosya islenemedi.";
              patchItem(id, (item) => ({
                ...item,
                status: "error",
                outputBlob: null,
                errorCode: "WORKER_ERROR",
                errorMessage: message,
                zipTargetPath: null,
              }));
            }
          }
        }),
      );
    } finally {
      cancelSignalResolveRef.current = null;
      for (const worker of workers) {
        worker.terminate();
      }
    }

    let finalItems = itemsRef.current.map((item) => ({ ...item }));

    if (cancelRequestedRef.current) {
      finalItems = finalItems.map((item) => {
        if (item.status === "queued" || item.status === "processing") {
          return {
            ...item,
            status: "cancelled",
            errorCode: "CANCELLED",
            errorMessage: "Islem kullanici tarafindan iptal edildi.",
          };
        }

        return item;
      });

      itemsRef.current = finalItems;
      setItems(finalItems);
    }

    const zipItems = buildZipItems(finalItems);

    if (zipItems.length > 0) {
      try {
        const zipResult = await buildMediaMetadataZip(zipItems);
        setZipBlob(zipResult.blob);
      } catch {
        setZipErrorMessage("ZIP olusturulamadi. Lutfen tekrar deneyin.");
      }
    }

    setIsProcessing(false);
    setIsCancelling(false);
  }, [isProcessing, patchItem]);

  const cancelCleaning = useCallback(() => {
    if (!isProcessing) {
      return;
    }

    cancelRequestedRef.current = true;
    cancelSignalResolveRef.current?.();
    setIsCancelling(true);
  }, [isProcessing]);

  const clearItems = useCallback(() => {
    if (isProcessing) {
      return;
    }

    itemsRef.current = [];
    setItems([]);
    setZipBlob(null);
    setZipErrorMessage(null);
    setIsCancelling(false);
    cancelRequestedRef.current = false;
  }, [isProcessing]);

  const downloadZip = useCallback(() => {
    if (!zipBlob) {
      return;
    }

    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `image-metadata-cleaner-${Date.now()}.zip`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [zipBlob]);

  const summary = useMemo<CleanerSummary>(() => {
    return items.reduce(
      (accumulator, item) => {
        accumulator.totalCount += 1;

        if (item.status === "queued") {
          accumulator.queuedCount += 1;
        } else if (item.status === "processing") {
          accumulator.processingCount += 1;
        } else if (item.status === "success") {
          accumulator.successCount += 1;
        } else if (item.status === "error") {
          accumulator.errorCount += 1;
        } else if (item.status === "unsupported") {
          accumulator.unsupportedCount += 1;
        } else if (item.status === "cancelled") {
          accumulator.cancelledCount += 1;
        }

        return accumulator;
      },
      {
        totalCount: 0,
        queuedCount: 0,
        processingCount: 0,
        successCount: 0,
        errorCount: 0,
        unsupportedCount: 0,
        cancelledCount: 0,
      },
    );
  }, [items]);

  const canStart = !isProcessing && items.length > 0 && (summary.queuedCount > 0 || zipBlob === null);

  return {
    items,
    summary,
    isProcessing,
    isCancelling,
    zipErrorMessage,
    canStart,
    canCancel: isProcessing,
    canDownloadZip: !isProcessing && zipBlob !== null,
    registerFiles,
    startCleaning,
    cancelCleaning,
    clearItems,
    downloadZip,
  };
}
