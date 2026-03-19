import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { ParseError } from "../../src/modules/scraping/parseErrors";
import { parseTrendyolProduct } from "../../src/modules/scraping/parseTrendyolProduct";

function readFixture(name: string) {
  return readFileSync(new URL(`../fixtures/trendyol/${name}`, import.meta.url), "utf8");
}

describe("parseTrendyolProduct", () => {
  it("extracts variant-aware product data from a fixture", () => {
    const parsed = parseTrendyolProduct(readFixture("product-with-variants.html"));

    expect(parsed.title).toBe("Oversize Hoodie");
    expect(parsed.variants[0]).toEqual(
      expect.objectContaining({
        variantKey: "S-Siyah",
        option1: "S",
        option2: "Siyah",
        stockState: "IN_STOCK",
        price: 42990,
      })
    );
    expect(parsed.images).toHaveLength(2);
  });

  it("throws a typed parse error for unavailable products", () => {
    expect(() => parseTrendyolProduct(readFixture("product-unavailable.html"))).toThrowError(ParseError);
  });
});
