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
  it("requires Etsy research and returns a 3-section final output contract", () => {
    const pack = buildChatGptResearchPromptPack(detail);

    expect(pack.outputFormat).toBe("sectioned-text");
    expect(pack.researchMode).toBe("required");
    expect(pack.expectedSections).toEqual(["title", "description", "tags"]);
    expect(pack.prompt).toContain("Browse the Etsy Seller Handbook");
    expect(pack.prompt).toContain("research competing English-language Etsy listings");
    expect(pack.prompt).toContain("English-speaking Etsy market");
    expect(pack.prompt).toContain("Do not avoid browsing");
    expect(pack.prompt).toContain("Do not show research notes");
    expect(pack.prompt).toContain("overused phrasing to avoid");
    expect(pack.prompt).toContain("choose exactly 1 primary keyword angle");
    expect(pack.prompt).toContain("Description rules: it does not need to be short");
    expect(pack.prompt).toContain("naturally weaves the chosen tag concepts into the body text");
    expect(pack.prompt).toContain("Do not mention competitors, competing listings, SEO strategy, research, or keyword analysis directly");
    expect(pack.prompt).toContain("prefer roughly 8 to 11 words");
    expect(pack.prompt).toContain("one main product noun cluster plus at most one supporting carry/style term");
    expect(pack.prompt).toContain("mention color only once");
    expect(pack.prompt).toContain("Reject any title draft that repeats the same product type");
    expect(pack.prompt).toContain("Reject any title draft that ends in raw attribute fragments");
    expect(pack.prompt).toContain("avoid stacking near-synonyms like bag/handbag/purse");
    expect(pack.prompt).toContain("Write exactly 3 shopper-facing paragraphs");
    expect(pack.prompt).toContain("paragraph 1 must establish the main search intent");
    expect(pack.prompt).toContain("do not rely on generic template headings");
    expect(pack.prompt).toContain("Reject any draft that reads like a template, a lightly rewritten attribute list, or a direct comparison script");
    expect(pack.prompt).toContain("avoid vague filler words such as versatile, timeless, elevated, giftable, or elegant");
    expect(pack.prompt).toContain("mild emoji is allowed");
    expect(pack.prompt).toContain("at most 1 or 2 total");
    expect(pack.prompt).toContain("do not repeat the same root word across most of the tag set");
    expect(pack.prompt).toContain("each tag should read like a real Etsy shopper query");
    expect(pack.prompt).toContain("at least 8 of the 13 tags should combine a concrete product anchor");
    expect(pack.prompt).toContain("no single generic noun root such as bag, purse, or handbag may appear in more than 4 of the 13 tags");
    expect(pack.prompt).toContain("at least 4 tags should avoid those generic noun roots entirely");
    expect(pack.prompt).toContain("Reject any tag set where the same root noun appears in most tags");
    expect(pack.prompt).toContain("neutral outfit bag, brunch outfit bag, city day accessory");
    expect(pack.prompt).toContain("replace the weakest 3 if they sound editorial or vague");
    expect(pack.prompt).toContain("You may use light emoji");
    expect(pack.prompt).toContain("Never mention any brand name or seller name");
    expect(pack.prompt).toContain("Write the final answer in natural English only");
    expect(pack.prompt).toContain("Internal-only source brand hint:");
    expect(pack.prompt).toContain("EG BAGS");
    expect(pack.prompt).toContain("Return only the final answer in exactly 3 sections");
    expect(pack.prompt).toContain("1. Title");
    expect(pack.prompt).toContain("2. Description");
    expect(pack.prompt).toContain("3. Tags");
    expect(pack.prompt).not.toContain("Return ONLY the JSON object.");
    expect(pack.prompt).not.toContain("Brand: EG BAGS");
  });
});
