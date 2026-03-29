import type { EtsyPrepView } from "../buildEtsyPrepView";
import {
  collectAllowedClaimTokens,
  isUsefulAttribute,
  sanitizeFactText,
  splitSanitizedSentences,
} from "./promptSanitizers";

export interface ProductPromptContext {
  sourceTitle: string;
  brand: string | null;
  category: string | null;
  attributes: Array<{ key: string; value: string }>;
  variants: Array<{
    variantKey: string;
    option1: string | null;
    option2: string | null;
    option3: string | null;
  }>;
  images: string[];
  existingDraft: {
    englishTitle: string | null;
    longDescription: string | null;
    tags: string[];
  };
  listingFacts: string[];
  allowedClaimTokens: string[];
  imageBrief: {
    referenceImageCount: number;
    productIdentity: string[];
  };
}

function compact(values: Array<string | null | undefined>) {
  return values.filter((value): value is string => Boolean(value && value.trim()));
}

function summarizeVariants(detail: EtsyPrepView) {
  const summary = detail.variants
    .map((variant) =>
      [variant.option1, variant.option2, variant.option3]
        .map((value) => sanitizeFactText(value))
        .filter(Boolean)
        .join(" / "),
    )
    .filter(Boolean)
    .slice(0, 5);

  return summary.length > 0 ? `Available variants: ${summary.join("; ")}` : null;
}

export function buildProductPromptContext(detail: EtsyPrepView): ProductPromptContext {
  const sourceTitle = sanitizeFactText(detail.product.title) || "Untitled product";
  const brand = sanitizeFactText(detail.product.brand) || null;
  const category = sanitizeFactText(detail.product.category) || null;

  const attributes = (detail.product.attributes ?? [])
    .filter((attribute) => isUsefulAttribute(attribute.key))
    .map((attribute) => {
      const key = sanitizeFactText(attribute.key);
      const value = sanitizeFactText(attribute.value);
      return key && value ? { key, value } : null;
    })
    .filter((attribute): attribute is { key: string; value: string } => Boolean(attribute));

  const variants = (detail.variants ?? []).map((variant) => ({
    variantKey: sanitizeFactText(variant.variantKey) || variant.variantKey,
    option1: sanitizeFactText(variant.option1) || null,
    option2: sanitizeFactText(variant.option2) || null,
    option3: sanitizeFactText(variant.option3) || null,
  }));

  const images = (detail.product.images ?? []).map((_, index) => `reference-image-${index + 1}`);
  const existingDraftTags = (detail.draft.tags ?? []).map((tag) => sanitizeFactText(tag)).filter(Boolean);

  const listingFacts = compact([
    `Source title: ${sourceTitle}`,
    brand ? `Brand: ${brand}` : null,
    category ? `Category: ${category}` : null,
    ...splitSanitizedSentences(detail.product.descriptionRaw).map((line) => `Summary: ${line}`),
    ...attributes.map((attribute) => `${attribute.key}: ${attribute.value}`),
    summarizeVariants(detail),
    detail.draft.englishTitle ? `Existing draft title: ${sanitizeFactText(detail.draft.englishTitle)}` : null,
    existingDraftTags.length > 0 ? `Existing draft tags: ${existingDraftTags.join(", ")}` : null,
  ]);

  return {
    sourceTitle,
    brand,
    category,
    attributes,
    variants,
    images,
    existingDraft: {
      englishTitle: detail.draft.englishTitle ? sanitizeFactText(detail.draft.englishTitle) || null : null,
      longDescription: detail.draft.longDescription ? sanitizeFactText(detail.draft.longDescription) || null : null,
      tags: existingDraftTags,
    },
    listingFacts,
    allowedClaimTokens: collectAllowedClaimTokens(listingFacts),
    imageBrief: {
      referenceImageCount: Array.isArray(detail.product.images) ? detail.product.images.length : 0,
      productIdentity: compact([
        `Product title: ${sourceTitle}`,
        brand ? `Brand: ${brand}` : null,
        category ? `Category: ${category}` : null,
        ...attributes.slice(0, 4).map((attribute) => `${attribute.key}: ${attribute.value}`),
        summarizeVariants(detail),
      ]),
    },
  };
}
