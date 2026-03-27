import "@testing-library/jest-dom/vitest";

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CollectedMediaFile } from "../lib/fileCollection";
import type { MediaMetadataZipSourceItem } from "../lib/zipBuilder";

const zipBuilderMocks = vi.hoisted(() => ({
  buildMediaMetadataZip: vi.fn(),
}));

vi.mock("../lib/zipBuilder", () => ({
  buildMediaMetadataZip: zipBuilderMocks.buildMediaMetadataZip,
}));

import { useImageMetadataCleaner } from "./useImageMetadataCleaner";

type WorkerMessageEvent = { data: unknown };
type WorkerMessageHandler = (event: WorkerMessageEvent) => void;
type WorkerErrorHandler = (event: { message?: string }) => void;
type WorkerRequestHandler = (request: { id: string; fileName: string; bytes: ArrayBuffer }, worker: MockWorker) => void;

let workerRequestHandler: WorkerRequestHandler | null = null;
const workerInstances: MockWorker[] = [];

class MockWorker {
  private readonly messageListeners = new Set<WorkerMessageHandler>();
  private readonly errorListeners = new Set<WorkerErrorHandler>();

  public readonly postMessage = vi.fn((request: { id: string; fileName: string; bytes: ArrayBuffer }) => {
    workerRequestHandler?.(request, this);
  });

  public readonly terminate = vi.fn();

  constructor() {
    workerInstances.push(this);
  }

  addEventListener(type: "message" | "error", listener: WorkerMessageHandler | WorkerErrorHandler) {
    if (type === "message") {
      this.messageListeners.add(listener as WorkerMessageHandler);
      return;
    }

    this.errorListeners.add(listener as WorkerErrorHandler);
  }

  removeEventListener(type: "message" | "error", listener: WorkerMessageHandler | WorkerErrorHandler) {
    if (type === "message") {
      this.messageListeners.delete(listener as WorkerMessageHandler);
      return;
    }

    this.errorListeners.delete(listener as WorkerErrorHandler);
  }

  emitMessage(data: unknown) {
    for (const listener of this.messageListeners) {
      listener({ data });
    }
  }

  emitError(message: string) {
    for (const listener of this.errorListeners) {
      listener({ message });
    }
  }
}

function createFile(name: string, content: string, type = "image/jpeg") {
  return new File([content], name, { type });
}

function createCollectedFile(
  file: File,
  relativePath: string,
  extension: CollectedMediaFile["extension"],
): CollectedMediaFile {
  return {
    file,
    relativePath,
    source: "input" as const,
    extension,
  };
}

function createZipResult() {
  return {
    blob: new Blob(["zip"], { type: "application/zip" }),
    report: {
      generatedAt: "2026-03-27T00:00:00.000Z",
      summary: {
        totalCount: 0,
        successCount: 0,
        errorCount: 0,
        unsupportedCount: 0,
        cancelledCount: 0,
        zipEntryCount: 1,
      },
      entries: [],
    },
  };
}

function setHardwareConcurrency(value: number) {
  Object.defineProperty(globalThis.navigator, "hardwareConcurrency", {
    value,
    configurable: true,
  });
}

describe("useImageMetadataCleaner", () => {
  beforeEach(() => {
    workerInstances.length = 0;
    workerRequestHandler = null;
    zipBuilderMocks.buildMediaMetadataZip.mockReset();
    zipBuilderMocks.buildMediaMetadataZip.mockResolvedValue(createZipResult());
    vi.stubGlobal("Worker", MockWorker);
    setHardwareConcurrency(2);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("kuyruk özetlerini ve canDownloadZip durumunu registerFiles sonrası doğru hesaplar", () => {
    const { result } = renderHook(() => useImageMetadataCleaner());

    act(() => {
      result.current.registerFiles([
        createCollectedFile(createFile("cover.jpg", "ok"), "album/cover.jpg", "jpg"),
        createCollectedFile(createFile("poster.gif", "skip", "image/gif"), "album/poster.gif", null),
      ]);
    });

    expect(result.current.summary).toMatchObject({
      totalCount: 2,
      queuedCount: 1,
      processingCount: 0,
      successCount: 0,
      errorCount: 0,
      unsupportedCount: 1,
      cancelledCount: 0,
    });
    expect(result.current.canStart).toBe(true);
    expect(result.current.canDownloadZip).toBe(false);
    expect(result.current.items.map((item) => item.status)).toEqual(["queued", "unsupported"]);
  });

  it("startCleaning akışında kısmi başarı ve hata durumlarını ZIP'e yansıtır", async () => {
    const { result } = renderHook(() => useImageMetadataCleaner());

    workerRequestHandler = (request, worker) => {
      if (request.fileName === "success.jpg") {
        worker.emitMessage({
          id: request.id,
          status: "success",
          fileName: request.fileName,
          format: "jpeg",
          cleanedBytes: new Uint8Array([1, 2, 3]).buffer,
          removedMetadataBlocks: ["APP1"],
          changed: true,
        });
        return;
      }

      worker.emitMessage({
        id: request.id,
        status: "error",
        fileName: request.fileName,
        format: "jpeg",
        code: "INVALID_IMAGE_DATA",
        message: "Bozuk dosya",
      });
    };

    act(() => {
      result.current.registerFiles([
        createCollectedFile(createFile("success.jpg", "one"), "gallery/success.jpg", "jpg"),
        createCollectedFile(createFile("broken.jpg", "two"), "gallery/broken.jpg", "jpg"),
      ]);
    });

    await act(async () => {
      await result.current.startCleaning();
    });

    expect(result.current.summary).toMatchObject({
      totalCount: 2,
      queuedCount: 0,
      processingCount: 0,
      successCount: 1,
      errorCount: 1,
      unsupportedCount: 0,
      cancelledCount: 0,
    });
    expect(result.current.items.map((item) => item.status)).toEqual(["success", "error"]);
    expect(result.current.items[0]?.outputBlob).toBeInstanceOf(Blob);
    await waitFor(() => {
      expect(zipBuilderMocks.buildMediaMetadataZip).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(result.current.canDownloadZip).toBe(true);
    });

    const [zipItems] = zipBuilderMocks.buildMediaMetadataZip.mock.calls[0] as [
      MediaMetadataZipSourceItem[],
    ];

    expect(zipItems).toEqual([
      expect.objectContaining({
        sourcePath: "gallery/success.jpg",
        status: "success",
      }),
      expect.objectContaining({
        sourcePath: "gallery/broken.jpg",
        status: "error",
        errorCode: "INVALID_IMAGE_DATA",
        errorMessage: "Bozuk dosya",
      }),
    ]);
    expect(workerInstances).toHaveLength(2);
    expect(workerInstances.every((worker) => worker.terminate.mock.calls.length === 1)).toBe(true);
  });

  it("iptal edildiğinde processing ve queued öğeleri cancelled olarak işaretler", async () => {
    const { result } = renderHook(() => useImageMetadataCleaner());
    let resolveWorkerResponse: (() => void) | null = null;

    workerRequestHandler = (_request, worker) => {
      resolveWorkerResponse = () => {
        worker.emitMessage({
          id: _request.id,
          status: "success",
          fileName: _request.fileName,
          format: "jpeg",
          cleanedBytes: new Uint8Array([9, 9, 9]).buffer,
          removedMetadataBlocks: [],
          changed: false,
        });
      };
    };

    act(() => {
      result.current.registerFiles([
        createCollectedFile(createFile("one.jpg", "1"), "batch/one.jpg", "jpg"),
        createCollectedFile(createFile("two.jpg", "2"), "batch/two.jpg", "jpg"),
        createCollectedFile(createFile("three.jpg", "3"), "batch/three.jpg", "jpg"),
      ]);
    });

    setHardwareConcurrency(1);

    act(() => {
      void result.current.startCleaning();
    });

    await waitFor(() => {
      expect(result.current.items[0]?.status).toBe("processing");
    });

    act(() => {
      result.current.cancelCleaning();
    });

    expect(result.current.isCancelling).toBe(true);

    await act(async () => {
      resolveWorkerResponse?.();
    });

    await waitFor(() => {
      expect(zipBuilderMocks.buildMediaMetadataZip).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(result.current.isProcessing).toBe(false);
    });

    expect(result.current.items.map((item) => item.status)).toEqual(["cancelled", "cancelled", "cancelled"]);
    expect(result.current.summary).toMatchObject({
      totalCount: 3,
      queuedCount: 0,
      processingCount: 0,
      successCount: 0,
      errorCount: 0,
      unsupportedCount: 0,
      cancelledCount: 3,
    });
    expect(result.current.canDownloadZip).toBe(true);
    expect(zipBuilderMocks.buildMediaMetadataZip).toHaveBeenCalledTimes(1);

    const [zipItems] = zipBuilderMocks.buildMediaMetadataZip.mock.calls[0] as [MediaMetadataZipSourceItem[]];
    expect(zipItems.every((item) => item.status === "cancelled")).toBe(true);
  });
});
