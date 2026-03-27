import JSZip from "jszip";

import { normalizeRelativePath, resolveDeterministicZipPath } from "./pathUtils";

export type ZipItemStatus = "success" | "error" | "unsupported" | "cancelled";

export interface MediaMetadataZipSourceItem {
  sourcePath: string;
  status: ZipItemStatus;
  blob: Blob;
  errorCode?: string | null;
  errorMessage?: string | null;
}

export interface MediaMetadataZipReportEntry {
  sourcePath: string;
  status: ZipItemStatus;
  zipPath: string;
  size: number;
  errorCode: string | null;
  errorMessage: string | null;
}

export interface MediaMetadataZipReport {
  generatedAt: string;
  summary: {
    totalCount: number;
    successCount: number;
    errorCount: number;
    unsupportedCount: number;
    cancelledCount: number;
    zipEntryCount: number;
  };
  entries: MediaMetadataZipReportEntry[];
}

export interface MediaMetadataZipBuildResult {
  blob: Blob;
  report: MediaMetadataZipReport;
}

interface ZipFileRecord {
  name: string;
  data: Uint8Array;
}

function toUint8Array(value: Blob | Uint8Array | ArrayBuffer): Promise<Uint8Array> | Uint8Array {
  if (value instanceof Uint8Array) {
    return value;
  }

  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }

  return new Response(value).arrayBuffer().then((buffer) => new Uint8Array(buffer));
}

function toArrayBuffer(value: Uint8Array) {
  return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer;
}

function buildOperationReport(entries: MediaMetadataZipReportEntry[]): MediaMetadataZipReport {
  const summary = entries.reduce(
    (accumulator, entry) => {
      accumulator.totalCount += 1;

      if (entry.status === "success") {
        accumulator.successCount += 1;
      } else if (entry.status === "error") {
        accumulator.errorCount += 1;
      } else if (entry.status === "unsupported") {
        accumulator.unsupportedCount += 1;
      } else {
        accumulator.cancelledCount += 1;
      }

      return accumulator;
    },
    {
      totalCount: 0,
      successCount: 0,
      errorCount: 0,
      unsupportedCount: 0,
      cancelledCount: 0,
    },
  );

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      ...summary,
      zipEntryCount: entries.length + 1,
    },
    entries,
  };
}

export async function buildMediaMetadataZip(items: MediaMetadataZipSourceItem[]): Promise<MediaMetadataZipBuildResult> {
  const usedPaths = new Set<string>();
  const zipRecords: ZipFileRecord[] = [];
  const reportEntries: MediaMetadataZipReportEntry[] = [];

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const sourcePath = normalizeRelativePath(item.sourcePath) || `dosya-${index + 1}`;
    const targetBasePath = item.status === "success" ? sourcePath : `hatali/${sourcePath}`;
    const zipPath = resolveDeterministicZipPath(targetBasePath, usedPaths);
    const data = await toUint8Array(item.blob);

    zipRecords.push({
      name: zipPath,
      data,
    });

    reportEntries.push({
      sourcePath,
      status: item.status,
      zipPath,
      size: data.length,
      errorCode: item.errorCode ?? null,
      errorMessage: item.errorMessage ?? null,
    });
  }

  const report = buildOperationReport(reportEntries);
  const reportPath = resolveDeterministicZipPath("islem-raporu.json", usedPaths);
  const reportText = `${JSON.stringify(report, null, 2)}\n`;

  zipRecords.push({
    name: reportPath,
    data: new TextEncoder().encode(reportText),
  });

  const zip = new JSZip();

  for (const record of zipRecords) {
    if (record.name === reportPath) {
      zip.file(record.name, reportText, {
        compression: "STORE",
      });
      continue;
    }

    zip.file(record.name, toArrayBuffer(record.data), {
      binary: true,
      compression: "STORE",
    });
  }

  const zipBytes = await zip.generateAsync({
    type: "uint8array",
    compression: "STORE",
  });

  return {
    blob: new Blob([zipBytes.buffer.slice(zipBytes.byteOffset, zipBytes.byteOffset + zipBytes.byteLength) as ArrayBuffer], {
      type: "application/zip",
    }),
    report,
  };
}
