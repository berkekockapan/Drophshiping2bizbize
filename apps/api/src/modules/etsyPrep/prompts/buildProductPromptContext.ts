import type { EtsyPrepView } from "../buildEtsyPrepView";

export function buildProductPromptContext(detail: EtsyPrepView) {
  return {
    sourceTitle: detail.product.title ?? "",
    brand: detail.product.brand ?? null,
    category: detail.product.category ?? null,
    descriptionRaw: detail.product.descriptionRaw ?? null,
    attributes: detail.product.attributes ?? [],
    variants: detail.variants.map((variant) => ({
      variantKey: variant.variantKey,
      option1: variant.option1,
      option2: variant.option2,
      option3: variant.option3,
      currentPrice: variant.currentPrice,
      currentStockState: variant.currentStockState,
    })),
    images: detail.product.images ?? [],
    existingDraft: {
      englishTitle: detail.draft.englishTitle,
      longDescription: detail.draft.longDescription,
      tags: detail.draft.tags,
    },
  };
}
