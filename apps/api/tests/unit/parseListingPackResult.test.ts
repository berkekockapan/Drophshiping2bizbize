import { describe, expect, it } from "vitest";

import type { EtsyPrepView } from "../../src/modules/etsyPrep/buildEtsyPrepView";
import { buildProductPromptContext } from "../../src/modules/etsyPrep/prompts/buildProductPromptContext";
import { parseListingPackResult } from "../../src/modules/etsyPrep/prompts/parseListingPackResult";

const detail = {
  product: {
    id: "prod_1",
    title: "Oversize Hoodie",
    brand: "North Apparel",
    category: "Sweatshirt",
    descriptionRaw: "Soft cotton hoodie for everyday wear.",
    attributes: [{ key: "Materyal", value: "Pamuk" }],
    images: ["https://cdn.example.com/hoodie-1.jpg"],
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

const context = buildProductPromptContext(detail);

describe("parseListingPackResult", () => {
  it("normalizes comma-separated tags and rejects fenced or invalid marketing output", () => {
    expect(
      parseListingPackResult(
        JSON.stringify({
          title: "Oversize Cotton Hoodie",
          description: "Soft cotton hoodie for everyday wear.",
          tags: "oversize hoodie, streetwear gift, black hoodie, cotton hoodie, everyday wear, casual layer, soft cotton, street style, neutral staple, winter layer, gift idea, wardrobe essential, minimalist look",
        }),
        context,
      ),
    ).toEqual({
      title: "Oversize Cotton Hoodie",
      description: "Soft cotton hoodie for everyday wear.",
      tags:
        "oversize hoodie, streetwear gift, black hoodie, cotton hoodie, everyday wear, casual layer, soft cotton, street style, neutral staple, winter layer, gift idea, wardrobe essential, minimalist look",
    });

    expect(() =>
      parseListingPackResult(
        "```json\n{\"title\":\"Soft cotton hoodie\",\"description\":\"Soft cotton hoodie\",\"tags\":\"hoodie\"}\n```",
        context,
      ),
    ).toThrow(/markdown/i);

    expect(() =>
      parseListingPackResult(
        JSON.stringify({
          title: "Premium Hoodie",
          description: "Indirimli fiyat icin Trendyol linkine bakin",
          tags: "hoodie, gift",
        }),
        context,
      ),
    ).toThrow(/banned|english|claim/i);

    expect(() =>
      parseListingPackResult(
        JSON.stringify({
          title: "Soft Cotton Hoodie",
          description: "Yumusak dokulu pamuk hoodie for everyday wear.",
          tags: "hoodie, gift",
        }),
        context,
      ),
    ).toThrow(/english/i);

    expect(() =>
      parseListingPackResult(
        JSON.stringify({
          title: "North Apparel Cotton Hoodie",
          description: "Soft cotton hoodie for everyday wear.",
          tags:
            "oversize hoodie, streetwear gift, black hoodie, cotton hoodie, everyday wear, casual layer, soft cotton, street style, neutral staple, winter layer, gift idea, wardrobe essential, minimalist look",
        }),
        context,
      ),
    ).toThrow(/brand/i);

    expect(() =>
      parseListingPackResult(
        JSON.stringify({
          title: "NorthApparel Cotton Hoodie",
          description: "Soft cotton hoodie for everyday wear.",
          tags:
            "oversize hoodie, streetwear gift, black hoodie, cotton hoodie, everyday wear, casual layer, soft cotton, street style, neutral staple, winter layer, gift idea, wardrobe essential, minimalist look",
        }),
        context,
      ),
    ).toThrow(/brand/i);

    expect(() =>
      parseListingPackResult(
        JSON.stringify({
          title: "Soft Cotton Hoodie / Black / M / L / XL / Variant Matrix",
          description: "Soft cotton hoodie for everyday wear.",
          tags: "hoodie",
        }),
        context,
      ),
    ).toThrow(/variant/i);

    expect(() =>
      parseListingPackResult(
        JSON.stringify({
          title: "Handmade Oversize Hoodie",
          description: "Soft cotton hoodie for everyday wear.",
          tags: ["oversize hoodie"],
        }),
        context,
      ),
    ).toThrow(/tags/i);

    expect(() =>
      parseListingPackResult(
        JSON.stringify({
          title: "Handmade Oversize Hoodie",
          description: "Soft cotton hoodie for everyday wear.",
          tags: "oversize hoodie, streetwear gift, black hoodie, cotton hoodie, everyday wear, casual layer, soft cotton, street style, neutral staple, winter layer, gift idea, wardrobe essential, minimalist look",
        }),
        context,
      ),
    ).toThrow(/claim/i);

    expect(() =>
      parseListingPackResult(
        JSON.stringify({
          title: "Oversize Cotton Hoodie",
          description: "Origin: TR. Warranty period: 1 year. Care instructions are included.",
          tags: "oversize hoodie, streetwear gift, black hoodie, cotton hoodie, everyday wear, casual layer, soft cotton, street style, neutral staple, winter layer, gift idea, wardrobe essential, minimalist look",
        }),
        context,
      ),
    ).toThrow(/boilerplate/i);

    expect(() =>
      parseListingPackResult(
        JSON.stringify({
          title: "Oversize Cotton Hoodie",
          description: "Soft cotton hoodie for everyday wear.",
          tags:
            "mirror chain necklace, opal necklace, long gold necklace, 14k gold necklace, gold chain necklace, elegant gold jewelry, minimalist necklace, layered look necklace, women gold necklace, opal gold jewelry, fine gold necklace, extra long statement necklace, modern style necklace",
        }),
        context,
      ),
    ).toThrow(/20-character/i);

    expect(() =>
      parseListingPackResult(
        JSON.stringify({
          title: "Soft Cotton Hoodie",
          description: "Soft cotton hoodie for everyday wear.",
          tags: "hoodie, hoodie, streetwear gift, black hoodie, cotton hoodie, everyday wear, casual layer, soft cotton, street style, neutral staple, winter layer, gift idea, wardrobe essential",
        }),
        context,
      ),
    ).toThrow(/13 unique/i);
  });
});
