import type { ChatGptResearchPromptPack } from "@dropshiping2bizbize/shared";

import type { EtsyPrepView } from "../buildEtsyPrepView";
import { buildProductPromptContext } from "./buildProductPromptContext";
import { etsyMasterRulebook } from "./masterRulebook";

export function buildChatGptResearchPromptPack(detail: EtsyPrepView): ChatGptResearchPromptPack {
  const context = buildProductPromptContext(detail);
  const {
    researchPrompt: {
      role,
      coreObjective,
      primaryOutputGoal,
      keywordEvidencePriority,
      requiredResearch,
      productFactDiscipline,
      internalKeywordStrategy,
      titleRules,
      descriptionRules,
      descriptionWordCountEnforcement,
      tagRules,
      finalTagAudit,
      selfRejectLoop,
      finalOutputRules,
    },
  } = etsyMasterRulebook;

  return {
    outputFormat: "sectioned-text",
    researchMode: "required",
    expectedSections: ["title", "description", "tags"],
    prompt: [
      "Role",
      role,
      "",
      "Core Objective",
      coreObjective,
      "",
      "Primary Output Goal",
      ...primaryOutputGoal.map((rule) => `- ${rule}`),
      "",
      "Keyword Evidence Priority",
      ...keywordEvidencePriority.map((rule, index) => `${index + 1}. ${rule}`),
      "",
      "Research First",
      ...requiredResearch.map((rule) => `- ${rule}`),
      "",
      "Product-Fact Discipline",
      ...productFactDiscipline.map((rule) => `- ${rule}`),
      "",
      "Internal Keyword Strategy",
      ...internalKeywordStrategy.map((rule) => `- ${rule}`),
      "",
      "Title Rules",
      ...titleRules.map((rule) => `- ${rule}`),
      "",
      "Description Rules",
      ...descriptionRules.map((rule) => `- ${rule}`),
      "",
      "Description Word Count Enforcement",
      ...descriptionWordCountEnforcement.map((rule) => `- ${rule}`),
      "",
      "Tag Rules",
      ...tagRules.map((rule) => `- ${rule}`),
      "",
      "Required Final Tag Audit",
      ...finalTagAudit.map((rule) => `- ${rule}`),
      "",
      "Final Self-Reject Loop",
      ...selfRejectLoop.map((rule) => `- ${rule}`),
      "",
      "Final Output Rules",
      ...finalOutputRules.map((rule) => `- ${rule}`),
      "",
      "Optional Etsy Keyword Data",
      "- No Etsy Marketplace Insights or Shop Stats search terms were supplied by the app for this product. Do not claim keyword volume or popularity.",
      "",
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

