import { describe, expect, it } from "vitest";

import { buildDraftPrompt } from "../../src/modules/ai/buildDraftPrompt";

const seedProductDetail = {
  product: {
    id: "prod_1",
    title: "Oversize Hoodie",
    brand: "North Apparel",
    category: "Sweatshirt",
    descriptionRaw: "Yumuşak dokulu, rahat kalıp hoodie.",
    attributes: [
      { key: "Kumaş", value: "%80 pamuk" },
      { key: "Kalıp", value: "Oversize" },
    ],
  },
  variants: [
    { variantKey: "S-Siyah", option1: "S", option2: "Siyah", option3: null, currentPrice: 39990, currentStockState: "IN_STOCK" },
    { variantKey: "M-Siyah", option1: "M", option2: "Siyah", option3: null, currentPrice: 39990, currentStockState: "IN_STOCK" },
    { variantKey: "L-Siyah", option1: "L", option2: "Siyah", option3: null, currentPrice: 39990, currentStockState: "OUT_OF_STOCK" },
  ],
};

describe("buildDraftPrompt", () => {
  it("builds a prompt payload that includes source product, variants, and etsy constraints", () => {
    const prompt = buildDraftPrompt(seedProductDetail);

    expect(prompt.instructions).toContain("13 tags");
    expect(prompt.source.variants).toHaveLength(3);
    expect(prompt.source.productTitle).toContain("Oversize Hoodie");
  });
});