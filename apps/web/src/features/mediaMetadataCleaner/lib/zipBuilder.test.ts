import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";

import { buildMediaMetadataZip } from "./zipBuilder";

function toUint16LE(bytes: Uint8Array, offset: number) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(offset, true);
}

function toUint32LE(bytes: Uint8Array, offset: number) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, true);
}

function decodeUtf8(bytes: Uint8Array) {
  return new TextDecoder().decode(bytes);
}

async function readBlobBytes(blob: Blob) {
  return await new Promise<Uint8Array>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Blob okunamadı"));
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.readAsArrayBuffer(blob);
  });
}

function findEndOfCentralDirectory(bytes: Uint8Array) {
  for (let offset = bytes.length - 22; offset >= 0; offset -= 1) {
    if (toUint32LE(bytes, offset) === 0x06054b50) {
      return offset;
    }
  }

  throw new Error("EOCD bulunamadı");
}

function listZipEntries(bytes: Uint8Array) {
  const eocdOffset = findEndOfCentralDirectory(bytes);
  const entryCount = toUint16LE(bytes, eocdOffset + 8);
  const centralDirectoryOffset = toUint32LE(bytes, eocdOffset + 16);
  const entries: Array<{ name: string; data: Uint8Array }> = [];
  let offset = centralDirectoryOffset;

  for (let index = 0; index < entryCount; index += 1) {
    expect(toUint32LE(bytes, offset)).toBe(0x02014b50);

    const nameLength = toUint16LE(bytes, offset + 28);
    const extraLength = toUint16LE(bytes, offset + 30);
    const commentLength = toUint16LE(bytes, offset + 32);
    const localHeaderOffset = toUint32LE(bytes, offset + 42);
    const nameStart = offset + 46;
    const name = decodeUtf8(bytes.slice(nameStart, nameStart + nameLength));

    expect(toUint32LE(bytes, localHeaderOffset)).toBe(0x04034b50);
    const localNameLength = toUint16LE(bytes, localHeaderOffset + 26);
    const localExtraLength = toUint16LE(bytes, localHeaderOffset + 28);
    const dataOffset = localHeaderOffset + 30 + localNameLength + localExtraLength;
    const compressedSize = toUint32LE(bytes, localHeaderOffset + 18);
    const data = bytes.slice(dataOffset, dataOffset + compressedSize);

    entries.push({ name, data });
    offset = nameStart + nameLength + extraLength + commentLength;
  }

  return entries;
}

describe("buildMediaMetadataZip", () => {
  it("başarılı ve başarısız dosyaları doğru klasör yapısıyla zip'e yazar", async () => {
    const result = await buildMediaMetadataZip([
      {
        sourcePath: "gallery/photo.jpg",
        status: "success",
        blob: new Blob(["photo-bytes"], { type: "image/jpeg" }),
      },
      {
        sourcePath: "gallery/photo.jpg",
        status: "error",
        blob: new Blob(["original-photo"], { type: "image/jpeg" }),
        errorCode: "PARSE_FAILED",
        errorMessage: "Çözümlenemedi",
      },
      {
        sourcePath: "gallery/photo.jpg",
        status: "error",
        blob: new Blob(["original-photo-2"], { type: "image/jpeg" }),
        errorCode: "PARSE_FAILED",
        errorMessage: "Çözümlenemedi",
      },
      {
        sourcePath: "gallery/raw.webp",
        status: "unsupported",
        blob: new Blob(["raw"], { type: "image/webp" }),
        errorCode: "UNSUPPORTED",
        errorMessage: "Desteklenmiyor",
      },
    ]);

    const zipBytes = await readBlobBytes(result.blob);
    const entries = listZipEntries(zipBytes);
    const names = entries.map((entry) => entry.name);

    expect(names).toContain("gallery/photo.jpg");
    expect(names).toContain("hatali/gallery/photo.jpg");
    expect(names).toContain("hatali/gallery/photo (2).jpg");
    expect(names).toContain("hatali/gallery/raw.webp");
    expect(names).toContain("islem-raporu.json");

    const reportEntry = entries.find((entry) => entry.name === "islem-raporu.json");
    expect(reportEntry).toBeDefined();

    const report = JSON.parse(decodeUtf8(reportEntry!.data));
    expect(report.summary.totalCount).toBe(4);
    expect(report.summary.successCount).toBe(1);
    expect(report.summary.errorCount).toBe(2);
    expect(report.summary.unsupportedCount).toBe(1);
    expect(report.summary.zipEntryCount).toBe(5);
    expect(report.entries.map((entry: { zipPath: string }) => entry.zipPath)).toEqual([
      "gallery/photo.jpg",
      "hatali/gallery/photo.jpg",
      "hatali/gallery/photo (2).jpg",
      "hatali/gallery/raw.webp",
    ]);
  });

  it("aynı hedef yolu ikinci kez gördüğünde deterministik ad ekler", async () => {
    const result = await buildMediaMetadataZip([
      {
        sourcePath: "a/b/c.png",
        status: "success",
        blob: new Blob(["1"]),
      },
      {
        sourcePath: "a/b/c.png",
        status: "success",
        blob: new Blob(["2"]),
      },
    ]);

    const zipBytes = await readBlobBytes(result.blob);
    const entries = listZipEntries(zipBytes);
    const names = entries.map((entry) => entry.name);

    expect(names).toContain("a/b/c.png");
    expect(names).toContain("a/b/c (2).png");
  });
});
