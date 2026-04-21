import type { ChatGptResearchPromptPack } from "@dropshiping2bizbize/shared";

import type { EtsyPrepView } from "../buildEtsyPrepView";
import { buildProductPromptContext } from "./buildProductPromptContext";
import { etsyMasterRulebook } from "./masterRulebook";

export function buildChatGptResearchPromptPack(detail: EtsyPrepView): ChatGptResearchPromptPack {
  const context = buildProductPromptContext(detail);
  const {
    researchPrompt: { role, requiredResearch, titleRules, descriptionRules, tagRules, selfRejectLoop },
  } = etsyMasterRulebook;

  return {
    outputFormat: "sectioned-text",
    researchMode: "required",
    expectedSections: ["title", "description", "tags"],
    prompt: [
      "Role",
      role,
      "",
      "Research First",
      ...requiredResearch.map((rule) => `- ${rule}`),
      "",
      "Title Rules",
      ...titleRules.map((rule) => `- ${rule}`),
      "",
      "Description Rules",
      ...descriptionRules.map((rule) => `- ${rule}`),
      "",
      "Tag Rules",
      ...tagRules.map((rule) => `- ${rule}`),
      "",
      "Final Self-Reject Loop",
      ...selfRejectLoop.map((rule) => `- ${rule}`),
      "",
      "Guardrails",
      "- Write the final answer in natural English only. Do not output Turkish words, transliterations, or bilingual copy.",
      "- Do not mention competitors, competing listings, SEO strategy, research, or keyword analysis directly in the final copy.",
      "- Do not include origin, warranty, care instructions, shipping promises, marketplace names, or unsupported claims unless explicitly supported by the product facts.",
      "- Do not output markdown, code fences, or JSON.",
      "Return only the final answer in exactly 3 sections:",
      "1. Title",
      "2. Description",
      "3. Tags",
      "Tags must be exactly 13 unique English tags separated by commas.",
      ...(context.brand
        ? [
            "",
            "Internal-only source brand hint:",
            `- ${context.brand}`,
            "- Use this only to infer price tier, positioning, and competitor set. Never reveal it in the final answer.",
          ]
        : []),
      "",
      "Product facts:",
      ...context.listingFacts.map((fact) => `- ${fact}`),
      "",
      `Rulebook version: ${etsyMasterRulebook.version}`,
    ].join("\n"),
  };
}

