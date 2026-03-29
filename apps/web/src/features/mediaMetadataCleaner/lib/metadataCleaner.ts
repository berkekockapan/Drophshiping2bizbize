import {
  getSupportedImageFormatFromFileName,
  isLosslessMetadataCleaningSupportedFormat,
  type LosslessMetadataCleaningFormat,
  type SupportedImageFormat,
} from "./supportedImageFormats";

export type MetadataCleanerErrorCode = "UNSUPPORTED_FORMAT" | "UNSAFE_FORMAT" | "INVALID_IMAGE_DATA";

export interface MetadataCleanerSuccessResult {
  status: "success";
  format: LosslessMetadataCleaningFormat;
  cleanedBytes: Uint8Array;
  removedMetadataBlocks: string[];
  changed: boolean;
}

export interface MetadataCleanerErrorResult {
  status: "error";
  format: SupportedImageFormat | null;
  code: MetadataCleanerErrorCode;
  message: string;
}

export type MetadataCleanerResult = MetadataCleanerSuccessResult | MetadataCleanerErrorResult;

interface MetadataCleanerInput {
  fileName: string;
  bytes: Uint8Array;
}

const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const JPEG_METADATA_MARKERS = new Map<number, string>([
  [0xe1, "APP1"],
  [0xe2, "APP2"],
  [0xeb, "APP11"],
  [0xed, "APP13"],
  [0xfe, "COM"],
]);

const PNG_METADATA_CHUNKS = new Set([
  "tEXt",
  "iTXt",
  "zTXt",
  "iCCP",
  "eXIf",
  "pHYs",
  "tIME",
  "caBX",
]);

const WEBP_METADATA_CHUNKS = new Set(["ICCP", "EXIF", "XMP ", "C2PA"]);

const WEBP_VP8X_METADATA_FLAGS = 0x04 | 0x08 | 0x20;

function createErrorResult(
  code: MetadataCleanerErrorCode,
  message: string,
  format: SupportedImageFormat | null,
): MetadataCleanerErrorResult {
  return {
    status: "error",
    code,
    message,
    format,
  };
}

function concatBytes(parts: Uint8Array[]) {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;

  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }

  return output;
}

function readAscii(bytes: Uint8Array, start: number, length: number) {
  let value = "";

  for (let index = 0; index < length; index += 1) {
    value += String.fromCharCode(bytes[start + index] ?? 0);
  }

  return value;
}

function readUint16BE(bytes: Uint8Array, offset: number) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(offset, false);
}

function readUint32BE(bytes: Uint8Array, offset: number) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, false);
}

function readUint32LE(bytes: Uint8Array, offset: number) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, true);
}

function writeUint32LE(bytes: Uint8Array, offset: number, value: number) {
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).setUint32(offset, value, true);
}

function findJpegEoi(bytes: Uint8Array, startOffset: number) {
  for (let index = startOffset; index < bytes.length - 1; index += 1) {
    if (bytes[index] === 0xff && bytes[index + 1] === 0xd9) {
      return index;
    }
  }

  return -1;
}

function cleanJpegMetadata(bytes: Uint8Array): MetadataCleanerResult {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return createErrorResult("INVALID_IMAGE_DATA", "JPEG dosyasi beklenen baslik ile baslamiyor.", "jpeg");
  }

  const parts: Uint8Array[] = [bytes.slice(0, 2)];
  const removedMetadataBlocks: string[] = [];
  let offset = 2;
  let sawScanData = false;

  while (offset < bytes.length) {
    const markerStart = offset;

    if (bytes[offset] !== 0xff) {
      return createErrorResult("INVALID_IMAGE_DATA", "JPEG segment basligi beklenen 0xFF bayri ile baslamiyor.", "jpeg");
    }

    while (offset < bytes.length && bytes[offset] === 0xff) {
      offset += 1;
    }

    if (offset >= bytes.length) {
      break;
    }

    const marker = bytes[offset];
    offset += 1;

    if (marker === 0xd9) {
      if (!sawScanData) {
        return createErrorResult("INVALID_IMAGE_DATA", "JPEG dosyasi SOS segmenti olmadan EOI ile sonlaniyor.", "jpeg");
      }

      parts.push(bytes.slice(markerStart, offset));
      return {
        status: "success",
        format: "jpeg",
        cleanedBytes: concatBytes(parts),
        removedMetadataBlocks: Array.from(new Set(removedMetadataBlocks)),
        changed: removedMetadataBlocks.length > 0,
      };
    }

    if (marker === 0xda) {
      if (offset + 2 > bytes.length) {
        return createErrorResult("INVALID_IMAGE_DATA", "JPEG SOS segmenti okunamadi.", "jpeg");
      }

      const segmentLength = readUint16BE(bytes, offset);
      if (segmentLength < 2 || offset + segmentLength > bytes.length) {
        return createErrorResult("INVALID_IMAGE_DATA", "JPEG SOS segment uzunlugu gecersiz.", "jpeg");
      }

      const scanStart = offset + segmentLength;
      const eoiIndex = findJpegEoi(bytes, scanStart);

      if (eoiIndex < 0) {
        return createErrorResult("INVALID_IMAGE_DATA", "JPEG EOI markeri bulunamadi.", "jpeg");
      }

      sawScanData = true;
      parts.push(bytes.slice(markerStart, eoiIndex + 2));

      return {
        status: "success",
        format: "jpeg",
        cleanedBytes: concatBytes(parts),
        removedMetadataBlocks: Array.from(new Set(removedMetadataBlocks)),
        changed: removedMetadataBlocks.length > 0,
      };
    }

    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      parts.push(bytes.slice(markerStart, offset));
      continue;
    }

    if (marker === 0xd8) {
      return createErrorResult("INVALID_IMAGE_DATA", "JPEG dosyasi beklenmeyen ikinci SOI markeri iceriyor.", "jpeg");
    }

    if (offset + 2 > bytes.length) {
      return createErrorResult("INVALID_IMAGE_DATA", "JPEG segment uzunlugu okunamadi.", "jpeg");
    }

    const segmentLength = readUint16BE(bytes, offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length) {
      return createErrorResult("INVALID_IMAGE_DATA", "JPEG segment uzunlugu gecersiz.", "jpeg");
    }

    const segmentEnd = offset + segmentLength;
    const markerName = JPEG_METADATA_MARKERS.get(marker);

    if (markerName) {
      removedMetadataBlocks.push(markerName);
    } else {
      parts.push(bytes.slice(markerStart, segmentEnd));
    }

    offset = segmentEnd;
  }

  return createErrorResult("INVALID_IMAGE_DATA", "JPEG dosyasi EOI markeri olmadan sonlaniyor.", "jpeg");
}

function cleanPngMetadata(bytes: Uint8Array): MetadataCleanerResult {
  if (bytes.length < PNG_SIGNATURE.length) {
    return createErrorResult("INVALID_IMAGE_DATA", "PNG dosyasi beklenen baslik ile baslamiyor.", "png");
  }

  for (let index = 0; index < PNG_SIGNATURE.length; index += 1) {
    if (bytes[index] !== PNG_SIGNATURE[index]) {
      return createErrorResult("INVALID_IMAGE_DATA", "PNG dosyasi beklenen baslik ile baslamiyor.", "png");
    }
  }

  const parts: Uint8Array[] = [bytes.slice(0, PNG_SIGNATURE.length)];
  const removedMetadataBlocks: string[] = [];
  let offset = PNG_SIGNATURE.length;
  let sawIend = false;

  while (offset < bytes.length) {
    if (offset + 12 > bytes.length) {
      return createErrorResult("INVALID_IMAGE_DATA", "PNG chunk yapisi okunamadi.", "png");
    }

    const chunkLength = readUint32BE(bytes, offset);
    const chunkType = readAscii(bytes, offset + 4, 4);
    const chunkEnd = offset + 12 + chunkLength;

    if (chunkEnd > bytes.length) {
      return createErrorResult("INVALID_IMAGE_DATA", `PNG chunk uzunlugu gecersiz: ${chunkType}.`, "png");
    }

    if (PNG_METADATA_CHUNKS.has(chunkType)) {
      removedMetadataBlocks.push(chunkType);
    } else {
      parts.push(bytes.slice(offset, chunkEnd));
    }

    offset = chunkEnd;
    sawIend = chunkType === "IEND";

    if (sawIend) {
      break;
    }
  }

  if (!sawIend) {
    return createErrorResult("INVALID_IMAGE_DATA", "PNG dosyasi IEND chunk'i ile tamamlanmiyor.", "png");
  }

  return {
    status: "success",
    format: "png",
    cleanedBytes: concatBytes(parts),
    removedMetadataBlocks: Array.from(new Set(removedMetadataBlocks)),
    changed: removedMetadataBlocks.length > 0,
  };
}

function cleanWebPMetadata(bytes: Uint8Array): MetadataCleanerResult {
  if (bytes.length < 12 || readAscii(bytes, 0, 4) !== "RIFF" || readAscii(bytes, 8, 4) !== "WEBP") {
    return createErrorResult("INVALID_IMAGE_DATA", "WebP dosyasi beklenen RIFF/WebP basligi ile baslamiyor.", "webp");
  }

  const declaredEnd = 8 + readUint32LE(bytes, 4);

  if (declaredEnd < 12) {
    return createErrorResult("INVALID_IMAGE_DATA", "WebP RIFF boyutu gecersiz.", "webp");
  }

  if (declaredEnd > bytes.length) {
    return createErrorResult("INVALID_IMAGE_DATA", "WebP dosyasi beyan edilen RIFF boyutundan kisa.", "webp");
  }

  const parseEnd = Math.min(bytes.length, declaredEnd);

  const parts: Uint8Array[] = [bytes.slice(0, 12)];
  const removedMetadataBlocks: string[] = [];
  let offset = 12;

  while (offset < parseEnd) {
    if (offset + 8 > parseEnd) {
      return createErrorResult("INVALID_IMAGE_DATA", "WebP chunk basligi okunamadi.", "webp");
    }

    const chunkType = readAscii(bytes, offset, 4);
    const chunkSize = readUint32LE(bytes, offset + 4);
    const chunkDataStart = offset + 8;
    const chunkDataEnd = chunkDataStart + chunkSize;
    const paddedChunkEnd = chunkDataEnd + (chunkSize % 2);

    if (paddedChunkEnd > parseEnd) {
      return createErrorResult("INVALID_IMAGE_DATA", `WebP chunk uzunlugu gecersiz: ${chunkType}.`, "webp");
    }

    if (WEBP_METADATA_CHUNKS.has(chunkType)) {
      removedMetadataBlocks.push(chunkType);
      offset = paddedChunkEnd;
      continue;
    }

    if (chunkType === "VP8X") {
      if (chunkSize < 10) {
        return createErrorResult("INVALID_IMAGE_DATA", "VP8X chunk boyutu gecersiz.", "webp");
      }

      const updatedChunk = bytes.slice(offset, paddedChunkEnd);
      updatedChunk[8] = updatedChunk[8] & ~WEBP_VP8X_METADATA_FLAGS;
      parts.push(updatedChunk);
      offset = paddedChunkEnd;
      continue;
    }

    parts.push(bytes.slice(offset, paddedChunkEnd));
    offset = paddedChunkEnd;
  }

  const output = concatBytes(parts);
  writeUint32LE(output, 4, output.length - 8);

  return {
    status: "success",
    format: "webp",
    cleanedBytes: output,
    removedMetadataBlocks: Array.from(new Set(removedMetadataBlocks)),
    changed: removedMetadataBlocks.length > 0,
  };
}

function detectFormatFromBytes(bytes: Uint8Array): LosslessMetadataCleaningFormat | null {
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    return "jpeg";
  }

  if (bytes.length >= PNG_SIGNATURE.length) {
    let isPng = true;

    for (let index = 0; index < PNG_SIGNATURE.length; index += 1) {
      if (bytes[index] !== PNG_SIGNATURE[index]) {
        isPng = false;
        break;
      }
    }

    if (isPng) {
      return "png";
    }
  }

  if (bytes.length >= 12 && readAscii(bytes, 0, 4) === "RIFF" && readAscii(bytes, 8, 4) === "WEBP") {
    return "webp";
  }

  return null;
}

export function cleanImageMetadata(input: MetadataCleanerInput): MetadataCleanerResult {
  const extensionFormat = getSupportedImageFormatFromFileName(input.fileName);
  const sniffedFormat = detectFormatFromBytes(input.bytes);

  if (!extensionFormat && !sniffedFormat) {
    return createErrorResult("UNSUPPORTED_FORMAT", "Bu dosya uzantisi desteklenmiyor.", null);
  }

  if (sniffedFormat) {
    switch (sniffedFormat) {
      case "jpeg":
        return cleanJpegMetadata(input.bytes);
      case "png":
        return cleanPngMetadata(input.bytes);
      case "webp":
        return cleanWebPMetadata(input.bytes);
      default:
        break;
    }
  }

  if (!extensionFormat) {
    return createErrorResult(
      "INVALID_IMAGE_DATA",
      "Dosya icerigi taninan JPEG, PNG veya WebP basligi ile eslesmiyor; uzanti yanlis ya da dosya bozuk olabilir.",
      null,
    );
  }

  if (!isLosslessMetadataCleaningSupportedFormat(extensionFormat)) {
    return createErrorResult(
      "UNSAFE_FORMAT",
      "HEIC/AVIF icin kayipsiz ve guvenli metadata temizligi bu surumde garanti edilemiyor.",
      extensionFormat,
    );
  }

  if (input.bytes.length === 0) {
    return createErrorResult("INVALID_IMAGE_DATA", "Dosya icerigi bos.", extensionFormat);
  }

  return createErrorResult(
    "INVALID_IMAGE_DATA",
    "Dosya icerigi taninan JPEG, PNG veya WebP basligi ile eslesmiyor; uzanti yanlis ya da dosya bozuk olabilir.",
    extensionFormat,
  );
}
