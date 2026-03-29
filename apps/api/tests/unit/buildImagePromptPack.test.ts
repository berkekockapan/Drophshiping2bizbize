import { describe, expect, it } from "vitest";

import type { EtsyPrepView } from "../../src/modules/etsyPrep/buildEtsyPrepView";
import { buildImagePromptPack } from "../../src/modules/etsyPrep/prompts/buildImagePromptPack";

const detail = {
  product: {
    id: "prod_1",
    title: "Oversize Hoodie",
    brand: "North Apparel",
    category: "Sweatshirt",
    descriptionRaw: "Yumusak dokulu oversize hoodie.",
    attributes: [
      { key: "Renk", value: "Siyah" },
      { key: "Materyal", value: "Pamuk" },
    ],
    images: ["https://cdn.example.com/hoodie-1.jpg"],
  },
  variants: [
    {
      id: "var_1",
      variantKey: "siyah-m",
      option1: "Siyah",
      option2: "M",
      option3: null,
      trendyolUrl: null,
      currentStockState: "IN_STOCK",
      currentPrice: 44990,
      lastSeenAt: null,
      rawPayload: null,
    },
  ],
  draft: {
    id: "draft_1",
    productId: "prod_1",
    englishTitle: "Handmade Oversize Hoodie",
    shortDescription: null,
    longDescription: null,
    tags: ["oversize hoodie"],
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

describe("buildImagePromptPack", () => {
  it("returns a short main prompt, seven variations, and product-fidelity guardrails", () => {
    const pack = buildImagePromptPack(detail);

    expect(pack.mainPrompt).toContain("single source of truth");
    expect(pack.mainPrompt).not.toMatch(/PRODUCT_CONTEXT|"attributes"|"variants"|"images"|"existingDraft"|https?:\/\/|cdn\./i);
    expect(pack.variations).toHaveLength(7);
    expect(pack.variations.every((variation) => variation.length < 220)).toBe(true);
    expect(pack.guardrailSummary).toContain("Do not redesign the product.");
  });
});
