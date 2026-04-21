import type { ImagePromptPack } from "@dropshiping2bizbize/shared";

import type { EtsyPrepView } from "../buildEtsyPrepView";
import { buildProductPromptContext } from "./buildProductPromptContext";
import { imagePromptVariationTemplates } from "./imagePromptVariationFamilies";
import { etsyMasterRulebook } from "./masterRulebook";

function inferToneHints(context: ReturnType<typeof buildProductPromptContext>) {
  const haystack = [context.sourceTitle, context.category, ...context.imageBrief.productIdentity].join(" ").toLowerCase();

  if (/\b(hoodie|sweatshirt|dress|shirt|pant|jacket|coat|apparel|clothing)\b/.test(haystack)) {
    return [
      "Favor fabric texture readability and realistic drape.",
      "Keep the setup modern, clean, and believable rather than theatrical.",
    ];
  }

  if (/\b(necklace|earring|bracelet|ring|jewelry|jewellery)\b/.test(haystack)) {
    return [
      "Favor refined close framing with controlled highlights.",
      "Keep shine believable so product details stay truthful.",
    ];
  }

  if (/\b(mug|cup|glass|candle|pillow|blanket|ceramic|decor)\b/.test(haystack)) {
    return [
      "Favor calm home cues, soft natural light, and restrained cozy styling.",
      "Keep the environment inviting and uncluttered.",
    ];
  }

  return [
    "Favor clean premium Etsy merchandising with restrained props.",
    "Keep the environment supportive, uncluttered, and shopper-friendly.",
  ];
}

function buildVariationText(template: (typeof imagePromptVariationTemplates)[number], toneHints: string[]) {
  return [
    "Same exact product from the reference image.",
    template.lead,
    template.composition,
    template.lighting,
    template.environment,
    toneHints[0] ?? "",
    "Keep exact form, color, material feel, pattern, and structure. No redesign.",
  ].join(" ");
}

export function buildImagePromptPack(detail: EtsyPrepView): ImagePromptPack {
  const context = buildProductPromptContext(detail);
  const toneHints = inferToneHints(context);

  return {
    mainPrompt: [
      "Reference Truth",
      "- The manual reference image is the single source of truth for the exact product.",
      "- Read product identity from the reference image first and never override it with guessed improvements.",
      "",
      "Product Identity Summary",
      ...context.imageBrief.productIdentity.map((fact) => `- ${fact}`),
      "",
      "Etsy Visual Objective",
      ...etsyMasterRulebook.imageVisualObjectives.map((rule) => `- ${rule}`),
      "",
      "Hard Guardrails",
      ...etsyMasterRulebook.imageGuardrails.map((rule) => `- ${rule}`),
      "",
      "Silent Quality Gate",
      ...etsyMasterRulebook.imageQualityGate.map((rule) => `- ${rule}`),
      "",
      "Creative Direction",
      ...etsyMasterRulebook.imageCreativeDirection.map((rule) => `- ${rule}`),
      ...toneHints.map((hint) => `- ${hint}`),
    ].join("\n"),
    variations: imagePromptVariationTemplates.map((template) => buildVariationText(template, toneHints)),
    guardrailSummary: [...etsyMasterRulebook.imageGuardrails],
  };
}

