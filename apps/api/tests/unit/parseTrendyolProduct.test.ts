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

  it("falls back to JSON-LD product payloads when fixture selectors are absent", () => {
    const parsed = parseTrendyolProduct(`
      <!doctype html>
      <html>
        <head>
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "ProductGroup",
              "name": "JSON-LD Cup",
              "description": "Sample product description",
              "manufacturer": "Brand A",
              "image": { "contentUrl": ["https://cdn.example.com/img-1.jpg"] },
              "offers": {
                "@type": "Offer",
                "availability": "https://schema.org/InStock",
                "price": 34.99,
                "priceCurrency": "TRY"
              },
              "hasVariant": [
                {
                  "@type": "Product",
                  "sku": "sku-1",
                  "color": "Siyah",
                  "offers": {
                    "@type": "Offer",
                    "availability": "https://schema.org/OutOfStock",
                    "price": 33.5,
                    "priceCurrency": "TRY"
                  }
                }
              ]
            }
          </script>
        </head>
        <body></body>
      </html>
    `);

    expect(parsed.title).toBe("JSON-LD Cup");
    expect(parsed.brand).toBe("Brand A");
    expect(parsed.price).toBe(3499);
    expect(parsed.images).toEqual(["https://cdn.example.com/img-1.jpg"]);
    expect(parsed.variants[0]).toEqual(
      expect.objectContaining({
        variantKey: "sku-1",
        option1: "Siyah",
        stockState: "OUT_OF_STOCK",
        price: 3350,
      })
    );
  });

  it("throws a typed parse error for unavailable products", () => {
    expect(() => parseTrendyolProduct(readFixture("product-unavailable.html"))).toThrowError(ParseError);
  });
});
