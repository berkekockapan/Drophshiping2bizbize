import { describe, expect, it } from "vitest";

import type { EtsyPrepView } from "../../src/modules/etsyPrep/buildEtsyPrepView";
import { buildChatGptResearchPromptPack } from "../../src/modules/etsyPrep/prompts/buildChatGptResearchPromptPack";

const detail = {
  product: {
    id: "prod_1",
    title: "Cream Crossbody Handbag",
    brand: "EG BAGS",
    category: "Handbag",
    descriptionRaw: "Orta boy krem capraz canta.",
    attributes: [{ key: "Materyal", value: "Suni Deri" }],
    images: ["https://cdn.example.com/bag-1.jpg"],
  },
  variants: [],
  draft: {
    id: "draft_1",
    productId: "prod_1",
    englishTitle: null,
    shortDescription: null,
    longDescription: null,
    tags: [],
    materials: [],
    attributes: [],
    seoNotes: null,
    policyNotes: null,
    generatedVersion: 0,
    editedVersion: 0,
    lastGeneratedAt: null,
    manualEditsPresent: false,
  },
} as unknown as EtsyPrepView;

describe("buildChatGptResearchPromptPack", () => {
  it("adapts the approved ChatGPT research prompt with evidence priority, 1-3 emojis, and strict tag selection", () => {
    const pack = buildChatGptResearchPromptPack(detail);

    expect(pack.outputFormat).toBe("sectioned-text");
    expect(pack.researchMode).toBe("required");
    expect(pack.expectedSections).toEqual(["title", "description", "tags"]);
    expect(pack.prompt).toContain(
      "You are an Etsy SEO strategist, Etsy buyer-intent keyword researcher, and conversion-focused listing copywriter for English-language Etsy listings.",
    );
    expect(pack.prompt).toContain("Keyword Evidence Priority");
    expect(pack.prompt).toContain("Prioritize Etsy Marketplace Insights data supplied by the user when available.");
    expect(pack.prompt).toContain(
      "Never claim that a keyword is the most searched, highest volume, or best keyword unless direct Etsy Marketplace Insights or Shop Stats data supports it.",
    );
    expect(pack.prompt).toContain(
      "If web access is available, check current Etsy Seller Handbook or Etsy Help guidance on titles, tags, descriptions, attributes, and listing quality before drafting.",
    );
    expect(pack.prompt).toContain(
      "If web access is available, review 10-20 live English-language Etsy listings in the same product group before drafting.",
    );
    expect(pack.prompt).toContain(
      "If web access is not available, do not pretend that live research was completed; work only from supplied product facts, supplied keyword data, and Etsy best-practice rules.",
    );
    expect(pack.prompt).toContain(
      "Silently choose exactly 1 primary keyword angle and exactly 2 supporting keyword angles before drafting.",
    );
    expect(pack.prompt).toContain("Do not ask clarification questions in this product-flow prompt");
    expect(pack.prompt).toContain("Maximum title length: 140 characters.");
    expect(pack.prompt).toContain("Target fewer than 15 words when possible.");
    expect(pack.prompt).toContain("Each paragraph must be 80-115 words.");
    expect(pack.prompt).toContain("Total description length must be 250-340 words.");
    expect(pack.prompt).toContain("Use 1-3 mild emojis total inside the description.");
    expect(pack.prompt).toContain(
      "Reject and revise if the description uses fewer than 1 or more than 3 emojis.",
    );
    expect(pack.prompt).toContain("Internally generate at least 40 candidate Etsy search phrases before selecting the final 13 tags.");
    expect(pack.prompt).toContain("Do not simply convert product attributes into tags.");
    expect(pack.prompt).toContain(
      "Reject any tag that sounds like a database attribute, technical label, translated phrase, catalog filter, sentence fragment, or phrase made only to satisfy SEO coverage.",
    );
    expect(pack.prompt).toContain("Do not use standalone color-only tags.");
    expect(pack.prompt).toContain(
      "Use color in a maximum of 2 tags by default; allow 3 color-based tags only if supplied Etsy data or strong live-search evidence shows color is a major search driver.",
    );
    expect(pack.prompt).toContain(
      "The final 13 tags must be exactly 13 unique English tags, 20 characters or fewer each, and sound like natural Etsy buyer searches.",
    );
    expect(pack.prompt).toContain(
      "Replace the weakest 3 tags unless they are clearly supported by strong buyer intent or supplied Etsy data.",
    );
    expect(pack.prompt).toContain(
      "No Etsy Marketplace Insights or Shop Stats search terms were supplied by the app for this product. Do not claim keyword volume or popularity.",
    );
    expect(pack.prompt).toContain("Internal-only source brand hint:");
    expect(pack.prompt).toContain("EG BAGS");
    expect(pack.prompt).toContain("Return only the final answer in exactly 3 sections:");
    expect(pack.prompt).toContain("Rulebook version: etsy-prompt-pack-v7");
  });
});
