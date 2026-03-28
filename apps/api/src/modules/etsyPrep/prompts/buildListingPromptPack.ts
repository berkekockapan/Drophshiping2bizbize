import type { ListingPromptPack } from "@trendyol-etsy/shared";

import type { EtsyPrepView } from "../buildEtsyPrepView";
import { buildProductPromptContext } from "./buildProductPromptContext";
import { etsyMasterRulebook } from "./masterRulebook";

export function buildListingPromptPack(detail: EtsyPrepView): ListingPromptPack {
  const context = buildProductPromptContext(detail);

  return {
    prompt: [
      "Role",
      etsyMasterRulebook.listingRole,
      "",
      "Non-Negotiable Rules",
      ...etsyMasterRulebook.listingGuardrails.map((rule) => `- ${rule}`),
      "",
      "SEO Rules",
      ...etsyMasterRulebook.listingSeoRules.map((rule) => `- ${rule}`),
      "",
      "Product Summary",
      JSON.stringify(
        {
          sourceTitle: context.sourceTitle,
          brand: context.brand,
          category: context.category,
          descriptionRaw: context.descriptionRaw,
        },
        null,
        2,
      ),
      "",
      "Attributes",
      JSON.stringify(context.attributes, null, 2),
      "",
      "Variants",
      JSON.stringify(context.variants, null, 2),
      "",
      "Images",
      JSON.stringify(context.images, null, 2),
      "",
      "Existing Draft",
      JSON.stringify(context.existingDraft, null, 2),
      "",
      "PRODUCT_CONTEXT",
      JSON.stringify(context, null, 2),
      "",
      "Output Format",
      JSON.stringify(
        {
          title: "...",
          description: "...",
          tags: "tag1, tag2, tag3",
        },
        null,
        2,
      ),
      "Return ONLY valid JSON.",
    ].join("\n"),
    outputContract: {
      type: "json",
      fields: ["title", "description", "tags"],
    },
  };
}
