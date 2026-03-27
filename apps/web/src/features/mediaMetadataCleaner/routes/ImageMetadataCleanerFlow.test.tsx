import "@testing-library/jest-dom/vitest";

import * as React from "react";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ImageMetadataCleanerPage } from "./ImageMetadataCleanerPage";
import { render } from "../../../test/test-utils";
import { isSupportedImageExtension } from "../lib/supportedImageFormats";

type CleanerStatus = "queued" | "processing" | "success" | "error" | "unsupported" | "cancelled";

interface MockCleanerItem {
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

const downloadZipSpy = vi.fn();

vi.mock("../hooks/useImageMetadataCleaner", () => {
  return {
    useImageMetadataCleaner: () => {
      const [items, setItems] = React.useState<MockCleanerItem[]>([]);
      const [isProcessing, setIsProcessing] = React.useState(false);
      const [isCancelling] = React.useState(false);
      const [zipErrorMessage] = React.useState<string | null>(null);
      const [hasZip, setHasZip] = React.useState(false);

      const registerFiles = React.useCallback((files: Array<{ file: File; relativePath: string; extension: string | null }>) => {
        setHasZip(false);
        setItems(
          files.map((entry, index) => {
            const extension = entry.extension ?? "";
            const supported = extension.length > 0 && isSupportedImageExtension(extension);

            return {
              id: `item_${index + 1}`,
              file: entry.file,
              name: entry.file.name,
              relativePath: entry.relativePath,
              extension,
              size: entry.file.size,
              status: supported ? "queued" : "unsupported",
              errorCode: supported ? null : "UNSUPPORTED_EXTENSION",
              errorMessage: supported ? null : "Bu uzanti desteklenmiyor.",
              zipTargetPath: null,
              outputBlob: null,
            };
          }),
        );
      }, []);

      const startCleaning = React.useCallback(async () => {
        setIsProcessing(true);

        await Promise.resolve();

        setItems((current) =>
          current.map((item) =>
            item.status === "queued"
              ? {
                  ...item,
                  status: "success",
                  errorCode: null,
                  errorMessage: null,
                  zipTargetPath: item.relativePath,
                  outputBlob: new Blob([item.name], { type: "image/jpeg" }),
                }
              : item,
          ),
        );
        setHasZip(true);
        setIsProcessing(false);
      }, []);

      const cancelCleaning = React.useCallback(() => {
        setIsProcessing(false);
      }, []);

      const clearItems = React.useCallback(() => {
        setItems([]);
        setHasZip(false);
      }, []);

      const summary = React.useMemo(() => {
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

      return {
        items,
        summary,
        isProcessing,
        isCancelling,
        zipErrorMessage,
        canStart: !isProcessing && items.length > 0 && summary.queuedCount > 0,
        canCancel: isProcessing,
        canDownloadZip: hasZip && !isProcessing,
        registerFiles,
        startCleaning,
        cancelCleaning,
        clearItems,
        downloadZip: downloadZipSpy,
      };
    },
  };
});

describe("ImageMetadataCleanerFlow", () => {
  afterEach(() => {
    downloadZipSpy.mockClear();
  });

  it("60 dosyali karisik batch'i islemeden donmadan calistirir ve ZIP indirmeyi aktif eder", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/settings/image-metadata-cleaner"]}>
        <Routes>
          <Route path="/settings/image-metadata-cleaner" element={<ImageMetadataCleanerPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: /gorsel metadata temizleme/i })).toBeInTheDocument();
    expect(screen.getByText(/tarayici icinde, cihazda calisir/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /temizlemeyi baslat/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /zip indir/i })).toBeDisabled();

    const files = createMixedBatchFiles();
    await user.upload(screen.getByLabelText(/dosya sec/i), files);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /temizlemeyi baslat/i })).toBeEnabled();
    });

    expect(screen.getByText("60")).toBeInTheDocument();
    expect(screen.getByText("46")).toBeInTheDocument();
    expect(screen.getByText("14")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /temizlemeyi baslat/i }));

    await waitFor(() => {
      expect(screen.getByText("46")).toBeInTheDocument();
      expect(screen.getByText("14")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /zip indir/i })).toBeEnabled();
    });

    await user.click(screen.getByRole("button", { name: /zip indir/i }));
    expect(downloadZipSpy).toHaveBeenCalledTimes(1);
  });
});

function createMixedBatchFiles() {
  const files: File[] = [];

  for (let index = 1; index <= 46; index += 1) {
    const extension = index % 3 === 0 ? "webp" : index % 2 === 0 ? "png" : "jpg";
    const file = new File([`ok-${index}`], `foto-${String(index).padStart(2, "0")}.${extension}`, {
      type: `image/${extension === "jpg" ? "jpeg" : extension}`,
    });

    Object.defineProperty(file, "webkitRelativePath", {
      value: `kitaplik/arsiv/2026/sonuc-${String(index).padStart(2, "0")}.${extension}`,
    });

    files.push(file);
  }

  for (let index = 1; index <= 14; index += 1) {
    const file = new File([`bad-${index}`], `bozuk-${String(index).padStart(2, "0")}.gif`, {
      type: "image/gif",
    });

    Object.defineProperty(file, "webkitRelativePath", {
      value: `kitaplik/arsiv/2026/hatali-${String(index).padStart(2, "0")}.gif`,
    });

    files.push(file);
  }

  return files;
}
