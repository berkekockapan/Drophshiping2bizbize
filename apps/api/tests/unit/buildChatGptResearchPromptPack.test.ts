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
  it("forces handbook + competitor research, truthful claim handling, and a stricter tag self-reject loop", () => {
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
    expect(pack.prompt).toContain("Every tag must read like a natural Etsy buyer query, not a literal attribute dump or awkward translated phrase.");
    expect(pack.prompt).toContain("No more than 4 tags may use the same main noun root such as bracelet.");
    expect(pack.prompt).toContain("No more than 5 tags may repeat the same adjective root such as pink.");
    expect(pack.prompt).toContain("Use truthful claims such as handmade when they are explicitly supported by product facts and improve buyer clarity.");
    expect(pack.prompt).toContain("Do not call an item vintage unless the product facts explicitly confirm Etsy-vintage eligibility.");
    expect(pack.prompt).toContain("Reject tags that combine a raw measurement with a generic noun unless the phrase sounds like a real Etsy buyer search.");
    expect(pack.prompt).toContain(
      "Treat size tags as optional. Use a size-based tag only when the exact phrase sounds like a natural Etsy buyer search and is stronger than available material, style, recipient, or use-case tags.",
    );
    expect(pack.prompt).toContain("Do not reject a tag only because it is broad.");
    expect(pack.prompt).toContain(
      "Keep broader material or color tags only when they add distinct search intent not already covered by stronger product-type tags.",
    );
    expect(pack.prompt).toContain(
      "Do not let generic fallback nouns such as jewelry or accessory dominate the tag set; keep them only when they add distinct search intent that a more specific product noun cannot express cleanly.",
    );
    expect(pack.prompt).toContain(
      "Gift-intent tags should use a clear recipient or occasion when supported by product facts; avoid vague material-plus-gift phrasing.",
    );
    expect(pack.prompt).toContain("Replace the weakest 3 tags before finalizing.");
    expect(pack.prompt).toContain("Reject any tag set with awkward raw-size phrases such as 20 cm bracelet when a more natural buyer phrase is available.");
    expect(pack.prompt).toContain(
      "Reject any tag set where more than 2 tags rely on generic fallback nouns such as jewelry or accessory.",
    );
    expect(pack.prompt).toContain(
      "Reject weak generic tags such as everyday jewelry, wrist jewelry, or long stone bracelet when stronger product-led queries are available.",
    );
    expect(pack.prompt).toContain("Reject a broad tag only when it adds no distinct buyer intent beyond stronger tags already in the set.");
    expect(pack.prompt).toContain("Reject any tag set where more than 2 tags are minor rewrites of each other.");
    expect(pack.prompt).toContain(
      "Reject any tag set that misses recipient, use-case, or differentiator coverage when supported by product facts.",
    );
    expect(pack.prompt).toContain("Reject any output that uses vintage language without explicit proof that the item qualifies as vintage on Etsy.");
    expect(pack.prompt).toContain("Before finalizing, silently reject outputs that copy weak competitor patterns.");
    expect(pack.prompt).toContain("Internal-only source brand hint:");
    expect(pack.prompt).toContain("EG BAGS");
    expect(pack.prompt).toContain("Return only the final answer in exactly 3 sections:");
  });
});
