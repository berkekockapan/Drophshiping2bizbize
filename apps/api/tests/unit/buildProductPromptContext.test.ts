import { describe, expect, it } from "vitest";

import type { EtsyPrepView } from "../../src/modules/etsyPrep/buildEtsyPrepView";
import { buildProductPromptContext } from "../../src/modules/etsyPrep/prompts/buildProductPromptContext";

const detail = {
  product: {
    id: "prod_1",
    title: "North Apparel Oversize Hoodie",
    brand: "North Apparel",
    category: "Sweatshirt",
    descriptionRaw:
      "Trendyol'a ozel indirimli fiyat. Yumusak dokulu pamuk hoodie. Yorumlarini inceleyin. https://cdn.example.com/hoodie-1.jpg",
    attributes: [
      { key: "Renk", value: "Siyah" },
      { key: "Materyal", value: "Pamuk" },
      { key: "Garanti Suresi", value: "2 yil" },
    ],
    images: ["https://cdn.example.com/hoodie-1.jpg", "https://cdn.example.com/hoodie-2.jpg"],
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
    {
      id: "var_2",
      variantKey: "siyah-l",
      option1: "Siyah",
      option2: "L",
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
    englishTitle: "Oversize Cotton Hoodie",
    shortDescription: null,
    longDescription: null,
    tags: ["oversize hoodie", "cotton hoodie"],
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

describe("buildProductPromptContext", () => {
  it("keeps only sanitized listing facts and short image identity data", () => {
    const context = buildProductPromptContext(detail);

    expect(context.listingFacts).toEqual(
      expect.arrayContaining([
        "Source title: Oversize Hoodie",
        "Category: Sweatshirt",
        "Renk: Siyah",
        "Materyal: Pamuk",
        "Available variants: Siyah / M; Siyah / L",
      ]),
    );
    expect(context.listingFacts.join("\n")).not.toMatch(/North Apparel/i);
    expect(context.forbiddenBrandPhrases).toEqual(["North Apparel", "NorthApparel"]);
    expect(context.imageBrief.referenceImageCount).toBe(2);
    expect(JSON.stringify(context)).not.toMatch(/Trendyol|yorumlarini inceleyin|indirimli fiyat|https?:\/\/|cdn\./i);
    expect(JSON.stringify(context)).not.toMatch(/Garanti Suresi|2 yil/i);
    expect(JSON.stringify(context)).not.toMatch(/origin|warranty|care instructions/i);
  });
});
