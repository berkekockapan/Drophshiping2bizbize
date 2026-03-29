export const SUPPORTED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "heic", "avif"] as const;

export type SupportedImageExtension = (typeof SUPPORTED_IMAGE_EXTENSIONS)[number];

export type SupportedImageFormat = "jpeg" | "png" | "webp" | "heic" | "avif";

export const SUPPORTED_LOSSLESS_METADATA_CLEANING_FORMATS = ["jpeg", "png", "webp"] as const;

export type LosslessMetadataCleaningFormat = (typeof SUPPORTED_LOSSLESS_METADATA_CLEANING_FORMATS)[number];

export const UNSAFE_METADATA_CLEANING_FORMATS = ["heic", "avif"] as const;

const EXTENSION_TO_FORMAT: Record<SupportedImageExtension, SupportedImageFormat> = {
  jpg: "jpeg",
  jpeg: "jpeg",
  png: "png",
  webp: "webp",
  heic: "heic",
  avif: "avif",
};

const FORMAT_TO_PREFERRED_EXTENSION: Record<SupportedImageFormat, SupportedImageExtension> = {
  jpeg: "jpg",
  png: "png",
  webp: "webp",
  heic: "heic",
  avif: "avif",
};

const FORMAT_TO_MIME_TYPE: Record<SupportedImageFormat, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  avif: "image/avif",
};

function normalizeFileName(value: string) {
  return value.trim().split(/[\\/]/).pop() ?? "";
}

export function getImageExtensionFromFileName(fileName: string): string | null {
  const normalizedFileName = normalizeFileName(fileName);
  const extensionIndex = normalizedFileName.lastIndexOf(".");

  if (extensionIndex < 0 || extensionIndex === normalizedFileName.length - 1) {
    return null;
  }

  return normalizedFileName.slice(extensionIndex + 1).toLowerCase();
}

export function isSupportedImageExtension(extension: string): extension is SupportedImageExtension {
  return Object.prototype.hasOwnProperty.call(EXTENSION_TO_FORMAT, extension);
}

export function getSupportedImageFormatFromFileName(fileName: string): SupportedImageFormat | null {
  const extension = getImageExtensionFromFileName(fileName);

  if (!extension || !isSupportedImageExtension(extension)) {
    return null;
  }

  return EXTENSION_TO_FORMAT[extension];
}

export function getPreferredImageExtensionForFormat(format: SupportedImageFormat): SupportedImageExtension {
  return FORMAT_TO_PREFERRED_EXTENSION[format];
}

export function getMimeTypeForSupportedImageFormat(format: SupportedImageFormat): string {
  return FORMAT_TO_MIME_TYPE[format];
}

export function isLosslessMetadataCleaningSupportedFormat(
  format: SupportedImageFormat | null,
): format is LosslessMetadataCleaningFormat {
  return format === "jpeg" || format === "png" || format === "webp";
}
