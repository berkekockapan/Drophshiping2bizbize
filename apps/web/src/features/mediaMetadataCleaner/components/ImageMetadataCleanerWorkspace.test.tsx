import "@testing-library/jest-dom/vitest";

import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { render } from "../../../test/test-utils";
import type { UseImageMetadataCleanerResult } from "../hooks/useImageMetadataCleaner";
import { ImageMetadataCleanerWorkspace } from "./ImageMetadataCleanerWorkspace";

function createCleanerStub(overrides: Partial<UseImageMetadataCleanerResult> = {}): UseImageMetadataCleanerResult {
  return {
    items: [],
    summary: {
      totalCount: 0,
      queuedCount: 0,
      processingCount: 0,
      successCount: 0,
      errorCount: 0,
      unsupportedCount: 0,
      cancelledCount: 0,
    },
    isProcessing: false,
    isCancelling: false,
    zipErrorMessage: null,
    canStart: false,
    canCancel: false,
    canDownloadZip: false,
    registerFiles: vi.fn(),
    startCleaning: vi.fn(async () => undefined),
    cancelCleaning: vi.fn(),
    clearItems: vi.fn(),
    downloadZip: vi.fn(),
    ...overrides,
  };
}

describe("ImageMetadataCleanerWorkspace", () => {
  it("bilgilendirme metinlerini ve devre disi aksiyonlari render eder", () => {
    const cleaner = createCleanerStub();

    render(<ImageMetadataCleanerWorkspace cleaner={cleaner} />);

    expect(screen.getByRole("heading", { name: /tarayici icinde, cihazda calisir/i })).toBeInTheDocument();
    expect(screen.getByText(/dosyalarinizi surukleyip birakabilir/i)).toBeInTheDocument();
    expect(screen.getByText(/toplu kullanim/i)).toBeInTheDocument();
    expect(screen.getByText(/icc profili silindigi icin/i)).toBeInTheDocument();
    expect(screen.getByText(/dosyalari buraya surukleyin/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /temizlemeyi baslat/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /iptal et/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /zip indir/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /listeyi temizle/i })).toBeDisabled();
  });

  it("özet kartlarini ve dosya durumlarini render eder", () => {
    const cleaner = createCleanerStub({
      items: [
        {
          id: "item-1",
          file: new File(["ok"], "photo.jpg", { type: "image/jpeg" }),
          name: "photo.jpg",
          relativePath: "gallery/photo.jpg",
          extension: "jpg",
          size: 1536,
          status: "success",
          errorCode: null,
          errorMessage: null,
          zipTargetPath: "gallery/photo.jpg",
          outputBlob: new Blob(["ok"], { type: "image/jpeg" }),
        },
        {
          id: "item-2",
          file: new File(["bad"], "photo2.jpg", { type: "image/jpeg" }),
          name: "photo2.jpg",
          relativePath: "gallery/photo2.jpg",
          extension: "jpg",
          size: 2048,
          status: "error",
          errorCode: "PARSE_FAILED",
          errorMessage: "Cozumlenemedi",
          zipTargetPath: null,
          outputBlob: null,
        },
        {
          id: "item-3",
          file: new File(["raw"], "photo3.heic", { type: "image/heic" }),
          name: "photo3.heic",
          relativePath: "gallery/photo3.heic",
          extension: "heic",
          size: 4096,
          status: "unsupported",
          errorCode: "UNSUPPORTED_EXTENSION",
          errorMessage: "Bu uzanti desteklenmiyor.",
          zipTargetPath: null,
          outputBlob: null,
        },
        {
          id: "item-4",
          file: new File(["cancel"], "photo4.png", { type: "image/png" }),
          name: "photo4.png",
          relativePath: "gallery/photo4.png",
          extension: "png",
          size: 8192,
          status: "queued",
          errorCode: null,
          errorMessage: null,
          zipTargetPath: null,
          outputBlob: null,
        },
      ],
      summary: {
        totalCount: 4,
        queuedCount: 1,
        processingCount: 0,
        successCount: 1,
        errorCount: 1,
        unsupportedCount: 1,
        cancelledCount: 0,
      },
      canStart: true,
      canDownloadZip: true,
    });

    render(<ImageMetadataCleanerWorkspace cleaner={cleaner} />);

    expect(screen.getByText("Toplam")).toBeInTheDocument();
    expect(screen.getByText("Siradaki")).toBeInTheDocument();
    expect(screen.getAllByText("Basarili").length).toBeGreaterThan(1);
    expect(screen.getAllByText("Hatali").length).toBeGreaterThan(1);
    expect(screen.getByText("Desteklenmiyor")).toBeInTheDocument();
    expect(screen.getByText("Sirada")).toBeInTheDocument();
  });
});
