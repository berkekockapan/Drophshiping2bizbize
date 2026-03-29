import type { ImagePromptPack } from "@trendyol-etsy/shared";

import type { EtsyPrepView } from "../buildEtsyPrepView";
import { buildProductPromptContext } from "./buildProductPromptContext";
import { etsyMasterRulebook } from "./masterRulebook";

const sceneVariations = [
  "Bright studio tabletop scene with a clean front angle and minimal props.",
  "Soft morning window light with a slight top-down camera angle.",
  "Neutral lifestyle shelf setup with shallow depth and tidy styling.",
  "Warm gift-table composition with centered framing and soft shadows.",
  "Editorial catalog shot with crisp side angle and muted backdrop.",
  "Minimal fabric backdrop with close three-quarter framing.",
  "Airy home desk setting with natural light and restrained accessories.",
];

export function buildImagePromptPack(detail: EtsyPrepView): ImagePromptPack {
  const context = buildProductPromptContext(detail);

  return {
    mainPrompt: [
      "Use the manual reference image as the single source of truth for the product.",
      etsyMasterRulebook.imageRole,
      "",
      "Product Identity",
      ...context.imageBrief.productIdentity.map((fact) => `- ${fact}`),
      "",
      "Guardrails",
      ...etsyMasterRulebook.imageGuardrails.map((rule) => `- ${rule}`),
      "",
      "Creative Direction",
      ...etsyMasterRulebook.imagePromptStructure.mainPromptSections.map((rule) => `- ${rule}`),
    ].join("\n"),
    variations: sceneVariations.map(
      (variation) =>
        `Same exact product from the reference image. ${variation} Keep product form, color, material feel, print, and structural details unchanged.`,
    ),
    guardrailSummary: [...etsyMasterRulebook.imageGuardrails],
  };
}
