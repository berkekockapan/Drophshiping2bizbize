import type { EtsyPromptPackResponse } from "@trendyol-etsy/shared";

import type { EtsyPrepView } from "../buildEtsyPrepView";
import { buildImagePromptPack } from "./buildImagePromptPack";
import { buildListingPromptPack } from "./buildListingPromptPack";
import { buildProductPromptContext } from "./buildProductPromptContext";
import { etsyMasterRulebook } from "./masterRulebook";

export function buildEtsyPromptPackResponse(detail: EtsyPrepView): EtsyPromptPackResponse {
  const context = buildProductPromptContext(detail);
  const listingPromptPack = buildListingPromptPack(detail);
  const imagePromptPack = buildImagePromptPack(detail);

  return {
    rulebookVersion: etsyMasterRulebook.version,
    generatedAt: Date.now(),
    productSnapshot: {
      productId: detail.product.id,
      title: detail.product.title ?? null,
      brand: detail.product.brand ?? null,
      category: detail.product.category ?? null,
      attributeCount: context.attributes.length,
      variantCount: context.variants.length,
      imageCount: context.images.length,
    },
    listingPromptPack,
    imagePromptPack,
  };
}
