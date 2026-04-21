import type { EtsyPromptPackResponse } from "@dropshiping2bizbize/shared";

import type { EtsyPrepView } from "../buildEtsyPrepView";
import { buildChatGptResearchPromptPack } from "./buildChatGptResearchPromptPack";
import { buildImagePromptPack } from "./buildImagePromptPack";
import { buildListingPromptPack } from "./buildListingPromptPack";
import { buildProductPromptContext } from "./buildProductPromptContext";
import { etsyMasterRulebook } from "./masterRulebook";

export function buildEtsyPromptPackResponse(detail: EtsyPrepView): EtsyPromptPackResponse {
  const context = buildProductPromptContext(detail);
  const systemListingPromptPack = buildListingPromptPack(detail);
  const chatGptResearchPromptPack = buildChatGptResearchPromptPack(detail);
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
    listingPromptPack: systemListingPromptPack,
    systemListingPromptPack,
    chatGptResearchPromptPack,
    imagePromptPack,
  };
}

