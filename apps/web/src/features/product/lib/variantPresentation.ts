import type { ProductDetailResponse } from "../../../app/api";

type ProductVariant = ProductDetailResponse["variants"][number];

const VARIANT_IMAGE_KEYS = new Set([
  "image",
  "imageurl",
  "image_url",
  "images",
  "imageurls",
  "imagesrc",
  "thumbnail",
  "thumbnailurl",
  "thumburl",
  "mainimage",
  "mainimageurl",
  "variantimage",
  "variantimageurl",
  "media",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeImageUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  try {
    return new URL(value.trim(), "https://www.trendyol.com").toString();
  } catch {
    return null;
  }
}

function extractImageCandidates(value: unknown, allowGenericUrl = false, depth = 0): string[] {
  if (depth > 6 || value == null) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => extractImageCandidates(entry, allowGenericUrl, depth + 1));
  }

  const directUrl = normalizeImageUrl(value);
  if (directUrl) {
    return [directUrl];
  }

  if (!isRecord(value)) {
    return [];
  }

  const keys = Object.entries(value);
  const results: string[] = [];

  for (const [rawKey, rawValue] of keys) {
    const key = rawKey.toLowerCase();
    const shouldReadNested =
      VARIANT_IMAGE_KEYS.has(key) || (allowGenericUrl && (key === "url" || key === "src" || key === "href"));

    if (!shouldReadNested) {
      continue;
    }

    results.push(...extractImageCandidates(rawValue, true, depth + 1));
  }

  return results;
}

function firstNonEmptyImage(images: Array<string | null | undefined> | null | undefined): string | null {
  if (!images) {
    return null;
  }

  for (const image of images) {
    const normalized = normalizeImageUrl(image);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

export function getVariantLabel(variant: ProductVariant) {
  return [variant.option1, variant.option2, variant.option3].filter(Boolean).join(" / ") || variant.variantKey;
}

export function getVariantImageUrl(
  variant: ProductVariant,
  productImages: Array<string | null | undefined> | null | undefined,
) {
  const variantCandidates = extractImageCandidates(variant.rawPayload);
  if (variantCandidates.length > 0) {
    return variantCandidates[0];
  }

  return firstNonEmptyImage(productImages);
}
