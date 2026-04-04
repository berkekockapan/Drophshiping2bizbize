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
  it("returns a block-structured main prompt, ten balanced variations, and stronger fidelity guardrails", () => {
    const pack = buildImagePromptPack(detail);

    expect(pack.mainPrompt).toContain("Reference Truth");
    expect(pack.mainPrompt).toContain("Etsy Visual Objective");
    expect(pack.mainPrompt).toContain("Hard Guardrails");
    expect(pack.mainPrompt).toContain("Silent Quality Gate");
    expect(pack.mainPrompt).toContain("Do not redesign, reinterpret, embellish, or reconstruct the product.");
    expect(pack.mainPrompt).not.toMatch(/PRODUCT_CONTEXT|"attributes"|"variants"|"images"|"existingDraft"|https?:\/\/|cdn\./i);
    expect(pack.variations).toHaveLength(10);
    expect(pack.variations.filter((variation) => /Etsy hero clean product shot/i.test(variation))).toHaveLength(4);
    expect(pack.variations.filter((variation) => /Lifestyle scene/i.test(variation))).toHaveLength(4);
    expect(pack.variations.filter((variation) => /Editorial attention-grabber/i.test(variation))).toHaveLength(2);
    expect(pack.variations.every((variation) => variation.length < 420)).toBe(true);
    expect(pack.guardrailSummary).toContain("Do not redesign, reinterpret, embellish, or reconstruct the product.");
  });
});
