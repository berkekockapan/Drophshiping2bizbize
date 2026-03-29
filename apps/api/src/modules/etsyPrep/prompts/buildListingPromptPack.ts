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
      "Language Rules",
      ...etsyMasterRulebook.languageRules.map((rule) => `- ${rule}`),
      "",
      "SEO Rules",
      ...etsyMasterRulebook.listingSeoRules.map((rule) => `- ${rule}`),
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
      "Return ONLY the JSON object.",
    ].join("\n"),
    outputContract: etsyMasterRulebook.outputContracts.listing,
  };
}
