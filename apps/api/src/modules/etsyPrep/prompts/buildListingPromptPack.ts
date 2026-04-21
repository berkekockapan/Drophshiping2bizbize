import type { ListingPromptPack } from "@dropshiping2bizbize/shared";

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
      "Language Rules",
      ...etsyMasterRulebook.languageRules.map((rule) => `- ${rule}`),
      "",
      "SEO Rules",
      ...etsyMasterRulebook.listingSeoRules.map((rule) => `- ${rule}`),
      "",
      "Market Focus",
      "- Optimize for English-speaking Etsy shoppers and return English-only copy.",
      "- If the source data contains a brand, use it only to understand the product and omit it from the final output.",
      "",
      "Sanitized Product Facts",
      ...context.listingFacts.map((fact) => `- ${fact}`),
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
      "Tags must contain exactly 13 unique entries separated by commas.",
      "Return ONLY the JSON object.",
    ].join("\n"),
    outputContract: {
      type: etsyMasterRulebook.outputContracts.listing.type,
      fields: [...etsyMasterRulebook.outputContracts.listing.fields] as ["title", "description", "tags"],
    },
  };
}

