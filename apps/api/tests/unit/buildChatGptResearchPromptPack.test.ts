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
  it("forces handbook + competitor research, sharper SEO rules, and a self-reject loop", () => {
    const pack = buildChatGptResearchPromptPack(detail);

    expect(pack.outputFormat).toBe("sectioned-text");
    expect(pack.researchMode).toBe("required");
    expect(pack.expectedSections).toEqual(["title", "description", "tags"]);
    expect(pack.prompt).toContain("Check Etsy Seller Handbook guidance on listing quality and keyword strategy before drafting.");
    expect(pack.prompt).toContain(
      "Review a meaningful set of live English-language Etsy competitor listings in the same product group before you write.",
    );
    expect(pack.prompt).toContain(
      "Silently choose exactly 1 primary keyword angle and exactly 2 supporting keyword angles before drafting.",
    );
    expect(pack.prompt).toContain("Reject any title draft that feels catalog-like, empty, or overextended.");
    expect(pack.prompt).toContain(
      "Reject any description draft that is too short, too generic, or fails to naturally distribute the chosen tag logic.",
    );
    expect(pack.prompt).toContain("Before finalizing, silently reject outputs that copy weak competitor patterns.");
    expect(pack.prompt).toContain("Internal-only source brand hint:");
    expect(pack.prompt).toContain("EG BAGS");
    expect(pack.prompt).toContain("Return only the final answer in exactly 3 sections:");
  });
});