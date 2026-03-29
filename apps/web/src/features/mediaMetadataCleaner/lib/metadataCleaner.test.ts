import "@testing-library/jest-dom/vitest";

import { describe, expect, it } from "vitest";

import {
  cleanImageMetadata,
  type MetadataCleanerErrorResult,
  type MetadataCleanerSuccessResult,
} from "./metadataCleaner";
import {
  getSupportedImageFormatFromFileName,
  isLosslessMetadataCleaningSupportedFormat,
  isSupportedImageExtension,
  SUPPORTED_IMAGE_EXTENSIONS,
} from "./supportedImageFormats";
import { handleMetadataCleanerWorkerRequest } from "../workers/metadataCleaner.worker";

function concatBytes(chunks: number[][]) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const bytes = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }

  return bytes;
}

function asciiBytes(value: string) {
  return Array.from(value).map((character) => character.charCodeAt(0));
}

function be16(value: number) {
  return [(value >> 8) & 0xff, value & 0xff];
}

function be32(value: number) {
  return [(value >> 24) & 0xff, (value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

function le32(value: number) {
  return [value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff, (value >> 24) & 0xff];
}

function makeSegment(marker: number, payload: number[]) {
  return [0xff, marker, ...be16(payload.length + 2), ...payload];
}

function makePngChunk(type: string, payload: number[]) {
  const crc = [0x00, 0x00, 0x00, 0x00];
  return [...be32(payload.length), ...asciiBytes(type), ...payload, ...crc];
}

function makeWebPChunk(type: string, payload: number[]) {
  const pad = payload.length % 2 === 1 ? [0x00] : [];
  return [...asciiBytes(type), ...le32(payload.length), ...payload, ...pad];
}

describe("supportedImageFormats", () => {
  it("desteklenen uzantilari dogru sekilde siniflandirir", () => {
    expect(SUPPORTED_IMAGE_EXTENSIONS).toEqual(["jpg", "jpeg", "png", "webp", "heic", "avif"]);
    expect(getSupportedImageFormatFromFileName("foto.JPG")).toBe("jpeg");
    expect(getSupportedImageFormatFromFileName("folder/sub/foto.jpeg")).toBe("jpeg");
    expect(getSupportedImageFormatFromFileName("image.png")).toBe("png");
    expect(getSupportedImageFormatFromFileName("image.webp")).toBe("webp");
    expect(getSupportedImageFormatFromFileName("image.heic")).toBe("heic");
    expect(getSupportedImageFormatFromFileName("image.avif")).toBe("avif");
    expect(getSupportedImageFormatFromFileName("image.gif")).toBeNull();
    expect(isSupportedImageExtension("jpg")).toBe(true);
    expect(isSupportedImageExtension("gif")).toBe(false);
    expect(isLosslessMetadataCleaningSupportedFormat("jpeg")).toBe(true);
    expect(isLosslessMetadataCleaningSupportedFormat("heic")).toBe(false);
  });
});

describe("cleanImageMetadata", () => {
  it("JPEG icindeki metadata segmentlerini kaldirir ve scan verisine dokunmaz", () => {
    const jpeg = concatBytes([
      [0xff, 0xd8],
      makeSegment(0xe0, [...asciiBytes("JFIF"), 0x00, 0x01, 0x02, 0x00, 0x00, 0x01]),
      makeSegment(0xe1, [...asciiBytes("Exif"), 0x00, 0x00, 0x11, 0x22]),
      makeSegment(0xe2, [...asciiBytes("ICC"), 0x00]),
      makeSegment(0xeb, [...asciiBytes("C2PA"), 0x00, 0x01, 0x02, 0x03]),
      makeSegment(0xed, [...asciiBytes("Photoshop"), 0x00]),
      makeSegment(0xfe, [...asciiBytes("notlar")]),
      [0xff, 0xda, ...be16(8), 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00],
      [0x12, 0x34, 0xff, 0x00, 0x56, 0xff, 0xd0, 0x78],
      [0xff, 0xd9],
    ]);

    const result = cleanImageMetadata({ fileName: "foto.jpg", bytes: jpeg });

    expect(result.status).toBe("success");
    if (result.status !== "success") {
      throw new Error("Beklenmeyen hata sonucu");
    }

    expect(result.format).toBe("jpeg");
    expect(result.changed).toBe(true);
    expect(result.removedMetadataBlocks).toEqual(
      expect.arrayContaining(["APP1", "APP2", "APP11", "APP13", "COM"]),
    );
    expect(Array.from(result.cleanedBytes)).toEqual([
      0xff, 0xd8,
      0xff, 0xe0, 0x00, 0x0c, ...asciiBytes("JFIF"), 0x00, 0x01, 0x02, 0x00, 0x00, 0x01,
      0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00,
      0x12, 0x34, 0xff, 0x00, 0x56, 0xff, 0xd0, 0x78,
      0xff, 0xd9,
    ]);
  });

  it("PNG metadata chunk'larini kaldirir", () => {
    const png = concatBytes([
      Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      makePngChunk("IHDR", [0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00]),
      makePngChunk("tEXt", [...asciiBytes("Author"), 0x00, ...asciiBytes("Berke")]),
      makePngChunk("iCCP", [...asciiBytes("profile"), 0x00, 0x00, 0x01]),
      makePngChunk("caBX", [...asciiBytes("jumbf"), 0x00, 0x00, 0x00, 0x01]),
      makePngChunk("pHYs", [...be32(2835), ...be32(2835), 0x01]),
      makePngChunk("tIME", [0x07, 0xe9, 0x03, 0x1c, 0x0b, 0x22, 0x10]),
      makePngChunk("IDAT", [0x78, 0x9c, 0x63, 0x60]),
      makePngChunk("iTXt", [...asciiBytes("Comment"), 0x00, 0x00, 0x00, ...asciiBytes("Merhaba")]),
      makePngChunk("zTXt", [...asciiBytes("Keywords"), 0x00, 0x00]),
      makePngChunk("eXIf", [0x01, 0x02, 0x03]),
      makePngChunk("IEND", []),
    ]);

    const result = cleanImageMetadata({ fileName: "foto.png", bytes: png });

    expect(result.status).toBe("success");
    if (result.status !== "success") {
      throw new Error("Beklenmeyen hata sonucu");
    }

    expect(result.format).toBe("png");
    expect(result.changed).toBe(true);
    expect(result.removedMetadataBlocks).toEqual(
      expect.arrayContaining(["tEXt", "iCCP", "caBX", "pHYs", "tIME", "iTXt", "zTXt", "eXIf"]),
    );

    const output = Array.from(result.cleanedBytes);
    expect(output.slice(0, 8)).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(output).toContain(0x49);
    expect(output).toContain(0x44);
    expect(output).toContain(0x41);
    expect(output).toContain(0x54);
    expect(output).toContain(0x49);
    expect(output).toContain(0x45);
    expect(output).toContain(0x4e);
    expect(output).toContain(0x44);
    expect(readChunkTypes(result.cleanedBytes)).toEqual(["IHDR", "IDAT", "IEND"]);
  });

  it("uzanti PNG olsa bile JPEG imzasini okuyup gercek formata gore temizler", () => {
    const jpeg = concatBytes([
      [0xff, 0xd8],
      makeSegment(0xe1, [...asciiBytes("Exif"), 0x00, 0x00, 0x11, 0x22]),
      [0xff, 0xda, ...be16(8), 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00],
      [0x12, 0x34, 0x56],
      [0xff, 0xd9],
    ]);

    const result = cleanImageMetadata({ fileName: "yanlis-uzanti.png", bytes: jpeg });

    expect(result.status).toBe("success");
    if (result.status !== "success") {
      throw new Error("Beklenmeyen hata sonucu");
    }

    expect(result.format).toBe("jpeg");
    expect(result.removedMetadataBlocks).toEqual(["APP1"]);
    expect(Array.from(result.cleanedBytes.slice(0, 2))).toEqual([0xff, 0xd8]);
  });

  it("PNG worker yardimcisi metadata chunk'larini kaldirip temiz bytes dondurur", () => {
    const png = concatBytes([
      Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      makePngChunk("IHDR", [0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00]),
      makePngChunk("tEXt", [...asciiBytes("Author"), 0x00, ...asciiBytes("Berke")]),
      makePngChunk("caBX", [...asciiBytes("jumbf"), 0x00, 0x00, 0x00, 0x01]),
      makePngChunk("pHYs", [...be32(2835), ...be32(2835), 0x01]),
      makePngChunk("tIME", [0x07, 0xe9, 0x03, 0x1c, 0x0b, 0x22, 0x10]),
      makePngChunk("IDAT", [0x78, 0x9c, 0x63, 0x60]),
      makePngChunk("IEND", []),
    ]);

    const result = handleMetadataCleanerWorkerRequest({
      id: "job-png",
      fileName: "foto.png",
      bytes: png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength),
    });

    expect(result.id).toBe("job-png");
    expect(result.status).toBe("success");
    if (result.status !== "success") {
      throw new Error("Beklenmeyen hata sonucu");
    }

    expect(result.format).toBe("png");
    expect(result.changed).toBe(true);
    expect(result.removedMetadataBlocks).toEqual(expect.arrayContaining(["tEXt", "caBX", "pHYs", "tIME"]));
    expect(readChunkTypes(new Uint8Array(result.cleanedBytes))).toEqual(["IHDR", "IDAT", "IEND"]);
  });

  it("WebP metadata chunk'larini kaldirir ve VP8X bayraklarini temizler", () => {
    const vp8xPayload = [0x2c, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x01, 0x00, 0x00];
    const webpChunks = [
      makeWebPChunk("VP8X", vp8xPayload),
      makeWebPChunk("C2PA", [0x63, 0x32, 0x70, 0x61, 0x01, 0x02]),
      makeWebPChunk("ICCP", [0x01, 0x02, 0x03]),
      makeWebPChunk("VP8 ", [0x11, 0x22, 0x33]),
      makeWebPChunk("EXIF", [0x44, 0x55, 0x66]),
      makeWebPChunk("XMP ", [0x77, 0x88, 0x99]),
    ];

    const riffSize = 4 + webpChunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const webp = concatBytes([
      [...asciiBytes("RIFF"), ...le32(riffSize), ...asciiBytes("WEBP")],
      ...webpChunks.map((chunk) => chunk),
    ]);

    const result = cleanImageMetadata({ fileName: "foto.webp", bytes: webp });

    expect(result.status).toBe("success");
    if (result.status !== "success") {
      throw new Error("Beklenmeyen hata sonucu");
    }

    expect(result.format).toBe("webp");
    expect(result.changed).toBe(true);
    expect(result.removedMetadataBlocks).toEqual(expect.arrayContaining(["C2PA", "ICCP", "EXIF", "XMP "]));
    expect(readWebpChunkTypes(result.cleanedBytes)).toEqual(["VP8X", "VP8 "]);
    expect(result.cleanedBytes[20]).toBe(0x00);
  });

  it("HEIC ve AVIF icin kontrollu hata dondurur", () => {
    const heicResult = cleanImageMetadata({ fileName: "foto.heic", bytes: new Uint8Array([0x00, 0x01, 0x02]) });
    const avifResult = cleanImageMetadata({ fileName: "foto.avif", bytes: new Uint8Array([0x00, 0x01, 0x02]) });

    expect(heicResult).toMatchObject({
      status: "error",
      code: "UNSAFE_FORMAT",
      format: "heic",
    });

    expect(avifResult).toMatchObject({
      status: "error",
      code: "UNSAFE_FORMAT",
      format: "avif",
    });
  });

  it("taninmayan baslikta daha acik invalid image data hatasi dondurur", () => {
    const result = cleanImageMetadata({ fileName: "foto.jpg", bytes: new Uint8Array([0x00, 0x01, 0x02, 0x03]) });

    expect(result).toMatchObject({
      status: "error",
      code: "INVALID_IMAGE_DATA",
      format: "jpeg",
    });
    if (result.status !== "error") {
      throw new Error("Beklenmeyen basari sonucu");
    }
    expect(result.message).toContain("uzanti yanlis ya da dosya bozuk olabilir");
  });

  it("worker yardimcisi ayni sonucu ArrayBuffer olarak dondurur", () => {
    const input = concatBytes([
      [0xff, 0xd8],
      [0xff, 0xda, ...be16(8), 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00],
      [0x12, 0x34, 0xff, 0x00, 0x56],
      [0xff, 0xd9],
    ]);
    const result = handleMetadataCleanerWorkerRequest({
      id: "job-1",
      fileName: "bos.jpg",
      bytes: input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength),
    });

    expect(result.id).toBe("job-1");
    expect(result.status).toBe("success");
    if (result.status !== "success") {
      throw new Error("Beklenmeyen hata sonucu");
    }

    expect(result.cleanedBytes).toBeInstanceOf(ArrayBuffer);
    expect(new Uint8Array(result.cleanedBytes)).toEqual(input);
  });
});

function readChunkTypes(bytes: Uint8Array) {
  const types: string[] = [];
  let offset = 8;

  while (offset < bytes.length) {
    const length = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, false);
    const type = String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7]);
    types.push(type);
    offset += 12 + length;

    if (type === "IEND") {
      break;
    }
  }

  return types;
}

function readWebpChunkTypes(bytes: Uint8Array) {
  const types: string[] = [];
  const declaredEnd = 8 + new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(4, true);
  let offset = 12;

  while (offset < declaredEnd) {
    const type = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
    const size = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset + 4, true);
    types.push(type);
    offset += 8 + size + (size % 2);
  }

  return types;
}
