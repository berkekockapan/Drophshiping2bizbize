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
        rawPayload: expect.objectContaining({
          url: "https://www.trendyol.com/north-apparel/oversize-hoodie-s-siyah-p-123",
        }),
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
                  "url": "/brand-a/json-ld-cup-siyah-p-1",
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
        rawPayload: expect.objectContaining({
          url: "https://www.trendyol.com/brand-a/json-ld-cup-siyah-p-1",
        }),
      })
    );
  });

  it("prefers Trendyol PDP state over JSON-LD fallback prices", () => {
    const parsed = parseTrendyolProduct(`
      <!doctype html>
      <html>
        <head>
          <script>
            window["__envoy__PROPS"] = {
              "product": {
                "name": "Glass Cup",
                "brand": { "name": "Brand A" },
                "category": { "name": "Bardak" },
                "images": [
                  "https://cdn.example.com/cup-1.jpg",
                  "https://cdn.example.com/product-placeholder-v2.jpeg"
                ],
                "attributes": [
                  {
                    "key": { "name": "Materyal" },
                    "value": { "name": "Cam" }
                  }
                ],
                "variants": [
                  {
                    "itemNumber": 976599742,
                    "value": "",
                    "beautifiedValue": "",
                    "url": "/brand-a/glass-cup-clear-p-555",
                    "inStock": true,
                    "isSelected": true,
                    "price": {
                      "value": 89,
                      "text": "89 TL"
                    }
                  }
                ],
                "merchantListing": {
                  "winnerVariant": {
                    "itemNumber": 976599742,
                    "inStock": true,
                    "price": {
                      "currency": "TRY",
                      "discountedPrice": {
                        "value": 89,
                        "text": "89 TL"
                      },
                      "sellingPrice": {
                        "value": 89,
                        "text": "89 TL"
                      }
                    }
                  }
                }
              }
            };
          </script>
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "ProductGroup",
              "name": "Brand A Glass Cup",
              "description": "Sample product description",
              "manufacturer": "Brand A",
              "image": { "contentUrl": ["https://cdn.example.com/jsonld-image.jpg"] },
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
                  "url": "https://www.trendyol.com/brand-a/glass-cup-jsonld-p-555",
                  "offers": {
                    "@type": "Offer",
                    "availability": "https://schema.org/InStock",
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

    expect(parsed.title).toBe("Brand A Glass Cup");
    expect(parsed.brand).toBe("Brand A");
    expect(parsed.category).toBe("Bardak");
    expect(parsed.descriptionRaw).toBe("Sample product description");
    expect(parsed.attributes).toEqual([{ key: "Materyal", value: "Cam" }]);
    expect(parsed.images).toEqual(["https://cdn.example.com/cup-1.jpg"]);
    expect(parsed.price).toBe(8900);
    expect(parsed.variants).toEqual([
      expect.objectContaining({
        variantKey: "976599742",
        option1: null,
        stockState: "IN_STOCK",
        price: 8900,
        rawPayload: expect.objectContaining({
          url: "https://www.trendyol.com/brand-a/glass-cup-clear-p-555",
        }),
      }),
    ]);
  });

  it("throws a typed parse error for unavailable products", () => {
    expect(() => parseTrendyolProduct(readFixture("product-unavailable.html"))).toThrowError(ParseError);
  });
});
