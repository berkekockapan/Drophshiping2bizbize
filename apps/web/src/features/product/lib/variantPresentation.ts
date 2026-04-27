import type { ProductDetailResponse } from "../../../app/api";

type ProductVariant = ProductDetailResponse["variants"][number];
type ProductAttribute = NonNullable<ProductDetailResponse["product"]["attributes"]>[number];
type VariantOptionKey = "option1" | "option2" | "option3";

export interface VariantOptionCategory {
  id: VariantOptionKey;
  label: string;
  values: string[];
}

export interface VariantOptionDisplay {
  id: VariantOptionKey;
  label: string;
  value: string;
}

const VARIANT_OPTION_KEYS = ["option1", "option2", "option3"] as const;

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

function normalizeComparable(value: string) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function uniqueValues(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    if (!value?.trim()) {
      continue;
    }

    const normalized = normalizeComparable(value);
    if (seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(value.trim());
  }

  return result;
}

const COLOR_WORDS = new Set(
  [
    "altın",
    "bej",
    "beyaz",
    "black",
    "blue",
    "bordo",
    "brown",
    "camel",
    "cream",
    "ekru",
    "fuşya",
    "fuchsia",
    "gold",
    "gray",
    "green",
    "gri",
    "gümüş",
    "indigo",
    "kahverengi",
    "kırmızı",
    "lacivert",
    "lila",
    "mavi",
    "mor",
    "orange",
    "pembe",
    "pink",
    "purple",
    "red",
    "sarı",
    "siyah",
    "silver",
    "turkuaz",
    "turuncu",
    "white",
    "yellow",
    "yeşil",
  ].map(normalizeComparable),
);

const SIZE_CODES = new Set(["xxs", "xs", "s", "m", "l", "xl", "xxl", "xxxl", "2xl", "3xl", "4xl", "5xl"]);
const OPTION_LABEL_FALLBACKS: Record<VariantOptionKey, string> = {
  option1: "Seçenek 1",
  option2: "Seçenek 2",
  option3: "Seçenek 3",
};

const RAW_LABEL_KEYS: Record<VariantOptionKey, string[]> = {
  option1: ["option1Label", "option1Name", "attributeLabel", "attributeName", "attributeTypeName", "variantAttributeName"],
  option2: ["option2Label", "option2Name", "secondOptionLabel", "secondOptionName"],
  option3: ["option3Label", "option3Name", "thirdOptionLabel", "thirdOptionName"],
};

function hasColorSignal(value: string) {
  const normalized = normalizeComparable(value);
  return COLOR_WORDS.has(normalized) || [...COLOR_WORDS].some((color) => normalized.split(" ").includes(color));
}

function hasLengthSignal(value: string) {
  return /\b\d+(?:[.,]\d+)?\s*-?\s*(cm|mm|m)\b/i.test(value);
}

function hasSizeSignal(value: string) {
  const normalized = normalizeComparable(value);
  return SIZE_CODES.has(normalized) || /^\d{1,2}(?:\s*(beden|numara|no))?$/.test(normalized);
}

function readRawLabel(variants: ProductVariant[], optionKey: VariantOptionKey) {
  for (const variant of variants) {
    if (!isRecord(variant.rawPayload)) {
      continue;
    }

    for (const key of RAW_LABEL_KEYS[optionKey]) {
      const value = readString(variant.rawPayload[key]);
      if (value) {
        return value;
      }
    }
  }

  return null;
}

function inferLabelFromProductAttributes(values: string[], productAttributes: ProductAttribute[] | null | undefined) {
  if (!productAttributes?.length) {
    return null;
  }

  const normalizedValues = values.map(normalizeComparable);
  const matchingAttributes = productAttributes.filter((attribute) => {
    const attributeValue = normalizeComparable(attribute.value ?? "");
    return normalizedValues.some((value) => value && (attributeValue === value || attributeValue.includes(value)));
  });

  const colorAttribute = matchingAttributes.find((attribute) => normalizeComparable(attribute.key ?? "").includes("renk"));
  if (colorAttribute) {
    return colorAttribute.key;
  }

  return matchingAttributes[0]?.key ?? null;
}

function inferOptionLabel(
  variants: ProductVariant[],
  optionKey: VariantOptionKey,
  values: string[],
  productAttributes: ProductAttribute[] | null | undefined,
) {
  const rawLabel = readRawLabel(variants, optionKey);
  if (rawLabel) {
    return rawLabel;
  }

  const attributeLabel = inferLabelFromProductAttributes(values, productAttributes);
  if (attributeLabel) {
    return attributeLabel;
  }

  if (values.some(hasColorSignal)) {
    return "Renk";
  }

  if (values.length > 0 && values.every(hasLengthSignal)) {
    return "Uzunluk";
  }

  if (values.length > 0 && values.every(hasSizeSignal)) {
    return "Beden";
  }

  return OPTION_LABEL_FALLBACKS[optionKey];
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

export function getVariantOptionCategories(
  variants: ProductVariant[],
  productAttributes: ProductAttribute[] | null | undefined,
): VariantOptionCategory[] {
  return VARIANT_OPTION_KEYS.flatMap((optionKey) => {
    const values = uniqueValues(variants.map((variant) => variant[optionKey]));
    if (values.length === 0) {
      return [];
    }

    return [
      {
        id: optionKey,
        label: inferOptionLabel(variants, optionKey, values, productAttributes),
        values,
      },
    ];
  });
}

export function getVariantOptions(variant: ProductVariant, categories: VariantOptionCategory[]): VariantOptionDisplay[] {
  return categories.flatMap((category) => {
    const value = variant[category.id]?.trim();
    if (!value) {
      return [];
    }

    return [
      {
        id: category.id,
        label: category.label,
        value,
      },
    ];
  });
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
