import type { ChatGptResearchPromptPack } from "@trendyol-etsy/shared";

import type { EtsyPrepView } from "../buildEtsyPrepView";
import { buildProductPromptContext } from "./buildProductPromptContext";
import { etsyMasterRulebook } from "./masterRulebook";

export function buildChatGptResearchPromptPack(detail: EtsyPrepView): ChatGptResearchPromptPack {
  const context = buildProductPromptContext(detail);

  return {
    outputFormat: "sectioned-text",
    researchMode: "required",
    expectedSections: ["title", "description", "tags"],
    prompt: [
      "You are an Etsy SEO strategist and conversion-focused copywriter.",
      "Browse the Etsy Seller Handbook first, then research competing English-language Etsy listings in the same product group before writing the final answer.",
      "Research and optimize for the English-speaking Etsy market, especially US-facing buyer intent and search phrasing.",
      "Do not avoid browsing. Actively inspect enough Etsy results to understand repeated title structures, common tag angles, weak copy habits, and realistic differentiation opportunities before you write.",
      "Use that research only as internal reasoning. Do not show research notes, competitor notes, or a research summary in the final answer.",
      "Identify the strongest buyer-intent keywords, repeated competitor patterns, weak positioning, overused phrasing to avoid, and market gaps this product can win on.",
      "Before writing, choose exactly 1 primary keyword angle and exactly 2 supporting keyword angles. Discard weaker directions.",
      "Write a high-conversion Etsy listing that stays truthful to the supplied product facts and the observed market research.",
      "Write the final answer in natural English only. Do not output Turkish words, transliterations, or bilingual copy.",
      "Treat any source brand or seller name as internal-only context. Never mention any brand name or seller name in the Title, Description, or Tags.",
      "Do not mention competitors, competing listings, SEO strategy, research, or keyword analysis directly in the final copy. Convert that insight into shopper-facing benefits instead.",
      "Title rules: lead with the clearest shopper phrase, prefer roughly 8 to 11 words, use one main product noun cluster plus at most one supporting carry/style term if fact-supported, mention color only once, avoid stacking near-synonyms like bag/handbag/purse unless each adds distinct search value, and reject vague filler endings.",
      "Reject any title draft that repeats the same product type through multiple near-synonyms or says the same color twice.",
      "Reject any title draft that ends in raw attribute fragments or technical phrases such as 'with plain woven finish' unless the wording is a natural shopper query.",
      "Description rules: it does not need to be short. Write exactly 3 shopper-facing paragraphs in clear, persuasive, SEO-aware language that naturally weaves the chosen tag concepts into the body text without sounding like an attribute dump.",
      "Description rules: paragraph 1 must establish the main search intent and product promise. Paragraph 2 must explain why this is a stronger choice than common competing listings using only supported facts. Paragraph 3 must cover styling fit, wardrobe pairing, or use-case versatility.",
      "Description rules: do not rely on generic template headings such as 'Why shoppers love this style', 'Style it with', or 'Product details'. Reject any draft that reads like a template, a lightly rewritten attribute list, or a direct comparison script about other listings.",
      "Description rules: avoid vague filler words such as versatile, timeless, elevated, giftable, or elegant unless they are immediately supported by concrete product facts.",
      "Description rules: mild emoji is allowed, but keep it to at most 1 or 2 total, use emoji only inside the description, and only if it adds warmth without making the listing feel gimmicky.",
      "Tag rules: generate exactly 13 unique English tags, keep each tag within Etsy's 20-character limit, spread them across product type, style, use case, aesthetic intent, and material/color/size differentiators, avoid weak generic tags, and do not repeat the same root word across most of the tag set.",
      "Tag rules: each tag should read like a real Etsy shopper query, not like a merchandiser label, editorial phrase, or outfit-planning caption.",
      "Tag rules: at least 8 of the 13 tags should combine a concrete product anchor with a meaningful differentiator or use case, rather than soft wording alone.",
      "Tag rules: no single generic noun root such as bag, purse, or handbag may appear in more than 4 of the 13 tags, and at least 4 tags should avoid those generic noun roots entirely.",
      "Reject any tag set where the same root noun appears in most tags or where multiple tags are weak variations of the same phrase such as neutral outfit bag, brunch outfit bag, city day accessory, woven finish bag, basic style bag, hand carry bag, or womens cream bag.",
      "Before finalizing, silently rank the 13 tags by search strength, replace the weakest 3 if they sound editorial or vague, and rewrite once if the title sounds catalog-like, if the description mentions competitors directly, or if bag/purse roots dominate the tags.",
      "You may use light emoji if it improves readability and does not look spammy.",
      "Do not include origin, warranty, care instructions, shipping promises, marketplace names, or unsupported claims unless explicitly supported by the product facts.",
      "Do not output markdown, code fences, or JSON.",
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
