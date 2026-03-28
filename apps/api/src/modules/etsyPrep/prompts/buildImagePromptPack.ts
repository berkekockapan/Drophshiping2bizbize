import type { ImagePromptPack } from "@trendyol-etsy/shared";

import type { EtsyPrepView } from "../buildEtsyPrepView";
import { buildProductPromptContext } from "./buildProductPromptContext";
import { etsyMasterRulebook } from "./masterRulebook";

const sceneVariations = [
  "bright studio tabletop scene with clean front angle",
  "soft morning window light with slight top-down camera angle",
  "minimal home office desk setup with crisp side angle",
  "warm gift-table styling with centered product framing",
  "airy lifestyle shelf composition with subtle depth",
  "neutral fabric backdrop with close three-quarter angle",
  "editorial catalog setup with sharp overhead composition",
];

export function buildImagePromptPack(detail: EtsyPrepView): ImagePromptPack {
  const context = buildProductPromptContext(detail);

  return {
    mainPrompt: [
      "Use the provided reference image as the product truth source.",
      etsyMasterRulebook.imageRole,
      ...etsyMasterRulebook.imageGuardrails.map((rule) => `- ${rule}`),
      `PRODUCT_CONTEXT: ${JSON.stringify(context, null, 2)}`,
    ].join("\n"),
    variations: sceneVariations.map(
      (variation) =>
        `Same exact product from the reference image, ${variation}; keep product form, color, material feel, print, and structural details unchanged.`,
    ),
    guardrailSummary: [...etsyMasterRulebook.imageGuardrails],
  };
}
