import type { EtsyPrepView } from "../buildEtsyPrepView";
import {
  collectBannedBrandTokens,
  collectAllowedClaimTokens,
  isUsefulAttribute,
  sanitizeFactText,
  splitSanitizedSentences,
  stripBrandFromText,
} from "./promptSanitizers";

type SourceAttribute = {
  key: string | null;
  value: string | null;
};

type SourceVariant = {
  variantKey: string;
  option1: string | null;
  option2: string | null;
  option3: string | null;
};

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
  forbiddenBrandPhrases: string[];
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

function collectSourceFacts(detail: EtsyPrepView) {
  return splitSanitizedSentences(detail.product.descriptionRaw).map((line) => `Summary: ${line}`);
}

export function buildProductPromptContext(detail: EtsyPrepView): ProductPromptContext {
  const brand = sanitizeFactText(detail.product.brand) || null;
  const sourceTitle = sanitizeFactText(detail.product.title) || "Untitled product";
  const listingSourceTitle = stripBrandFromText(sourceTitle, brand) || sanitizeFactText(detail.product.category) || "Untitled product";
  const category = sanitizeFactText(detail.product.category) || null;

  const attributes = ((detail.product.attributes ?? []) as SourceAttribute[])
    .filter((attribute) => isUsefulAttribute(attribute.key))
    .map((attribute: SourceAttribute) => {
      const key = sanitizeFactText(attribute.key);
      const value = sanitizeFactText(attribute.value);
      return key && value ? { key, value } : null;
    })
    .filter((attribute): attribute is { key: string; value: string } => Boolean(attribute));

  const variants = ((detail.variants ?? []) as SourceVariant[]).map((variant: SourceVariant) => ({
    variantKey: sanitizeFactText(variant.variantKey) || variant.variantKey,
    option1: sanitizeFactText(variant.option1) || null,
    option2: sanitizeFactText(variant.option2) || null,
    option3: sanitizeFactText(variant.option3) || null,
  }));

  const images = (detail.product.images ?? []).map((_: string, index: number) => `reference-image-${index + 1}`);
  const existingDraftTags = (detail.draft.tags ?? [])
    .map((tag) => stripBrandFromText(tag, brand))
    .filter(Boolean);
  const sourceFacts = collectSourceFacts(detail)
    .map((line) => stripBrandFromText(line, brand))
    .filter(Boolean);
  const existingDraftTitle = detail.draft.englishTitle ? stripBrandFromText(detail.draft.englishTitle, brand) : null;

  const listingFacts = compact([
    `Source title: ${listingSourceTitle}`,
    category ? `Category: ${category}` : null,
    ...sourceFacts,
    ...attributes
      .map((attribute: { key: string; value: string }) => stripBrandFromText(`${attribute.key}: ${attribute.value}`, brand))
      .filter(Boolean),
    summarizeVariants(detail),
    existingDraftTitle ? `Existing draft title: ${existingDraftTitle}` : null,
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
    forbiddenBrandPhrases: collectBannedBrandTokens(brand),
    imageBrief: {
      referenceImageCount: Array.isArray(detail.product.images) ? detail.product.images.length : 0,
      productIdentity: compact([
        `Product title: ${sourceTitle}`,
        brand ? `Brand: ${brand}` : null,
        category ? `Category: ${category}` : null,
        ...attributes.slice(0, 4).map((attribute: { key: string; value: string }) => `${attribute.key}: ${attribute.value}`),
        summarizeVariants(detail),
      ]),
    },
  };
}
