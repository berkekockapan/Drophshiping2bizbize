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
  it("forces handbook + competitor research, hardened tag strategy, and a stricter self-reject loop", () => {
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
    expect(pack.prompt).toContain("Generate 30 candidate Etsy search phrases first, then keep only the strongest 13.");
    expect(pack.prompt).toContain("Use all 13 tags.");
    expect(pack.prompt).toContain("Keep every tag at 20 characters or fewer.");
    expect(pack.prompt).toContain("No more than 4 tags may use the same main noun root such as bracelet.");
    expect(pack.prompt).toContain("No more than 5 tags may repeat the same adjective root such as pink.");
    expect(pack.prompt).toContain(
      "Avoid unsupported claims such as handmade, stretch, adjustable, gemstone, healing, crystal, or hypoallergenic unless explicitly supported by product facts.",
    );
    expect(pack.prompt).toContain("Replace the weakest 3 tags before finalizing.");
    expect(pack.prompt).toContain("Reject any tag set where more than 2 tags are minor rewrites of each other.");
    expect(pack.prompt).toContain(
      "Reject any tag set that misses recipient, use-case, or differentiator coverage when supported by product facts.",
    );
    expect(pack.prompt).toContain("Before finalizing, silently reject outputs that copy weak competitor patterns.");
    expect(pack.prompt).toContain("Internal-only source brand hint:");
    expect(pack.prompt).toContain("EG BAGS");
    expect(pack.prompt).toContain("Return only the final answer in exactly 3 sections:");
  });
});
